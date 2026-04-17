import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Button, Checkbox, Collapse, Divider, Empty, Modal, Spin, Tag, Typography,
} from 'antd';
import {
  ApiOutlined, CodeOutlined, EyeOutlined, FunctionOutlined, LinkOutlined,
  TableOutlined, FileSearchOutlined, LoadingOutlined,
} from '@ant-design/icons';
import { getSAPObjectSource, analyzeObjectSource } from '../../api/sap.api';
import { createSSEStream } from '../../api/client';
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

function getRelatedObjectKey(obj: RelatedObject): string {
  return obj.objectUrl || `${obj.type}:${obj.name}`;
}

export default function SourceAnalysisPanel({
  selectedObject,
  onReady,
  onCheckedChange,
}: SourceAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SourceAnalysisData | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());

  // Source viewer modal state
  const [viewObj, setViewObj] = useState<RelatedObject | null>(null);
  const [viewSource, setViewSource] = useState('');
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  // Pseudocode state
  const [pseudocode, setPseudocode] = useState('');
  const [pseudocodeLoading, setPseudocodeLoading] = useState(false);
  const [pseudocodeError, setPseudocodeError] = useState<string | null>(null);
  const pseudocodeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    setCheckedKeys(new Set());

    analyzeObjectSource(selectedObject.objectUrl)
      .then((result) => {
        setData(result);
        const autoChecked = new Set(
          result.relatedObjects
            .filter((o) => o.autoInclude && o.objectUrl)
            .map((o) => getRelatedObjectKey(o))
        );
        setCheckedKeys(autoChecked);
        const checkedList = result.relatedObjects.filter((o) => autoChecked.has(getRelatedObjectKey(o)));
        onReady(result, checkedList);
      })
      .catch((err) => setError(err.message || '读取失败'))
      .finally(() => setLoading(false));
  }, [selectedObject.objectUrl]);

  const handleCheck = (obj: RelatedObject, checked: boolean) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      const key = getRelatedObjectKey(obj);
      checked ? next.add(key) : next.delete(key);
      const checkedList = data?.relatedObjects.filter((o) => next.has(getRelatedObjectKey(o))) ?? [];
      onCheckedChange(checkedList);
      return next;
    });
  };

  const handleViewSource = (obj: RelatedObject, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent checkbox toggle
    setViewObj(obj);
    setViewSource('');
    setViewError(null);
    if (!obj.objectUrl) {
      setViewLoading(false);
      setViewError('该对象暂无可用的 SAP URL，无法读取源码');
      return;
    }
    setViewLoading(true);
    getSAPObjectSource(obj.objectUrl)
      .then((res) => setViewSource(res.source))
      .catch((err) => setViewError(err.message || '读取失败'))
      .finally(() => setViewLoading(false));
  };

  const handleGeneratePseudocode = () => {
    if (!data) return;
    pseudocodeAbortRef.current?.abort();
    setPseudocode('');
    setPseudocodeError(null);
    setPseudocodeLoading(true);
    const pseudocodeRef = { current: '' };
    pseudocodeAbortRef.current = createSSEStream(
      '/api/documents/pseudocode/stream',
      { programName: selectedObject.name, source: data.source },
      (event) => {
        if (event.type === 'chunk') {
          pseudocodeRef.current += event.content as string;
          setPseudocode(pseudocodeRef.current);
        } else if (event.type === 'error') {
          setPseudocodeError((event.message as string) || '生成失败');
          setPseudocodeLoading(false);
        } else if (event.type === 'done') {
          setPseudocodeLoading(false);
        }
      },
      () => setPseudocodeLoading(false),
      (err) => { setPseudocodeError(err.message); setPseudocodeLoading(false); }
    );
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
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>
                <CodeOutlined style={{ marginRight: 6 }} />
                源码预览
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  {data.lineCount} 行 / {(data.source.length / 1024).toFixed(1)} KB
                </Text>
              </span>
              <Button
                size="small"
                icon={pseudocodeLoading ? <LoadingOutlined /> : <FileSearchOutlined />}
                onClick={(e) => { e.stopPropagation(); handleGeneratePseudocode(); }}
                disabled={pseudocodeLoading}
                style={{ marginRight: 8 }}
              >
                {pseudocodeLoading ? '分析中...' : '伪代码说明'}
              </Button>
            </span>
          ),
          children: (
            <>
              {/* Pseudocode result */}
              {(pseudocode || pseudocodeError) && (
                <div
                  style={{
                    background: '#f6f8fa',
                    border: '1px solid #e1e4e8',
                    padding: '12px 16px',
                    marginBottom: 8,
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  {pseudocodeError ? (
                    <Alert type="error" message={pseudocodeError} showIcon />
                  ) : (
                    <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {pseudocode}
                    </pre>
                  )}
                </div>
              )}
              <pre
                style={{
                  maxHeight: 400,
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
                {data.source}
              </pre>
            </>
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
              勾选后将一并纳入文档生成，点击 <EyeOutlined /> 查看源码
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
                    <div key={getRelatedObjectKey(obj)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Checkbox
                        checked={checkedKeys.has(getRelatedObjectKey(obj))}
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
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        style={{ padding: '0 4px', height: 20, color: '#747480' }}
                        title="查看源码"
                        onClick={(e) => handleViewSource(obj, e)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <Divider style={{ margin: '8px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            已勾选 {checkedKeys.size} 个关联对象
            {checkedKeys.size > 0 && '，将与主程序源码合并后生成文档'}
          </Text>
        </div>
      )}

      {/* Source viewer modal */}
      <Modal
        open={viewObj !== null}
        onCancel={() => setViewObj(null)}
        footer={null}
        width={860}
        title={
          <span>
            <CodeOutlined style={{ marginRight: 8 }} />
            {viewObj?.name}
            {viewObj?.type && (
              <Tag style={{ marginLeft: 8, borderRadius: 0 }}>{viewObj.type}</Tag>
            )}
          </span>
        }
        styles={{ body: { padding: 0 } }}
      >
        {viewLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="正在读取源码..." />
          </div>
        ) : viewError ? (
          <div style={{ padding: 16 }}>
            <Alert type="error" message={`读取失败：${viewError}`} showIcon />
          </div>
        ) : (
          <pre
            style={{
              maxHeight: 560,
              overflow: 'auto',
              margin: 0,
              fontSize: 12,
              lineHeight: 1.6,
              background: '#1e1e2e',
              color: '#cdd6f4',
              padding: '16px 20px',
              borderRadius: 0,
            }}
          >
            {viewSource}
          </pre>
        )}
      </Modal>
    </div>
  );
}
