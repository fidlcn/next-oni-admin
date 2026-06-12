/**
 * Token 管理工具
 * Access Token 和 Refresh Token 均由服务端通过 httpOnly cookie 管理
 * 前端 JS 无法读取这些 cookie，防止 XSS 窃取
 *
 * CSRF Token 存储在非 httpOnly cookie 中，前端可读取并附加到请求头
 */

/** 获取 Access Token（已废弃，Token 在 httpOnly cookie 中） */
export const getAccessToken = (): string | null => {
  return null;
};

/** 存储 Access Token（已废弃，由服务端 Set-Cookie 管理） */
export const setAccessToken = (_token: string): void => {
  // no-op: Token 由 httpOnly cookie 管理
};

/** 清除 Access Token（已废弃，由服务端 clearCookie 管理） */
export const removeAccessToken = (): void => {
  // no-op: Token 由 httpOnly cookie 管理
};

/**
 * 从 cookie 中读取 CSRF Token
 * CSRF token 由服务端通过非 httpOnly cookie 下发
 * 前端需要在每次状态变更请求中将其放入 X-CSRF-Token 请求头
 */
export function getCsrfToken(): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}
