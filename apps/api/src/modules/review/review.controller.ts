// ============================================
// Review 控制器 - 買家評價 API
// ============================================

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';

@Controller('reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  // ========================================
  // 公開 API
  // ========================================

  // GET /api/reviews/featured - 獲取首頁精選評價
  @Get('featured')
  async getFeaturedReviews(@Query('limit') limit?: string) {
    return this.reviewService.getFeaturedReviews(limit ? parseInt(limit) : 10);
  }

  // ========================================
  // 用戶 API (需登錄)
  // ========================================

  // POST /api/reviews - 提交評價
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Req() req: any,
    @Body() body: {
      orderId: string;
      rating: number;
      content?: string;
      images?: string[];
      productName?: string;
      isAnonymous?: boolean;
    },
  ) {
    return this.reviewService.createReview(req.user.id, body);
  }

  // GET /api/reviews/my - 獲取我的評價列表
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyReviews(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.getMyReviews(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  // GET /api/reviews/check/:orderId - 檢查訂單是否可評價
  @Get('check/:orderId')
  @UseGuards(JwtAuthGuard)
  async checkReviewable(@Req() req: any, @Param('orderId') orderId: string) {
    return this.reviewService.checkReviewable(req.user.id, orderId);
  }

  // ========================================
  // 管理員 API
  // ========================================

  // GET /api/reviews/admin/all - 獲取所有評價
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('rating') rating?: string,
  ) {
    return this.reviewService.getAllReviews({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
      rating: rating ? parseInt(rating) : undefined,
    });
  }

  // PATCH /api/reviews/admin/:id/feature - 切換精選狀態
  @Patch('admin/:id/feature')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async toggleFeatured(@Param('id') id: string) {
    return this.reviewService.toggleFeatured(id);
  }

  // PATCH /api/reviews/admin/:id/reply - 回復評價
  @Patch('admin/:id/reply')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async replyReview(@Param('id') id: string, @Body() body: { reply: string }) {
    return this.reviewService.replyReview(id, body.reply);
  }

  // DELETE /api/reviews/admin/:id - 刪除評價
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteReview(@Param('id') id: string) {
    return this.reviewService.deleteReview(id);
  }
}
