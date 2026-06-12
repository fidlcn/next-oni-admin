import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

const { Title } = Typography;

/**
 * 登录页 —— 用户名 + 密码登录
 * 登录成功后跳转到之前想去的页面（或管理后台首页）
 * 密码强度：最少 8 位，必须包含字母和数字（与后端一致）
 *
 * 安全机制：
 *   - RSA-OAEP 非对称加密：前端用公钥加密密码，服务端用私钥解密
 *   - 密码在传输过程中始终为密文，即使 HTTPS 被截获也无法还原明文
 */

/** 将 ArrayBuffer 转为 base64 字符串 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** 从 PEM 格式字符串导入 RSA 公钥 */
async function importPublicKey(pem: string): Promise<CryptoKey> {
  // 提取 PEM 中的 base64 部分
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();

  // 登录后跳转到之前想去的页面
  const from = (location.state as any)?.from || '/admin/dashboard';

  // 页面加载时获取 RSA 公钥 + CSRF Token
  useEffect(() => {
    // 并行获取公钥和 CSRF token
    Promise.all([
      fetch('/v1/auth/public-key').then((res) => res.json()),
      fetch('/v1/auth/csrf-token', { credentials: 'include' }).then((res) =>
        res.json(),
      ),
    ])
      .then(async ([keyData]) => {
        // API 响应格式: { code: 0, data: { publicKey: "..." } }
        const key = await importPublicKey(keyData.data.publicKey);
        setPublicKey(key);
      })
      .catch(() => {
        message.error('安全模块加载失败，请刷新页面');
      });
  }, []);

  const handleSubmit = async (values: {
    username: string;
    password: string;
  }) => {
    if (!publicKey) {
      message.error('安全模块尚未加载，请稍候');
      return;
    }

    setLoading(true);
    try {
      // 用 RSA-OAEP 加密密码
      const encoder = new TextEncoder();
      const encrypted = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        encoder.encode(values.password),
      );
      const encryptedPassword = arrayBufferToBase64(encrypted);

      await login(values.username, encryptedPassword);
      message.success('登录成功');
      navigate(from, { replace: true });
    } catch (_err: any) {
      // 错误已在 axios 拦截器中提示，这里不重复处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '80px auto',
        padding: '0 24px',
      }}
    >
      <Card>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          登录
        </Title>

        <Form
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少 8 位' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={!publicKey}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
