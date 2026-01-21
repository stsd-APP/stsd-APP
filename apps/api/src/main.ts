// ============================================
// 叁通速達 API - 服務入口
// ============================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局路由前綴
  app.setGlobalPrefix('api');

  // 啟用 CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 全局驗證管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // 自動剔除未定義的屬性
      forbidNonWhitelisted: true, // 拒絕包含未定義屬性的請求
      transform: true,            // 自動轉換類型
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局異常過濾器
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║     叁通速達 API 服務已啟動                    ║
║                                                ║
║     地址: http://localhost:${port}              ║
║     API:  http://localhost:${port}/api          ║
║                                                ║
╚════════════════════════════════════════════════╝
  `);
}

bootstrap();
