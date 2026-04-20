import React, { useEffect, useState } from 'react';
import { Tabs, Form, Input, InputNumber, Switch, Button, Table, Modal, message, Space, Popconfirm, Select, Tag } from 'antd';
import axios from 'axios';
import { mailConfigApi } from '../../../api/mail-config.api';
import { rolesApi } from '../../../api/roles.api';

interface Role { id: number; name: string; }
interface Recipient { id: number; email: string; name?: string; role: Role; isActive: boolean; }
interface EmailLog { id: number; toAddrs: string; subject: string; status: string; sentAt?: string; createdBy?: { username: string; fullName: string }; }

export default function AdminMailConfig() {
  return (
    <Tabs items={[
      { key: 'smtp', label: 'SMTP 配置', children: <SmtpTab /> },
      { key: 'recipients', label: '收件人', children: <RecipientsTab /> },
      { key: 'logs', label: '发送记录', children: <LogsTab /> },
    ]} />
  );
}

function SmtpTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    mailConfigApi.getSmtp().then((res) => { if (res.data) form.setFieldsValue(res.data); }).catch(() => {});
  }, []);

  const onSave = async (values: Parameters<typeof mailConfigApi.updateSmtp>[0]) => {
    setLoading(true);
    try {
      await mailConfigApi.updateSmtp(values);
      message.success('SMTP 配置已保存');
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { error?: { message?: string } })?.error?.message : undefined;
      message.error(msg || '保存失败');
    } finally { setLoading(false); }
  };

  const onTest = async () => {
    if (!testEmail) return message.warning('请输入测试收件人邮箱');
    try {
      await mailConfigApi.testSmtp(testEmail);
      message.success('测试邮件已发送');
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { error?: { message?: string } })?.error?.message : undefined;
      message.error(msg || '发送失败');
    }
  };

  return (
    <Form form={form} onFinish={onSave} layout="vertical" style={{ maxWidth: 480 }}>
      <Form.Item name="host" label="SMTP 服务器" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="port" label="端口" rules={[{ required: true }]}><InputNumber min={1} max={65535} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="secure" label="SSL/TLS" valuePropName="checked"><Switch /></Form.Item>
      <Form.Item name="user" label="用户名"><Input /></Form.Item>
      <Form.Item name="password" label="密码（留空不修改）"><Input.Password placeholder="***" /></Form.Item>
      <Form.Item name="fromAddr" label="发件人地址" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
      <Form.Item name="fromName" label="发件人名称"><Input /></Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
        <Input placeholder="测试收件人邮箱" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} style={{ width: 220 }} />
        <Button onClick={onTest}>发送测试邮件</Button>
      </Space>
    </Form>
  );
}

function RecipientsTab() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      const [r, ro] = await Promise.all([mailConfigApi.getRecipients(), rolesApi.list()]);
      setRecipients(r.data); setRoles(ro.data);
    } catch { message.error('加载失败'); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (values: { email: string; name?: string; roleId: number }) => {
    try {
      await mailConfigApi.addRecipient(values);
      message.success('收件人已添加');
      setOpen(false); form.resetFields(); load();
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { error?: { message?: string } })?.error?.message : undefined;
      message.error(msg || '添加失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await mailConfigApi.deleteRecipient(id);
      message.success('已删除'); load();
    } catch { message.error('删除失败'); }
  };

  const columns = [
    { title: '邮箱', dataIndex: 'email' },
    { title: '姓名', dataIndex: 'name' },
    { title: '绑定角色', dataIndex: 'role', render: (r: Role) => <Tag>{r?.name}</Tag> },
    { title: '操作', render: (_: unknown, record: Recipient) => (
      <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
        <Button size="small" danger>删除</Button>
      </Popconfirm>
    )},
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setOpen(true)}>添加收件人</Button>
      </div>
      <Table rowKey="id" dataSource={recipients} columns={columns} pagination={false} />
      <Modal title="添加收件人" open={open} onCancel={() => { setOpen(false); form.resetFields(); }} onOk={() => form.submit()}>
        <Form form={form} onFinish={handleAdd} layout="vertical">
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="name" label="姓名"><Input /></Form.Item>
          <Form.Item name="roleId" label="绑定角色" rules={[{ required: true }]}>
            <Select options={roles.map((r) => ({ label: r.name, value: r.id }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const load = async (p = page) => {
    try {
      const res = await mailConfigApi.getLogs(p, 20);
      setLogs(res.data.logs); setTotal(res.data.total);
    } catch { message.error('加载失败'); }
  };

  useEffect(() => { load(); }, []);

  const columns = [
    { title: '收件人', dataIndex: 'toAddrs', render: (v: string) => {
      try { return JSON.parse(v).join(', '); } catch { return v; }
    }},
    { title: '主题', dataIndex: 'subject' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'sent' ? 'green' : 'red'}>{v}</Tag> },
    { title: '发送人', dataIndex: 'createdBy', render: (u?: { fullName: string }) => u?.fullName ?? '-' },
    { title: '时间', dataIndex: 'sentAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <Table rowKey="id" dataSource={logs} columns={columns}
      pagination={{ current: page, total, pageSize: 20, onChange: (p) => { setPage(p); load(p); } }} />
  );
}
