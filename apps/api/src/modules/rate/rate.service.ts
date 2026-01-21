// ============================================
// Rate 服務 - 匯率管理邏輯
// ============================================

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RateService {
  // 內存緩存匯率，減少數據庫查詢
  private cachedRate: number | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 60000; // 1 分鐘緩存

  constructor(private prisma: PrismaService) {}

  // ========================================
  // 獲取當前匯率
  // ========================================
  async getCurrentRate(): Promise<number> {
    try {
      // 檢查緩存
      if (this.cachedRate && Date.now() - this.cacheTime < this.CACHE_TTL) {
        return this.cachedRate;
      }

      const config = await this.prisma.systemConfig.findUnique({
        where: { key: 'exchange_rate' },
      });

      if (!config) {
        // 如果沒有配置，返回默認值並創建配置
        await this.prisma.systemConfig.create({
          data: {
            key: 'exchange_rate',
            value: '4.6',
            description: 'RMB 轉 TWD 匯率',
          },
        });
        this.cachedRate = 4.6;
        this.cacheTime = Date.now();
        return 4.6;
      }

      this.cachedRate = parseFloat(config.value);
      this.cacheTime = Date.now();
      return this.cachedRate;
    } catch (error) {
      console.error('獲取匯率失敗:', error);
      return 4.6; // 出錯時返回默認值
    }
  }

  // ========================================
  // 獲取匯率詳情（供 API 使用）
  // ========================================
  async getRateInfo() {
    const rate = await this.getCurrentRate();
    return {
      success: true,
      data: {
        rate,
        currency: {
          from: 'RMB',
          to: 'TWD',
        },
        description: `1 RMB = ${rate} TWD`,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  // ========================================
  // 更新匯率（僅管理員）
  // ========================================
  async updateRate(newRate: number) {
    try {
      if (isNaN(newRate) || newRate <= 0 || newRate > 100) {
        throw new BadRequestException('匯率必須在 0 到 100 之間');
      }

      const config = await this.prisma.systemConfig.upsert({
        where: { key: 'exchange_rate' },
        update: {
          value: newRate.toString(),
          updatedAt: new Date(),
        },
        create: {
          key: 'exchange_rate',
          value: newRate.toString(),
          description: 'RMB 轉 TWD 匯率',
        },
      });

      // 清除緩存
      this.cachedRate = newRate;
      this.cacheTime = Date.now();

      return {
        success: true,
        message: '匯率更新成功',
        data: {
          rate: parseFloat(config.value),
          updatedAt: config.updatedAt,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('更新匯率失敗');
    }
  }

  // ========================================
  // 計算 TWD 金額
  // ========================================
  async calculateTWD(rmbAmount: number): Promise<number> {
    const rate = await this.getCurrentRate();
    return Math.round(rmbAmount * rate * 100) / 100;
  }
}
