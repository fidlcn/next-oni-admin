import { useState } from 'react';
import { Layout, Menu, Dropdown, Button, theme } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  MenuOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

const { Header, Sider, Content } = Layout;

/**
 * 管理后台布局 —— 登录用户专用的侧边栏 + 顶栏布局
 * 侧边栏菜单根据路由高亮，支持折叠
 * 顶栏显示面包屑和用户操作
 * 移动端侧边栏自动收起，通过按钮展开
 */
export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // 侧边栏菜单项 —— 对应管理页面的路由
  const menuItems = [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: 'cms-group',
      label: '内容管理',
      icon: <FileTextOutlined />,
      children: [
        {
          key: '/admin/contents',
          label: '内容列表',
        },
        {
          key: '/admin/categories',
          label: '分类管理',
        },
        {
          key: '/admin/media',
          icon: <PictureOutlined />,
          label: '媒体库',
        },
      ],
    },
    {
      key: 'system-group',
      label: '系统管理',
      icon: <SettingOutlined />,
      children: [
        {
          key: '/admin/users',
          icon: <UserOutlined />,
          label: '用户管理',
        },
        {
          key: '/admin/roles',
          icon: <TeamOutlined />,
          label: '角色管理',
        },
        {
          key: '/admin/menus',
          icon: <MenuOutlined />,
          label: '菜单管理',
        },
        {
          key: '/admin/settings',
          label: '系统设置',
        },
      ],
    },
  ];

  // 当前路由高亮对应菜单项
  const selectedKeys = [location.pathname];

  const userMenuItems = [
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
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{ background: themeToken.colorBgContainer }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: collapsed ? 14 : 18,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {collapsed ? 'NO' : 'Next Oni Admin'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout>
        {/* 顶栏 */}
        <Header
          style={{
            padding: '0 24px',
            background: themeToken.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />}>
              {user?.username}
            </Button>
          </Dropdown>
        </Header>

        {/* 内容区 */}
        <Content
          style={{
            margin: 16,
            padding: 24,
            background: themeToken.colorBgContainer,
            borderRadius: themeToken.borderRadiusLG,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
