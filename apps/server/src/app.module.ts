import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { getDatabaseConfig } from './config/database.config';
import { getThrottlerConfig } from './config/app.config';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { MenuModule } from './modules/menu/menu.module';
import { LogModule } from './modules/log/log.module';
import { ContentModule } from './modules/content/content.module';
import { CategoryModule } from './modules/category/category.module';
import { MediaModule } from './modules/media/media.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

/**
 * 应用根模块 —— 组装所有全局能力和业务模块
 * 加载顺序：Config → TypeORM → Throttler → Auth → 业务模块 → 日志
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

    // 接口限流
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

    // 操作日志
    LogModule,

    // CMS 业务模块
    ContentModule,
    CategoryModule,
    MediaModule,
    DashboardModule,
  ],
})
export class AppModule {}
