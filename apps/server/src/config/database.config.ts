import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { entities } from '../entities';
import { CreatePagegenRecord20260930000000 } from '../migrations/20260930000000-CreatePagegenRecord';
import { AddPagegenDeviceColumns20261001000000 } from '../migrations/20261001000000-AddPagegenDeviceColumns';

/**
 * 构建数据库连接配置
 * 2核2G 服务器需保守配置连接池大小，避免 MySQL 被压垮
 * synchronize 仅在开发环境启用，生产环境用 migration（启动时自动执行）
 */
export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME', 'root'),
  password: configService.get<string>('DB_PASSWORD', ''),
  database: configService.get<string>('DB_DATABASE', 'next_oni_admin'),
  entities,
  migrations: [
    CreatePagegenRecord20260930000000,
    AddPagegenDeviceColumns20261001000000,
  ],
  // 开发环境自动同步表结构，生产环境启动时跑 migration
  synchronize: configService.get<string>('NODE_ENV') !== 'production',
  migrationsRun: configService.get<string>('NODE_ENV') === 'production',
  // 连接池配置 —— 2G 内存机器不宜开太大
  extra: {
    connectionLimit: 10,
  },
  timezone: '+08:00', // 东八区
  logging: configService.get<string>('NODE_ENV') !== 'production',
});
