// ============================================
// Excel 服務 - 訂單導出
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface OrderExportData {
  id: string;
  userName: string;
  userEmail: string;
  productName?: string;
  specs?: string;
  rmbAmount: number;
  twdAmount: number;
  status: string;
  createdAt: Date | string;
}

export interface PackageExportData {
  id: string;
  trackingNumber: string;
  userName: string;
  description?: string;
  weight?: number;
  volume?: number;
  status: string;
  createdAt: Date | string;
}

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  // ========================================
  // 導出訂單列表
  // ========================================
  async exportOrders(orders: OrderExportData[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '叁通速達';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('訂單列表', {
      headerFooter: {
        firstHeader: '叁通速達 - 訂單導出',
      },
    });

    // 定義列
    worksheet.columns = [
      { header: '訂單號', key: 'id', width: 15 },
      { header: '用戶名', key: 'userName', width: 15 },
      { header: '郵箱', key: 'userEmail', width: 25 },
      { header: '商品名', key: 'productName', width: 30 },
      { header: '規格', key: 'specs', width: 20 },
      { header: '人民幣金額', key: 'rmbAmount', width: 12 },
      { header: '台幣金額', key: 'twdAmount', width: 12 },
      { header: '狀態', key: 'status', width: 10 },
      { header: '創建時間', key: 'createdAt', width: 20 },
    ];

    // 設置表頭樣式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF333333' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // 狀態映射
    const statusMap: Record<string, string> = {
      PENDING: '待處理',
      PAID: '已付款',
      COMPLETED: '已完成',
      REJECTED: '已駁回',
      CANCELLED: '已取消',
    };

    // 添加數據行
    orders.forEach((order, index) => {
      const row = worksheet.addRow({
        id: `#${order.id.slice(-8)}`,
        userName: order.userName,
        userEmail: order.userEmail,
        productName: order.productName || '-',
        specs: order.specs || '-',
        rmbAmount: order.rmbAmount,
        twdAmount: order.twdAmount,
        status: statusMap[order.status] || order.status,
        createdAt: new Date(order.createdAt).toLocaleString('zh-TW'),
      });

      // 斑馬紋
      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      }

      // 金額格式
      row.getCell('rmbAmount').numFmt = '¥#,##0.00';
      row.getCell('twdAmount').numFmt = 'NT$#,##0.00';
    });

    // 添加邊框
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });
    });

    // 凍結表頭
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // 生成 Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`訂單導出完成: ${orders.length} 條記錄`);
    
    return Buffer.from(buffer);
  }

  // ========================================
  // 導出包裹列表
  // ========================================
  async exportPackages(packages: PackageExportData[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '叁通速達';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('包裹列表');

    worksheet.columns = [
      { header: '包裹ID', key: 'id', width: 12 },
      { header: '快遞單號', key: 'trackingNumber', width: 20 },
      { header: '用戶', key: 'userName', width: 15 },
      { header: '描述', key: 'description', width: 30 },
      { header: '重量(KG)', key: 'weight', width: 12 },
      { header: '體積(m³)', key: 'volume', width: 12 },
      { header: '狀態', key: 'status', width: 12 },
      { header: '創建時間', key: 'createdAt', width: 20 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1989FA' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    const statusMap: Record<string, string> = {
      PREDICTED: '預報中',
      IN_WAREHOUSE: '已入庫',
      PACKED: '已打包',
      SHIPPED: '已發貨',
      DELIVERED: '已簽收',
    };

    packages.forEach((pkg, index) => {
      const row = worksheet.addRow({
        id: `#${pkg.id.slice(-8)}`,
        trackingNumber: pkg.trackingNumber,
        userName: pkg.userName,
        description: pkg.description || '-',
        weight: pkg.weight || 0,
        volume: pkg.volume || 0,
        status: statusMap[pkg.status] || pkg.status,
        createdAt: new Date(pkg.createdAt).toLocaleString('zh-TW'),
      });

      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F9FF' },
        };
      }
    });

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`包裹導出完成: ${packages.length} 條記錄`);
    
    return Buffer.from(buffer);
  }

  // ========================================
  // 導出 Packing List (報關用)
  // ========================================
  async exportPackingList(
    container: {
      containerNo: string;
      vesselName?: string;
      voyageNo?: string;
      etd?: Date;
      eta?: Date;
    },
    packingList: Array<{
      no: number;
      trackingNumber: string;
      description: string;
      quantity: number;
      weight: number;
      volume: number;
      declaredValue: number;
      consignee: string;
    }>,
    totals: {
      totalPieces: number;
      totalQuantity: number;
      totalWeight: number;
      totalVolume: number;
      totalDeclaredValue: number;
    },
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '叁通速達';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Packing List');

    // ============================================
    // 表頭信息
    // ============================================
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'PACKING LIST';
    titleCell.font = { size: 18, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // 集裝箱信息
    worksheet.getCell('A3').value = 'Container No:';
    worksheet.getCell('B3').value = container.containerNo;
    worksheet.getCell('A4').value = 'Vessel/Voyage:';
    worksheet.getCell('B4').value = `${container.vesselName || ''} / ${container.voyageNo || ''}`;
    worksheet.getCell('D3').value = 'ETD:';
    worksheet.getCell('E3').value = container.etd ? new Date(container.etd).toLocaleDateString() : '-';
    worksheet.getCell('D4').value = 'ETA:';
    worksheet.getCell('E4').value = container.eta ? new Date(container.eta).toLocaleDateString() : '-';

    // 樣式
    ['A3', 'A4', 'D3', 'D4'].forEach(cell => {
      worksheet.getCell(cell).font = { bold: true };
    });

    // ============================================
    // 表格標題
    // ============================================
    const headerRowNum = 6;
    const headers = ['No.', 'Tracking No.', 'Description', 'Qty', 'Weight(KG)', 'Volume(CBM)', 'Value(USD)', 'Consignee'];
    const headerRow = worksheet.getRow(headerRowNum);
    
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F5496' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 25;

    // 設置列寬
    worksheet.getColumn(1).width = 6;   // No.
    worksheet.getColumn(2).width = 20;  // Tracking No.
    worksheet.getColumn(3).width = 25;  // Description
    worksheet.getColumn(4).width = 8;   // Qty
    worksheet.getColumn(5).width = 12;  // Weight
    worksheet.getColumn(6).width = 12;  // Volume
    worksheet.getColumn(7).width = 12;  // Value
    worksheet.getColumn(8).width = 20;  // Consignee

    // ============================================
    // 數據行
    // ============================================
    packingList.forEach((item, index) => {
      const row = worksheet.addRow([
        item.no,
        item.trackingNumber,
        item.description,
        item.quantity,
        item.weight,
        item.volume.toFixed(4),
        item.declaredValue,
        item.consignee,
      ]);

      // 斑馬紋
      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }

      // 邊框
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
        cell.alignment = { vertical: 'middle' };
      });

      // 數字居中
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // ============================================
    // 合計行
    // ============================================
    const totalRow = worksheet.addRow([
      '',
      'TOTAL',
      `${totals.totalPieces} Packages`,
      totals.totalQuantity,
      totals.totalWeight.toFixed(2),
      totals.totalVolume.toFixed(4),
      totals.totalDeclaredValue.toFixed(2),
      '',
    ]);

    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' },
    };
    totalRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'medium' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    });

    // 凍結表頭
    worksheet.views = [{ state: 'frozen', ySplit: headerRowNum }];

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Packing List 導出完成: ${container.containerNo}, ${packingList.length} 條記錄`);
    
    return Buffer.from(buffer);
  }
}
