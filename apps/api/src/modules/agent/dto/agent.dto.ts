// ============================================
// Agent DTOs - 代理分銷系統
// ============================================

import { IsString, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyAgentDto {
  @IsString({ message: '請輸入代理名稱' })
  agentName: string;

  @IsOptional()
  @IsString()
  agentCode?: string; // 可選，系統可自動生成
}

export class QueryClientsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class WithdrawDto {
  @IsNumber({}, { message: '請輸入提現金額' })
  @Min(100, { message: '最低提現金額為 100' })
  amount: number;
}

export class SetCommissionRateDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Min(0)
  @Max(0.5)
  rate: number; // 0-50%
}
