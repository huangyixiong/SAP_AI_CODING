import React, { useState } from 'react';
import { Input, Select, Button, Table, Space, Tag, Alert } from 'antd';
import { SearchOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { searchSAPObjects } from '../../api/sap.api';
import { SAPObject } from '../../types';

const OBJECT_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'PROG', label: 'PROG - 程序' },
  { value: 'CLAS', label: 'CLAS - 类' },
  { value: 'FUGR', label: 'FUGR - 函数组' },
  { value: 'INTF', label: 'INTF - 接口' },
  { value: 'DTEL', label: 'DTEL - 数据元素' },
  { value: 'TABL', label: 'TABL - 数据库表' },
];

interface ObjectSearchInputProps {
  onSelect: (object: SAPObject | null) => void;
  selectedObject?: SAPObject | null;
}

export default function ObjectSearchInput({ onSelect, selectedObject }: ObjectSearchInputProps) {
  const [query, setQuery] = useState('');
  const [objectType, setObjectType] = useState('');
  const [results, setResults] = useState<SAPObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchSAPObjects(query.trim(), objectType || undefined);
      setResults(data);
      if (data.length === 0) setError('未找到匹配的 SAP 对象');
    } catch (err) {
      setError((err as Error).message || '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '对象名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <code style={{ fontSize: 13 }}>{name}</code>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <Tag style={{ background: '#2E2E38', color: '#FFE600', border: 'none', borderRadius: 0, fontWeight: 600, fontSize: 11 }}>
          {type}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '包',
      dataIndex: 'packageName',
      key: 'packageName',
      width: 120,
      render: (pkg: string) => <span style={{ color: '#747480', fontSize: 12 }}>{pkg}</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 96,
      render: (_: unknown, record: SAPObject) => {
        const isSelected = selectedObject?.objectUrl === record.objectUrl;
        return (
          <Button
            size="small"
            type={isSelected ? 'primary' : 'default'}
            danger={isSelected}
            icon={isSelected ? <CloseCircleOutlined /> : undefined}
            onClick={() => onSelect(isSelected ? null : record)}
          >
            {isSelected ? '取消' : '选择'}
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
        <Select
          options={OBJECT_TYPES}
          value={objectType}
          onChange={setObjectType}
          style={{ width: 160 }}
        />
        <Input
          placeholder="输入程序名（支持通配符，如 ZMM*）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPressEnter={handleSearch}
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          loading={loading}
          onClick={handleSearch}
        >
          搜索
        </Button>
      </Space.Compact>

      {error && <Alert type="warning" message={error} style={{ marginBottom: 12 }} showIcon />}

      {results.length > 0 && (
        <Table
          dataSource={results}
          columns={columns}
          rowKey="objectUrl"
          size="small"
          pagination={{ pageSize: 5, size: 'small' }}
          rowClassName={(record) =>
            selectedObject?.objectUrl === record.objectUrl ? 'ant-table-row-selected' : ''
          }
        />
      )}
    </div>
  );
}
