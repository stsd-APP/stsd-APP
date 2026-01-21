// ============================================
// Order 服務 - 訂單業務邏輯 (含佣金計算)
// ============================================

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RateService } from '../rate/rate.service';
import { AgentService } from '../agent/agent.service';
import { CreateOrderDto, UpdateOrderStatusDto, QueryOrdersDto } from './dto/order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private rateService: RateService,
    private agentService: AgentService,
  ) {}

  // ========================================
  // 用戶：創建代付訂單
  // ========================================
  async createOrder(userId: string, dto: CreateOrderDto) {
    try {
      const currentRate = await this.rateService.getCurrentRate();
      const twdAmount = Math.round(dto.rmbAmount * currentRate * 100) / 100;

      const order = await this.prisma.proxyOrder.create({
        data: {
          userId,
          taobaoUrl: dto.taobaoUrl,
          rmbAmount: dto.rmbAmount,
          exchangeRate: currentRate,
          twdAmount,
          status: OrderStatus.PENDING,
          remark: dto.remark,
          logs: JSON.stringify([
            { time: new Date().toISOString(), action: '訂單創建', by: 'user' },
          ]),
        },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      });

      return {
        success: true,
        message: '代付申請已提交',
        data: order,
      };
    } catch (error) {
      console.error('創建訂單失敗:', error);
      throw new BadRequestException('創建訂單失敗，請稍後再試');
    }
  }

  // ========================================
  // 用戶：查詢我的訂單列表
  // ========================================
  async getMyOrders(userId: string, query: QueryOrdersDto) {
    try {
      const { page = 1, limit = 10, status } = query;
      const skip = (page - 1) * limit;

      const where: any = { userId };
      if (status) where.status = status;

      const [orders, total] = await Promise.all([
        this.prisma.proxyOrder.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.proxyOrder.count({ where }),
      ]);

      return {
        success: true,
        data: {
          orders,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      };
    } catch (error) {
      console.error('查詢訂單失敗:', error);
      throw new BadRequestException('查詢訂單失敗');
    }
  }

  // ========================================
  // 用戶：查詢單個訂單詳情
  // ========================================
  async getOrderDetail(userId: string, orderId: string, isAdmin: boolean = false) {
    const order = await this.prisma.proxyOrder.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!order) throw new NotFoundException('訂單不存在');
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException('無權查看此訂單');
    }

    return { success: true, data: order };
  }

  // ========================================
  // 管理員：查詢所有訂單
  // ========================================
  async getAllOrders(query: QueryOrdersDto) {
    try {
      const { page = 1, limit = 10, status } = query;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;

      const [orders, total] = await Promise.all([
        this.prisma.proxyOrder.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: { user: { select: { id: true, email: true, name: true } } },
        }),
        this.prisma.proxyOrder.count({ where }),
      ]);

      const stats = await this.prisma.proxyOrder.groupBy({
        by: ['status'],
        _count: { status: true },
      });

      const statusCounts: Record<string, number> = {
        PENDING: 0, PAID: 0, COMPLETED: 0, REJECTED: 0,
      };
      stats.forEach(s => { statusCounts[s.status] = s._count.status; });

      return {
        success: true,
        data: {
          orders,
          stats: statusCounts,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      };
    } catch (error) {
      console.error('查詢訂單失敗:', error);
      throw new BadRequestException('查詢訂單失敗');
    }
  }

  // ========================================
  // 管理員：更新訂單狀態 (含佣金計算)
  // ========================================
  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto, adminId: string) {
    try {
      const order = await this.prisma.proxyOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('訂單不存在');

      let logs: any[] = [];
      try { logs = order.logs ? JSON.parse(order.logs as string) : []; } catch { logs = []; }

      logs.push({
        time: new Date().toISOString(),
        action: `狀態變更: ${order.status} -> ${dto.status}`,
        by: adminId,
        remark: dto.remark,
      });

      const updatedOrder = await this.prisma.proxyOrder.update({
        where: { id: orderId },
        data: {
          status: dto.status,
          logs: JSON.stringify(logs),
        },
        include: { user: { select: { id: true, email: true, name: true } } },
      });

      // ============================================
      // 佣金計算：訂單完成時處理
      // ============================================
      if (dto.status === OrderStatus.COMPLETED) {
        try {
          const commissionResult = await this.agentService.processOrderCommission(orderId);
          if (commissionResult) {
            console.log(`[佣金] 訂單 ${orderId} 佣金已結算: ${commissionResult.commission}`);
          }
        } catch (error) {
          console.error('[佣金] 計算失敗:', error);
          // 佣金計算失敗不影響訂單狀態更新
        }
      }

      return {
        success: true,
        message: '訂單狀態已更新',
        data: updatedOrder,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('更新訂單狀態失敗:', error);
      throw new BadRequestException('更新訂單狀態失敗');
    }
  }

  // ========================================
  // 統計儀表板數據
  // ========================================
  async getDashboardStats(userId?: string) {
    try {
      const where = userId ? { userId } : {};

      const [totalOrders, pendingOrders, totalAmount] = await Promise.all([
        this.prisma.proxyOrder.count({ where }),
        this.prisma.proxyOrder.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.proxyOrder.aggregate({
          where: { ...where, status: { in: ['PAID', 'COMPLETED'] } },
          _sum: { twdAmount: true },
        }),
      ]);

      return {
        success: true,
        data: {
          totalOrders,
          pendingOrders,
          totalAmount: totalAmount._sum.twdAmount || 0,
        },
      };
    } catch (error) {
      console.error('獲取統計失敗:', error);
      return {
        success: true,
        data: { totalOrders: 0, pendingOrders: 0, totalAmount: 0 },
      };
    }
  }
}
