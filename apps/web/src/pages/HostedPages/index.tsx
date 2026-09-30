import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Modal,
  Descriptions,
  Card,
  Col,
  Row,
  Statistic,
  Select,
  Input,
} from 'antd';
import {
  DeleteOutlined,
  ExportOutlined,
  FileDoneOutlined,
  WarningOutlined,
  PayCircleOutlined,
  HddOutlined,
  LinkOutlined,
  FormOutlined,
} from '@ant-design/icons';
import {
  getHostedPages,
  getHostedStats,
  deleteHostedPage,
  PAGEGEN_TAG_LABELS,
  PAGEGEN_STYLE_LABELS,
  PAGEGEN_STATUS_META,
} from '@/services/pagegen';

/** 字节转可读大小 */
function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * 托管页管理 —— 公开 H5 提交生成的 HTML 页面托管在此
 * 顶部统计卡片（今日生成/失败率/费用估算/磁盘占用）+ 列表（提示词查看/跳转/删除）
 */

/** 主站 /gen 生成页地址；生产构建时通过 VITE_GEN_URL 覆盖为线上主站域名 */
const GEN_PAGE_URL =
  (import.meta.env.VITE_GEN_URL as string | undefined) ||
  'http://localhost:3001/gen';
export default function HostedPages() {
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [filters, setFilters] = useState<any>({});
  const [detail, setDetail] = useState<any>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data: any = await getHostedPages({ ...pagination, ...filters });
      setList(data.list || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStats(await getHostedStats());
    } catch {
      setStats(null);
    }
  };

  useEffect(() => {
    fetchList();
  }, [pagination, filters]);
  useEffect(() => {
    fetchStats();
  }, []);

  const handleDelete = async (id: number) => {
    await deleteHostedPage(id);
    message.success('删除成功');
    fetchList();
    fetchStats();
  };

  const handleExport = () => {
    // GET 下载，httpOnly cookie 自动携带
    window.open('/v1/pagegen/export', '_blank');
  };

  const columns = [
    { title: '标题', dataIndex: 'title', ellipsis: true },
    {
      title: 'pageId',
      dataIndex: 'pageId',
      width: 150,
      render: (v: string, record: any) =>
        record.url ? (
          <a href={record.url} target="_blank" rel="noreferrer">
            <LinkOutlined /> {v}
          </a>
        ) : (
          v
        ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 140,
      render: (tags: string[]) =>
        (tags || []).map((t) => (
          <Tag key={t}>{PAGEGEN_TAG_LABELS[t] || t}</Tag>
        )),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const meta = PAGEGEN_STATUS_META[v] || { label: v, color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: '浏览', dataIndex: 'views', width: 70 },
    {
      title: '生成时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    { title: 'IP', dataIndex: 'ip', width: 130 },
    {
      title: '提示词',
      width: 90,
      render: (_: any, record: any) => (
        <Button size="small" onClick={() => setDetail(record)}>
          查看
        </Button>
      ),
    },
    {
      title: '操作',
      width: 90,
      render: (_: any, record: any) => (
        <Popconfirm
          title="删除后页面文件与记录均不可恢复，确定？"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
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
        <h2 style={{ margin: 0 }}>托管页管理</h2>
        <Space>
          <Input.Search
            placeholder="搜索标题"
            allowClear
            style={{ width: 180 }}
            onSearch={(v) => setFilters({ ...filters, keyword: v })}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 110 }}
            onChange={(v) => setFilters({ ...filters, status: v })}
            options={Object.entries(PAGEGEN_STATUS_META).map(([value, m]) => ({
              value,
              label: m.label,
            }))}
          />
          <Select
            placeholder="标签"
            allowClear
            style={{ width: 110 }}
            onChange={(v) => setFilters({ ...filters, tag: v })}
            options={Object.entries(PAGEGEN_TAG_LABELS).map(
              ([value, label]) => ({
                value,
                label,
              }),
            )}
          />
          <Button
            icon={<FormOutlined />}
            onClick={() => window.open(GEN_PAGE_URL, '_blank')}
          >
            去生成页
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出 CSV
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日生成"
              value={stats?.todayCount ?? 0}
              suffix={`/ 总 ${stats?.totalCount ?? 0} 页`}
              prefix={<FileDoneOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="失败率"
              value={((stats?.failRate ?? 0) * 100).toFixed(1)}
              suffix={`%（${stats?.failedCount ?? 0} 次）`}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="费用估算"
              value={stats?.cost ?? 0}
              precision={2}
              prefix={<PayCircleOutlined />}
              suffix={`元（${stats?.tokensIn ?? 0} 入 / ${stats?.tokensOut ?? 0} 出 tokens）`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="磁盘占用"
              value={formatBytes(stats?.diskBytes ?? 0)}
              suffix={`/ ${stats?.fileCount ?? 0} 个文件`}
              prefix={<HddOutlined />}
            />
          </Card>
        </Col>
      </Row>

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

      {/* 提示词详情弹窗 */}
      <Modal
        title={detail ? `提示词 — ${detail.title}` : ''}
        open={!!detail}
        footer={null}
        onCancel={() => setDetail(null)}
        width={680}
      >
        {detail && (
          <Descriptions
            column={2}
            size="small"
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="标题">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="风格">
              {PAGEGEN_STYLE_LABELS[detail.style] || detail.style}
            </Descriptions.Item>
            <Descriptions.Item label="pageId" span={2}>
              {detail.url ? (
                <a href={detail.url} target="_blank" rel="noreferrer">
                  <LinkOutlined /> {detail.url}
                </a>
              ) : (
                detail.pageId
              )}
            </Descriptions.Item>
            <Descriptions.Item label="标签" span={2}>
              {(detail.tags || []).map((t: string) => (
                <Tag key={t}>{PAGEGEN_TAG_LABELS[t] || t}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="提交时间" span={2}>
              {new Date(detail.createdAt).toLocaleString('zh-CN')}（IP:{' '}
              {detail.ip || '-'}）
            </Descriptions.Item>
            {detail.error && (
              <Descriptions.Item label="失败原因" span={2}>
                <Tag color="error">{detail.error}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
        <div
          style={{
            whiteSpace: 'pre-wrap',
            background: '#fafafa',
            padding: 12,
            borderRadius: 6,
            maxHeight: 320,
            overflow: 'auto',
          }}
        >
          {detail?.content}
        </div>
      </Modal>
    </div>
  );
}
