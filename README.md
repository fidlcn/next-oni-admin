# Next Oni Admin

[中文](#中文文档) | [English](#english-documentation)

---

## 中文文档

基于 TypeScript 的全栈后台管理系统，采用 Monorepo 架构，集成内容管理、权限控制、博客展示等功能。

### ✨ 特性

- 🏗️ **Monorepo 架构** — Turborepo + pnpm workspaces 统一管理
- 🔒 **安全加固** — RSA-2048 密码加密传输 + CSRF 双重提交 Cookie 防护
- 🔐 **JWT 认证** — httpOnly Cookie 存储，Token 自动轮换，防暴力破解锁定
- 📝 **内容管理** — 文章、分类、媒体库的完整 CRUD
- 👥 **RBAC 权限** — 用户 / 角色 / 权限 / 菜单四级管理
- 🌐 **多域名部署** — 主站 + 管理后台独立域名，Nginx 反向代理
- 📊 **操作日志** — 装饰器 + 拦截器自动记录

### 🛠️ 技术栈

| 层级         | 技术                                                |
| ------------ | --------------------------------------------------- |
| **语言**     | TypeScript 5.8                                      |
| **Monorepo** | Turborepo 2.5 + pnpm 10                             |
| **后端**     | NestJS 11 · TypeORM 0.3 · MySQL 8                   |
| **管理前端** | React 18 · Vite 6 · Ant Design 5 · Zustand          |
| **主站**     | Next.js 16 (App Router) · React 19 · Tailwind CSS 4 |
| **认证**     | JWT + Passport · bcryptjs · RSA-2048 · CSRF         |
| **部署**     | PM2 · Nginx · SSL                                   |

### 📁 项目结构

```
next-oni-admin/
├── apps/
│   ├── server/          # NestJS 后端 API（端口 3000）
│   ├── web/             # React 管理后台 SPA（Vite 构建）
│   └── site/            # Next.js 主站 + 博客（端口 3001）
├── packages/
│   ├── constants/       # 共享常量（HTTP 状态码、认证、分页）
│   ├── shared/          # 共享 TypeScript 类型定义
│   └── utils/           # 共享工具函数
├── deploy/              # 部署配置（PM2、Nginx、备份脚本）
│   ├── .env.example     # 环境变量模板
│   ├── ecosystem.config.js  # PM2 配置
│   ├── nginx.conf       # Nginx 多域名配置
│   ├── deploy.sh        # 一键部署脚本
│   └── backup.sh        # MySQL 自动备份
└── turbo.json           # Turborepo 构建配置
```

### 🚀 快速开始

#### 前置条件

- Node.js >= 18
- pnpm >= 10
- MySQL 8

#### 安装

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/next-oni-admin.git
cd next-oni-admin

# 安装依赖
pnpm install

# 复制环境变量
cp deploy/.env.example apps/server/.env.development
# 编辑 .env.development 填入数据库连接信息和 JWT 密钥
```

#### 开发

```bash
# 启动所有应用（并行开发模式）
pnpm dev

# 仅启动后端
pnpm --filter server dev

# 仅启动管理后台
pnpm --filter web dev

# 仅启动主站
pnpm --filter site dev
```

#### 构建

```bash
# 构建所有应用
pnpm build

# 单独构建
pnpm --filter server build
pnpm --filter web build
pnpm --filter site build
```

### 🔒 安全机制

| 机制                      | 说明                                                              |
| ------------------------- | ----------------------------------------------------------------- |
| **RSA 密码加密**          | 2048-bit 非对称加密，前端公钥加密、后端私钥解密，密码不以明文传输 |
| **CSRF 防护**             | Double Submit Cookie 模式，状态变更请求需携带 `X-CSRF-Token` 头   |
| **JWT + httpOnly Cookie** | Token 存储在 httpOnly cookie 中，前端 JS 无法读取，防止 XSS 窃取  |
| **Token 轮换**            | Refresh Token 每次使用后吊销并生成新 Token                        |
| **防暴力破解**            | 5 次登录失败锁定账户 15 分钟 + 接口限流                           |
| **CORS 白名单**           | 仅允许指定域名的跨域请求                                          |

### 📋 环境变量

| 变量                 | 说明                   | 示例                                                |
| -------------------- | ---------------------- | --------------------------------------------------- |
| `DB_HOST`            | MySQL 主机             | `localhost`                                         |
| `DB_PORT`            | MySQL 端口             | `3306`                                              |
| `DB_USERNAME`        | MySQL 用户名           | —                                                   |
| `DB_PASSWORD`        | MySQL 密码             | —                                                   |
| `DB_DATABASE`        | 数据库名               | `next_oni_admin`                                    |
| `APP_PORT`           | API 端口               | `3000`                                              |
| `APP_PREFIX`         | API 前缀               | `/v1`                                               |
| `JWT_SECRET`         | JWT 密钥               | `openssl rand -base64 64`                           |
| `JWT_ACCESS_EXPIRY`  | Access Token 有效期    | `2h`                                                |
| `JWT_REFRESH_EXPIRY` | Refresh Token 有效期   | `7d`                                                |
| `CORS_ORIGIN`        | 允许的域名（逗号分隔） | `https://www.example.com,https://admin.example.com` |
| `CSRF_SECRET`        | CSRF 签名密钥          | `openssl rand -base64 32`                           |

完整模板见 [`deploy/.env.example`](deploy/.env.example)。

### 🚢 生产部署

详见 [`deploy/README.md`](deploy/README.md)。

```bash
# 一键部署
bash deploy/deploy.sh
```

部署架构：

```
浏览器 → Nginx (SSL)
          ├── www.example.com    → Next.js SSR (:3001)
          │   └── /v1/*          → NestJS API (:3000)
          └── admin.example.com  → React SPA (静态文件)
              └── /v1/*          → NestJS API (:3000)
```

### 📄 License

MIT

---

## English Documentation

A full-stack admin management system built with TypeScript, featuring a monorepo architecture with integrated CMS, RBAC, and blog capabilities.

### ✨ Features

- 🏗️ **Monorepo Architecture** — Managed with Turborepo + pnpm workspaces
- 🔒 **Security Hardened** — RSA-2048 password encryption + CSRF double-submit cookie protection
- 🔐 **JWT Authentication** — httpOnly cookie storage, token rotation, brute-force lockout
- 📝 **Content Management** — Full CRUD for articles, categories, and media library
- 👥 **RBAC Permissions** — Four-tier management: Users / Roles / Permissions / Menus
- 🌐 **Multi-domain Deployment** — Separate domains for public site and admin panel with Nginx reverse proxy
- 📊 **Audit Logging** — Automatic operation logging via decorator + interceptor

### 🛠️ Tech Stack

| Layer              | Technology                                          |
| ------------------ | --------------------------------------------------- |
| **Language**       | TypeScript 5.8                                      |
| **Monorepo**       | Turborepo 2.5 + pnpm 10                             |
| **Backend**        | NestJS 11 · TypeORM 0.3 · MySQL 8                   |
| **Admin Frontend** | React 18 · Vite 6 · Ant Design 5 · Zustand          |
| **Public Site**    | Next.js 16 (App Router) · React 19 · Tailwind CSS 4 |
| **Auth**           | JWT + Passport · bcryptjs · RSA-2048 · CSRF         |
| **Deployment**     | PM2 · Nginx · SSL                                   |

### 📁 Project Structure

```
next-oni-admin/
├── apps/
│   ├── server/          # NestJS backend API (port 3000)
│   ├── web/             # React admin panel SPA (Vite build)
│   └── site/            # Next.js public site + blog (port 3001)
├── packages/
│   ├── constants/       # Shared constants (HTTP codes, auth, pagination)
│   ├── shared/          # Shared TypeScript type definitions
│   └── utils/           # Shared utility functions
├── deploy/              # Deployment configs (PM2, Nginx, backup scripts)
│   ├── .env.example     # Environment variable template
│   ├── ecosystem.config.js  # PM2 config
│   ├── nginx.conf       # Nginx multi-domain config
│   ├── deploy.sh        # One-click deployment script
│   └── backup.sh        # MySQL auto-backup
└── turbo.json           # Turborepo build config
```

### 🚀 Getting Started

#### Prerequisites

- Node.js >= 18
- pnpm >= 10
- MySQL 8

#### Installation

```bash
# Clone the project
git clone https://github.com/YOUR_USERNAME/next-oni-admin.git
cd next-oni-admin

# Install dependencies
pnpm install

# Set up environment variables
cp deploy/.env.example apps/server/.env.development
# Edit .env.development with your database credentials and JWT secret
```

#### Development

```bash
# Start all apps (parallel dev mode)
pnpm dev

# Start individual apps
pnpm --filter server dev    # Backend API
pnpm --filter web dev       # Admin panel
pnpm --filter site dev      # Public site
```

#### Build

```bash
# Build all apps
pnpm build

# Build individually
pnpm --filter server build
pnpm --filter web build
pnpm --filter site build
```

### 🔒 Security

| Mechanism                   | Description                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **RSA Password Encryption** | 2048-bit asymmetric encryption — frontend encrypts with public key, server decrypts with private key. Passwords never transmitted in plaintext. |
| **CSRF Protection**         | Double Submit Cookie pattern — mutating requests require `X-CSRF-Token` header                                                                  |
| **JWT + httpOnly Cookie**   | Tokens stored in httpOnly cookies, invisible to JavaScript, preventing XSS token theft                                                          |
| **Token Rotation**          | Refresh tokens are revoked after each use and replaced with new ones                                                                            |
| **Brute-Force Protection**  | Account locked for 15 minutes after 5 failed login attempts + API rate limiting                                                                 |
| **CORS Allowlist**          | Only explicitly allowed origins can make cross-origin requests                                                                                  |

### 📋 Environment Variables

| Variable             | Description                       | Example                                             |
| -------------------- | --------------------------------- | --------------------------------------------------- |
| `DB_HOST`            | MySQL host                        | `localhost`                                         |
| `DB_PORT`            | MySQL port                        | `3306`                                              |
| `DB_USERNAME`        | MySQL username                    | —                                                   |
| `DB_PASSWORD`        | MySQL password                    | —                                                   |
| `DB_DATABASE`        | Database name                     | `next_oni_admin`                                    |
| `APP_PORT`           | API port                          | `3000`                                              |
| `APP_PREFIX`         | API prefix                        | `/v1`                                               |
| `JWT_SECRET`         | JWT secret key                    | `openssl rand -base64 64`                           |
| `JWT_ACCESS_EXPIRY`  | Access token lifetime             | `2h`                                                |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime            | `7d`                                                |
| `CORS_ORIGIN`        | Allowed origins (comma-separated) | `https://www.example.com,https://admin.example.com` |
| `CSRF_SECRET`        | CSRF signing secret               | `openssl rand -base64 32`                           |

Full template available at [`deploy/.env.example`](deploy/.env.example).

### 🚢 Production Deployment

See [`deploy/README.md`](deploy/README.md) for the complete guide.

```bash
# One-click deploy
bash deploy/deploy.sh
```

Deployment architecture:

```
Browser → Nginx (SSL)
          ├── www.example.com    → Next.js SSR (:3001)
          │   └── /v1/*          → NestJS API (:3000)
          └── admin.example.com  → React SPA (static files)
              └── /v1/*         → NestJS API (:3000)
```

### 📄 License

MIT
