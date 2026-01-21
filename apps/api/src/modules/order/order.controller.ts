// ============================================
// Order 控制器 - 訂單 API
// ============================================

import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';
import { CreateOrderDto, UpdateOrderStatusDto, QueryOrdersDto } from './dto/order.dto';

@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  // ========================================
  // 用戶接口
  // ========================================

  // POST /api/orders - 創建代付訂單
  @UseGuards(JwtAuthGuard)
  @Post()
  async createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(req.user.sub, dto);
  }

  // GET /api/orders/my - 查詢我的訂單
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyOrders(@Request() req: any, @Query() query: QueryOrdersDto) {
    return this.orderService.getMyOrders(req.user.sub, query);
  }

  // GET /api/orders/stats - 獲取用戶統計
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getMyStats(@Request() req: any) {
    return this.orderService.getDashboardStats(req.user.sub);
  }

  // GET /api/orders/:id - 查詢訂單詳情
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrderDetail(@Request() req: any, @Param('id') id: string) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.orderService.getOrderDetail(req.user.sub, id, isAdmin);
  }

  // ========================================
  // 管理員接口
  // ========================================

  // GET /api/orders/admin/all - 管理員查詢所有訂單
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/all')
  async getAllOrders(@Query() query: QueryOrdersDto) {
    return this.orderService.getAllOrders(query);
  }

  // GET /api/orders/admin/stats - 管理員統計
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/stats')
  async getAdminStats() {
    return this.orderService.getDashboardStats();
  }

  // PATCH /api/orders/admin/:id/status - 更新訂單狀態
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/:id/status')
  async updateOrderStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(id, dto, req.user.sub);
  }
}
