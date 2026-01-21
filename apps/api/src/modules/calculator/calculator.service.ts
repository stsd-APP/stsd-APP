// ============================================
// Calculator 服務 - 運費計算引擎
// ============================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CalculateQuoteDto } from './dto/calculator.dto';

export interface QuoteResult {
  // 尺寸信息
  length: number;
  width: number;
  height: number;
  weight: number | null;

  // 計算結果
  volumeCbm: number;         // 實際體積 (m³)
  volumetricWeight: number;  // 材積重 (kg) = CBM * 167
  chargeableWeight: number;  // 計費重量

  // 費用
  volumeFee: number;         // 按體積計費
  weightFee: number;         // 按重量計費
  calculatedFee: number;     // 計算運費
  minCharge: number;         // 最低消費
  finalFee: number;          // 最終運費 (TWD)

  // 規則信息
  ruleName: string;
  pricePerCbm: number;
  pricePerKg: number | null;
  estimatedDays: number | null;
  
  // 提示
  note: string;
}

@Injectable()
export class CalculatorService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // 運費試算
  // ========================================
  async calculateQuote(dto: CalculateQuoteDto): Promise<{ success: boolean; data: QuoteResult }> {
    const { length, width, height, weight } = dto;

    // 1. 計算體積 (cm -> m³)
    const volumeCbm = (length * width * height) / 1000000;

    // 2. 計算材積重 (CBM * 167 = kg)
    const volumetricWeight = volumeCbm * 167;

    // 3. 獲取默認物流規則
    const rule = await this.prisma.logisticsRule.findFirst({
      where: { isActive: true, isDefault: true },
    });

    if (!rule) {
      // 使用系統配置的默認值
      const pricePerCbm = await this.getConfigValue('shipping_price_per_cbm', 6000);
      const minCharge = await this.getConfigValue('shipping_min_charge', 800);

      const volumeFee = volumeCbm * pricePerCbm;
      const finalFee = Math.max(volumeFee, minCharge);

      return {
        success: true,
        data: {
          length,
          width,
          height,
          weight: weight || null,
          volumeCbm: this.round(volumeCbm, 4),
          volumetricWeight: this.round(volumetricWeight, 2),
          chargeableWeight: this.round(volumetricWeight, 2),
          volumeFee: this.round(volumeFee),
          weightFee: 0,
          calculatedFee: this.round(volumeFee),
          minCharge,
          finalFee: this.round(finalFee),
          ruleName: '海運家具專線',
          pricePerCbm,
          pricePerKg: null,
          estimatedDays: 10,
          note: '預估運費，實際以出貨時計算為準。運費包含海運費、報關費，不含上樓費用。',
        },
      };
    }

    // 4. 按規則計算
    const pricePerCbm = Number(rule.pricePerCbm);
    const pricePerKg = rule.pricePerKg ? Number(rule.pricePerKg) : null;
    const minCharge = Number(rule.minCharge);

    // 按體積計費
    const volumeFee = volumeCbm * pricePerCbm;

    // 按重量計費 (如果有重量和重量單價)
    let weightFee = 0;
    let chargeableWeight = volumetricWeight;
    
    if (weight && pricePerKg) {
      weightFee = weight * pricePerKg;
      // 取材積重和實際重量中較大者
      chargeableWeight = Math.max(volumetricWeight, weight);
    }

    // 取體積運費和重量運費中較高者
    const calculatedFee = Math.max(volumeFee, weightFee);

    // 應用最低消費
    const finalFee = Math.max(calculatedFee, minCharge);

    return {
      success: true,
      data: {
        length,
        width,
        height,
        weight: weight || null,
        volumeCbm: this.round(volumeCbm, 4),
        volumetricWeight: this.round(volumetricWeight, 2),
        chargeableWeight: this.round(chargeableWeight, 2),
        volumeFee: this.round(volumeFee),
        weightFee: this.round(weightFee),
        calculatedFee: this.round(calculatedFee),
        minCharge,
        finalFee: this.round(finalFee),
        ruleName: rule.name,
        pricePerCbm,
        pricePerKg,
        estimatedDays: rule.estimatedDays,
        note: rule.description || '預估運費，實際以出貨時計算為準。',
      },
    };
  }

  // ========================================
  // 快速計算 (僅返回最終運費)
  // ========================================
  async quickCalculate(length: number, width: number, height: number): Promise<number> {
    const result = await this.calculateQuote({ length, width, height });
    return result.data.finalFee;
  }

  // ========================================
  // 獲取物流規則列表
  // ========================================
  async getLogisticsRules() {
    const rules = await this.prisma.logisticsRule.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' },
    });

    return {
      success: true,
      data: rules.map(r => ({
        ...r,
        pricePerCbm: Number(r.pricePerCbm),
        pricePerKg: r.pricePerKg ? Number(r.pricePerKg) : null,
        minCharge: Number(r.minCharge),
      })),
    };
  }

  // ========================================
  // 更新物流規則
  // ========================================
  async updateLogisticsRule(id: string, data: { pricePerCbm?: number; pricePerKg?: number; minCharge?: number; estimatedDays?: number; description?: string }) {
    const rule = await this.prisma.logisticsRule.update({
      where: { id },
      data,
    });

    return {
      success: true,
      message: '物流規則已更新',
      data: rule,
    };
  }

  // ========================================
  // 輔助方法
  // ========================================
  private round(value: number, decimals = 0): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  private async getConfigValue(key: string, defaultValue: number): Promise<number> {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    return config ? parseFloat(config.value) : defaultValue;
  }
}
