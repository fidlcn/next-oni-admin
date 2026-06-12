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
// 默认重置密码 — 生产环境应通过环境变量配置
const DEFAULT_RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD || 'changeme';

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
} from '@/services/user';
import { getRoles } from '@/services/role';

/**
 * 用户管理页 —— 管理员可新增/编辑/删除用户、分配角色、重置密码
 * 支持按用户名搜索和分页
 */
export default function UserPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form] = Form.useForm();

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [keyword, setKeyword] = useState('');

  // 加载用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data: any = await getUsers({ ...pagination, keyword });
      setUsers(data.list || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  // 加载角色列表（用于分配角色下拉）
  const fetchRoles = async () => {
    const data: any = await getRoles();
    setRoles(data || []);
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination, keyword]);

  useEffect(() => {
    fetchRoles();
  }, []);

  // 打开新增/编辑弹窗
  const handleEdit = (user?: any) => {
    setEditUser(user || null);
    form.resetFields();
    if (user) {
      form.setFieldsValue({
        ...user,
        roleIds: user.roles?.map((r: any) => r.id),
      });
    }
    setModalOpen(true);
  };

  // 提交新增/编辑
  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editUser) {
      await updateUser(editUser.id, values);
      message.success('更新成功');
    } else {
      await createUser(values);
      message.success('创建成功');
    }
    setModalOpen(false);
    fetchUsers();
  };

  // 删除用户
  const handleDelete = async (id: number) => {
    await deleteUser(id);
    message.success('删除成功');
    fetchUsers();
  };

  // 重置密码
  const handleResetPassword = async (id: number) => {
    const newPassword = DEFAULT_RESET_PASSWORD;
    await resetPassword(id, newPassword);
    message.success('密码已重置为默认密码');
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username' },
    {
      title: '邮箱',
      dataIndex: 'email',
      render: (v: string) => v || '-',
    },
    {
      title: '手机',
      dataIndex: 'phone',
      render: (v: string) => v || '-',
    },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (roles: any[]) =>
        roles?.map((r) => (
          <Tag key={r.id} color="blue">
            {r.name}
          </Tag>
        )),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: number) =>
        v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>,
    },
    {
      title: '操作',
      width: 240,
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
            title="确定删除该用户？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定重置密码？"
            onConfirm={() => handleResetPassword(record.id)}
          >
            <Button size="small" icon={<KeyOutlined />}>
              重置密码
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
        <h2 style={{ margin: 0 }}>用户管理</h2>
        <Space>
          <Input.Search
            placeholder="搜索用户名"
            onSearch={setKeyword}
            style={{ width: 200 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleEdit()}
          >
            新增用户
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
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

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editUser ? '编辑用户' : '新增用户'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true }]}
          >
            <Input disabled={!!editUser} />
          </Form.Item>
          {!editUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true },
                { min: 8, message: '密码至少 8 位' },
                {
                  pattern: /^(?=.*[A-Za-z])(?=.*\d)/,
                  message: '必须包含字母和数字',
                },
              ]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="email" label="邮箱">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label="手机">
            <Input />
          </Form.Item>
          <Form.Item name="roleIds" label="角色">
            <Select mode="multiple" placeholder="选择角色">
              {roles.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  {r.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {editUser && (
            <Form.Item name="status" label="状态">
              <Select>
                <Select.Option value={1}>启用</Select.Option>
                <Select.Option value={0}>禁用</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
