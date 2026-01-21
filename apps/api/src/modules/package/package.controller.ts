// ============================================
// Package 控制器 - 包裹 API
// 含驗貨報告 + 精細化物流軌跡
// ============================================

import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PackageService } from './package.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';
import { CreatePackageDto, InboundPackageDto, QueryPackagesDto, SubmitQcReportDto } from './dto/package.dto';
import { PackageStatus, LogisticsStatus } from '@prisma/client';

@Controller('packages')
export class PackageController {
  constructor(private packageService: PackageService) {}

  // ========================================
  // 公開接口
  // ========================================

  // GET /api/packages/warehouse - 獲取倉庫地址
  @Get('warehouse')
  async getWarehouse() {
    return this.packageService.getWarehouseAddress();
  }

  // ========================================
  // 用戶接口
  // ========================================

  // POST /api/packages - 預報包裹
  @UseGuards(JwtAuthGuard)
  @Post()
  async createPackage(@Request() req: any, @Body() dto: CreatePackageDto) {
    return this.packageService.createPackage(req.user.sub, dto);
  }

  // GET /api/packages/my - 我的包裹列表
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyPackages(@Request() req: any, @Query() query: QueryPackagesDto) {
    return this.packageService.getMyPackages(req.user.sub, query);
  }

  // GET /api/packages/my/:id - 包裹詳情 (含驗貨報告)
  @UseGuards(JwtAuthGuard)
  @Get('my/:id')
  async getPackageDetail(@Request() req: any, @Param('id') id: string) {
    return this.packageService.getPackageDetail(req.user.sub, id);
  }

  // GET /api/packages/my/:id/tracking - 物流軌跡時間線
  @UseGuards(JwtAuthGuard)
  @Get('my/:id/tracking')
  async getLogisticsTimeline(@Request() req: any, @Param('id') id: string) {
    return this.packageService.getLogisticsTimeline(id, req.user.sub);
  }

  // ========================================
  // 管理員接口
  // ========================================

  // GET /api/packages/admin/all - 所有包裹
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/all')
  async getAllPackages(@Query() query: QueryPackagesDto) {
    return this.packageService.getAllPackages(query);
  }

  // GET /api/packages/admin/pending-qc - 待驗貨列表
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/pending-qc')
  async getPendingQcPackages(@Query() query: QueryPackagesDto) {
    return this.packageService.getPendingQcPackages(query);
  }

  // GET /api/packages/admin/search/:trackingNumber - 按單號查詢
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/search/:trackingNumber')
  async searchByTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.packageService.findByTrackingNumber(trackingNumber);
  }

  // POST /api/packages/admin/:id/inbound - 確認入庫
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/:id/inbound')
  async inboundPackage(@Param('id') id: string, @Body() dto: InboundPackageDto) {
    return this.packageService.inboundPackage(id, dto);
  }

  // POST /api/packages/admin/:id/qc - 提交驗貨報告
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/:id/qc')
  async submitQcReport(@Param('id') id: string, @Body() dto: SubmitQcReportDto) {
    return this.packageService.submitQcReport(id, dto);
  }

  // POST /api/packages/admin/create-inbound - 新建並入庫
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/create-inbound')
  async createAndInbound(
    @Body() body: { userId: string; trackingNumber: string } & InboundPackageDto & { description?: string; logisticsCompany?: string }
  ) {
    const { userId, trackingNumber, ...dto } = body;
    return this.packageService.createAndInbound(userId, trackingNumber, dto);
  }

  // PATCH /api/packages/admin/:id/status - 更新狀態
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/:id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: PackageStatus) {
    return this.packageService.updatePackageStatus(id, status);
  }

  // PATCH /api/packages/admin/:id/logistics-status - 更新物流狀態
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/:id/logistics-status')
  async updateLogisticsStatus(
    @Param('id') id: string,
    @Body() body: { status: LogisticsStatus; location?: string; description?: string }
  ) {
    return this.packageService.updateLogisticsStatus(id, body.status, {
      location: body.location,
      description: body.description,
    });
  }
}
