// ============================================
// Rate 模塊 - 匯率管理
// ============================================

import { Module, Global } from '@nestjs/common';
import { RateService } from './rate.service';
import { RateController } from './rate.controller';

@Global()
@Module({
  controllers: [RateController],
  providers: [RateService],
  exports: [RateService],
})
export class RateModule {}
