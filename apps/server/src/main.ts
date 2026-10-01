import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import * as dotenv from 'dotenv';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { isSecureCookie } from './config/app.config';
import { assertProductionEnv } from './config/env.validation';

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
  // 开发环境可用兜底值；生产环境由 assertProductionEnv 强制校验真实密钥
  getSecret: () =>
    process.env.CSRF_SECRET || 'csrf-secret-change-in-production',
  cookieName: 'csrf_token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: isSecureCookie(),
    httpOnly: false, // 前端 JS 需要读取此 cookie
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getSessionIdentifier: () => 'session',
  // 跳过认证端点的 CSRF 校验 —— 这些端点在用户尚未持有 CSRF cookie 时就需要工作
  // pagegen/submit 自带口令秘密（请求方必须知道口令才能通过），豁免 CSRF 无放大风险
  skipCsrfProtection: (req) => {
    const path = req.path || req.url;
    return (
      path === '/v1/auth/login' ||
      path === '/v1/auth/refresh' ||
      path === '/v1/auth/register' ||
      path === '/v1/pagegen/submit'
    );
  },
});

async function bootstrap() {
  // 生产密钥校验必须最先执行：配置不对直接终止，避免带病上线。
  // 注意 ConfigModule 要到 NestFactory.create 阶段才加载 env 文件，
  // 这里先手动载入同一份文件（不覆盖已有环境变量），校验才能读到 .env.production 里的密钥
  dotenv.config({
    path: `.env.${process.env.NODE_ENV || 'development'}`,
  });
  assertProductionEnv();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);
  const prefix = configService.get<string>('APP_PREFIX', '/v1');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '');

  // 全局路由前缀，所有接口变成 /v1/xxx
  app.setGlobalPrefix(prefix);

  // 信任一级反代（nginx）：限流/日志才能拿到真实客户端 IP（X-Forwarded-For）
  app.set('trust proxy', 1);

  // Cookie 解析中间件
  app.use(cookieParser());

  // CORS 配置（未配置 CORS_ORIGIN 时不放开跨域）
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

  // 静态文件服务：上传的文件通过 /uploads/ 访问。
  // 上传内容不可信，叠加 nosniff + 沙箱 CSP（即使混入脚本也无法在同源执行/外连）
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('X-Frame-Options', 'DENY');
      res.set(
        'Content-Security-Policy',
        "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
      );
    },
  });

  // Swagger API 文档 —— 仅在非生产环境启用
  if (!isProduction) {
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

  // 优雅停机：SIGTERM 时先断连接池再退出（PM2/Docker 滚动重启必备）
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}${prefix}`);
}

bootstrap();
