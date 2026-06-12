import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';

import DefaultLayout from '@/layouts/DefaultLayout';
import AdminLayout from '@/layouts/AdminLayout';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UserPage from '@/pages/User';
import RolePage from '@/pages/Role';
import MenuPage from '@/pages/Menu';
import ContentPage from '@/pages/Content';
import CategoryPage from '@/pages/Category';
import MediaPage from '@/pages/Media';
import SettingsPage from '@/pages/Settings';

const routeConfig = [
  {
    path: '/',
    element: <DefaultLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },
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
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'contents', element: <ContentPage /> },
      { path: 'categories', element: <CategoryPage /> },
      { path: 'media', element: <MediaPage /> },
      { path: 'users', element: <UserPage /> },
      { path: 'roles', element: <RolePage /> },
      { path: 'menus', element: <MenuPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const router: any = createBrowserRouter(routeConfig);
