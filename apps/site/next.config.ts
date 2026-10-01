import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 安全：隐藏 X-Powered-By 头
  poweredByHeader: false,

  // /v1 反代到后端 —— 所有环境生效：
  // - 开发：站点直跑 3001，浏览器请求 /v1 需要代理
  // - Docker 一体化容器：主站 3001 直连访问时（未走容器 nginx），同样需要代理
  // - 云上部署：宿主 nginx 已把 /v1 转发到 3000，请求到不了 Next，此规则不生效
  // 目标可用 API_PROXY_TARGET 覆盖（默认本机后端）
  async rewrites() {
    const target = process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000';
    return [
      {
        source: '/v1/:path*',
        destination: `${target}/v1/:path*`,
      },
    ];
  },

  // 安全响应头
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
