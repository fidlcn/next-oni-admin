import { useEffect, useState } from 'react';
import { Layout, Menu, Dropdown, Button, Drawer, theme } from 'antd';
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
  FileDoneOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

const { Header, Sider, Content } = Layout;

/**
 * 管理后台布局 —— 响应式：
 * - 桌面/平板（≥768px）：常驻侧边栏，<992px 自动折叠为图标模式
 * - 手机（<768px）：侧边栏隐藏，汉堡按钮唤出抽屉菜单（完整文字竖排，
 *   点击跳转后自动收起）——避免窄屏下菜单文字换行
 * 列表页表格自带横向滚动，内容区边距在手机上收窄
 */
export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  // 手机判定（<768px），窗口变化时实时同步
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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
        {
          key: '/admin/hosted-pages',
          icon: <FileDoneOutlined />,
          label: '托管页管理',
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
      {/* 桌面/平板：常驻侧边栏；手机：抽屉菜单替代 */}
      {!isMobile && (
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
      )}

      {isMobile && (
        <Drawer
          placement="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          width={224}
          title="Next Oni Admin"
          styles={{ body: { padding: 0 } }}
        >
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            items={menuItems}
            onClick={({ key }) => {
              navigate(key);
              setMobileOpen(false);
            }}
            style={{ borderRight: 0 }}
          />
        </Drawer>
      )}

      <Layout>
        {/* 顶栏 */}
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            background: themeToken.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            icon={
              isMobile ? (
                <MenuUnfoldOutlined />
              ) : collapsed ? (
                <MenuUnfoldOutlined />
              ) : (
                <MenuFoldOutlined />
              )
            }
            onClick={() =>
              isMobile ? setMobileOpen(true) : setCollapsed(!collapsed)
            }
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />}>
              {user?.username}
            </Button>
          </Dropdown>
        </Header>

        {/* 内容区 —— 手机收窄边距 */}
        <Content
          style={{
            margin: isMobile ? 8 : 16,
            padding: isMobile ? 12 : 24,
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
