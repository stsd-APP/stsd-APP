// ============================================
// 當前用戶裝飾器
// ============================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // 如果指定了屬性名，返回該屬性
    if (data) {
      return user?.[data];
    }
    
    return user;
  },
);
