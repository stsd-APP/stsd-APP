// ============================================
// Rate 控制器 - 匯率 API
// ============================================

import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { RateService } from './rate.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';
import { UpdateRateDto } from './dto/rate.dto';

@Controller('rate')
export class RateController {
  constructor(private rateService: RateService) {}

  // GET /api/rate - 獲取當前匯率（公開）
  @Get()
  async getRate() {
    return this.rateService.getRateInfo();
  }

  // POST /api/rate - 更新匯率（僅管理員）
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async updateRate(@Body() dto: UpdateRateDto) {
    return this.rateService.updateRate(dto.rate);
  }

  // GET /api/rate/calculate - 計算 TWD
  @Get('calculate')
  async calculate(@Query('rmb') rmb: string) {
    const rmbAmount = parseFloat(rmb) || 0;
    const twd = await this.rateService.calculateTWD(rmbAmount);
    return {
      success: true,
      data: {
        rmb: rmbAmount,
        twd,
        rate: await this.rateService.getCurrentRate(),
      },
    };
  }
}
