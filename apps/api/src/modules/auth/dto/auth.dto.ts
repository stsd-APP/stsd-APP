// ============================================
// Auth DTOs - 認證數據傳輸對象
// ============================================

import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '請輸入有效的郵箱地址' })
  email: string;

  @IsString({ message: '密碼必須是字符串' })
  @MinLength(6, { message: '密碼至少需要 6 個字符' })
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  // 推薦碼 (代理分銷系統)
  @IsOptional()
  @IsString()
  refCode?: string;
}

export class LoginDto {
  @IsEmail({}, { message: '請輸入有效的郵箱地址' })
  email: string;

  @IsString({ message: '請輸入密碼' })
  password: string;
}
