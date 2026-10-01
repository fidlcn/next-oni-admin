import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { getDatabaseConfig } from './config/database.config';
import { getThrottlerConfig } from './config/app.config';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { MenuModule } from './modules/menu/menu.module';
import { ContentModule } from './modules/content/content.module';
import { CategoryModule } from './modules/category/category.module';
import { MediaModule } from './modules/media/media.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PagegenModule } from './modules/pagegen/pagegen.module';

/**
 * 应用根模块 —— 组装所有全局能力和业务模块
 * 加载顺序：Config → TypeORM → Throttler → Auth → 业务模块
 * Auth 必须在 User/Role/Menu 之前，因为它们依赖 AuthModule 导出的 Guard
 */
@Module({
  imports: [
    // 多环境配置，根据 NODE_ENV 加载对应 .env 文件
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`],
    }),

    // 数据库连接
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    // 接口限流（全局守卫，所有路由默认生效，可用 @Throttle 覆盖/ @SkipThrottle 豁免）
    ThrottlerModule.forRootAsync({
      useFactory: getThrottlerConfig,
    }),

    // 健康检查
    HealthModule,

    // 认证（登录/注册/Token）
    AuthModule,

    // 业务模块
    UserModule,
    RoleModule,
    MenuModule,

    // CMS 业务模块
    ContentModule,
    CategoryModule,
    MediaModule,
    DashboardModule,

    // 托管页生成（H5 表单 → GLM → 静态页）
    PagegenModule,
  ],
  providers: [
    // 全局限流守卫 —— 此前只在 pagegen 局部启用，登录等公开端点实际未受保护
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
