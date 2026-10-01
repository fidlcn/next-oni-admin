import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * 限流配置 —— 保护小服务器不被恶意请求打崩
 * 默认每 60 秒内最多 60 次请求（平均 1 次/秒）
 * 2核2G 机器承受能力有限，超过限制直接返回 429
 */
export const getThrottlerConfig = (): ThrottlerModuleOptions => ({
  throttlers: [
    {
      name: 'short',
      ttl: 1000, // 1 秒窗口
      limit: 10, // 最多 10 次
    },
    {
      name: 'medium',
      ttl: 60000, // 60 秒窗口
      limit: 60, // 最多 60 次
    },
  ],
  // 单测/E2E 环境不做限流（jest 会把 NODE_ENV 置为 test）
  skipIf: () => process.env.NODE_ENV === 'test',
});

/**
 * Cookie Secure 策略：默认随 NODE_ENV，可被 COOKIE_SECURE 显式覆盖。
 * 本地 Docker 部署（http://localhost:8080）需要 COOKIE_SECURE=false，
 * 云上 https 部署保持默认即可。
 */
export function isSecureCookie(): boolean {
  const override = process.env.COOKIE_SECURE;
  if (override !== undefined && override !== '') {
    return override === 'true';
  }
  return process.env.NODE_ENV === 'production';
}
