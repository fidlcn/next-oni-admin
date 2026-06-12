import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/services/category';

/**
 * 分类管理页 —— 树形分类 CRUD
 */
export default function CategoryPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const data: any = await getCategories();
      setList(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleEdit = (item?: any, parentId?: number) => {
    setEditItem(item || null);
    form.resetFields();
    if (item) form.setFieldsValue(item);
    else if (parentId) form.setFieldsValue({ parentId });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editItem) {
      await updateCategory(editItem.id, values);
      message.success('更新成功');
    } else {
      await createCategory(values);
      message.success('创建成功');
    }
    setModalOpen(false);
    fetchList();
  };

  const handleDelete = async (id: number) => {
    await deleteCategory(id);
    message.success('删除成功');
    fetchList();
  };

  const columns = [
    { title: '名称', dataIndex: 'name', width: 200 },
    { title: '类型', dataIndex: 'type', render: (v: string) => v || 'default' },
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: number) => (v === 1 ? '启用' : '禁用'),
    },
    {
      title: '操作',
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(undefined, record.id)}>
            添加子分类
          </Button>
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
        <h2 style={{ margin: 0 }}>分类管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleEdit()}
        >
          新增分类
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={list}
        rowKey="id"
        loading={loading}
        defaultExpandAllRows
      />

      <Modal
        title={editItem ? '编辑分类' : '新增分类'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="parentId" label="父分类 ID">
            <Input type="number" placeholder="留空表示顶级分类" />
          </Form.Item>
          <Form.Item name="name" label="分类名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" initialValue="default">
            <Input placeholder="分类类型标识" />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select>
              <Select.Option value={1}>启用</Select.Option>
              <Select.Option value={0}>禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
