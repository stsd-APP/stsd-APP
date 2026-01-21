// ============================================
// Package DTOs - 包裹數據傳輸對象
// 含驗貨報告 (QC Report) 功能
// ============================================

import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PackageStatus } from '@prisma/client';

export class CreatePackageDto {
  @IsString({ message: '請輸入快遞單號' })
  trackingNumber: string;

  @IsOptional()
  @IsString()
  logisticsCompany?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  logisticsCompany?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volume?: number;

  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class InboundPackageDto {
  @IsNumber({}, { message: '請輸入重量' })
  @Min(0.01, { message: '重量必須大於 0' })
  weight: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volume?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class QueryPackagesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

// ============================================
// 驗貨報告 (QC Report) DTOs
// ============================================

export class SubmitQcReportDto {
  @IsEnum(['PASSED', 'ISSUE_FOUND'], { message: '驗貨狀態必須為 PASSED 或 ISSUE_FOUND' })
  qcStatus: 'PASSED' | 'ISSUE_FOUND';

  @IsArray({ message: '驗貨圖片必須為數組' })
  @IsString({ each: true })
  qcImages: string[];

  @IsOptional()
  @IsString()
  qcNote?: string;

  @IsOptional()
  @IsBoolean()
  isReinforced?: boolean;
}
