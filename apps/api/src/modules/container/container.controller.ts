// ============================================
// Container 控制器 - 裝櫃管理 API
// ============================================

import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ContainerService } from './container.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';
import { ContainerStatus } from '@prisma/client';
import { ExcelService } from '../file/excel.service';

@Controller('containers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ContainerController {
  constructor(
    private containerService: ContainerService,
    private excelService: ExcelService,
  ) {}

  // ========================================
  // 集裝箱管理
  // ========================================

  // POST /api/containers - 創建集裝箱
  @Post()
  async createContainer(@Body() body: {
    containerNo: string;
    vesselName?: string;
    voyageNo?: string;
    etd?: string;
    eta?: string;
    remark?: string;
  }) {
    return this.containerService.createContainer({
      containerNo: body.containerNo,
      vesselName: body.vesselName,
      voyageNo: body.voyageNo,
      etd: body.etd ? new Date(body.etd) : undefined,
      eta: body.eta ? new Date(body.eta) : undefined,
      remark: body.remark,
    });
  }

  // GET /api/containers - 獲取集裝箱列表
  @Get()
  async getContainers(
    @Query('status') status?: ContainerStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.containerService.getContainers({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // GET /api/containers/available-packages - 獲取待裝櫃包裹
  @Get('available-packages')
  async getAvailablePackages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.containerService.getAvailablePackages({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  // GET /api/containers/:id - 獲取集裝箱詳情
  @Get(':id')
  async getContainerDetail(@Param('id') id: string) {
    return this.containerService.getContainerDetail(id);
  }

  // POST /api/containers/:id/load - 裝櫃操作
  @Post(':id/load')
  async loadPackages(
    @Param('id') id: string,
    @Body() body: { packageIds: string[] },
  ) {
    return this.containerService.loadPackages(id, body.packageIds);
  }

  // POST /api/containers/:id/seal - 封櫃
  @Post(':id/seal')
  async sealContainer(@Param('id') id: string) {
    return this.containerService.sealContainer(id);
  }

  // PATCH /api/containers/:id/status - 更新狀態
  @Patch(':id/status')
  async updateContainerStatus(
    @Param('id') id: string,
    @Body() body: { status: ContainerStatus; atd?: string; ata?: string },
  ) {
    return this.containerService.updateContainerStatus(id, body.status, {
      atd: body.atd ? new Date(body.atd) : undefined,
      ata: body.ata ? new Date(body.ata) : undefined,
    });
  }

  // GET /api/containers/:id/packing-list - 導出 Packing List
  @Get(':id/packing-list')
  async exportPackingList(@Param('id') id: string, @Res() res: Response) {
    const result = await this.containerService.getPackingListData(id);
    const { container, packingList, totals } = result.data;

    // 轉換 null 為 undefined
    const containerData = {
      containerNo: container.containerNo,
      vesselName: container.vesselName ?? undefined,
      voyageNo: container.voyageNo ?? undefined,
      etd: container.etd ?? undefined,
      eta: container.eta ?? undefined,
    };

    // 生成 Excel
    const buffer = await this.excelService.exportPackingList(containerData, packingList, totals);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=PackingList_${container.containerNo}.xlsx`);
    res.send(buffer);
  }
}
