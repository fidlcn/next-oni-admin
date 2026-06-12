import { create } from 'zustand';
import {
  getProfile,
  login as loginApi,
  logout as logoutApi,
  UserInfo,
} from '@/services/auth';

/**
 * 认证状态管理 —— Zustand store
 * 应用启动时尝试拉取用户信息（cookie 自动携带）
 * 提供 login / logout / initAuth 三个核心方法
 */

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  loading: boolean;

  /** 登录 */
  login: (username: string, password: string) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 初始化认证状态（App 启动时调用） */
  initAuth: () => Promise<void>;
  /** 设置用户信息 */
  setUser: (user: UserInfo | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  login: async (username, password) => {
    const user = await loginApi({ username, password });
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await logoutApi();
    set({ user: null, isAuthenticated: false });
  },

  initAuth: async () => {
    // 尝试用 cookie 中的 token 获取用户信息
    // 不再检查 localStorage，直接调接口，由 cookie 认证
    try {
      const user = await getProfile();
      set({ user, isAuthenticated: true, loading: false });
    } catch {
      // Token 无效或过期，清除状态
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  setUser: (user) => set({ user }),
}));
