import { Layout, Button, Dropdown } from 'antd';
import { LogoutOutlined, UserOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

const { Header, Content, Footer } = Layout;

/**
 * 默认布局 —— 未登录用户看到的公开页面
 * 右上角显示「更多 → 登录」入口
 * 已登录用户右上角显示头像 + 下拉菜单（个人信息 / 退出）
 */
export default function DefaultLayout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // 已登录用户右上角下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/admin/dashboard'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
        }}
      >
        <div
          style={{ fontSize: 18, fontWeight: 600, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          Next Oni Admin
        </div>

        {isAuthenticated ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />}>
              {user?.username}
            </Button>
          </Dropdown>
        ) : (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'login',
                  icon: <LoginOutlined />,
                  label: '登录',
                  onClick: () => navigate('/login'),
                },
              ],
            }}
          >
            <Button type="text">更多</Button>
          </Dropdown>
        )}
      </Header>

      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        <Outlet />
      </Content>

      <Footer style={{ textAlign: 'center', color: '#999' }}>
        Next Oni Admin ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}
