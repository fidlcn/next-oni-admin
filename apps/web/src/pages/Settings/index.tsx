import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Descriptions, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';

import { changePassword } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import { fetchPublicKey, encryptWithKey } from '@/utils/rsa';

/**
 * 个人设置页 —— 当前账号信息 + 修改密码（真保存，走 RSA 加密通道）
 * 原先的「站点设置」表单没有后端支撑（保存按钮是假的），已移除
 */
export default function SettingsPage() {
  const [form] = Form.useForm();
  const user = useAuthStore((s) => s.user);
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPublicKey()
      .then(setPublicKey)
      .catch(() => message.error('安全模块加载失败，请刷新页面'));
  }, []);

  const handleSave = async () => {
    if (!publicKey) {
      message.error('安全模块尚未就绪，请稍候再试');
      return;
    }
    try {
      const values = await form.validateFields();
      setSaving(true);
      const [oldPassword, newPassword] = await Promise.all([
        encryptWithKey(publicKey, values.oldPassword),
        encryptWithKey(publicKey, values.newPassword),
      ]);
      const result = await changePassword({ oldPassword, newPassword });
      message.success(result.message || '密码已修改');
      form.resetFields();
    } catch (error: any) {
      // 表单校验失败（validateFields reject）由表单自身标红，不需额外提示
      if (error?.errorFields) return;
      // 业务/网络错误已由拦截器统一提示，这里只需终止流程
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>个人设置</h2>

      <Card style={{ maxWidth: 600, marginBottom: 24 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="用户名">
            {user?.username || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            {(user?.roles || []).map((r) => r.name).join('、') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {user?.email || '未设置'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="修改密码" style={{ maxWidth: 600 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="修改成功后其他设备会被强制下线，当前会话保持登录。"
        />
        <Form form={form} layout="vertical">
          <Form.Item
            name="oldPassword"
            label="原密码"
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="当前使用的密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/,
                message: '至少 8 位，且必须包含字母和数字',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="至少 8 位，包含字母和数字"
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="再输入一次新密码"
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              loading={saving}
              disabled={!publicKey}
              onClick={handleSave}
            >
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
