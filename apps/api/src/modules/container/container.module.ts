// ============================================
// Container Module - 裝櫃管理模組
// ============================================

import { Module } from '@nestjs/common';
import { ContainerService } from './container.service';
import { ContainerController } from './container.controller';
import { FileModule } from '../file/file.module';

@Module({
  imports: [FileModule],
  controllers: [ContainerController],
  providers: [ContainerService],
  exports: [ContainerService],
})
export class ContainerModule {}
