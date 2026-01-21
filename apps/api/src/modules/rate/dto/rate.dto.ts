// ============================================
// Rate DTOs
// ============================================

import { IsNumber, Min, Max } from 'class-validator';

export class UpdateRateDto {
  @IsNumber({}, { message: '匯率必須是數字' })
  @Min(0.1, { message: '匯率不能小於 0.1' })
  @Max(100, { message: '匯率不能大於 100' })
  rate: number;
}
