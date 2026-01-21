// ============================================
// Order DTOs
// ============================================

import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class CreateOrderDto {
  @IsString({ message: '請輸入商品連結' })
  taobaoUrl: string;

  @IsNumber({}, { message: '金額必須是數字' })
  @Min(1, { message: '金額不能小於 1' })
  @Max(1000000, { message: '金額不能超過 1,000,000' })
  rmbAmount: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: '無效的訂單狀態' })
  status: OrderStatus;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class QueryOrdersDto {
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
  limit?: number = 10;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
