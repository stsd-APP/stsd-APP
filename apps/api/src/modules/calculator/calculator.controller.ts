// ============================================
// Calculator 控制器 - 運費計算 API
// ============================================

import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { CalculatorService } from './calculator.service';
import { CalculateQuoteDto } from './dto/calculator.dto';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';

@Controller('calculator')
export class CalculatorController {
  constructor(private calculatorService: CalculatorService) {}

  // POST /api/calculator/quote - 運費試算
  @Post('quote')
  async calculateQuote(@Body() dto: CalculateQuoteDto) {
    return this.calculatorService.calculateQuote(dto);
  }

  // GET /api/calculator/rules - 獲取物流規則
  @Get('rules')
  async getLogisticsRules() {
    return this.calculatorService.getLogisticsRules();
  }

  // PUT /api/calculator/rules/:id - 更新物流規則 (Admin)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('rules/:id')
  async updateRule(@Param('id') id: string, @Body() data: any) {
    return this.calculatorService.updateLogisticsRule(id, data);
  }
}
