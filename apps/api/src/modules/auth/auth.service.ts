// ============================================
// Auth 服務 - 用戶認證邏輯 (含推薦綁定)
// ============================================

import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

// 嘗試導入 bcrypt，如果失敗則使用 bcryptjs
let bcrypt: any;
try {
  bcrypt = require('bcrypt');
} catch {
  bcrypt = require('bcryptjs');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ========================================
  // 用戶註冊 (含推薦碼綁定)
  // ========================================
  async register(dto: RegisterDto) {
    try {
      // 檢查郵箱是否已存在
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('此郵箱已被註冊');
      }

      // 處理推薦碼
      let referrerId: string | undefined;
      if (dto.refCode) {
        const agent = await this.prisma.user.findUnique({
          where: { agentCode: dto.refCode.toUpperCase() },
          select: { id: true, isAgent: true },
        });
        
        if (agent?.isAgent) {
          referrerId = agent.id;
        }
      }

      // 加密密碼
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      // 創建用戶
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name || dto.email.split('@')[0],
          referrerId, // 綁定推薦人
        },
      });

      // 生成 JWT
      const token = this.generateToken(user);

      return {
        success: true,
        message: referrerId ? '註冊成功，已綁定推薦人' : '註冊成功',
        data: {
          user: this.sanitizeUser(user),
          token,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException('註冊失敗，請稍後再試');
    }
  }

  // ========================================
  // 用戶登錄
  // ========================================
  async login(dto: LoginDto) {
    try {
      // 查找用戶
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        throw new UnauthorizedException('郵箱或密碼錯誤');
      }

      // 驗證密碼
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('郵箱或密碼錯誤');
      }

      // 生成 JWT
      const token = this.generateToken(user);

      return {
        success: true,
        message: '登錄成功',
        data: {
          user: this.sanitizeUser(user),
          token,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new BadRequestException('登錄失敗，請稍後再試');
    }
  }

  // ========================================
  // 獲取當前用戶信息
  // ========================================
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrer: {
          select: { agentName: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用戶不存在');
    }

    return {
      success: true,
      data: {
        ...this.sanitizeUser(user),
        referrerName: user.referrer?.agentName || null,
      },
    };
  }

  // ========================================
  // 輔助方法
  // ========================================
  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isAgent: user.isAgent,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: any) {
    const { password, referrer, ...result } = user;
    return {
      ...result,
      balance: Number(result.balance),
      commissionBalance: Number(result.commissionBalance || 0),
    };
  }
}
