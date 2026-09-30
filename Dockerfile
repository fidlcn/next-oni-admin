# =====================================================================
# Next Oni Admin — 一体化应用镜像
# 单容器内运行：Nginx（管理后台静态 + API 反代）、NestJS API、Next.js 主站
# 由 supervisord 统一托管，配合 docker-compose.yml 中的 oni-admin-mysql 使用
# =====================================================================

# ---------- 构建阶段：安装依赖并编译三个应用 ----------
FROM node:22-bookworm-slim AS builder

RUN npm install -g pnpm@10.17.1
ENV HUSKY=0
WORKDIR /app

# 先只拷贝清单文件，利用 Docker 层缓存加速重复构建
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/site/package.json apps/site/
COPY packages/constants/package.json packages/constants/
COPY packages/shared/package.json packages/shared/
COPY packages/utils/package.json packages/utils/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter ./apps/server build \
 && pnpm --filter ./apps/web build \
 && pnpm --filter ./apps/site build

# ---------- 运行阶段 ----------
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx supervisor ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app /app

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/supervisord.conf

# 运行时目录：上传文件、RSA 密钥、日志与 nginx pid
RUN mkdir -p /app/apps/server/uploads /app/apps/server/keys \
              /var/log/supervisor /run/nginx \
 && ln -sf /dev/stdout /var/log/nginx/access.log \
 && ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 80 3001

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
