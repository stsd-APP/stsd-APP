// ============================================
// Wallet 服務 - 積分錢包系統
// ============================================
// 1積分 = 1元台幣 (可配置)
// 訂單完成後按金額 1% 贈送積分

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PointLogType } from '@prisma/client';

// 系統配置 Key
const CONFIG_POINTS_RATE = 'POINTS_EARN_RATE';       // 積分獲取比例 (默認 0.01 = 1%)
const CONFIG_POINTS_VALUE = 'POINTS_VALUE_TWD';     // 1積分 = X台幣 (默認 1)

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // 獲取用戶積分餘額
  // ========================================
  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    const pointsValue = await this.getPointsValue();

    return {
      success: true,
      data: {
        points: user.points,
        valueTwd: user.points * pointsValue,
        pointsValue,
      },
    };
  }

  // ========================================
  // 獲取積分記錄
  // ========================================
  async getPointLogs(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.pointLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pointLog.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ========================================
  // 訂單完成 - 贈送積分
  // ========================================
  async rewardOrderPoints(userId: string, orderId: string, orderAmountTwd: number) {
    const earnRate = await this.getEarnRate();
    const pointsToAdd = Math.floor(orderAmountTwd * earnRate);

    if (pointsToAdd <= 0) {
      return { success: true, pointsEarned: 0 };
    }

    // 使用事務
    const result = await this.prisma.$transaction(async (tx) => {
      // 更新用戶積分
      const user = await tx.user.update({
        where: { id: userId },
        data: { points: { increment: pointsToAdd } },
      });

      // 記錄積分變動
      await tx.pointLog.create({
        data: {
          userId,
          amount: pointsToAdd,
          type: PointLogType.ORDER_REWARD,
          description: `訂單完成獎勵 (訂單金額 NT$ ${orderAmountTwd})`,
          orderId,
          balanceAfter: user.points,
        },
      });

      // 更新訂單的積分獲得數量
      await tx.proxyOrder.update({
        where: { id: orderId },
        data: { pointsEarned: pointsToAdd },
      });

      return { pointsEarned: pointsToAdd, newBalance: user.points };
    });

    return {
      success: true,
      data: result,
    };
  }

  // ========================================
  // 訂單結算 - 使用積分抵扣
  // ========================================
  async usePoints(userId: string, orderId: string, pointsToUse: number) {
    if (pointsToUse <= 0) {
      return { success: true, pointsUsed: 0, deductedTwd: 0 };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    if (user.points < pointsToUse) {
      throw new BadRequestException(`積分不足，當前餘額: ${user.points}`);
    }

    const pointsValue = await this.getPointsValue();
    const deductedTwd = pointsToUse * pointsValue;

    // 使用事務
    const result = await this.prisma.$transaction(async (tx) => {
      // 扣除用戶積分
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: pointsToUse } },
      });

      // 記錄積分變動
      await tx.pointLog.create({
        data: {
          userId,
          amount: -pointsToUse,
          type: PointLogType.ORDER_DEDUCT,
          description: `訂單抵扣 (抵扣 NT$ ${deductedTwd})`,
          orderId,
          balanceAfter: updatedUser.points,
        },
      });

      // 更新訂單的積分使用數量
      await tx.proxyOrder.update({
        where: { id: orderId },
        data: { pointsUsed: pointsToUse },
      });

      return { pointsUsed: pointsToUse, deductedTwd, newBalance: updatedUser.points };
    });

    return {
      success: true,
      data: result,
    };
  }

  // ========================================
  // 管理員調整積分
  // ========================================
  async adminAdjustPoints(userId: string, amount: number, description: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { points: { increment: amount } },
      });

      await tx.pointLog.create({
        data: {
          userId,
          amount,
          type: PointLogType.ADMIN_ADJUST,
          description: description || (amount > 0 ? '管理員增加積分' : '管理員扣除積分'),
          balanceAfter: user.points,
        },
      });

      return { newBalance: user.points };
    });

    return {
      success: true,
      message: amount > 0 ? '積分已增加' : '積分已扣除',
      data: result,
    };
  }

  // ========================================
  // 計算可抵扣金額
  // ========================================
  async calculateDeduction(userId: string, maxDeductTwd?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    const pointsValue = await this.getPointsValue();
    let maxDeductiblePoints = user.points;
    let maxDeductibleTwd = user.points * pointsValue;

    // 如果有最大抵扣限制
    if (maxDeductTwd !== undefined && maxDeductibleTwd > maxDeductTwd) {
      maxDeductibleTwd = maxDeductTwd;
      maxDeductiblePoints = Math.floor(maxDeductTwd / pointsValue);
    }

    return {
      success: true,
      data: {
        availablePoints: user.points,
        maxDeductiblePoints,
        maxDeductibleTwd,
        pointsValue,
      },
    };
  }

  // ========================================
  // 獲取系統配置
  // ========================================
  private async getEarnRate(): Promise<number> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: CONFIG_POINTS_RATE },
    });
    return config ? parseFloat(config.value) : 0.01; // 默認 1%
  }

  private async getPointsValue(): Promise<number> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: CONFIG_POINTS_VALUE },
    });
    return config ? parseFloat(config.value) : 1; // 默認 1積分 = 1台幣
  }
}
