#!/bin/bash
# 一键部署脚本 —— 在云服务器上执行
# 用法：bash deploy.sh
#
# 前提：服务器已安装 Node.js 20+, pnpm, PM2, Nginx, MySQL
# 首次部署需先手动配置 .env.production 和 nginx.conf

set -euo pipefail

DEPLOY_DIR="/srv/next-oni-admin"
LOG_DIR="/var/log/next-oni-admin"

echo "=== Next Oni Admin 部署开始 ==="

# 1. 创建必要目录
echo "[1/7] 创建目录..."
mkdir -p "$LOG_DIR"
mkdir -p "$DEPLOY_DIR/apps/server/uploads"

# 2. 拉取最新代码（如果是 git 部署）
if [ -d "$DEPLOY_DIR/.git" ]; then
    echo "[2/7] 拉取最新代码..."
    cd "$DEPLOY_DIR"
    git pull origin master
else
    echo "[2/7] 跳过 git pull（非 git 部署）"
    cd "$DEPLOY_DIR"
fi

# 3. 安装依赖
echo "[3/7] 安装依赖..."
pnpm install --frozen-lockfile

# 4. 构建后端 + 管理后台
echo "[4/7] 构建 API + 管理后台..."
pnpm turbo build

# 5. 构建主站（Next.js）
echo "[5/7] 构建主站..."
cd "$DEPLOY_DIR/apps/site"
pnpm build
cd "$DEPLOY_DIR"

# 6. 重启 PM2（API + Site）
echo "[6/7] 重启服务..."
pm2 delete next-oni-admin-api 2>/dev/null || true
pm2 delete next-oni-admin-site 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save

# 7. 输出状态
echo "[7/7] 部署完成！"
pm2 status

echo ""
echo "=== 常用命令 ==="
echo "  查看日志: pm2 logs"
echo "  重启 API:  pm2 restart next-oni-admin-api"
echo "  重启主站:  pm2 restart next-oni-admin-site"
echo "  查看状态:  pm2 status"
echo ""
echo "=== Nginx 配置 ==="
echo "  如未配置 Nginx，请参考 deploy/nginx.conf"
echo "  sudo cp deploy/nginx.conf /etc/nginx/sites-available/next-oni-admin"
echo "  sudo ln -sf /etc/nginx/sites-available/next-oni-admin /etc/nginx/sites-enabled/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
