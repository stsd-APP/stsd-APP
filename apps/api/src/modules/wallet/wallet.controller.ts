// ============================================
// Wallet 控制器 - 積分錢包 API
// ============================================

import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  // ========================================
  // 用戶接口
  // ========================================

  // GET /api/wallet/balance - 獲取積分餘額
  @UseGuards(JwtAuthGuard)
  @Get('balance')
  async getBalance(@Request() req: any) {
    return this.walletService.getBalance(req.user.sub);
  }

  // GET /api/wallet/logs - 獲取積分記錄
  @UseGuards(JwtAuthGuard)
  @Get('logs')
  async getPointLogs(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getPointLogs(
      req.user.sub,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // GET /api/wallet/calculate-deduction - 計算可抵扣金額
  @UseGuards(JwtAuthGuard)
  @Get('calculate-deduction')
  async calculateDeduction(
    @Request() req: any,
    @Query('maxDeductTwd') maxDeductTwd?: string,
  ) {
    return this.walletService.calculateDeduction(
      req.user.sub,
      maxDeductTwd ? parseFloat(maxDeductTwd) : undefined,
    );
  }

  // ========================================
  // 管理員接口
  // ========================================

  // POST /api/wallet/admin/adjust - 調整用戶積分
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/adjust')
  async adminAdjustPoints(
    @Body() body: { userId: string; amount: number; description?: string },
  ) {
    return this.walletService.adminAdjustPoints(
      body.userId,
      body.amount,
      body.description || '',
    );
  }
}
