// ============================================
// Container 服務 - 裝櫃管理系統
// ============================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContainerStatus, LogisticsStatus, PackageStatus } from '@prisma/client';

@Injectable()
export class ContainerService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // 創建集裝箱
  // ========================================
  async createContainer(data: {
    containerNo: string;
    vesselName?: string;
    voyageNo?: string;
    etd?: Date;
    eta?: Date;
    remark?: string;
  }) {
    // 檢查櫃號是否已存在
    const existing = await this.prisma.container.findUnique({
      where: { containerNo: data.containerNo },
    });

    if (existing) {
      throw new BadRequestException('櫃號已存在');
    }

    const container = await this.prisma.container.create({
      data: {
        containerNo: data.containerNo,
        vesselName: data.vesselName,
        voyageNo: data.voyageNo,
        etd: data.etd,
        eta: data.eta,
        remark: data.remark,
        status: ContainerStatus.LOADING,
      },
    });

    return {
      success: true,
      message: '集裝箱創建成功',
      data: container,
    };
  }

  // ========================================
  // 獲取集裝箱列表
  // ========================================
  async getContainers(query: { status?: ContainerStatus; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [containers, total] = await Promise.all([
      this.prisma.container.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { packages: true } },
        },
      }),
      this.prisma.container.count({ where }),
    ]);

    return {
      success: true,
      data: {
        containers: containers.map(c => ({
          ...c,
          totalWeight: c.totalWeight ? Number(c.totalWeight) : 0,
          totalVolume: c.totalVolume ? Number(c.totalVolume) : 0,
          packageCount: c._count.packages,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ========================================
  // 獲取集裝箱詳情
  // ========================================
  async getContainerDetail(containerId: string) {
    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
      include: {
        packages: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!container) {
      throw new NotFoundException('集裝箱不存在');
    }

    return {
      success: true,
      data: {
        ...container,
        totalWeight: container.totalWeight ? Number(container.totalWeight) : 0,
        totalVolume: container.totalVolume ? Number(container.totalVolume) : 0,
        packages: container.packages.map(p => ({
          ...p,
          weight: p.weight ? Number(p.weight) : 0,
          volume: p.volume ? Number(p.volume) : 0,
          declaredValue: p.declaredValue ? Number(p.declaredValue) : 0,
        })),
      },
    };
  }

  // ========================================
  // 獲取待裝櫃包裹 (已入庫/待發貨)
  // ========================================
  async getAvailablePackages(query: { page?: number; limit?: number }) {
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    // 已入庫但未裝櫃的包裹
    const where = {
      status: { in: [PackageStatus.IN_WAREHOUSE, PackageStatus.PACKED] },
      containerId: null,
    };

    const [packages, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        orderBy: { inboundAt: 'asc' },
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
        packages: packages.map(p => ({
          ...p,
          weight: p.weight ? Number(p.weight) : 0,
          volume: p.volume ? Number(p.volume) : 0,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // ========================================
  // 裝櫃操作 - 將包裹移入集裝箱
  // ========================================
  async loadPackages(containerId: string, packageIds: string[]) {
    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
    });

    if (!container) {
      throw new NotFoundException('集裝箱不存在');
    }

    if (container.status !== ContainerStatus.LOADING) {
      throw new BadRequestException('集裝箱已封櫃，無法繼續裝貨');
    }

    // 獲取要裝入的包裹
    const packages = await this.prisma.package.findMany({
      where: {
        id: { in: packageIds },
        containerId: null,
      },
    });

    if (packages.length === 0) {
      throw new BadRequestException('沒有可裝入的包裹');
    }

    // 計算總重量和體積
    let addWeight = 0;
    let addVolume = 0;
    packages.forEach(p => {
      addWeight += p.weight ? Number(p.weight) : 0;
      addVolume += p.volume ? Number(p.volume) : 0;
    });

    // 使用事務
    await this.prisma.$transaction(async (tx) => {
      // 更新包裹
      await tx.package.updateMany({
        where: { id: { in: packageIds } },
        data: {
          containerId,
          logisticsStatus: LogisticsStatus.LOADED,
        },
      });

      // 為每個包裹創建物流事件
      for (const pkg of packages) {
        await tx.logisticsEvent.create({
          data: {
            packageId: pkg.id,
            status: LogisticsStatus.LOADED,
            description: `已裝入集裝箱 ${container.containerNo}`,
          },
        });
      }

      // 更新集裝箱統計
      await tx.container.update({
        where: { id: containerId },
        data: {
          totalWeight: { increment: addWeight },
          totalVolume: { increment: addVolume },
          totalPieces: { increment: packages.length },
        },
      });
    });

    return {
      success: true,
      message: `已將 ${packages.length} 個包裹裝入櫃子`,
      data: { loadedCount: packages.length },
    };
  }

  // ========================================
  // 封櫃
  // ========================================
  async sealContainer(containerId: string) {
    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
      include: { _count: { select: { packages: true } } },
    });

    if (!container) {
      throw new NotFoundException('集裝箱不存在');
    }

    if (container._count.packages === 0) {
      throw new BadRequestException('集裝箱內沒有包裹，無法封櫃');
    }

    await this.prisma.container.update({
      where: { id: containerId },
      data: { status: ContainerStatus.SEALED },
    });

    return {
      success: true,
      message: '集裝箱已封櫃',
    };
  }

  // ========================================
  // 更新集裝箱狀態
  // ========================================
  async updateContainerStatus(containerId: string, status: ContainerStatus, data?: {
    atd?: Date;
    ata?: Date;
  }) {
    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
    });

    if (!container) {
      throw new NotFoundException('集裝箱不存在');
    }

    // 更新集裝箱
    await this.prisma.container.update({
      where: { id: containerId },
      data: {
        status,
        atd: data?.atd,
        ata: data?.ata,
      },
    });

    // 根據狀態更新包裹的物流狀態
    const logisticsStatusMap: Record<ContainerStatus, LogisticsStatus> = {
      LOADING: LogisticsStatus.LOADED,
      SEALED: LogisticsStatus.LOADED,
      SHIPPED: LogisticsStatus.SHIPPED,
      ARRIVED: LogisticsStatus.ARRIVED_PORT,
      CLEARED: LogisticsStatus.CUSTOMS_CLEAR,
      COMPLETED: LogisticsStatus.DISPATCHING,
    };

    const newLogisticsStatus = logisticsStatusMap[status];
    if (newLogisticsStatus) {
      // 批量更新包裹狀態
      await this.prisma.package.updateMany({
        where: { containerId },
        data: { logisticsStatus: newLogisticsStatus },
      });

      // 批量創建物流事件
      const packages = await this.prisma.package.findMany({
        where: { containerId },
        select: { id: true },
      });

      const statusDescMap: Record<ContainerStatus, string> = {
        LOADING: '裝櫃中',
        SEALED: '已封櫃',
        SHIPPED: `已發船 - ${container.vesselName || ''} ${container.voyageNo || ''}`,
        ARRIVED: '已到港',
        CLEARED: '清關中',
        COMPLETED: '已完成清關，準備派送',
      };

      for (const pkg of packages) {
        await this.prisma.logisticsEvent.create({
          data: {
            packageId: pkg.id,
            status: newLogisticsStatus,
            description: statusDescMap[status],
          },
        });
      }
    }

    return {
      success: true,
      message: '狀態已更新',
    };
  }

  // ========================================
  // 導出 Packing List (返回數據供 Excel 生成)
  // ========================================
  async getPackingListData(containerId: string) {
    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
      include: {
        packages: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!container) {
      throw new NotFoundException('集裝箱不存在');
    }

    // 整理報關數據
    const packingList = container.packages.map((pkg, index) => ({
      no: index + 1,
      trackingNumber: pkg.trackingNumber,
      description: pkg.description || 'Furniture',
      quantity: pkg.quantity,
      weight: pkg.weight ? Number(pkg.weight) : 0,
      volume: pkg.volume ? Number(pkg.volume) : 0,
      declaredValue: pkg.declaredValue ? Number(pkg.declaredValue) : 0,
      consignee: pkg.user?.name || pkg.user?.email?.split('@')[0] || 'N/A',
    }));

    const totals = {
      totalPieces: packingList.length,
      totalQuantity: packingList.reduce((sum, item) => sum + item.quantity, 0),
      totalWeight: packingList.reduce((sum, item) => sum + item.weight, 0),
      totalVolume: packingList.reduce((sum, item) => sum + item.volume, 0),
      totalDeclaredValue: packingList.reduce((sum, item) => sum + item.declaredValue, 0),
    };

    return {
      success: true,
      data: {
        container: {
          containerNo: container.containerNo,
          vesselName: container.vesselName,
          voyageNo: container.voyageNo,
          etd: container.etd,
          eta: container.eta,
        },
        packingList,
        totals,
      },
    };
  }
}
