import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Radio,
  Button,
  Table,
  Space,
  Tag,
  message,
  Result,
} from 'antd';
import {
  CopyOutlined,
  KeyOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import {
  createAccessTokens,
  PAGEGEN_TOKEN_TYPE_META,
  type PagegenTokenItem,
} from '@/services/pagegen';
import { siteUrl } from '@/utils/siteUrl';

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${label}已复制`);
  } catch {
    message.error(`复制失败，请手动复制：${text}`);
  }
}

/**
 * 口令生成 —— 选择类型与限额批量创建口令，
 * 结果面板展示口令码与邀请短链（对外只发短链，不暴露 /gen 真实地址）
 */
export default function AccessTokenCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<PagegenTokenItem[]>([]);

  const type = Form.useWatch('type', form) ?? 'short';

  const handleCreate = async () => {
    const values = await form.validateFields();
    setCreating(true);
    try {
      // 拦截器已解包 { code, message, data }，这里 any 与现有页面一致
      const list: any = await createAccessTokens({
        name: values.name,
        type: values.type,
        hourlyLimit: values.type === 'long' ? values.hourlyLimit : undefined,
        maxUses: values.type === 'short' ? values.maxUses : undefined,
        count: values.count ?? 1,
      });
      setCreated(list || []);
      message.success(`已生成 ${list.length} 个口令`);
    } finally {
      setCreating(false);
    }
  };

  const copyAll = () => {
    const text = created
      .map(
        (t) =>
          `${t.name || '未命名'}（${
            PAGEGEN_TOKEN_TYPE_META[t.type]?.label || t.type
          }）：口令 ${t.code} ｜ 邀请链接 ${siteUrl(t.inviteUrl)}`,
      )
      .join('\n');
    copyText(text, '全部信息');
  };

  const resultColumns = [
    {
      title: '备注名',
      dataIndex: 'name',
      ellipsis: true,
      render: (v: string) => v || '未命名',
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 140,
      render: (v: string, record: PagegenTokenItem) => (
        <Space size={4}>
          {PAGEGEN_TOKEN_TYPE_META[v] ? (
            <Tag color={PAGEGEN_TOKEN_TYPE_META[v].color}>
              {PAGEGEN_TOKEN_TYPE_META[v].label}
            </Tag>
          ) : (
            v
          )}
          {record.type === 'long'
            ? `${record.hourlyLimit} 条/小时`
            : `共 ${record.maxUses} 条`}
        </Space>
      ),
    },
    {
      title: '口令',
      dataIndex: 'code',
      render: (v: string) => (
        <Space>
          <code>{v}</code>
          <Button
            size="small"
            type="text"
            icon={<CopyOutlined />}
            onClick={() => copyText(v, '口令')}
          />
        </Space>
      ),
    },
    {
      title: '邀请短链（对外发放）',
      dataIndex: 'inviteUrl',
      render: (v: string) => (
        <Space>
          <a href={siteUrl(v)} target="_blank" rel="noreferrer">
            {siteUrl(v)}
          </a>
          <Button
            size="small"
            type="text"
            icon={<CopyOutlined />}
            onClick={() => copyText(siteUrl(v), '邀请短链')}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>口令生成</h2>
        <Button
          icon={<UnorderedListOutlined />}
          onClick={() => navigate('/admin/access-tokens')}
        >
          口令列表
        </Button>
      </div>

      <Card style={{ maxWidth: 640 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'short', count: 1 }}
        >
          <Form.Item
            name="name"
            label="备注名"
            rules={[
              { required: true, message: '请填写备注名，便于识别发给谁' },
            ]}
          >
            <Input maxLength={100} placeholder="例如：给小王的" />
          </Form.Item>

          <Form.Item name="type" label="口令类型">
            <Radio.Group>
              <Radio.Button value="short">短期（限量）</Radio.Button>
              <Radio.Button value="long">长期（限频）</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {type === 'short' ? (
            <Form.Item
              name="maxUses"
              label="可生成总条数"
              rules={[{ required: true, message: '请填写总条数' }]}
              extra="用完即失效；生成失败不扣减额度"
            >
              <InputNumber
                min={1}
                max={1000}
                precision={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name="hourlyLimit"
              label="每小时最多条数"
              rules={[{ required: true, message: '请填写每小时条数' }]}
              extra="长期口令不过期，仅按小时限频"
            >
              <InputNumber
                min={1}
                max={100}
                precision={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}

          <Form.Item name="count" label="批量个数" extra="一次最多生成 50 个">
            <InputNumber
              min={1}
              max={50}
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Button
            type="primary"
            icon={<KeyOutlined />}
            loading={creating}
            onClick={() => handleCreate().catch(() => undefined)}
          >
            生成口令
          </Button>
        </Form>
      </Card>

      {created.length > 0 && (
        <Card
          title={`生成结果（${created.length} 个）`}
          style={{ marginTop: 16 }}
          extra={
            <Space>
              <Button icon={<CopyOutlined />} onClick={copyAll}>
                复制全部
              </Button>
              <Button onClick={() => navigate('/admin/access-tokens')}>
                去口令列表
              </Button>
            </Space>
          }
        >
          <Result
            status="success"
            title="口令已生成"
            subTitle="对外发放建议只发邀请短链：打开即是生成页，口令自动生效，无需再输口令"
            style={{ padding: '12px 0 20px' }}
          />
          <Table
            columns={resultColumns}
            dataSource={created}
            rowKey="id"
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )}
    </div>
  );
}
