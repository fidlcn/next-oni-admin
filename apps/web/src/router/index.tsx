import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';

import { AuthGuard } from './AuthGuard';

import DefaultLayout from '@/layouts/DefaultLayout';
import AdminLayout from '@/layouts/AdminLayout';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';

// 管理端页面懒加载：Landing/Login 保持同步（首屏），其余按需分包，
// 首屏 bundle 从 ~1.4MB 显著收窄
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const UserPage = lazy(() => import('@/pages/User'));
const RolePage = lazy(() => import('@/pages/Role'));
const MenuPage = lazy(() => import('@/pages/Menu'));
const ContentPage = lazy(() => import('@/pages/Content'));
const CategoryPage = lazy(() => import('@/pages/Category'));
const MediaPage = lazy(() => import('@/pages/Media'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const HostedPages = lazy(() => import('@/pages/HostedPages'));
const HostedPagesOverview = lazy(() => import('@/pages/HostedPagesOverview'));
const AccessTokens = lazy(() => import('@/pages/AccessTokens'));
const AccessTokenCreate = lazy(() => import('@/pages/AccessTokenCreate'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function LazyFallback() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 320,
      }}
    >
      <Spin size="large" />
    </div>
  );
}

function lazyEl(node: React.ReactNode) {
  return <Suspense fallback={<LazyFallback />}>{node}</Suspense>;
}

const routeConfig = [
  {
    path: '/',
    element: <DefaultLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },
      { path: '*', element: lazyEl(<NotFound />) },
    ],
  },
  {
    path: '/admin',
    element: (
      <AuthGuard>
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: lazyEl(<Dashboard />) },
      { path: 'contents', element: lazyEl(<ContentPage />) },
      { path: 'categories', element: lazyEl(<CategoryPage />) },
      { path: 'media', element: lazyEl(<MediaPage />) },
      { path: 'hosted-pages', element: lazyEl(<HostedPages />) },
      {
        path: 'hosted-pages/overview',
        element: lazyEl(<HostedPagesOverview />),
      },
      { path: 'access-tokens', element: lazyEl(<AccessTokens />) },
      {
        path: 'access-tokens/create',
        element: lazyEl(<AccessTokenCreate />),
      },
      { path: 'users', element: lazyEl(<UserPage />) },
      { path: 'roles', element: lazyEl(<RolePage />) },
      { path: 'menus', element: lazyEl(<MenuPage />) },
      { path: 'settings', element: lazyEl(<SettingsPage />) },
      { path: '*', element: lazyEl(<NotFound />) },
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const router: any = createBrowserRouter(routeConfig);
