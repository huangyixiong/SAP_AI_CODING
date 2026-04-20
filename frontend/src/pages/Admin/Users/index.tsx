import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { usersApi } from '../../../api/users.api';
import { rolesApi } from '../../../api/roles.api';

interface Role { id: number; name: string; }
interface User {
  id: number; username: string; fullName: string; email: string;
  isActive: boolean; mustChangePassword: boolean;
  roles: Role[]; createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();

  const load = async (p = page) => {
    try {
      const res = await usersApi.list(p, 20);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch { message.error('加载用户列表失败'); }
  };

  useEffect(() => {
    load(1);
    rolesApi.list().then((r) => setRoles(r.data)).catch(() => { message.error('加载角色列表失败'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: run only on mount; load is stable within this render cycle

  const handleCreate = async (values: { username: string; fullName: string; email: string; password: string }) => {
    try {
      await usersApi.create(values);
      message.success('用户已创建，初始密码需首次登录修改');
      setCreateOpen(false); form.resetFields(); load();
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { error?: { message?: string } })?.error?.message
        : undefined;
      message.error(msg || '创建失败');
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await usersApi.deactivate(id);
      message.success('用户已禁用'); load();
    } catch { message.error('操作失败'); }
  };

  const handleAssignRoles = async (values: { roleIds: number[] }) => {
    if (!roleOpen.userId) return;
    try {
      await usersApi.assignRoles(roleOpen.userId, values.roleIds);
      message.success('角色已更新');
      setRoleOpen({ open: false, userId: null }); load();
    } catch { message.error('操作失败'); }
  };

  const columns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'fullName' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '状态', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '启用' : '禁用'}</Tag> },
    { title: '角色', dataIndex: 'roles', render: (rs: Role[]) => rs.map((r) => <Tag key={r.id}>{r.name}</Tag>) },
    {
      title: '操作', render: (_: unknown, record: User) => (
        <Space>
          <Button size="small" onClick={() => {
            roleForm.setFieldsValue({ roleIds: record.roles.map((r) => r.id) });
            setRoleOpen({ open: true, userId: record.id });
          }}>分配角色</Button>
          <Popconfirm title="确认禁用此用户？" onConfirm={() => handleDeactivate(record.id)}>
            <Button size="small" danger disabled={!record.isActive}>禁用</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建用户</Button>
      </div>
      <Table rowKey="id" dataSource={users} columns={columns}
        pagination={{ current: page, total, pageSize: 20, onChange: (p) => { setPage(p); load(p); } }} />

      <Modal title="新建用户" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); }} onOk={() => form.submit()}>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
          <Form.Item name="fullName" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="password" label="初始密码（至少8位）" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>
        </Form>
      </Modal>

      <Modal title="分配角色" open={roleOpen.open} onCancel={() => setRoleOpen({ open: false, userId: null })} onOk={() => roleForm.submit()}>
        <Form form={roleForm} onFinish={handleAssignRoles} layout="vertical">
          <Form.Item name="roleIds" label="角色">
            <Select mode="multiple" options={roles.map((r) => ({ label: r.name, value: r.id }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
