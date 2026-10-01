import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  Tooltip,
  Select,
  message,
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  StopOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import {
  getAccessTokens,
  updateAccessToken,
  unbindAccessTokenDevice,
  deleteAccessToken,
  PAGEGEN_TOKEN_TYPE_META,
  PAGEGEN_TOKEN_STATE_META,
  type PagegenTokenItem,
} from '@/services/pagegen';

/** 邀请短链本地开发兜底（后端 PAGEGEN_PUBLIC_BASE_URL 为相对路径时） */
function absInviteUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `http://localhost:3001${url}`;
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${label}已复制`);
  } catch {
    message.error(`复制失败，请手动复制：${text}`);
  }
}

/** 设备 ID 摘要展示（uuid / ip:xxx 截断） */
function shortDevice(id: string | null): string {
  if (!id) return '-';
  return id.length > 12 ? `${id.slice(0, 12)}…` : id;
}

/**
 * 口令列表 —— 口令码（可复制）/ 类型限额 / 实时用量 / 设备占用 /
 * 邀请短链 / 启停 / 解绑 / 删除
 */
export default function AccessTokens() {
  const navigate = useNavigate();
  const [list, setList] = useState<PagegenTokenItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [filters, setFilters] = useState<any>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const fetchList = async () => {
    setLoading(true);
    try {
      const data: any = await getAccessTokens({ ...pagination, ...filters });
      setList(data.list || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [pagination, filters]);

  const handleToggleStatus = async (record: PagegenTokenItem) => {
    const next = record.status === 'active' ? 'disabled' : 'active';
    await updateAccessToken(record.id, { status: next });
    message.success(next === 'active' ? '已启用' : '已停用');
    fetchList();
  };

  const handleUnbind = async (record: PagegenTokenItem) => {
    await unbindAccessTokenDevice(record.id);
    message.success('已解绑设备');
    fetchList();
  };

  const handleDelete = async (record: PagegenTokenItem) => {
    await deleteAccessToken(record.id);
    message.success('删除成功');
    fetchList();
  };

  const columns = [
    {
      title: '备注名',
      dataIndex: 'name',
      width: 140,
      ellipsis: true,
      render: (v: string) => v || '未命名',
    },
    {
      title: '口令',
      dataIndex: 'code',
      width: 200,
      render: (v: string, record: PagegenTokenItem) => (
        <Space size={4}>
          <code style={{ fontSize: 12 }}>
            {revealed[record.id] ? v : `${v.slice(0, 4)}••••••••${v.slice(-4)}`}
          </code>
          <Button
            size="small"
            type="text"
            icon={
              revealed[record.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />
            }
            onClick={() =>
              setRevealed((prev) => ({
                ...prev,
                [record.id]: !prev[record.id],
              }))
            }
          />
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
      title: '类型 / 限额',
      dataIndex: 'type',
      width: 150,
      render: (v: string, record: PagegenTokenItem) => (
        <Space size={4} wrap>
          {PAGEGEN_TOKEN_TYPE_META[v] ? (
            <Tag color={PAGEGEN_TOKEN_TYPE_META[v].color}>
              {PAGEGEN_TOKEN_TYPE_META[v].label}
            </Tag>
          ) : (
            v
          )}
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            {record.type === 'long'
              ? `${record.hourlyLimit} 条/时`
              : `${record.usedTotal}/${record.maxUses} 条`}
          </span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'derivedStatus',
      width: 90,
      render: (v: string) => {
        const meta = PAGEGEN_TOKEN_STATE_META[v] || {
          label: v,
          color: 'default',
        };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '用量',
      width: 170,
      render: (_: any, record: PagegenTokenItem) => (
        <Tooltip title={`今日 ${record.usedToday} 条`} placement="top">
          <span style={{ fontSize: 12 }}>
            累计 {record.usedTotal} · 近1时 {record.usedLastHour}
            {record.type === 'long' && record.hourRemaining != null
              ? ` · 本时可再用 ${record.hourRemaining}`
              : ''}
            {record.type === 'short' && record.remaining != null
              ? ` · 剩余 ${record.remaining}`
              : ''}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '设备占用',
      dataIndex: 'activeDeviceId',
      width: 170,
      render: (v: string | null, record: PagegenTokenItem) =>
        v ? (
          <Tooltip
            title={`绑定于 ${
              record.deviceBoundAt
                ? new Date(record.deviceBoundAt).toLocaleString('zh-CN')
                : '-'
            }${record.deviceLocked ? '（活跃占用中）' : '（已空闲，可被其他设备接管）'}`}
          >
            <Space size={4}>
              <Tag color={record.deviceLocked ? 'orange' : 'default'}>
                {shortDevice(v)}
              </Tag>
              {record.deviceLocked && (
                <Button
                  size="small"
                  type="text"
                  icon={<DisconnectOutlined />}
                  onClick={() => handleUnbind(record)}
                >
                  解绑
                </Button>
              )}
            </Space>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: '邀请短链',
      dataIndex: 'inviteUrl',
      width: 220,
      render: (v: string) => (
        <Space size={4}>
          <a href={absInviteUrl(v)} target="_blank" rel="noreferrer">
            {absInviteUrl(v).replace(/^https?:\/\//, '')}
          </a>
          <Button
            size="small"
            type="text"
            icon={<CopyOutlined />}
            onClick={() => copyText(absInviteUrl(v), '邀请短链')}
          />
        </Space>
      ),
    },
    {
      title: '最近使用',
      dataIndex: 'lastUsedAt',
      width: 150,
      render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 150,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: PagegenTokenItem) => (
        <Space size={4}>
          <Button
            size="small"
            danger={record.status === 'active'}
            icon={
              record.status === 'active' ? (
                <StopOutlined />
              ) : (
                <PlayCircleOutlined />
              )
            }
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === 'active' ? '停用' : '启用'}
          </Button>
          <Popconfirm
            title="删除后使用者将无法再用此口令，确定？"
            onConfirm={() => handleDelete(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
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
        <h2 style={{ margin: 0 }}>口令列表</h2>
        <Space>
          <Select
            placeholder="类型"
            allowClear
            style={{ width: 110 }}
            onChange={(v) => setFilters({ ...filters, type: v })}
            options={[
              { value: 'long', label: '长期' },
              { value: 'short', label: '短期' },
            ]}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 110 }}
            onChange={(v) => setFilters({ ...filters, status: v })}
            options={[
              { value: 'active', label: '启用中' },
              { value: 'disabled', label: '已停用' },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/access-tokens/create')}
          >
            生成口令
          </Button>
        </Space>
      </div>

      <Table
        scroll={{ x: 'max-content' }}
        columns={columns}
        dataSource={list}
        rowKey="id"
        loading={loading}
        pagination={{
          total,
          current: pagination.page,
          pageSize: pagination.pageSize,
          showSizeChanger: true,
          onChange: (page, pageSize) => setPagination({ page, pageSize }),
        }}
      />
    </div>
  );
}
