import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message, Tag, Popconfirm, Typography, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { EYColors, EYTypography, EYSpacing, EYBorderRadius, EYShadows } from '../../styles/ey-theme';

const { Title, Text } = Typography;

interface SAPConfig {
  id: string;
  name: string;
  url: string;
  user: string;
  client: string;
  language: string;
  isActive: boolean;
  createdAt: string;
}

export default function SAPConfig() {
  const [configs, setConfigs] = useState<SAPConfig[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SAPConfig | null>(null);
  const [form] = Form.useForm();
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/sap-configs');
      const data = await response.json();
      if (data.success) {
        setConfigs(data.data);
      } else {
        message.error('加载配置失败');
      }
    } catch (error) {
      message.error('加载配置失败');
    }
  };

  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: SAPConfig) => {
    setEditingConfig(record);
    form.setFieldsValue({
      name: record.name,
      url: record.url,
      user: record.user,
      password: '', // Don't show password
      client: record.client,
      language: record.language,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/sap-configs/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        message.success('删除成功');
        loadConfigs();
      } else {
        message.error(data.error || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const isEdit = !!editingConfig;
      
      const response = await fetch(
        isEdit ? `/api/sap-configs/${editingConfig.id}` : '/api/sap-configs',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }
      );
      
      const data = await response.json();
      if (data.success) {
        message.success(isEdit ? '更新成功' : '添加成功');
        setModalVisible(false);
        loadConfigs();
      } else {
        message.error(data.error || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`/api/sap-configs/${id}/activate`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        message.success('激活成功，正在重新连接SAP...');
        loadConfigs();
      } else {
        message.error(data.error || '激活失败');
      }
    } catch (error) {
      message.error('激活失败');
    }
  };

  const handleTest = async (id: string) => {
    setTestingConnection(id);
    try {
      const response = await fetch(`/api/sap-configs/${id}/test`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        message.success('✓ 连接测试成功');
      } else {
        message.error(`✗ 连接失败: ${data.error}`);
      }
    } catch (error) {
      message.error('✗ 连接测试失败');
    } finally {
      setTestingConnection(null);
    }
  };

  const columns: ColumnsType<SAPConfig> = [
    {
      title: '配置名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => (
        <Text strong style={{ color: EYColors.deepGray, fontSize: EYTypography.sizes.md }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'SAP URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (text) => (
        <Text code style={{ fontSize: EYTypography.sizes.sm }}>{text}</Text>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'user',
      key: 'user',
      width: 120,
    },
    {
      title: 'Client',
      dataIndex: 'client',
      key: 'client',
      width: 80,
      align: 'center',
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 80,
      align: 'center',
    },
    {
      title: '状态',
      key: 'isActive',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Tag
          icon={record.isActive ? <CheckCircleOutlined /> : undefined}
          color={record.isActive ? 'success' : 'default'}
          style={{
            borderRadius: EYBorderRadius.round,
            fontWeight: EYTypography.weights.medium,
            padding: '2px 12px'
          }}
        >
          {record.isActive ? '当前激活' : '未激活'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {!record.isActive && (
            <Button
              type="link"
              size="small"
              onClick={() => handleActivate(record.id)}
              style={{ color: EYColors.yellow, fontWeight: EYTypography.weights.semibold }}
            >
              激活
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<ThunderboltOutlined />}
            loading={testingConnection === record.id}
            onClick={() => handleTest(record.id)}
            style={{ color: EYColors.info }}
          >
            测试
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ color: EYColors.warning }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此配置吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header - EY Style */}
      <div style={{ 
        marginBottom: EYSpacing.xxl,
        padding: `${EYSpacing.xl}px ${EYSpacing.xxl}px`,
        background: EYColors.white,
        borderRadius: EYBorderRadius.lg,
        boxShadow: EYShadows.sm,
        borderLeft: `5px solid ${EYColors.yellow}`
      }}>
        <Title level={3} style={{ 
          margin: 0, 
          color: EYColors.deepGray,
          fontWeight: EYTypography.weights.bold,
          fontSize: EYTypography.sizes.xxxl
        }}>
          <SettingOutlined style={{ marginRight: EYSpacing.md, color: EYColors.yellow }} />
          SAP配置管理
        </Title>
        <Text style={{ 
          marginTop: EYSpacing.sm, 
          display: 'block',
          color: EYColors.mediumGray,
          fontSize: EYTypography.sizes.md
        }}>
          管理多个SAP系统连接配置，支持DEV/QAS/PRD等多环境切换
        </Text>
      </div>

      {/* Main Content Card */}
      <Card
        style={{
          borderRadius: EYBorderRadius.lg,
          boxShadow: EYShadows.md,
          border: `1px solid ${EYColors.borderGray}`
        }}
        headStyle={{
          borderBottom: `2px solid ${EYColors.yellow}`,
          background: 'rgba(255,230,0,0.03)',
          padding: `${EYSpacing.lg}px ${EYSpacing.xl}px`
        }}
        title={
          <span style={{ fontWeight: EYTypography.weights.semibold, fontSize: EYTypography.sizes.lg }}>
            配置列表
          </span>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            style={{
              height: 36,
              fontWeight: EYTypography.weights.semibold,
              borderRadius: EYBorderRadius.md,
              background: EYColors.yellow,
              color: EYColors.deepGray,
              border: 'none'
            }}
          >
            新增配置
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={configs}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条配置`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Add/Edit Modal - EY Style */}
      <Modal
        title={
          <span style={{ 
            fontWeight: EYTypography.weights.bold,
            fontSize: EYTypography.sizes.xxl,
            color: EYColors.deepGray
          }}>
            {editingConfig ? '编辑SAP配置' : '新增SAP配置'}
          </span>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="保存"
        cancelText="取消"
        width={600}
        okButtonProps={{
          style: {
            background: EYColors.yellow,
            color: EYColors.deepGray,
            border: 'none',
            fontWeight: EYTypography.weights.semibold,
            borderRadius: EYBorderRadius.md
          }
        }}
        cancelButtonProps={{
          style: {
            borderRadius: EYBorderRadius.md
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: EYSpacing.lg }}
        >
          <Form.Item
            label={<Text strong>配置名称</Text>}
            name="name"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input 
              placeholder="例如：DEV环境、QAS环境、PRD环境"
              size="large"
              style={{ borderRadius: EYBorderRadius.md }}
            />
          </Form.Item>

          <Form.Item
            label={<Text strong>SAP URL</Text>}
            name="url"
            rules={[
              { required: true, message: '请输入SAP URL' },
              { pattern: /^.+:\d+$/, message: 'URL必须包含端口号，例如：http://192.168.20.41:8000' }
            ]}
            extra={<Text type="secondary" style={{ fontSize: EYTypography.sizes.xs }}>必须包含端口号，例如：http://192.168.20.41:8000</Text>}
          >
            <Input 
              placeholder="http://192.168.20.41:8000"
              size="large"
              style={{ borderRadius: EYBorderRadius.md, fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            label={<Text strong>用户名</Text>}
            name="user"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              placeholder="SAP登录用户名"
              size="large"
              style={{ borderRadius: EYBorderRadius.md }}
            />
          </Form.Item>

          <Form.Item
            label={<Text strong>密码</Text>}
            name="password"
            rules={[{ required: !editingConfig, message: '请输入密码' }]}
            extra={editingConfig ? <Text type="secondary" style={{ fontSize: EYTypography.sizes.xs }}>留空则不修改密码</Text> : null}
          >
            <Input.Password 
              placeholder="SAP登录密码（会自动加密存储）"
              size="large"
              style={{ borderRadius: EYBorderRadius.md }}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: EYSpacing.lg }}>
            <Form.Item
              label={<Text strong>Client</Text>}
              name="client"
              rules={[{ required: true, message: '请输入Client' }]}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input 
                placeholder="100"
                size="large"
                style={{ borderRadius: EYBorderRadius.md }}
              />
            </Form.Item>

            <Form.Item
              label={<Text strong>语言</Text>}
              name="language"
              rules={[{ required: true, message: '请输入语言代码' }]}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input 
                placeholder="ZH 或 EN"
                size="large"
                style={{ borderRadius: EYBorderRadius.md }}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
