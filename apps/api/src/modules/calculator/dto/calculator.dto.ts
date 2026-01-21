// ============================================
// Calculator DTOs - 運費計算器
// ============================================

import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CalculateQuoteDto {
  @IsNumber({}, { message: '請輸入長度' })
  @Min(1, { message: '長度最小 1cm' })
  @Max(10000, { message: '長度最大 10000cm' })
  length: number; // cm

  @IsNumber({}, { message: '請輸入寬度' })
  @Min(1, { message: '寬度最小 1cm' })
  @Max(10000, { message: '寬度最大 10000cm' })
  width: number; // cm

  @IsNumber({}, { message: '請輸入高度' })
  @Min(1, { message: '高度最小 1cm' })
  @Max(10000, { message: '高度最大 10000cm' })
  height: number; // cm

  @IsOptional()
  @IsNumber({}, { message: '請輸入有效的重量' })
  @Min(0)
  weight?: number; // kg
}
