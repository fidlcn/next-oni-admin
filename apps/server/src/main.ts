import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * 应用启动入口
 * 注册全局管道（参数校验）、过滤器（异常处理）、拦截器（响应格式化）
 * 启用 CORS 和接口版本前缀（/v1）
 * CSRF 防护：Double Submit Cookie 模式
 */

// CSRF 实例 —— 在模块外创建，供 controller 引用
const isProduction = process.env.NODE_ENV === 'production';

export const {
  generateCsrfToken, // 生成 CSRF token
  doubleCsrfProtection, // Express 中间件
} = doubleCsrf({
  getSecret: () =>
    process.env.CSRF_SECRET || 'csrf-secret-change-in-production',
  cookieName: 'csrf_token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: isProduction,
    httpOnly: false, // 前端 JS 需要读取此 cookie
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getSessionIdentifier: () => 'session',
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);
  const prefix = configService.get<string>('APP_PREFIX', '/v1');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '');

  // 全局路由前缀，所有接口变成 /v1/xxx
  app.setGlobalPrefix(prefix);

  // Cookie 解析中间件
  app.use(cookieParser());

  // CORS 配置
  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
  });

  // CSRF 防护中间件 —— 在 CORS 之后、管道之前注册
  app.use(doubleCsrfProtection);

  // 全局参数校验管道 —— 配合 class-validator 使用
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剥离未定义的属性
      forbidNonWhitelisted: true, // 存在未定义属性时报错
      transform: true, // 自动转换类型（如字符串转数字）
    }),
  );

  // 全局异常过滤器 + 响应拦截器
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // 静态文件服务：上传的文件通过 /uploads/ 访问
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // Swagger API 文档 —— 仅在非生产环境启用
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Next Oni Admin API')
      .setDescription('后台管理系统接口文档')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document);
    logger.log(`Swagger docs: http://localhost:${port}/api-docs`);
  }

  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}${prefix}`);
}

bootstrap();
