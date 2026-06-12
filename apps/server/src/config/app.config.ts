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
});
