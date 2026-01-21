// ============================================
// Review Service - 買家評價服務
// ============================================

import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PointLogType } from '@prisma/client';

// 評價獎勵積分
const REVIEW_REWARD_POINTS = 50;

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // 用戶提交評價
  // ========================================
  async createReview(
    userId: string,
    data: {
      orderId: string;
      rating: number;
      content?: string;
      images?: string[];
      productName?: string;
      isAnonymous?: boolean;
    },
  ) {
    // 1. 驗證評分範圍
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('評分必須在 1-5 之間');
    }

    // 2. 檢查訂單是否存在且已完成
    const order = await this.prisma.proxyOrder.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      throw new NotFoundException('訂單不存在');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('無權評價此訂單');
    }

    if (order.status !== 'COMPLETED') {
      throw new BadRequestException('只能評價已完成的訂單');
    }

    // 3. 檢查是否已評價過
    const existingReview = await this.prisma.review.findUnique({
      where: { orderId: data.orderId },
    });

    if (existingReview) {
      throw new BadRequestException('此訂單已評價過');
    }

    // 4. 創建評價並獎勵積分 (事務)
    const result = await this.prisma.$transaction(async (tx) => {
      // 創建評價
      const review = await tx.review.create({
        data: {
          userId,
          orderId: data.orderId,
          rating: data.rating,
          content: data.content,
          images: data.images || [],
          productName: data.productName,
          isAnonymous: data.isAnonymous || false,
        },
      });

      // 獎勵積分
      const user = await tx.user.update({
        where: { id: userId },
        data: { points: { increment: REVIEW_REWARD_POINTS } },
      });

      // 記錄積分變動
      await tx.pointLog.create({
        data: {
          userId,
          amount: REVIEW_REWARD_POINTS,
          type: PointLogType.REVIEW_REWARD,
          description: '評價獎勵',
          orderId: data.orderId,
          balanceAfter: user.points,
        },
      });

      return { review, newPoints: user.points };
    });

    return {
      success: true,
      message: `評價成功！獲得 ${REVIEW_REWARD_POINTS} 積分獎勵`,
      data: {
        review: result.review,
        pointsEarned: REVIEW_REWARD_POINTS,
        currentPoints: result.newPoints,
      },
    };
  }

  // ========================================
  // 獲取首頁精選評價 (輪播)
  // ========================================
  async getFeaturedReviews(limit = 10) {
    const reviews = await this.prisma.review.findMany({
      where: { isFeatured: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 處理用戶名隱藏
    const processedReviews = reviews.map((review) => {
      let displayName = '匿名用戶';
      
      if (!review.isAnonymous && review.user) {
        if (review.user.name) {
          // 隱藏中間字符: 陳大明 → 陳**
          const name = review.user.name;
          if (name.length <= 1) {
            displayName = name + '**';
          } else if (name.length === 2) {
            displayName = name[0] + '*';
          } else {
            displayName = name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
          }
        } else {
          // 使用 email 前綴
          const emailPrefix = review.user.email.split('@')[0];
          displayName = emailPrefix.substring(0, 2) + '***';
        }
      }

      return {
        id: review.id,
        rating: review.rating,
        content: review.content,
        images: review.images,
        productName: review.productName,
        displayName,
        reply: review.reply,
        createdAt: review.createdAt,
      };
    });

    return {
      success: true,
      data: processedReviews,
    };
  }

  // ========================================
  // 獲取用戶自己的評價列表
  // ========================================
  async getMyReviews(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  // ========================================
  // 檢查訂單是否可評價
  // ========================================
  async checkReviewable(userId: string, orderId: string) {
    const order = await this.prisma.proxyOrder.findUnique({
      where: { id: orderId },
    });

    if (!order || order.userId !== userId) {
      return { success: true, data: { canReview: false, reason: '訂單不存在' } };
    }

    if (order.status !== 'COMPLETED') {
      return { success: true, data: { canReview: false, reason: '訂單未完成' } };
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { orderId },
    });

    if (existingReview) {
      return { success: true, data: { canReview: false, reason: '已評價過', review: existingReview } };
    }

    return { success: true, data: { canReview: true } };
  }

  // ========================================
  // [管理員] 獲取所有評價列表
  // ========================================
  async getAllReviews(query: {
    page?: number;
    limit?: number;
    isFeatured?: boolean;
    rating?: number;
  }) {
    const { page = 1, limit = 20, isFeatured, rating } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (rating) where.rating = rating;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  // ========================================
  // [管理員] 切換精選狀態
  // ========================================
  async toggleFeatured(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('評價不存在');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isFeatured: !review.isFeatured },
    });

    return {
      success: true,
      message: updated.isFeatured ? '已設為精選' : '已取消精選',
      data: updated,
    };
  }

  // ========================================
  // [管理員] 回復評價
  // ========================================
  async replyReview(reviewId: string, reply: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('評價不存在');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        reply,
        repliedAt: new Date(),
      },
    });

    return {
      success: true,
      message: '回復成功',
      data: updated,
    };
  }

  // ========================================
  // [管理員] 刪除評價
  // ========================================
  async deleteReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('評價不存在');
    }

    await this.prisma.review.delete({ where: { id: reviewId } });

    return {
      success: true,
      message: '評價已刪除',
    };
  }
}
