import { Injectable } from '@nestjs/common';
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
export class SiteUrlService {
  constructor(private configService: ConfigService) {}

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
