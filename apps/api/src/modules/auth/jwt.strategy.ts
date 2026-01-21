// ============================================
// JWT 策略 - Passport 認證
// ============================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || '3links_secret_key_2024',
    });
  }

  async validate(payload: JwtPayload) {
    // 驗證用戶是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('用戶不存在或已被刪除');
    }

    // 返回的對象會被附加到 request.user
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }
}
