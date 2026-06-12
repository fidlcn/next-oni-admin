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
  getAllMenus,
  createMenu,
  updateMenu,
  deleteMenu,
} from '@/services/menu';

/**
 * 菜单管理页 —— 管理后台侧边栏菜单的 CRUD
 * 使用树形表格展示菜单层级关系
 */
export default function MenuPage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMenu, setEditMenu] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const data: any = await getAllMenus();
      setMenus(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleEdit = (menu?: any, parentId?: number) => {
    setEditMenu(menu || null);
    form.resetFields();
    if (menu) {
      form.setFieldsValue(menu);
    } else if (parentId) {
      form.setFieldsValue({ parentId });
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editMenu) {
      await updateMenu(editMenu.id, values);
      message.success('更新成功');
    } else {
      await createMenu(values);
      message.success('创建成功');
    }
    setModalOpen(false);
    fetchMenus();
  };

  const handleDelete = async (id: number) => {
    await deleteMenu(id);
    message.success('删除成功');
    fetchMenus();
  };

  const columns = [
    { title: '名称', dataIndex: 'name', width: 200 },
    { title: '路径', dataIndex: 'path', render: (v: string) => v || '-' },
    { title: '图标', dataIndex: 'icon', render: (v: string) => v || '-' },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (v: number) => ['目录', '菜单', '外链'][v] || v,
    },
    { title: '排序', dataIndex: 'sort', width: 60 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: number) => (v === 1 ? '显示' : '隐藏'),
    },
    {
      title: '操作',
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(undefined, record.id)}>
            添加子菜单
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
        <h2 style={{ margin: 0 }}>菜单管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleEdit()}
        >
          新增菜单
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={menus}
        rowKey="id"
        loading={loading}
        pagination={false}
        defaultExpandAllRows
      />

      <Modal
        title={editMenu ? '编辑菜单' : '新增菜单'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="parentId" label="父菜单 ID">
            <Input type="number" placeholder="留空表示顶级菜单" />
          </Form.Item>
          <Form.Item name="name" label="菜单名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="path" label="路由路径">
            <Input placeholder="/system/user" />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Input placeholder="Ant Design 图标名称" />
          </Form.Item>
          <Form.Item name="type" label="类型" initialValue={1}>
            <Select>
              <Select.Option value={0}>目录</Select.Option>
              <Select.Option value={1}>菜单</Select.Option>
              <Select.Option value={2}>外链</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select>
              <Select.Option value={1}>显示</Select.Option>
              <Select.Option value={0}>隐藏</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
