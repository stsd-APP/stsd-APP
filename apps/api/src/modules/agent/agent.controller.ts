// ============================================
// Agent 控制器 - 代理分銷 API
// ============================================

import { Controller, Get, Post, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../../common/guards';
import { ApplyAgentDto, QueryClientsDto } from './dto/agent.dto';

@Controller('agent')
export class AgentController {
  constructor(private agentService: AgentService) {}

  // ========================================
  // 公開接口
  // ========================================

  // GET /api/agent/verify/:code - 驗證推薦碼
  @Get('verify/:code')
  async verifyCode(@Param('code') code: string) {
    return this.agentService.getAgentByCode(code);
  }

  // ========================================
  // 需要登錄的接口
  // ========================================

  // POST /api/agent/apply - 申請成為代理
  @UseGuards(JwtAuthGuard)
  @Post('apply')
  async applyAgent(@Request() req, @Body() dto: ApplyAgentDto) {
    return this.agentService.applyAgent(req.user.id, dto);
  }

  // GET /api/agent/stats - 獲取代理統計
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@Request() req) {
    return this.agentService.getAgentStats(req.user.id);
  }

  // GET /api/agent/clients - 獲取客戶列表
  @UseGuards(JwtAuthGuard)
  @Get('clients')
  async getClients(@Request() req, @Query() query: QueryClientsDto) {
    return this.agentService.getClients(req.user.id, query);
  }

  // GET /api/agent/commissions - 獲取佣金記錄
  @UseGuards(JwtAuthGuard)
  @Get('commissions')
  async getCommissions(@Request() req, @Query() query: QueryClientsDto) {
    return this.agentService.getCommissionRecords(req.user.id, query);
  }
}
