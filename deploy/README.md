# Next Oni Admin 部署指南

## 前提条件

| 依赖    | 版本   | 安装                                                                                               |
| ------- | ------ | -------------------------------------------------------------------------------------------------- |
| Node.js | >= 18  | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install -y nodejs` |
| pnpm    | >= 8   | `npm install -g pnpm`                                                                              |
| PM2     | latest | `npm install -g pm2`                                                                               |
| Nginx   | latest | `sudo apt install -y nginx`                                                                        |
| MySQL   | 8.0    | `sudo apt install -y mysql-server`                                                                 |

## 1. 准备数据库

```bash
sudo mysql -u root -p

CREATE DATABASE next_oni_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'next_oni_admin'@'localhost' IDENTIFIED BY 'YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON next_oni_admin.* TO 'next_oni_admin'@'localhost';
FLUSH PRIVILEGES;
```

## 2. 部署代码

```bash
# 方式一：Git 拉取
sudo mkdir -p /srv
sudo chown $USER:$USER /srv
git clone YOUR_REPO_URL /srv/next-oni-admin
cd /srv/next-oni-admin

# 方式二：手动上传
# 将项目文件上传到 /srv/next-oni-admin/

# 安装依赖
pnpm install
```

## 3. 配置环境变量

```bash
cp deploy/.env.example apps/server/.env.production

# 修改以下关键配置：
# - DB_PASSWORD: 数据库密码
# - JWT_SECRET: 随机密钥（openssl rand -base64 64）
# - CORS_ORIGIN: 前端域名
```

## 4. 构建

```bash
pnpm turbo build
```

## 5. 启动服务

```bash
# 创建日志目录
sudo mkdir -p /var/log/next-oni-admin
sudo chown $USER:$USER /var/log/next-oni-admin

# 创建上传目录
mkdir -p apps/server/uploads

# 用 PM2 启动
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup  # 设置开机自启
```

## 6. 配置 Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/next-oni-admin
sudo ln -sf /etc/nginx/sites-available/next-oni-admin /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 修改 server_name 为你的域名或 IP
sudo vi /etc/nginx/sites-available/next-oni-admin

# 测试并重载
sudo nginx -t && sudo systemctl reload nginx
```

## 7. 配置数据库备份（可选）

```bash
# 编辑备份脚本中的数据库密码
vi deploy/backup.sh

# 添加定时任务（每天凌晨 3 点备份）
chmod +x deploy/backup.sh
crontab -e
# 添加：0 3 * * * /srv/next-oni-admin/deploy/backup.sh
```

## 8. 配置日志轮转

```bash
sudo cp deploy/logrotate.conf /etc/logrotate.d/next-oni-admin
```

## 后续更新

```bash
cd /srv/next-oni-admin
bash deploy/deploy.sh
```

## SSL 配置（迁移云服务器后）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
# certbot 会自动修改 Nginx 配置启用 SSL
```

## 常用命令

```bash
pm2 status                     # 查看服务状态
pm2 logs next-oni-admin-server      # 查看实时日志
pm2 restart next-oni-admin-server   # 重启服务
pm2 monit                      # 监控面板
sudo systemctl status nginx    # Nginx 状态
sudo nginx -t                  # 检查 Nginx 配置
```
