import React, { useEffect, useState } from 'react';
import {
  Alert, Checkbox, Collapse, Spin, Tag, Typography, Empty, Divider
} from 'antd';
import {
  CodeOutlined, LinkOutlined, FunctionOutlined, TableOutlined, ApiOutlined
} from '@ant-design/icons';
import { analyzeObjectSource } from '../../api/sap.api';
import { SAPObject, SourceAnalysis as SourceAnalysisData, RelatedObject } from '../../types';

const { Text } = Typography;

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  include:  { icon: <CodeOutlined />,     label: 'Include',   color: '#1890ff' },
  function: { icon: <FunctionOutlined />, label: '函数模块', color: '#722ed1' },
  class:    { icon: <ApiOutlined />,      label: '类',       color: '#13c2c2' },
  table:    { icon: <TableOutlined />,    label: '数据库表', color: '#fa8c16' },
};

interface SourceAnalysisProps {
  selectedObject: SAPObject;
  onReady: (data: SourceAnalysisData, checked: RelatedObject[]) => void;
  onCheckedChange: (checked: RelatedObject[]) => void;
}

export default function SourceAnalysisPanel({
  selectedObject,
  onReady,
  onCheckedChange,
}: SourceAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SourceAnalysisData | null>(null);
  const [checkedNames, setCheckedNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    setCheckedNames(new Set());

    analyzeObjectSource(selectedObject.objectUrl)
      .then((result) => {
        setData(result);
        // Auto-check includes
        const autoChecked = new Set(
          result.relatedObjects
            .filter((o) => o.autoInclude && o.objectUrl)
            .map((o) => o.name)
        );
        setCheckedNames(autoChecked);
        const checkedList = result.relatedObjects.filter((o) => autoChecked.has(o.name));
        onReady(result, checkedList);
      })
      .catch((err) => setError(err.message || '读取失败'))
      .finally(() => setLoading(false));
  }, [selectedObject.objectUrl]);

  const handleCheck = (obj: RelatedObject, checked: boolean) => {
    setCheckedNames((prev) => {
      const next = new Set(prev);
      checked ? next.add(obj.name) : next.delete(obj.name);
      const checkedList = data?.relatedObjects.filter((o) => next.has(o.name)) ?? [];
      onCheckedChange(checkedList);
      return next;
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <Spin tip="正在读取源码并识别关联对象..." />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={`读取失败：${error}`} showIcon />;
  }

  if (!data) return null;

  const grouped = data.relatedObjects.reduce<Record<string, RelatedObject[]>>((acc, obj) => {
    (acc[obj.category] = acc[obj.category] || []).push(obj);
    return acc;
  }, {});

  return (
    <div>
      {/* Source preview */}
      <Collapse
        size="small"
        style={{ marginBottom: 12 }}
        items={[{
          key: 'src',
          label: (
            <span>
              <CodeOutlined style={{ marginRight: 6 }} />
              源码预览
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {data.lineCount} 行 / {(data.source.length / 1024).toFixed(1)} KB
              </Text>
            </span>
          ),
          children: (
            <pre
              style={{
                maxHeight: 300,
                overflow: 'auto',
                margin: 0,
                fontSize: 12,
                lineHeight: 1.5,
                background: '#1e1e2e',
                color: '#cdd6f4',
                padding: '12px 16px',
                borderRadius: 0,
              }}
            >
              {data.source.slice(0, 8000)}
              {data.source.length > 8000 && (
                <span style={{ color: '#6c7086' }}>
                  {'\n'}... （仅展示前 8000 字符）
                </span>
              )}
            </pre>
          ),
        }]}
      />

      {/* Related objects */}
      {data.relatedObjects.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未检测到关联对象" />
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <LinkOutlined style={{ marginRight: 6, color: '#747480' }} />
            <Text style={{ fontWeight: 600, fontSize: 13 }}>检测到的关联对象</Text>
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              勾选后将一并纳入文档生成
            </Text>
          </div>

          {Object.entries(grouped).map(([category, items]) => {
            const cfg = CATEGORY_CONFIG[category] ?? { icon: <CodeOutlined />, label: category, color: '#8c8c8c' };
            return (
              <div key={category} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</Text>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 20 }}>
                  {items.map((obj) => (
                    <Checkbox
                      key={obj.name}
                      checked={checkedNames.has(obj.name)}
                      onChange={(e) => handleCheck(obj, e.target.checked)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <code style={{ fontSize: 12 }}>{obj.name}</code>
                        <Tag
                          style={{
                            fontSize: 10,
                            padding: '0 4px',
                            margin: 0,
                            borderRadius: 0,
                            background: '#F6F6FA',
                            border: '1px solid #d9d9d9',
                          }}
                        >
                          {obj.type}
                        </Tag>
                      </span>
                    </Checkbox>
                  ))}
                </div>
              </div>
            );
          })}

          <Divider style={{ margin: '8px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            已勾选 {checkedNames.size} 个关联对象
            {checkedNames.size > 0 && '，将与主程序源码合并后生成文档'}
          </Text>
        </div>
      )}
    </div>
  );
}
