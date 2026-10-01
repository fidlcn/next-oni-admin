import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 站外跳转 URL 的唯一推导入口 —— 所有对外链接（托管页 / 生成页 / 邀请短链）
 * 都从这里出，页面与服务不得各自拼接域名。
 *
 * 唯一权威配置：PAGEGEN_PUBLIC_BASE_URL（主站托管页基地址）
 * - 生产必须配绝对地址（如 https://www.fidlcn.site/p）：
 *   管理端与主站跨域部署，绝对地址才能正确跳转、可被直接复制外发
 * - 本地开发保持默认 /p（相对路径），由前端 siteUrl() 统一兜底 dev origin
 */
@Injectable()
export class SiteUrlService implements OnModuleInit {
  private readonly logger = new Logger(SiteUrlService.name);

  constructor(private configService: ConfigService) {}

  /** 启动自检：生产模式下配了相对地址就大声报警（此时管理端链接会退化成 localhost） */
  onModuleInit(): void {
    const base =
      this.configService.get<string>('PAGEGEN_PUBLIC_BASE_URL', '/p') || '/p';
    if (process.env.NODE_ENV === 'production' && !/^https?:\/\//i.test(base)) {
      this.logger.warn(
        `PAGEGEN_PUBLIC_BASE_URL 当前为 "${base}"（非绝对地址）：托管页/生成页/邀请短链只能是相对路径，` +
          '管理端会兜底显示为 localhost 开发地址。云上部署请在 apps/server/.env.production ' +
          '配置 PAGEGEN_PUBLIC_BASE_URL=https://<主站域名>/p 并重启 PM2。' +
          '（本地 Docker 一体化部署使用 /p 默认值属正常，可忽略本告警）',
      );
    }
  }

  /** 主站 origin：剥掉尾斜杠与 /p 路径段 */
  origin(): string {
    const base =
      this.configService.get<string>('PAGEGEN_PUBLIC_BASE_URL', '/p') || '/p';
    return base.replace(/\/+$/, '').replace(/\/p$/, '');
  }

  /** 托管页访问地址（nginx /p/ 静态托管，带 CSP） */
  pageUrl(pageId: string): string {
    return `${this.origin()}/p/${pageId}.html`;
  }

  /** 生成页地址（/gen，管理员自用入口；对外发放走邀请短链） */
  genUrl(): string {
    return `${this.origin()}/gen`;
  }

  /** 口令专属邀请短链（/g/{code}，打开即口令生效，不暴露 /gen） */
  inviteUrl(code: string): string {
    return `${this.origin()}/g/${code}`;
  }
}
