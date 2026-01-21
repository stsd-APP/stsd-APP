// ============================================
// Product 服務 - 大件家具垂直電商
// ============================================
// Costco 模式：自營物流 + 嚴選商品
// 策略：只賺一頭的錢，整合物流成本提供極致性價比

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RateService } from '../rate/rate.service';
import { CalculatorService } from '../calculator/calculator.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto, CalculatePriceDto } from './dto/product.dto';

// ============================================
// Costco 模式默認參數
// ============================================
const DEFAULT_INTERNAL_SHIPPING_COST = 2000; // 內部海運成本 TWD/CBM (比對外報價低)
const DEFAULT_MARGIN_RATE = 0.10; // 默認利潤率 10%

// ============================================
// 家具關聯推薦映射 (垂直化)
// ============================================
const FURNITURE_PAIRINGS: Record<string, string[]> = {
  TABLE: ['CHAIR'],
  CHAIR: ['TABLE'],
  BED: ['CABINET', 'OTHER'],
  SOFA: ['TABLE', 'CABINET'],
  CABINET: ['SOFA', 'BED'],
};

const HIGH_CONVERSION_KEYWORDS = ['沙發', '餐桌', '床', '衣櫃', 'Sofa', 'Table', 'Bed'];

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private rateService: RateService,
    private calculatorService: CalculatorService,
  ) {}

  // ========================================
  // [Admin] 智能定價計算 (Costco 模式核心)
  // ========================================
  async calculateSuggestedPrice(dto: CalculatePriceDto) {
    // 獲取匯率
    const exchangeRate = dto.exchangeRate || (await this.rateService.getCurrentRate());
    const internalShippingCost = dto.internalShippingCost || DEFAULT_INTERNAL_SHIPPING_COST;
    const marginRate = dto.marginRate ?? DEFAULT_MARGIN_RATE;

    // 計算體積 (CBM)
    const volumeCbm = (dto.length * dto.width * dto.height) / 1000000;

    // ============================================
    // Costco 定價公式
    // SuggestedPrice = (進貨成本 * 匯率 + 體積 * 內部運費) * (1 + 利潤率)
    // ============================================
    const costTwd = dto.costRmb * exchangeRate;
    const internalShippingTwd = volumeCbm * internalShippingCost;
    const baseCost = costTwd + internalShippingTwd;
    const suggestedPriceTwd = Math.round(baseCost * (1 + marginRate));

    // 對外運費 (使用公開報價計算)
    const publicQuote = await this.calculatorService.calculateQuote({
      length: dto.length,
      width: dto.width,
      height: dto.height,
    });
    const publicShippingFee = publicQuote.data.finalFee;

    // 計算客戶節省金額
    const marketPrice = costTwd + publicShippingFee;
    const savings = Math.round(marketPrice - suggestedPriceTwd);
    const savingsRate = marketPrice > 0 ? Math.round((savings / marketPrice) * 100) : 0;

    // 轉換回 RMB (用於發布商品)
    const suggestedPriceRmb = Math.round((suggestedPriceTwd / exchangeRate) * 100) / 100;

    return {
      success: true,
      data: {
        // 計算參數
        costRmb: dto.costRmb,
        volumeCbm: Math.round(volumeCbm * 1000) / 1000,
        exchangeRate,
        internalShippingCost,
        marginRate,

        // 成本明細 (TWD)
        costBreakdown: {
          productCostTwd: Math.round(costTwd),
          internalShippingTwd: Math.round(internalShippingTwd),
          baseCost: Math.round(baseCost),
          margin: Math.round(baseCost * marginRate),
        },

        // 建議售價
        suggestedPriceTwd,
        suggestedPriceRmb, // 用於後台發布

        // 市場對比
        comparison: {
          publicShippingFee,
          marketPrice: Math.round(marketPrice),
          ourPrice: suggestedPriceTwd,
          savings,
          savingsRate: `${savingsRate}%`,
        },

        // 文案
        marketingMessage: savings > 0
          ? `比「單獨買+單獨運」便宜 NT$ ${savings.toLocaleString()} (省 ${savingsRate}%)`
          : '極致性價比，自營物流保障',
      },
    };
  }

  // ========================================
  // [Admin] 創建商品 (含 Costco 定價參數)
  // ========================================
  async createProduct(dto: CreateProductDto) {
    let volume: number | undefined;
    if (dto.length && dto.width && dto.height) {
      volume = (dto.length * dto.width * dto.height) / 1000000;
    }

    const product = await this.prisma.product.create({
      data: {
        title: dto.title,
        description: dto.description,
        price: dto.price,
        images: dto.images || [],
        category: dto.category,
        length: dto.length,
        width: dto.width,
        height: dto.height,
        weight: dto.weight,
        volume,
        // Costco 定價參數
        costRmb: dto.costRmb,
        internalShippingCost: dto.internalShippingCost,
        marginRate: dto.marginRate,
        // 營銷屬性
        isFreeShipping: dto.isFreeShipping ?? true,
        stock: dto.stock || 0,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        sortOrder: dto.sortOrder || 0,
      },
    });

    return {
      success: true,
      message: '商品創建成功',
      data: this.formatProduct(product),
    };
  }

  // ========================================
  // [Admin] 更新商品
  // ========================================
  async updateProduct(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('商品不存在');
    }

    const length = dto.length ?? existing.length;
    const width = dto.width ?? existing.width;
    const height = dto.height ?? existing.height;
    let volume = existing.volume ? Number(existing.volume) : undefined;

    if (length && width && height) {
      volume = (length * width * height) / 1000000;
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        volume,
      },
    });

    return {
      success: true,
      message: '商品更新成功',
      data: this.formatProduct(product),
    };
  }

  // ========================================
  // [User] 獲取商品列表 (垂直化推薦)
  // ========================================
  async getProducts(query: QueryProductsDto) {
    const { page = 1, limit = 20, category, keyword, featured } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (featured) where.isFeatured = true;

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [
          { isFeatured: 'desc' },
          { sortOrder: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const rate = await this.rateService.getCurrentRate();
    const formattedProducts = products.map(p => this.formatProductWithTWD(p, rate));

    return {
      success: true,
      data: {
        products: formattedProducts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        exchangeRate: rate,
      },
    };
  }

  // ========================================
  // [User] 獲取商品詳情 (含官方承諾)
  // ========================================
  async getProductDetail(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || !product.isActive) {
      throw new NotFoundException('商品不存在');
    }

    const rate = await this.rateService.getCurrentRate();

    // 計算運費 (僅非包郵商品)
    let shippingFee = 0;
    let shippingInfo: any = null;
    
    if (!product.isFreeShipping && product.length && product.width && product.height) {
      const quoteResult = await this.calculatorService.calculateQuote({
        length: product.length,
        width: product.width,
        height: product.height,
        weight: product.weight ? Number(product.weight) : undefined,
      });
      shippingFee = quoteResult.data.finalFee;
      shippingInfo = quoteResult.data;
    }

    const formattedProduct = this.formatProductWithTWD(product, rate);
    const relatedProducts = await this.getRelatedProducts(product.id, product.category, rate);

    // ============================================
    // 官方承諾 (Costco 模式核心信任建設)
    // ============================================
    const serviceGuarantees = [
      {
        icon: '🛡️',
        title: '自營物流監控',
        desc: '從採購到入戶，全程我們自己人盯，拒絕暴力分揀',
      },
      {
        icon: '💰',
        title: '一口價承諾',
        desc: '所見即所得，絕無到港後的隱形收費',
      },
      {
        icon: '🤝',
        title: '售後兜底',
        desc: '因為是我們自己運的，破損直接賠，不用推卸責任給第三方物流',
      },
    ];

    return {
      success: true,
      data: {
        ...formattedProduct,
        shippingFee,
        shippingInfo,
        totalPriceTWD: formattedProduct.priceTWD + shippingFee,
        // Costco 模式文案
        marketingText: product.isFreeShipping
          ? '🚢 此價格包含海運費與關稅，送貨到府 (不含上樓搬運)'
          : '💰 商品價格未含運費，運費依體積 (CBM) 另計',
        // 官方承諾
        serviceGuarantees,
        // 是否顯示運費計算器 (包郵款隱藏)
        showCalculator: !product.isFreeShipping,
        // 關聯推薦
        relatedProducts,
        pairingTip: this.getPairingTip(product.category),
      },
    };
  }

  // ========================================
  // 獲取關聯推薦 (家具搭配)
  // ========================================
  private async getRelatedProducts(excludeId: string, category: string, rate: number) {
    const pairingCategories = FURNITURE_PAIRINGS[category] || [];
    
    const where: any = {
      isActive: true,
      id: { not: excludeId },
    };

    if (pairingCategories.length > 0) {
      where.category = { in: pairingCategories };
    }

    const relatedProducts = await this.prisma.product.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'desc' }],
      take: 6,
    });

    if (relatedProducts.length < 6) {
      const sameCategory = await this.prisma.product.findMany({
        where: {
          isActive: true,
          id: { not: excludeId, notIn: relatedProducts.map(p => p.id) },
          category: category as any,
        },
        orderBy: [{ isFeatured: 'desc' }],
        take: 6 - relatedProducts.length,
      });
      relatedProducts.push(...sameCategory);
    }

    return relatedProducts.map(p => this.formatProductWithTWD(p, rate));
  }

  // ========================================
  // 獲取搭配建議文案
  // ========================================
  private getPairingTip(category: string): string {
    const tips: Record<string, string> = {
      TABLE: '💡 餐桌配餐椅，打造完美用餐空間',
      CHAIR: '💡 搭配同款餐桌，風格統一更協調',
      BED: '💡 推薦搭配：床頭櫃 + 床墊，一次配齊',
      SOFA: '💡 客廳三件套：沙發 + 茶几 + 電視櫃',
      CABINET: '💡 收納組合：衣櫃 + 斗櫃，空間利用最大化',
    };
    return tips[category] || '💡 多件家具一起買，整屋配送更划算';
  }

  // ========================================
  // [User] 搜索推薦
  // ========================================
  async getSearchSuggestions(keyword: string) {
    if (!keyword || keyword.trim().length === 0) {
      return {
        success: true,
        data: {
          suggestions: HIGH_CONVERSION_KEYWORDS,
          hotKeywords: ['北歐沙發', '實木餐桌', '雙人床', '布藝沙發', '餐椅組合'],
        },
      };
    }

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        title: { contains: keyword, mode: 'insensitive' },
      },
      select: { title: true, category: true },
      take: 10,
    });

    return {
      success: true,
      data: {
        suggestions: [...new Set(products.map(p => p.title))],
        keyword,
      },
    };
  }

  // ========================================
  // [Admin] 獲取所有商品 (後台，含成本信息)
  // ========================================
  async getAllProducts(query: QueryProductsDto) {
    const { page = 1, limit = 20, category, keyword } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category) where.category = category;
    if (keyword) {
      where.OR = [{ title: { contains: keyword, mode: 'insensitive' } }];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const rate = await this.rateService.getCurrentRate();

    // 後台顯示含成本信息
    const formattedProducts = products.map(p => ({
      ...this.formatProduct(p),
      priceTWD: Math.round(Number(p.price) * rate),
      costRmb: p.costRmb ? Number(p.costRmb) : null,
      internalShippingCost: p.internalShippingCost ? Number(p.internalShippingCost) : null,
      marginRate: p.marginRate ? Number(p.marginRate) : null,
    }));

    return {
      success: true,
      data: {
        products: formattedProducts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        exchangeRate: rate,
      },
    };
  }

  // ========================================
  // [Admin] 刪除商品
  // ========================================
  async deleteProduct(id: string) {
    await this.prisma.product.delete({ where: { id } });
    return { success: true, message: '商品已刪除' };
  }

  // ========================================
  // 格式化商品數據
  // ========================================
  private formatProduct(product: any) {
    return {
      ...product,
      price: Number(product.price),
      weight: product.weight ? Number(product.weight) : null,
      volume: product.volume ? Number(product.volume) : null,
    };
  }

  private formatProductWithTWD(product: any, rate: number) {
    const price = Number(product.price);
    const priceTWD = Math.round(price * rate);

    return {
      ...this.formatProduct(product),
      priceTWD,
      exchangeRate: rate,
      shippingTag: product.isFreeShipping ? '🚢 海運包郵' : null,
      volumeText: product.volume ? `${Number(product.volume).toFixed(3)} m³` : null,
    };
  }
}
