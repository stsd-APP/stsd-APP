// ============================================
// 管理員模塊 - Admin Module
// ============================================

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { TaskModule } from '../task';

@Module({
  imports: [TaskModule],
  controllers: [AdminController],
})
export class AdminModule {}
