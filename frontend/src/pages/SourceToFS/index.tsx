import React, { useRef, useState } from 'react';
import { Card, Button, Alert, Steps, Space, Typography } from 'antd';
import { ThunderboltOutlined, StopOutlined } from '@ant-design/icons';
import ObjectSearchInput from '../../components/sap/ObjectSearchInput';
import SourceAnalysisPanel from '../../components/sap/SourceAnalysis';
import MarkdownPreview from '../../components/common/MarkdownPreview';
import ExportButton from '../../components/common/ExportButton';
import { useSSE } from '../../hooks/useSSE';
import { SAPObject, RelatedObject, SourceAnalysis } from '../../types';

const { Text } = Typography;

export default function SourceToFS() {
  const [selectedObject, setSelectedObject] = useState<SAPObject | null>(null);
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const [checkedRelated, setCheckedRelated] = useState<RelatedObject[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const contentRef = useRef('');
  const [displayContent, setDisplayContent] = useState('');

  const { status, error, start, cancel } = useSSE({
    url: '/api/documents/fs/stream',
    onChunk: (chunk) => {
      contentRef.current += chunk;
      setDisplayContent(contentRef.current);
    },
    onStatusEvent: (event) => {
      if (event.type === 'start') setStatusMsg('正在搜索 SAP 对象...');
      else if (event.type === 'object_found') setStatusMsg(`找到对象：${event.objectName}`);
      else if (event.type === 'source_fetched') setStatusMsg(`已读取主程序源码（${event.lineCount} 行）`);
      else if (event.type === 'fetching_related') setStatusMsg(`正在读取关联对象：${event.objectName}...`);
      else if (event.type === 'related_fetched') setStatusMsg(`已读取关联对象：${event.objectName}`);
      else if (event.type === 'generating') setStatusMsg('正在生成文档...');
      else if (event.type === 'warning') setStatusMsg(`⚠️ ${event.message}`);
    },
  });

  const handleObjectSelect = (obj: SAPObject | null) => {
    setSelectedObject(obj);
    setAnalysis(null);
    setCheckedRelated([]);
    setStatusMsg('');
    contentRef.current = '';
    setDisplayContent('');
  };

  const handleGenerate = () => {
    if (!selectedObject) return;
    contentRef.current = '';
    setDisplayContent('');
    setStatusMsg('');
    start({
      programName: selectedObject.name,
      objectType: selectedObject.type,
      additionalObjects: checkedRelated.map((o) => ({
        name: o.name,
        type: o.type,
        objectUrl: o.objectUrl,
      })),
    });
  };

  const currentStep = (() => {
    if (status === 'idle' || status === 'error') return -1;
    if (status === 'loading') return 0;
    if (status === 'generating') return 1;
    if (status === 'done') return 2;
    return -1;
  })();

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {/* Step 1: Select Object */}
      <Card title="第一步：选择 SAP 对象" size="small">
        <ObjectSearchInput onSelect={handleObjectSelect} selectedObject={selectedObject} />
        {selectedObject && (
          <Alert
            style={{ marginTop: 12 }}
            type="success"
            message={`已选择：${selectedObject.name}（${selectedObject.type}）${selectedObject.description ? ' — ' + selectedObject.description : ''}`}
            showIcon
          />
        )}
      </Card>

      {/* Step 2: Source + Related Objects */}
      {selectedObject && (
        <Card title="第二步：查看源码与关联对象" size="small">
          <SourceAnalysisPanel
            selectedObject={selectedObject}
            onReady={(data, checked) => {
              setAnalysis(data);
              setCheckedRelated(checked);
            }}
            onCheckedChange={setCheckedRelated}
          />
        </Card>
      )}

      {/* Step 3: Generate */}
      {selectedObject && analysis && (
        <Card
          title="第三步：生成 Functional Specification"
          size="small"
          extra={
            <Space>
              {(status === 'loading' || status === 'generating') && (
                <Button icon={<StopOutlined />} onClick={cancel} size="small">
                  停止
                </Button>
              )}
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                disabled={status === 'loading' || status === 'generating'}
                onClick={handleGenerate}
                loading={status === 'loading'}
              >
                {checkedRelated.length > 0
                  ? `生成 FS 文档（含 ${checkedRelated.length} 个关联对象）`
                  : '生成 FS 文档'}
              </Button>
            </Space>
          }
        >
          {status !== 'idle' && currentStep >= 0 && (
            <Steps
              size="small"
              current={currentStep}
              status={status === 'error' ? 'error' : 'process'}
              style={{ marginBottom: 16 }}
              items={[
                { title: '读取源码' },
                { title: '生成中' },
                { title: '完成' },
              ]}
            />
          )}
          {statusMsg && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
              {statusMsg}
            </Text>
          )}
          {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
        </Card>
      )}

      {/* Result */}
      {displayContent && (
        <Card
          title="生成结果"
          size="small"
          extra={
            <ExportButton
              content={displayContent}
              filename={`FS_${selectedObject?.name || 'document'}`}
            />
          }
        >
          <MarkdownPreview
            content={displayContent}
            style={{ maxHeight: 600, overflowY: 'auto', padding: 8 }}
          />
        </Card>
      )}
    </Space>
  );
}
