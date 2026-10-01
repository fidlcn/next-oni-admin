/**
 * 站外跳转链接统一处理 —— 管理端所有「跳到主站」的链接（去生成页/邀请短链/
 * 托管页 /p/ 链接）都必须经过这里，页面不得各自维护兜底域名。
 *
 * - 后端 PAGEGEN_PUBLIC_BASE_URL 配了绝对地址（生产）→ 直接使用
 * - 相对路径（本地开发默认 /p）→ 兜底主站 dev 端口 3001
 */
const DEV_SITE_ORIGIN = 'http://localhost:3001';

export function siteUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${DEV_SITE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}
