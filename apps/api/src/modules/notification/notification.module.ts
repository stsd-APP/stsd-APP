// ============================================
// 通知模塊 - Notification Module
// ============================================

import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { PushService } from './push.service';

@Global()
@Module({
  providers: [EmailService, PushService],
  exports: [EmailService, PushService],
})
export class NotificationModule {}
