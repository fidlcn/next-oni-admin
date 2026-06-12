import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, Spin, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import { router } from './router';
import { useAuthStore } from './stores/auth';

/**
 * 应用根组件
 * 启动时初始化认证状态（检查 Token → 拉取用户信息）
 * 全局配置 Ant Design 中文 locale
 */
export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initAuth().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
}
