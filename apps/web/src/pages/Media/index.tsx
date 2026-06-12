import { useState, useEffect } from 'react';
import { Upload, Table, Button, Popconfirm, message, Image, Tag } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { getMediaList, uploadMedia, deleteMedia } from '@/services/media';

/**
 * 媒体管理页 —— 文件上传和管理
 * 支持图片预览，按类型筛选
 */
export default function MediaPage() {
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });

  const fetchList = async () => {
    setLoading(true);
    try {
      const data: any = await getMediaList(pagination);
      setList(data.list || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [pagination]);

  const handleUpload = async (file: File) => {
    try {
      await uploadMedia(file);
      message.success('上传成功');
      fetchList();
    } catch {
      // 错误已由拦截器处理
    }
    return false; // 阻止默认上传行为
  };

  const handleDelete = async (id: number) => {
    await deleteMedia(id);
    message.success('删除成功');
    fetchList();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '预览',
      dataIndex: 'url',
      width: 100,
      render: (url: string, record: any) =>
        record.type === 'image' ? (
          <Image
            src={url}
            width={60}
            height={60}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <Tag>{record.type}</Tag>
        ),
    },
    { title: '文件名', dataIndex: 'name' },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (v: string) => {
        const colorMap: any = {
          image: 'blue',
          video: 'purple',
          file: 'default',
        };
        return <Tag color={colorMap[v]}>{v}</Tag>;
      },
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 100,
      render: (v: number) => {
        if (v < 1024) return `${v} B`;
        if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
        return `${(v / 1024 / 1024).toFixed(1)} MB`;
      },
    },
    {
      title: '操作',
      width: 100,
      render: (_: any, record: any) => (
        <Popconfirm
          title="确定删除？"
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
        <h2 style={{ margin: 0 }}>媒体管理</h2>
        <Upload
          beforeUpload={handleUpload}
          showUploadList={false}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
        >
          <Button type="primary" icon={<UploadOutlined />}>
            上传文件
          </Button>
        </Upload>
      </div>

      <Table
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
