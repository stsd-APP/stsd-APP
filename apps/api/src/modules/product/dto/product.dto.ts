// ============================================
// Product DTOs - 商品數據傳輸對象
// Costco 模式：自營物流 + 嚴選商品
// ============================================

import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCategory } from '@prisma/client';

export class CreateProductDto {
  @IsString({ message: '請輸入商品名稱' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber({}, { message: '請輸入價格' })
  @Min(0.01, { message: '價格必須大於 0' })
  price: number; // 人民幣售價

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  // 物流參數
  @IsOptional()
  @IsInt({ message: '長度必須是整數' })
  @Min(1)
  @Max(10000)
  length?: number; // cm

  @IsOptional()
  @IsInt({ message: '寬度必須是整數' })
  @Min(1)
  @Max(10000)
  width?: number; // cm

  @IsOptional()
  @IsInt({ message: '高度必須是整數' })
  @Min(1)
  @Max(10000)
  height?: number; // cm

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number; // kg

  // ============================================
  // Costco 模式定價參數
  // ============================================
  @IsOptional()
  @IsNumber()
  @Min(0)
  costRmb?: number; // 進貨成本 (RMB)

  @IsOptional()
  @IsNumber()
  @Min(0)
  internalShippingCost?: number; // 內部海運成本 (TWD/CBM)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  marginRate?: number; // 期望利潤率 (0-1)

  // 營銷屬性
  @IsOptional()
  @IsBoolean()
  isFreeShipping?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateProductDto extends CreateProductDto {}

export class QueryProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;
}

// ============================================
// 智能定價計算 DTO
// ============================================
export class CalculatePriceDto {
  @IsNumber()
  @Min(0)
  costRmb: number; // 進貨成本 (RMB)

  @IsNumber()
  @Min(1)
  length: number; // cm

  @IsNumber()
  @Min(1)
  width: number; // cm

  @IsNumber()
  @Min(1)
  height: number; // cm

  @IsOptional()
  @IsNumber()
  @Min(0)
  internalShippingCost?: number; // 內部海運成本 (TWD/CBM)，默認 2000

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  marginRate?: number; // 期望利潤率，默認 0.10 (10%)

  @IsOptional()
  @IsNumber()
  exchangeRate?: number; // 匯率，不傳則從系統獲取
}
