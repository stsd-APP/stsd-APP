// ============================================
// JWT 認證守衛
// ============================================

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // 處理認證錯誤
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('登錄已過期，請重新登錄');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('無效的認證令牌');
      }
      throw new UnauthorizedException('請先登錄');
    }
    return user;
  }
}
