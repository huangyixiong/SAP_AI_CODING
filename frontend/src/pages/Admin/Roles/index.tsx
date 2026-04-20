import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Checkbox, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { rolesApi } from '../../../api/roles.api';

interface Permission { id: number; code: string; description?: string; }
interface Role { id: number; name: string; description?: string; createdAt: string; permissions: Permission[]; }

export default function AdminRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [permOpen, setPermOpen] = useState<{ open: boolean; roleId: number | null }>({ open: false, roleId: null });
  const [form] = Form.useForm();
  const [permForm] = Form.useForm();

  const load = async () => {
    try {
      const [r, p] = await Promise.all([rolesApi.list(), rolesApi.listPermissions()]);
      setRoles(r.data); setAllPerms(p.data);
    } catch { message.error('加载失败'); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (values: { name: string; description?: string }) => {
    try {
      await rolesApi.create(values);
      message.success('角色已创建');
      setCreateOpen(false); form.resetFields(); load();
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { error?: { message?: string } })?.error?.message
        : undefined;
      message.error(msg || '创建失败');
    }
  };

  const handleAssignPerms = async (values: { permissionIds: number[] }) => {
    try {
      await rolesApi.assignPermissions(permOpen.roleId!, values.permissionIds);
      message.success('权限已更新');
      setPermOpen({ open: false, roleId: null }); load();
    } catch { message.error('操作失败'); }
  };

  const columns = [
    { title: '角色名', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description' },
    { title: '权限', dataIndex: 'permissions', render: (ps: Permission[]) => ps.map((p) => <Tag key={p.code} color="blue">{p.code}</Tag>) },
    {
      title: '操作', render: (_: unknown, record: Role) => (
        <Button size="small" onClick={() => {
          permForm.setFieldsValue({ permissionIds: record.permissions.map((p) => p.id) });
          setPermOpen({ open: true, roleId: record.id });
        }}>编辑权限</Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建角色</Button>
      </div>
      <Table rowKey="id" dataSource={roles} columns={columns} pagination={false} />

      <Modal title="新建角色" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); }} onOk={() => form.submit()}>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="角色名" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="分配权限" open={permOpen.open} onCancel={() => setPermOpen({ open: false, roleId: null })} onOk={() => permForm.submit()}>
        <Form form={permForm} onFinish={handleAssignPerms} layout="vertical">
          <Form.Item name="permissionIds">
            <Checkbox.Group
              options={allPerms.map((p) => ({ label: `${p.code}${p.description ? ' — ' + p.description : ''}`, value: p.id }))}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
