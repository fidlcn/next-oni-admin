import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { getCsrfToken } from '@/utils/token';

/**
 * Axios 请求封装 —— 统一处理 CSRF 防护、401 刷新、错误提示
 * Access Token 和 Refresh Token 均通过 httpOnly cookie 自动携带
 * CSRF Token 通过非 httpOnly cookie 读取，附加到请求头
 */

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
      // Access Token 过期，尝试刷新（Refresh Token 在 cookie 中自动携带）
      try {
        // 刷新请求需要携带 CSRF Token
        const csrfToken = getCsrfToken();
        const headers: Record<string, string> = {};
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }

        await axios.post('/v1/auth/refresh', null, {
          withCredentials: true,
          headers,
        });

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
      // CSRF 验证失败时也返回 403，给出更明确的提示
      const errorMsg = error.response?.data?.message;
      if (errorMsg?.includes('CSRF') || errorMsg?.includes('csrf')) {
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
