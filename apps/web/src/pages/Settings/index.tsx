import { Card, Form, Input, Button, message, Space } from 'antd';

/**
 * 系统设置页 —— KV 配置管理
 * 后续可扩展为分组动态配置，当前提供基础站点信息设置
 */
export default function SettingsPage() {
  const [form] = Form.useForm();

  const handleSave = async () => {
    await form.validateFields();
    // TODO: Phase 5 对接设置 API
    message.success('设置已保存');
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统设置</h2>

      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="siteName"
            label="站点名称"
            initialValue="Next Oni Admin"
          >
            <Input />
          </Form.Item>
          <Form.Item name="siteDescription" label="站点描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="adminEmail" label="管理员邮箱">
            <Input type="email" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSave}>
                保存
              </Button>
              <Button onClick={() => form.resetFields()}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
