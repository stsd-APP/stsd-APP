// ============================================
// Agent 服務 - 代理分銷業務邏輯
// ============================================

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyAgentDto, QueryClientsDto, WithdrawDto } from './dto/agent.dto';
import { CommissionType } from '@prisma/client';

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // 申請成為代理
  // ========================================
  async applyAgent(userId: string, dto: ApplyAgentDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用戶不存在');

    if (user.isAgent) {
      throw new BadRequestException('您已經是代理商');
    }

    // 生成唯一推薦碼
    let agentCode = dto.agentCode?.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    if (!agentCode) {
      agentCode = `A${Date.now().toString(36).toUpperCase()}`;
    }

    // 檢查推薦碼是否已存在
    const existing = await this.prisma.user.findUnique({ where: { agentCode } });
    if (existing) {
      throw new BadRequestException('此推薦碼已被使用，請更換');
    }

    // 更新用戶為代理商 (待審核狀態)
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isAgent: true,
        agentCode,
        agentName: dto.agentName,
        agentAppliedAt: new Date(),
        agentApprovedAt: new Date(), // 自動通過，如需審核可設為 null
      },
    });

    return {
      success: true,
      message: '恭喜！您已成為代理商',
      data: {
        agentCode: updated.agentCode,
        agentName: updated.agentName,
        commissionRate: Number(updated.commissionRate) * 100 + '%',
      },
    };
  }

  // ========================================
  // 獲取代理統計數據
  // ========================================
  async getAgentStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAgent: true,
        agentCode: true,
        agentName: true,
        commissionBalance: true,
        commissionRate: true,
        _count: {
          select: { referrals: true },
        },
      },
    });

    if (!user) throw new NotFoundException('用戶不存在');
    if (!user.isAgent) throw new BadRequestException('您不是代理商');

    // 獲取本月和累計佣金
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCommission, monthCommission] = await Promise.all([
      this.prisma.commissionRecord.aggregate({
        where: { agentId: userId, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.commissionRecord.aggregate({
        where: { 
          agentId: userId, 
          amount: { gt: 0 },
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      success: true,
      data: {
        agentCode: user.agentCode,
        agentName: user.agentName,
        commissionRate: Number(user.commissionRate),
        clientCount: user._count.referrals,
        balance: Number(user.commissionBalance),
        totalEarnings: Number(totalCommission._sum.amount || 0),
        monthEarnings: Number(monthCommission._sum.amount || 0),
        promotionLink: `https://3links.tw/register?ref=${user.agentCode}`,
      },
    };
  }

  // ========================================
  // 獲取客戶列表
  // ========================================
  async getClients(userId: string, query: QueryClientsDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAgent) throw new BadRequestException('您不是代理商');

    const [clients, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { referrerId: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: {
            select: { orders: true, packages: true },
          },
          orders: {
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true, twdAmount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where: { referrerId: userId } }),
    ]);

    // 脫敏處理
    const maskedClients = clients.map(c => ({
      id: c.id.slice(-8),
      name: this.maskName(c.name || '用戶'),
      email: this.maskEmail(c.email),
      registeredAt: c.createdAt,
      orderCount: c._count.orders,
      packageCount: c._count.packages,
      lastOrderAt: c.orders[0]?.createdAt || null,
      lastOrderAmount: c.orders[0] ? Number(c.orders[0].twdAmount) : null,
    }));

    return {
      success: true,
      data: {
        clients: maskedClients,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ========================================
  // 獲取佣金記錄
  // ========================================
  async getCommissionRecords(userId: string, query: QueryClientsDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAgent) throw new BadRequestException('您不是代理商');

    const [records, total] = await Promise.all([
      this.prisma.commissionRecord.findMany({
        where: { agentId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.commissionRecord.count({ where: { agentId: userId } }),
    ]);

    return {
      success: true,
      data: {
        records: records.map(r => ({
          ...r,
          amount: Number(r.amount),
          balanceAfter: Number(r.balanceAfter),
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ========================================
  // 處理訂單佣金 (訂單完成時調用)
  // ========================================
  async processOrderCommission(orderId: string) {
    const order = await this.prisma.proxyOrder.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order || order.status !== 'COMPLETED' || order.commissionPaid) {
      return null;
    }

    // 檢查用戶是否有推薦人
    if (!order.user.referrerId) {
      return null;
    }

    // 獲取推薦人 (代理商)
    const agent = await this.prisma.user.findUnique({
      where: { id: order.user.referrerId },
    });

    if (!agent?.isAgent) {
      return null;
    }

    // 計算佣金
    const commissionRate = Number(agent.commissionRate);
    const orderAmount = Number(order.twdAmount);
    const commission = Math.round(orderAmount * commissionRate * 100) / 100;

    if (commission <= 0) {
      return null;
    }

    // 使用事務處理
    const result = await this.prisma.$transaction(async (tx) => {
      // 更新代理商餘額
      const updatedAgent = await tx.user.update({
        where: { id: agent.id },
        data: {
          commissionBalance: { increment: commission },
        },
      });

      // 創建佣金記錄
      const record = await tx.commissionRecord.create({
        data: {
          agentId: agent.id,
          orderId: orderId,
          amount: commission,
          type: CommissionType.ORDER,
          description: `訂單 #${orderId.slice(-8)} 佣金`,
          balanceAfter: Number(updatedAgent.commissionBalance),
        },
      });

      // 標記訂單佣金已結算
      await tx.proxyOrder.update({
        where: { id: orderId },
        data: { commissionPaid: true },
      });

      return { commission, record };
    });

    return result;
  }

  // ========================================
  // 通過推薦碼獲取代理信息
  // ========================================
  async getAgentByCode(code: string) {
    const agent = await this.prisma.user.findUnique({
      where: { agentCode: code.toUpperCase() },
      select: {
        id: true,
        agentName: true,
        isAgent: true,
      },
    });

    if (!agent || !agent.isAgent) {
      return { success: false, message: '推薦碼無效' };
    }

    return {
      success: true,
      data: {
        agentId: agent.id,
        agentName: agent.agentName,
      },
    };
  }

  // ========================================
  // 輔助方法：姓名脫敏
  // ========================================
  private maskName(name: string): string {
    if (name.length <= 1) return name + '**';
    return name[0] + '*'.repeat(name.length - 1);
  }

  // ========================================
  // 輔助方法：郵箱脫敏
  // ========================================
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return local[0] + '***@' + domain;
    return local.slice(0, 2) + '***@' + domain;
  }
}
