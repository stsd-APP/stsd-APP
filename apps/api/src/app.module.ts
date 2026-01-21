// ============================================
// 叁通速達 API - 根模塊
// 運營級後端架構 (含積分錢包 + 裝櫃管理)
// ============================================

import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth';
import { RateModule } from './modules/rate';
import { OrderModule } from './modules/order';
import { PackageModule } from './modules/package';
import { ProductModule } from './modules/product';
import { CalculatorModule } from './modules/calculator';
import { AgentModule } from './modules/agent';
import { AdminModule } from './modules/admin';
// 運營級基礎模塊
import { NotificationModule } from './modules/notification';
import { FileModule } from './modules/file';
import { TaskModule } from './modules/task';
import { StorageModule } from './modules/storage';
// 收官階段模塊
import { WalletModule } from './modules/wallet';
import { ContainerModule } from './modules/container';
import { ReviewModule } from './modules/review';
import { AppController } from './app.controller';

@Module({
  imports: [
    // ============================================
    // 基礎設施層 (Infrastructure)
    // ============================================
    PrismaModule,           // 數據庫 ORM
    StorageModule,          // 雲存儲 (S3/R2)
    NotificationModule,     // 通知服務 (郵件/推送)
    FileModule,             // 文件處理 (Excel/PDF)
    TaskModule,             // 定時任務調度

    // ============================================
    // 業務模塊層 (Business)
    // ============================================
    AuthModule,             // 認證授權
    RateModule,             // 匯率服務
    AgentModule,            // 代理分銷系統
    WalletModule,           // 積分錢包系統
    OrderModule,            // 訂單管理
    PackageModule,          // 包裹物流
    ContainerModule,        // 裝櫃管理
    CalculatorModule,       // 運費計算
    ProductModule,          // 商品管理
    ReviewModule,           // 買家評價系統
    AdminModule,            // 管理後台
  ],
  controllers: [AppController],
})
export class AppModule {}
