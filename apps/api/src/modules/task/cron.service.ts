// ============================================
// 定時任務服務 - Cron Service
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  // ========================================
  // 每天凌晨 02:00 - 更新匯率
  // ========================================
  @Cron('0 2 * * *', { name: 'exchangeRateUpdate' })
  async handleExchangeRateUpdate() {
    this.logger.log('[定時任務] 開始更新匯率...');

    try {
      // TODO: 實際生產環境從外部 API 獲取匯率
      // 例如: https://api.exchangerate-api.com/v4/latest/CNY
      
      // 模擬獲取匯率 (TWD/RMB)
      const mockRate = 4.45 + (Math.random() * 0.1 - 0.05); // 4.40 - 4.50
      const newRate = Math.round(mockRate * 100) / 100;

      // 更新數據庫中的匯率配置
      await this.prisma.systemConfig.upsert({
        where: { key: 'exchange_rate' },
        update: { 
          value: newRate.toString(),
          updatedAt: new Date(),
        },
        create: {
          key: 'exchange_rate',
          value: newRate.toString(),
          description: '人民幣兌台幣匯率',
        },
      });

      this.logger.log(`[定時任務] 匯率已更新: ${newRate}`);
    } catch (error) {
      this.logger.error(`[定時任務] 匯率更新失敗: ${error.message}`);
    }
  }

  // ========================================
  // 每小時 - 清理超時訂單
  // ========================================
  @Cron(CronExpression.EVERY_HOUR, { name: 'cleanupPendingOrders' })
  async cleanupPendingOrders() {
    this.logger.log('[定時任務] 檢查超時待處理訂單...');

    try {
      // 48 小時前
      const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000);

      // 查找超時的 PENDING 訂單
      const overdueOrders = await this.prisma.proxyOrder.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: cutoffTime },
        },
        select: { id: true, userId: true },
      });

      if (overdueOrders.length === 0) {
        this.logger.log('[定時任務] 無超時訂單');
        return;
      }

      // 批量更新為 REJECTED (取消)
      const result = await this.prisma.proxyOrder.updateMany({
        where: {
          id: { in: overdueOrders.map(o => o.id) },
        },
        data: {
          status: 'REJECTED',
          logs: JSON.stringify([{
            time: new Date().toISOString(),
            action: '系統自動取消 (超時48小時未處理)',
            by: 'SYSTEM',
          }]),
        },
      });

      this.logger.log(`[定時任務] 已取消 ${result.count} 筆超時訂單`);
    } catch (error) {
      this.logger.error(`[定時任務] 清理訂單失敗: ${error.message}`);
    }
  }

  // ========================================
  // 每天 03:00 - 清理過期預報包裹
  // ========================================
  @Cron('0 3 * * *', { name: 'cleanupPredictedPackages' })
  async cleanupPredictedPackages() {
    this.logger.log('[定時任務] 檢查超時預報包裹...');

    try {
      // 30 天前
      const cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // 查找超過 30 天未入庫的預報包裹
      const overduePackages = await this.prisma.package.findMany({
        where: {
          status: 'PREDICTED',
          createdAt: { lt: cutoffTime },
        },
        select: { id: true, trackingNumber: true },
      });

      if (overduePackages.length === 0) {
        this.logger.log('[定時任務] 無超時預報包裹');
        return;
      }

      // 刪除超時預報
      const result = await this.prisma.package.deleteMany({
        where: {
          id: { in: overduePackages.map(p => p.id) },
        },
      });

      this.logger.log(`[定時任務] 已清理 ${result.count} 筆超時預報`);
    } catch (error) {
      this.logger.error(`[定時任務] 清理預報失敗: ${error.message}`);
    }
  }

  // ========================================
  // 每天 04:00 - 生成每日統計報表
  // ========================================
  @Cron('0 4 * * *', { name: 'generateDailyReport' })
  async generateDailyReport() {
    this.logger.log('[定時任務] 生成每日統計...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 統計昨日數據
      const [orderCount, orderAmount, packageCount, newUsers] = await Promise.all([
        // 訂單數
        this.prisma.proxyOrder.count({
          where: {
            createdAt: { gte: yesterday, lt: today },
          },
        }),
        // 訂單金額
        this.prisma.proxyOrder.aggregate({
          where: {
            createdAt: { gte: yesterday, lt: today },
            status: { in: ['PAID', 'COMPLETED'] },
          },
          _sum: { twdAmount: true },
        }),
        // 入庫包裹數
        this.prisma.package.count({
          where: {
            inboundAt: { gte: yesterday, lt: today },
          },
        }),
        // 新增用戶數
        this.prisma.user.count({
          where: {
            createdAt: { gte: yesterday, lt: today },
          },
        }),
      ]);

      const report = {
        date: yesterday.toISOString().split('T')[0],
        orderCount,
        orderAmount: Number(orderAmount._sum.twdAmount || 0),
        packageCount,
        newUsers,
      };

      // 存儲報表 (可存到 SystemConfig 或專門的報表表)
      await this.prisma.systemConfig.upsert({
        where: { key: `daily_report_${report.date}` },
        update: { value: JSON.stringify(report) },
        create: {
          key: `daily_report_${report.date}`,
          value: JSON.stringify(report),
          description: `每日統計 ${report.date}`,
        },
      });

      this.logger.log(`[定時任務] 每日統計完成: ${JSON.stringify(report)}`);
    } catch (error) {
      this.logger.error(`[定時任務] 統計生成失敗: ${error.message}`);
    }
  }

  // ========================================
  // 手動觸發任務
  // ========================================
  async triggerJob(jobName: string) {
    const job = this.schedulerRegistry.getCronJob(jobName);
    if (job) {
      this.logger.log(`[手動觸發] ${jobName}`);
      job.fireOnTick();
      return true;
    }
    return false;
  }

  // ========================================
  // 獲取所有任務狀態
  // ========================================
  getJobsStatus() {
    const jobs = this.schedulerRegistry.getCronJobs();
    const status: Record<string, { running: boolean; lastDate: Date | null; nextDate: Date | null }> = {};

    jobs.forEach((job, name) => {
      status[name] = {
        running: (job as any).running ?? false,
        lastDate: job.lastDate(),
        nextDate: job.nextDate().toJSDate(),
      };
    });

    return status;
  }
}
