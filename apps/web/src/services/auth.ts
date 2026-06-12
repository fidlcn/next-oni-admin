import request from './request';

/**
 * 认证相关 API
 * Token 通过 httpOnly cookie 自动管理，前端不需要手动存取
 */

export interface LoginParams {
  username: string;
  password: string;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  status: number;
  roles: { id: number; name: string; permissions: { code: string }[] }[];
}

/** 登录 — Token 通过 Set-Cookie 自动写入 */
export async function login(params: LoginParams) {
  const data: any = await request.post('/auth/login', params);
  return data.user as UserInfo;
}

/** 注册 */
export async function register(
  params: LoginParams & { email?: string; phone?: string },
) {
  const data: any = await request.post('/auth/register', params);
  return data.user as UserInfo;
}

/** 获取当前用户信息（前端初始化时调用） */
export async function getProfile() {
  return request.get('/auth/profile') as Promise<UserInfo>;
}

/** 登出 — 服务端自动清除 cookie */
export async function logout() {
  await request.post('/auth/logout');
}
