// ============================================
// Package 服務 - 包裹管理邏輯
// 含驗貨報告 (QC Report) + 精細化物流軌跡
// ============================================

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePackageDto, UpdatePackageDto, InboundPackageDto, QueryPackagesDto, SubmitQcReportDto } from './dto/package.dto';
import { PackageStatus, LogisticsStatus } from '@prisma/client';

@Injectable()
export class PackageService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // 用戶：預報包裹
  // ========================================
  async createPackage(userId: string, dto: CreatePackageDto) {
    const existing = await this.prisma.package.findUnique({
      where: { trackingNumber: dto.trackingNumber },
    });

    if (existing) {
      if (existing.userId === userId) {
        throw new ConflictException('您已預報過此單號');
      }
      throw new ConflictException('此單號已被其他用戶預報');
    }

    const pkg = await this.prisma.package.create({
      data: {
        userId,
        trackingNumber: dto.trackingNumber,
        logisticsCompany: dto.logisticsCompany,
        description: dto.description,
        remark: dto.remark,
        status: PackageStatus.PREDICTED,
      },
    });

    return {
      success: true,
      message: '包裹預報成功',
      data: pkg,
    };
  }

  // ========================================
  // 用戶：查詢我的包裹
  // ========================================
  async getMyPackages(userId: string, query: QueryPackagesDto) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [packages, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.package.count({ where }),
    ]);

    const stats = await this.prisma.package.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });

    const statusCounts: Record<string, number> = {
      PREDICTED: 0,
      IN_WAREHOUSE: 0,
      PACKED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
    };
    stats.forEach((s) => {
      statusCounts[s.status] = s._count.status;
    });

    return {
      success: true,
      data: {
        packages: packages.map(p => this.formatPackageWithQC(p)),
        stats: statusCounts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ========================================
  // 用戶：獲取單個包裹詳情 (含驗貨報告)
  // ========================================
  async getPackageDetail(userId: string, packageId: string) {
    const pkg = await this.prisma.package.findFirst({
      where: { id: packageId, userId },
    });

    if (!pkg) {
      throw new NotFoundException('貨物不存在');
    }

    return {
      success: true,
      data: this.formatPackageWithQC(pkg),
    };
  }

  // ========================================
  // 管理員：查詢所有包裹
  // ========================================
  async getAllPackages(query: QueryPackagesDto) {
    const { page = 1, limit = 20, status, trackingNumber } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (trackingNumber) {
      where.trackingNumber = { contains: trackingNumber, mode: 'insensitive' };
    }

    const [packages, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.package.count({ where }),
    ]);

    const stats = await this.prisma.package.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const statusCounts: Record<string, number> = {
      PREDICTED: 0,
      IN_WAREHOUSE: 0,
      PACKED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
    };
    stats.forEach((s) => {
      statusCounts[s.status] = s._count.status;
    });

    return {
      success: true,
      data: {
        packages: packages.map(p => this.formatPackageWithQC(p)),
        stats: statusCounts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ========================================
  // 管理員：按單號查詢
  // ========================================
  async findByTrackingNumber(trackingNumber: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { trackingNumber },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
      },
    });

    return {
      success: true,
      data: pkg ? this.formatPackageWithQC(pkg) : null,
    };
  }

  // ========================================
  // 管理員：確認入庫
  // ========================================
  async inboundPackage(packageId: string, dto: InboundPackageDto) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new NotFoundException('包裹不存在');
    }

    const updated = await this.prisma.package.update({
      where: { id: packageId },
      data: {
        weight: dto.weight,
        volume: dto.volume,
        status: PackageStatus.IN_WAREHOUSE,
        inboundAt: new Date(),
        remark: dto.remark || pkg.remark,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return {
      success: true,
      message: '入庫成功',
      data: this.formatPackageWithQC(updated),
    };
  }

  // ========================================
  // 管理員：手動新建包裹並入庫
  // ========================================
  async createAndInbound(userId: string, trackingNumber: string, dto: InboundPackageDto & { description?: string; logisticsCompany?: string }) {
    const existing = await this.prisma.package.findUnique({
      where: { trackingNumber },
    });

    if (existing) {
      throw new ConflictException('此單號已存在');
    }

    const pkg = await this.prisma.package.create({
      data: {
        userId,
        trackingNumber,
        logisticsCompany: dto.logisticsCompany,
        description: dto.description,
        weight: dto.weight,
        volume: dto.volume,
        status: PackageStatus.IN_WAREHOUSE,
        inboundAt: new Date(),
        remark: dto.remark,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return {
      success: true,
      message: '包裹創建並入庫成功',
      data: this.formatPackageWithQC(pkg),
    };
  }

  // ========================================
  // 管理員：更新包裹狀態
  // ========================================
  async updatePackageStatus(packageId: string, status: PackageStatus) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new NotFoundException('包裹不存在');
    }

    const updateData: any = { status };
    if (status === PackageStatus.SHIPPED) {
      updateData.shippedAt = new Date();
    }

    const updated = await this.prisma.package.update({
      where: { id: packageId },
      data: updateData,
    });

    return {
      success: true,
      message: '狀態已更新',
      data: this.formatPackageWithQC(updated),
    };
  }

  // ========================================
  // 管理員：提交驗貨報告 (QC Report)
  // ========================================
  async submitQcReport(packageId: string, dto: SubmitQcReportDto) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!pkg) {
      throw new NotFoundException('包裹不存在');
    }

    // 驗貨通常在入庫後進行
    if (pkg.status === PackageStatus.PREDICTED) {
      throw new BadRequestException('貨物尚未入庫，無法驗貨');
    }

    const updated = await this.prisma.package.update({
      where: { id: packageId },
      data: {
        qcStatus: dto.qcStatus,
        qcImages: dto.qcImages,
        qcNote: dto.qcNote,
        isReinforced: dto.isReinforced ?? false,
        qcAt: new Date(),
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // TODO: 發送推送通知給用戶
    // await this.pushService.sendToUser(pkg.userId, {
    //   title: dto.qcStatus === 'PASSED' ? '驗貨通過' : '發現異常',
    //   body: dto.qcStatus === 'PASSED' 
    //     ? '您的貨物已驗貨通過，準備出庫' 
    //     : '您的貨物發現異常，請查看詳情',
    // });

    return {
      success: true,
      message: dto.qcStatus === 'PASSED' ? '驗貨通過，已記錄' : '已記錄異常，等待處理',
      data: this.formatPackageWithQC(updated),
    };
  }

  // ========================================
  // 管理員：獲取待驗貨列表
  // ========================================
  async getPendingQcPackages(query: QueryPackagesDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // 已入庫但未驗貨的包裹
    const where = {
      status: { in: [PackageStatus.IN_WAREHOUSE, PackageStatus.PACKED] },
      qcStatus: null,
    };

    const [packages, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        orderBy: { inboundAt: 'asc' }, // 先入庫的先驗
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.package.count({ where }),
    ]);

    return {
      success: true,
      data: {
        packages: packages.map(p => this.formatPackageWithQC(p)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ========================================
  // 獲取倉庫地址
  // ========================================
  async getWarehouseAddress() {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { isDefault: true, isActive: true },
    });

    if (!warehouse) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: warehouse,
    };
  }

  // ========================================
  // 格式化包裹數據 (含 QC 報告)
  // ========================================
  private formatPackageWithQC(pkg: any) {
    const base = {
      ...pkg,
      weight: pkg.weight ? Number(pkg.weight) : null,
      volume: pkg.volume ? Number(pkg.volume) : null,
    };

    // 添加驗貨報告格式化信息
    if (pkg.qcStatus) {
      base.qcReport = {
        status: pkg.qcStatus,
        statusText: pkg.qcStatus === 'PASSED' ? '驗貨通過' : '發現異常',
        statusColor: pkg.qcStatus === 'PASSED' ? '#07c160' : '#ee0a24',
        images: pkg.qcImages || [],
        note: pkg.qcNote,
        isReinforced: pkg.isReinforced,
        qcAt: pkg.qcAt,
        message: pkg.qcStatus === 'PASSED'
          ? '商品完好，包裝已加固，準備出庫'
          : '發現瑕疵，正在與廠家協商退換，請等待',
      };
    }

    return base;
  }

  // ========================================
  // 獲取物流軌跡 (精細化時間線)
  // ========================================
  async getLogisticsTimeline(packageId: string, userId?: string) {
    const where: any = { id: packageId };
    if (userId) {
      where.userId = userId;
    }

    const pkg = await this.prisma.package.findFirst({
      where,
      include: {
        container: {
          select: {
            containerNo: true,
            vesselName: true,
            voyageNo: true,
            eta: true,
            etd: true,
            status: true,
          },
        },
        logisticsEvents: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!pkg) {
      throw new NotFoundException('包裹不存在');
    }

    // 物流狀態配置
    const statusConfig: Record<string, { text: string; icon: string; color: string }> = {
      WAREHOUSE_IN: { text: '已入庫', icon: '📦', color: '#07c160' },
      LOADED: { text: '已裝櫃', icon: '🚛', color: '#1989fa' },
      SHIPPED: { text: '已發船', icon: '🚢', color: '#7232dd' },
      ARRIVED_PORT: { text: '已到港', icon: '⚓', color: '#ff976a' },
      CUSTOMS_CLEAR: { text: '清關中', icon: '📋', color: '#ee0a24' },
      DISPATCHING: { text: '派送中', icon: '🚚', color: '#1989fa' },
      DELIVERED: { text: '已簽收', icon: '✅', color: '#07c160' },
    };

    // 構建時間線
    const timeline = pkg.logisticsEvents.map(event => ({
      status: event.status,
      ...statusConfig[event.status],
      description: event.description,
      location: event.location,
      time: event.createdAt,
    }));

    // 如果沒有事件但有狀態，創建基礎節點
    if (timeline.length === 0 && pkg.logisticsStatus) {
      timeline.push({
        status: pkg.logisticsStatus,
        ...statusConfig[pkg.logisticsStatus],
        description: null,
        location: null,
        time: pkg.updatedAt,
      });
    }

    // 如果已裝櫃，添加櫃子信息
    let containerInfo: any = null;
    if (pkg.container) {
      containerInfo = {
        containerNo: pkg.container.containerNo,
        vesselName: pkg.container.vesselName,
        voyageNo: pkg.container.voyageNo,
        eta: pkg.container.eta,
        etd: pkg.container.etd,
        status: pkg.container.status,
      };
    }

    return {
      success: true,
      data: {
        package: this.formatPackageWithQC(pkg),
        currentStatus: pkg.logisticsStatus,
        currentStatusText: pkg.logisticsStatus ? statusConfig[pkg.logisticsStatus]?.text : '待入庫',
        timeline,
        containerInfo,
      },
    };
  }

  // ========================================
  // 更新物流狀態 (管理員)
  // ========================================
  async updateLogisticsStatus(packageId: string, status: LogisticsStatus, data?: {
    location?: string;
    description?: string;
  }) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new NotFoundException('包裹不存在');
    }

    // 更新包裹狀態
    await this.prisma.package.update({
      where: { id: packageId },
      data: { logisticsStatus: status },
    });

    // 創建物流事件
    await this.prisma.logisticsEvent.create({
      data: {
        packageId,
        status,
        location: data?.location,
        description: data?.description,
      },
    });

    // 如果是最終狀態，更新包裹主狀態
    if (status === LogisticsStatus.DELIVERED) {
      await this.prisma.package.update({
        where: { id: packageId },
        data: { status: PackageStatus.DELIVERED },
      });
    }

    return {
      success: true,
      message: '物流狀態已更新',
    };
  }
}
