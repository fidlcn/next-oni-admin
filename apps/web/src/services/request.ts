import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { message } from 'antd';
import { getCsrfToken } from '@/utils/token';

/**
 * Axios 请求封装 —— 统一处理 CSRF 防护、401 刷新、错误提示
 * Access Token 和 Refresh Token 均通过 httpOnly cookie 自动携带
 * CSRF Token 通过非 httpOnly cookie 读取，附加到请求头
 */

// 扩展 axios 配置：skipAuthRedirect 标记"静默"请求（如启动时的 profile 探测），
// 401 时不尝试刷新、也不把匿名访客踢去 /login
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

const request = axios.create({
  baseURL: '/v1',
  timeout: 15000,
  withCredentials: true, // 自动携带 httpOnly cookie（Access Token + Refresh Token）
});

// 请求拦截器：为状态变更请求附加 CSRF Token
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase();
    // 只对状态变更请求（POST / PUT / DELETE / PATCH）附加 CSRF Token
    if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers.set('X-CSRF-Token', csrfToken);
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  (response) => {
    const { data } = response;

    // 后端统一响应格式 { code, message, data }
    if (data.code === 0 || data.code === 200) {
      return data.data !== undefined ? data.data : data;
    }

    // 业务错误
    message.error(data.message || '请求失败');
    return Promise.reject(new Error(data.message));
  },
  async (error: AxiosError<any>) => {
    const status = error.response?.status;

    if (status === 401) {
      // 静默请求（启动时的登录态探测）直接失败，不刷新、不跳转
      if (error.config?.skipAuthRedirect) {
        return Promise.reject(error);
      }

      // Access Token 过期，尝试刷新（Refresh Token 在 cookie 中自动携带）
      try {
        // 刷新请求需要携带 CSRF Token
        const csrfToken = getCsrfToken();
        const headers: Record<string, string> = {};
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }

        const refreshConfig: AxiosRequestConfig = {
          withCredentials: true,
          headers,
          skipAuthRedirect: true, // 刷新自身失败时不要递归重试
        };
        await axios.post('/v1/auth/refresh', null, refreshConfig);

        // 刷新成功，重试原请求（新 Access Token 已通过 Set-Cookie 写入）
        return request(error.config!);
      } catch {
        // 刷新也失败，跳登录页（避免在 /login 页无限循环）
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    if (status === 403) {
      // CSRF 校验失败：csrf cookie 是会话级的，浏览器重启后丢失（refresh cookie 还在）。
      // 自动补拉一次 csrf-token 并重试原请求，避免用户被迫回登录页
      const errorMsg = error.response?.data?.message;
      if (errorMsg?.includes('CSRF') || errorMsg?.includes('csrf')) {
        if (!(error.config as any)?.__csrfRetried) {
          try {
            await axios.get('/v1/auth/csrf-token', { withCredentials: true });
            const newCsrf = getCsrfToken();
            if (newCsrf && error.config) {
              (error.config as any).__csrfRetried = true;
              error.config.headers = error.config.headers || {};
              error.config.headers.set?.('X-CSRF-Token', newCsrf);
              return request(error.config);
            }
          } catch {
            // 补拉失败走统一提示
          }
        }
        message.error('安全验证失败，请刷新页面重试');
      } else {
        message.error('权限不足');
      }
    } else if (status === 404) {
      message.error('请求的资源不存在');
    } else if (status === 429) {
      message.error('请求过于频繁，请稍后再试');
    } else {
      const msg = error.response?.data?.message || '网络错误，请稍后重试';
      message.error(msg);
    }

    return Promise.reject(error);
  },
);

export default request;
