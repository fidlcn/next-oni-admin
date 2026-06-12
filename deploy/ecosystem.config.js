/**
 * PM2 配置 —— 2核2G 云服务器部署
 * 包含两个应用：
 *   1. NestJS API（端口 3000）— 后端接口
 *   2. Next.js Site（端口 3001）— 主站 + 博客 SSR
 * 管理后台（admin.example.com）是静态文件，由 Nginx 直接服务，不需要 PM2 进程
 *
 * ⚠️ 请将 /srv/next-oni-admin 替换为你的实际部署路径
 */
module.exports = {
  apps: [
    {
      name: 'next-oni-admin-api',
      script: 'dist/main.js',
      cwd: '/srv/next-oni-admin/apps/server',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      // 日志配置
      error_file: '/var/log/next-oni-admin/api-error.log',
      out_file: '/var/log/next-oni-admin/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      autorestart: true,
    },
    {
      name: 'next-oni-admin-site',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3001',
      cwd: '/srv/next-oni-admin/apps/site',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 日志配置
      error_file: '/var/log/next-oni-admin/site-error.log',
      out_file: '/var/log/next-oni-admin/site-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_type: 'json',
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      autorestart: true,
    },
  ],
};
