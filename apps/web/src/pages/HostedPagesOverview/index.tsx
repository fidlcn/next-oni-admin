import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Card,
  Col,
  Row,
  Statistic,
  Switch,
  Tooltip,
} from 'antd';
import {
  ReloadOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  WarningOutlined,
  PayCircleOutlined,
} from '@ant-design/icons';

import {
  getHostedOverview,
  PAGEGEN_STATUS_META,
  PAGEGEN_TOKEN_TYPE_META,
  PAGEGEN_TOKEN_STATE_META,
} from '@/services/pagegen';
import { siteUrl } from '@/utils/siteUrl';

/** tokens 数值紧凑化：12345 -> 1.2万 */
function formatTokens(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

/** 耗时展示 */
function formatDuration(ms: number | null): string {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

const suffix = (text: string) => (
  <span style={{ fontSize: 12, color: '#8c8c8c' }}>{text}</span>
);

const REFRESH_MS = 15_000;

/**
 * 托管页管理概述 —— 核心是实时并发：
 * 「GLM 生成并发中 / 排队中」大数字卡片（默认 15s 轮询），
 * 配今日概况、最近生成、口令用量三组表格数据
 */
export default function HostedPagesOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const loadingRef = useRef(false);

  const fetchOverview = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res: any = await getHostedOverview();
      setData(res);
      setLastUpdated(new Date());
    } catch {
      // 静默失败，保留上次数据
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(fetchOverview, REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchOverview]);

  const running = data?.running ?? { generating: 0, pending: 0 };
  const today = data?.today ?? { count: 0, failed: 0 };
  const totals = data?.totals ?? {
    totalCount: 0,
    totalFailed: 0,
    tokensIn: 0,
    tokensOut: 0,
    cost: 0,
  };

  const recentColumns = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (v: string, record: any) =>
        record.url ? (
          <a href={siteUrl(record.url)} target="_blank" rel="noreferrer">
            {v || '（未命名）'}
          </a>
        ) : (
          v || '（未命名）'
        ),
    },
    {
      title: '口令',
      dataIndex: 'tokenName',
      width: 130,
      ellipsis: true,
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
    {
      title: '耗时',
      dataIndex: 'durationMs',
      width: 80,
      render: (v: number | null) => formatDuration(v),
    },
    { title: 'IP', dataIndex: 'ip', width: 130 },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
  ];

  const tokenColumns = [
    {
      title: '备注名',
      dataIndex: 'name',
      width: 140,
      ellipsis: true,
      render: (v: string) => v || '未命名',
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (v: string) =>
        PAGEGEN_TOKEN_TYPE_META[v] ? (
          <Tag color={PAGEGEN_TOKEN_TYPE_META[v].color}>
            {PAGEGEN_TOKEN_TYPE_META[v].label}
          </Tag>
        ) : (
          v
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
      title: '今日',
      dataIndex: 'usedToday',
      width: 70,
    },
    {
      title: '近1小时',
      dataIndex: 'usedLastHour',
      width: 80,
    },
    {
      title: '累计 / 限额',
      width: 120,
      render: (_: any, record: any) =>
        record.type === 'long'
          ? `${record.usedTotal} · ${record.hourlyLimit} 条/时`
          : `${record.usedTotal}/${record.maxUses} 条`,
    },
    {
      title: '设备占用',
      dataIndex: 'activeDeviceId',
      width: 110,
      render: (v: string | null, record: any) =>
        v ? (
          <Tag color={record.deviceLocked ? 'orange' : 'default'}>
            {v.length > 8 ? `${v.slice(0, 8)}…` : v}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '最近使用',
      dataIndex: 'lastUsedAt',
      width: 150,
      render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
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
        <h2 style={{ margin: 0 }}>管理概述</h2>
        <Space>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
              更新于 {lastUpdated.toLocaleTimeString('zh-CN')}
            </span>
          )}
          <Space size={4}>
            <Switch
              size="small"
              checked={autoRefresh}
              onChange={setAutoRefresh}
            />
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
              自动刷新（{REFRESH_MS / 1000}s）
            </span>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={fetchOverview}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 核心卡片：GLM 实时并发 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="GLM 生成并发中"
              value={running.generating}
              suffix={suffix('个任务正在调用 GLM')}
              prefix={<ThunderboltOutlined />}
              valueStyle={{
                fontSize: 34,
                color: running.generating > 0 ? '#1677ff' : undefined,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="排队等待中"
              value={running.pending}
              suffix={suffix('个任务待处理')}
              prefix={<ClockCircleOutlined />}
              valueStyle={{
                fontSize: 34,
                color: running.pending > 0 ? '#fa8c16' : undefined,
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="今日生成"
              value={today.count}
              suffix={suffix(`/ 失败 ${today.failed}`)}
              prefix={<FileDoneOutlined />}
              valueStyle={{ fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="累计生成"
              value={totals.totalCount}
              suffix={suffix(`/ 失败 ${totals.totalFailed}`)}
              prefix={<WarningOutlined />}
              valueStyle={{ fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Tokens 消耗"
              value={formatTokens(totals.tokensIn + totals.tokensOut)}
              suffix={suffix(
                `入 ${formatTokens(totals.tokensIn)} · 出 ${formatTokens(
                  totals.tokensOut,
                )}`,
              )}
              valueStyle={{ fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="费用估算"
              value={totals.cost}
              precision={2}
              suffix={suffix('元')}
              prefix={<PayCircleOutlined />}
              valueStyle={{ fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近生成" style={{ marginBottom: 16 }}>
        <Table
          columns={recentColumns}
          dataSource={data?.recent || []}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Card
        title={
          <Tooltip title="最近创建的 50 个口令；用量口径：成功 + 生成中，失败不扣减">
            口令用量
          </Tooltip>
        }
      >
        <Table
          columns={tokenColumns}
          dataSource={data?.tokens || []}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
