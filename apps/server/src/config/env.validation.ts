import { Logger } from '@nestjs/common';

/**
 * 生产环境密钥启动校验 —— 防止用开发默认值/弱密钥上线
 * 在 NestFactory.create 之前调用，校验失败直接终止进程（fail fast）
 */

const MIN_SECRET_LENGTH = 32;

const WEAK_DEFAULTS = new Set([
  'dev-secret',
  'csrf-secret-change-in-production',
  'change-me',
]);

function checkSecret(name: string, value: string | undefined): string | null {
  if (!value) {
    return `${name} 未配置`;
  }
  if (WEAK_DEFAULTS.has(value)) {
    return `${name} 使用了开发默认值，必须替换`;
  }
  if (value.length < MIN_SECRET_LENGTH) {
    return `${name} 长度不足 ${MIN_SECRET_LENGTH} 位（当前 ${value.length} 位）`;
  }
  return null;
}

export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const problems: string[] = [];
  const jwt = checkSecret('JWT_SECRET', process.env.JWT_SECRET);
  if (jwt) problems.push(jwt);
  const csrf = checkSecret('CSRF_SECRET', process.env.CSRF_SECRET);
  if (csrf) problems.push(csrf);
  if (!process.env.DB_PASSWORD) {
    problems.push('DB_PASSWORD 未配置');
  }

  if (problems.length > 0) {
    const logger = new Logger('EnvValidation');
    logger.error(
      `生产环境配置校验失败，拒绝启动：\n  - ${problems.join('\n  - ')}\n` +
        '请在应用目录的 .env.production（PM2 cwd = apps/server）中配置强随机密钥' +
        '（openssl rand -hex 32 生成）后重新部署',
    );
    process.exit(1);
  }
}
