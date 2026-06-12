import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getContents,
  createContent,
  updateContent,
  deleteContent,
  batchContentStatus,
  batchDeleteContents,
} from '@/services/content';
import { getCategories } from '@/services/category';

/**
 * 内容管理页 —— CMS 核心，支持分页/搜索/草稿/发布/批量操作
 */
export default function ContentPage() {
  const [list, setList] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [form] = Form.useForm();

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [filters, setFilters] = useState<any>({});

  const fetchList = async () => {
    setLoading(true);
    try {
      const data: any = await getContents({ ...pagination, ...filters });
      setList(data.list || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [pagination, filters]);
  useEffect(() => {
    getCategories().then((d: any) => setCategories(d || []));
  }, []);

  const handleEdit = (item?: any) => {
    setEditItem(item || null);
    form.resetFields();
    if (item) form.setFieldsValue(item);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editItem) {
      await updateContent(editItem.id, values);
      message.success('更新成功');
    } else {
      await createContent(values);
      message.success('创建成功');
    }
    setModalOpen(false);
    fetchList();
  };

  const handleDelete = async (id: number) => {
    await deleteContent(id);
    message.success('删除成功');
    fetchList();
  };

  const handleBatchPublish = async () => {
    if (!selectedIds.length) return message.warning('请选择内容');
    await batchContentStatus(selectedIds, 1);
    message.success('批量发布成功');
    setSelectedIds([]);
    fetchList();
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.length) return message.warning('请选择内容');
    await batchDeleteContents(selectedIds);
    message.success('批量删除成功');
    setSelectedIds([]);
    fetchList();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '标题', dataIndex: 'title' },
    {
      title: '分类',
      dataIndex: 'category',
      render: (v: any) => v?.name || '-',
    },
    {
      title: '作者',
      dataIndex: 'author',
      render: (v: any) => v?.username || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: number) =>
        v === 1 ? (
          <Tag color="green">已发布</Tag>
        ) : (
          <Tag color="orange">草稿</Tag>
        ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      render: (v: string) => (v ? new Date(v).toLocaleDateString() : '-'),
    },
    {
      title: '操作',
      width: 180,
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除？"
            onConfirm={() => handleDelete(record.id)}
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
        <h2 style={{ margin: 0 }}>内容管理</h2>
        <Space>
          <Input.Search
            placeholder="搜索标题"
            onSearch={(v) => setFilters({ ...filters, keyword: v })}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 100 }}
            onChange={(v) => setFilters({ ...filters, status: v })}
            options={[
              { label: '草稿', value: 0 },
              { label: '已发布', value: 1 },
            ]}
          />
          {selectedIds.length > 0 && (
            <>
              <Button onClick={handleBatchPublish}>批量发布</Button>
              <Popconfirm
                title={`确定删除 ${selectedIds.length} 条？`}
                onConfirm={handleBatchDelete}
              >
                <Button danger>批量删除</Button>
              </Popconfirm>
            </>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleEdit()}
          >
            新增内容
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={list}
        rowKey="id"
        loading={loading}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as number[]),
        }}
        pagination={{
          total,
          current: pagination.page,
          pageSize: pagination.pageSize,
          showSizeChanger: true,
          onChange: (page, pageSize) => setPagination({ page, pageSize }),
        }}
      />

      {/* 编辑弹窗 —— 使用 TextArea 作为简易富文本编辑器 */}
      <Modal
        title={editItem ? '编辑内容' : '新增内容'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="categoryId" label="分类">
            <Select placeholder="选择分类" allowClear>
              {categories.map((c: any) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="content" label="正文" rules={[{ required: true }]}>
            <Input.TextArea rows={12} placeholder="支持 HTML 内容" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={0}>
            <Select>
              <Select.Option value={0}>保存为草稿</Select.Option>
              <Select.Option value={1}>直接发布</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
