import { Button, Typography, Space } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

const { Title, Paragraph } = Typography;

/**
 * 默认首页 —— 未登录用户看到的 Landing 页面
 * 已登录用户自动显示「进入管理后台」按钮
 */
export default function Landing() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '80px auto',
        textAlign: 'center',
        padding: '0 24px',
      }}
    >
      <RocketOutlined
        style={{ fontSize: 64, color: '#1677ff', marginBottom: 24 }}
      />
      <Title level={2}>Next Oni Admin 后台管理系统</Title>
      <Paragraph style={{ fontSize: 16, color: '#666', marginBottom: 40 }}>
        基于 TypeScript + NestJS + React + Ant Design 构建的全栈后台管理平台
      </Paragraph>

      <Space size="large">
        {isAuthenticated ? (
          <Button
            type="primary"
            size="large"
            onClick={() => navigate('/admin/dashboard')}
          >
            进入管理后台
          </Button>
        ) : (
          <>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login')}
            >
              登录
            </Button>
            <Button size="large" onClick={() => navigate('/login')}>
              了解更多
            </Button>
          </>
        )}
      </Space>
    </div>
  );
}
