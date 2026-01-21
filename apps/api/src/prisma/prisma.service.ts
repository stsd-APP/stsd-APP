// ============================================
// Prisma 服務 - 數據庫連接
// ============================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('[Prisma] 數據庫連接成功');
    } catch (error) {
      console.error('[Prisma] 數據庫連接失敗:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('[Prisma] 數據庫連接已關閉');
  }

  // 清理方法（用於測試）
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('不能在生產環境清理數據庫');
    }
    
    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$')
    );
    
    return Promise.all(
      models.map((model) => (this as any)[model]?.deleteMany?.())
    );
  }
}
