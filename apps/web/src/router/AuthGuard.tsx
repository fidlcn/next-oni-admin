import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

/**
 * 路由守卫 —— 保护需要登录的管理页面
 * 未登录时重定向到首页（默认公开页面），而不是登录页
 * 因为用户需求是：未登录看到默认页面，点击右上角「登录」才进登录页
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // 记住用户想去的页面，登录后自动跳转
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
