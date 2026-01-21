// ============================================
// 管理員控制器 - 運營功能 API
// ============================================

import { Controller, Get, Post, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard, RolesGuard, Roles } from '../../common/guards';
import { ExcelService } from '../file/excel.service';
import { PdfService, LabelData } from '../file/pdf.service';
import { CronService } from '../task/cron.service';
import { S3Service } from '../storage/s3.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private excelService: ExcelService,
    private pdfService: PdfService,
    private cronService: CronService,
    private s3Service: S3Service,
    private prisma: PrismaService,
  ) {}

  // ========================================
  // 導出訂單 Excel
  // ========================================
  @Get('export/orders')
  async exportOrders(
    @Query('status') status: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    const orders = await this.prisma.proxyOrder.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const exportData = orders.map(order => ({
      id: order.id,
      userName: order.user.name || '未填寫',
      userEmail: order.user.email,
      productName: order.taobaoUrl,
      rmbAmount: Number(order.rmbAmount),
      twdAmount: Number(order.twdAmount),
      status: order.status,
      createdAt: order.createdAt,
    }));

    const buffer = await this.excelService.exportOrders(exportData);

    const filename = `orders_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ========================================
  // 導出包裹 Excel
  // ========================================
  @Get('export/packages')
  async exportPackages(
    @Query('status') status: string,
    @Res() res: Response,
  ) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const packages = await this.prisma.package.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const exportData = packages.map(pkg => ({
      id: pkg.id,
      trackingNumber: pkg.trackingNumber,
      userName: pkg.user.name || pkg.user.email.split('@')[0],
      description: pkg.description ?? undefined,
      weight: pkg.weight ? Number(pkg.weight) : undefined,
      volume: pkg.volume ? Number(pkg.volume) : undefined,
      status: pkg.status,
      createdAt: pkg.createdAt,
    }));

    const buffer = await this.excelService.exportPackages(exportData);

    const filename = `packages_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ========================================
  // 生成包裹標籤 PDF
  // ========================================
  @Get('label/:packageId')
  async generateLabel(
    @Param('packageId') packageId: string,
    @Res() res: Response,
  ) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!pkg) {
      return res.status(404).json({ success: false, message: '包裹不存在' });
    }

    // 獲取倉庫地址作為收件人
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { isDefault: true, isActive: true },
    });

    const labelData: LabelData = {
      memberId: pkg.user.id.slice(-8).toUpperCase(),
      trackingNumber: pkg.trackingNumber,
      recipientName: warehouse?.contactName || '叁通速達',
      recipientPhone: warehouse?.phone || '0800-000-000',
      recipientAddress: warehouse 
        ? `${warehouse.province}${warehouse.city}${warehouse.district}${warehouse.address}`
        : '廣東省廣州市白雲區XX路XX號',
      description: pkg.description ?? undefined,
      weight: pkg.weight ? Number(pkg.weight) : undefined,
      quantity: pkg.quantity,
    };

    const buffer = await this.pdfService.generateLabel(labelData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="label_${pkg.trackingNumber}.pdf"`);
    res.send(buffer);
  }

  // ========================================
  // 獲取定時任務狀態
  // ========================================
  @Get('tasks/status')
  async getTasksStatus() {
    const status = this.cronService.getJobsStatus();
    return {
      success: true,
      data: status,
    };
  }

  // ========================================
  // 手動觸發定時任務
  // ========================================
  @Post('tasks/trigger/:jobName')
  async triggerTask(@Param('jobName') jobName: string) {
    const result = await this.cronService.triggerJob(jobName);
    return {
      success: result,
      message: result ? `任務 ${jobName} 已觸發` : `任務 ${jobName} 不存在`,
    };
  }

  // ========================================
  // 獲取存儲服務狀態
  // ========================================
  @Get('storage/status')
  async getStorageStatus() {
    return {
      success: true,
      data: {
        mode: this.s3Service.isCloudMode() ? 'cloud' : 'local',
        provider: this.s3Service.isCloudMode() ? 'S3/R2' : 'Local Filesystem',
      },
    };
  }

  // ========================================
  // 系統概覽統計
  // ========================================
  @Get('dashboard')
  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalOrders,
      todayOrders,
      pendingOrders,
      totalPackages,
      inWarehousePackages,
      totalAgents,
      todayCommissions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.proxyOrder.count(),
      this.prisma.proxyOrder.count({ where: { createdAt: { gte: today } } }),
      this.prisma.proxyOrder.count({ where: { status: 'PENDING' } }),
      this.prisma.package.count(),
      this.prisma.package.count({ where: { status: 'IN_WAREHOUSE' } }),
      this.prisma.user.count({ where: { isAgent: true } }),
      this.prisma.commissionRecord.aggregate({
        where: { createdAt: { gte: today }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
    ]);

    return {
      success: true,
      data: {
        users: { total: totalUsers },
        orders: { total: totalOrders, today: todayOrders, pending: pendingOrders },
        packages: { total: totalPackages, inWarehouse: inWarehousePackages },
        agents: { total: totalAgents },
        commissions: { today: Number(todayCommissions._sum.amount || 0) },
      },
    };
  }
}
