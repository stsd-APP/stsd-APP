// ============================================
// PDF 服務 - 熱敏標籤生成
// ============================================

import { Injectable, Logger } from '@nestjs/common';
// @ts-ignore - PDFKit 类型兼容
import PDFDocument from 'pdfkit';

export interface LabelData {
  memberId: string;
  trackingNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  description?: string;
  weight?: number;
  quantity?: number;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  // ========================================
  // 生成熱敏紙標籤 (100mm x 150mm)
  // ========================================
  async generateLabel(data: LabelData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // 100mm x 150mm = 283.46pt x 425.2pt (1mm ≈ 2.8346pt)
        const doc = new PDFDocument({
          size: [283.46, 425.2],
          margins: { top: 10, bottom: 10, left: 10, right: 10 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.logger.log(`標籤生成完成: ${data.trackingNumber}`);
          resolve(buffer);
        });
        doc.on('error', reject);

        // ========================================
        // 標籤內容繪製
        // ========================================

        // 標題區域
        doc
          .fillColor('#333333')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('叁通速達', 10, 15, { align: 'center', width: 263 });

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#666666')
          .text('3LINKS EXPRESS', 10, 32, { align: 'center', width: 263 });

        // 分隔線
        doc
          .moveTo(10, 48)
          .lineTo(273, 48)
          .strokeColor('#cccccc')
          .lineWidth(1)
          .stroke();

        // ========================================
        // 會員ID (巨大顯示)
        // ========================================
        doc
          .fillColor('#C0392B')
          .fontSize(36)
          .font('Helvetica-Bold')
          .text(data.memberId, 10, 58, { align: 'center', width: 263 });

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#999999')
          .text('MEMBER ID', 10, 100, { align: 'center', width: 263 });

        // 分隔線
        doc
          .moveTo(10, 118)
          .lineTo(273, 118)
          .strokeColor('#cccccc')
          .stroke();

        // ========================================
        // 條碼區域 (用文字模擬，實際可用 bwip-js)
        // ========================================
        doc
          .fillColor('#000000')
          .fontSize(16)
          .font('Courier-Bold')
          .text(data.trackingNumber, 10, 128, { align: 'center', width: 263 });

        // 模擬條碼 (實際生產建議使用 bwip-js 生成真實條碼)
        const barcodeY = 150;
        const barcodeHeight = 40;
        const startX = 30;
        const barWidth = 2;

        // 簡易條碼模擬
        for (let i = 0; i < 60; i++) {
          const isBar = Math.random() > 0.4;
          if (isBar) {
            doc
              .rect(startX + i * 3.5, barcodeY, barWidth + (Math.random() > 0.5 ? 1 : 0), barcodeHeight)
              .fill('#000000');
          }
        }

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#666666')
          .text(data.trackingNumber, 10, 195, { align: 'center', width: 263 });

        // 分隔線
        doc
          .moveTo(10, 210)
          .lineTo(273, 210)
          .strokeColor('#cccccc')
          .stroke();

        // ========================================
        // 收件人信息
        // ========================================
        const infoStartY = 220;

        doc
          .fillColor('#333333')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('收件人:', 15, infoStartY);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(data.recipientName, 70, infoStartY);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text('電話:', 15, infoStartY + 20);

        doc
          .fillColor('#333333')
          .text(data.recipientPhone, 70, infoStartY + 20);

        doc
          .fillColor('#666666')
          .text('地址:', 15, infoStartY + 40);

        doc
          .fillColor('#333333')
          .fontSize(9)
          .text(data.recipientAddress, 70, infoStartY + 40, {
            width: 190,
            height: 40,
            lineGap: 2,
          });

        // 分隔線
        doc
          .moveTo(10, 310)
          .lineTo(273, 310)
          .strokeColor('#cccccc')
          .stroke();

        // ========================================
        // 包裹信息
        // ========================================
        const packageY = 320;

        doc
          .fillColor('#666666')
          .fontSize(9)
          .font('Helvetica')
          .text(`描述: ${data.description || '家具'}`, 15, packageY);

        doc.text(`件數: ${data.quantity || 1}`, 15, packageY + 15);
        doc.text(`重量: ${data.weight ? `${data.weight} KG` : '-'}`, 150, packageY + 15);

        // ========================================
        // 底部
        // ========================================
        doc
          .fontSize(7)
          .fillColor('#999999')
          .text('台灣 - 大陸 大件家具跨境物流', 10, 380, { align: 'center', width: 263 });

        doc
          .text(`列印時間: ${new Date().toLocaleString('zh-TW')}`, 10, 395, { align: 'center', width: 263 });

        // 邊框
        doc
          .rect(5, 5, 273.46, 415.2)
          .strokeColor('#000000')
          .lineWidth(2)
          .stroke();

        doc.end();
      } catch (error) {
        this.logger.error(`標籤生成失敗: ${error.message}`);
        reject(error);
      }
    });
  }

  // ========================================
  // 批量生成標籤
  // ========================================
  async generateLabels(dataList: LabelData[]): Promise<Buffer[]> {
    const labels: Buffer[] = [];
    
    for (const data of dataList) {
      const label = await this.generateLabel(data);
      labels.push(label);
    }

    this.logger.log(`批量標籤生成完成: ${labels.length} 張`);
    return labels;
  }
}
