import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PagegenRecord } from '../../entities/pagegen-record.entity';
import { AuthModule } from '../auth/auth.module';
import { PagegenService } from './pagegen.service';
import { PagegenController } from './pagegen.controller';
import { GlmService } from './services/glm.service';
import { SanitizeService } from './services/sanitize.service';

/**
 * 托管页生成模块 —— H5 表单提交 → GLM 生成单文件 HTML → 消毒落盘 pages/
 * 公开目录 / 管理端「托管页管理」共用本模块
 */
@Module({
  imports: [TypeOrmModule.forFeature([PagegenRecord]), AuthModule],
  controllers: [PagegenController],
  providers: [PagegenService, GlmService, SanitizeService],
  exports: [PagegenService],
})
export class PagegenModule {}
