import React, { useRef, useState } from 'react';
import { Card, Button, Alert, Steps, Space, Typography, Upload } from 'antd';
import { ThunderboltOutlined, StopOutlined, UploadOutlined } from '@ant-design/icons';
import mammoth from 'mammoth';
import ObjectSearchInput from '../../components/sap/ObjectSearchInput';
import SourceAnalysisPanel from '../../components/sap/SourceAnalysis';
import MarkdownPreview from '../../components/common/MarkdownPreview';
import ExportButton from '../../components/common/ExportButton';
import { useSSE } from '../../hooks/useSSE';
import { SAPObject, RelatedObject, SourceAnalysis } from '../../types';
import { EYSpacing, EYTypography } from '../../styles/ey-theme';

const { Text } = Typography;

export default function SourceToTS() {
  const [selectedObject, setSelectedObject] = useState<SAPObject | null>(null);
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const [checkedRelated, setCheckedRelated] = useState<RelatedObject[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const contentRef = useRef('');
  const [displayContent, setDisplayContent] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateFileName, setTemplateFileName] = useState('');

  const { status, error, start, cancel } = useSSE({
    url: '/api/documents/ts/stream',
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
      ...(templateContent ? { templateContent } : {}),
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

      {/* Step 2: Source + Related Objects — shows after object selected */}
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
          title="第三步：生成 Technical Specification"
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
                  ? `生成 TS 文档（含 ${checkedRelated.length} 个关联对象）`
                  : '生成 TS 文档'}
              </Button>
            </Space>
          }
        >
          {/* Template upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: EYSpacing.sm, marginBottom: EYSpacing.md }}>
            <Upload
              accept=".docx"
              showUploadList={false}
              beforeUpload={(file) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                  const arrayBuffer = e.target?.result as ArrayBuffer;
                  const result = await mammoth.extractRawText({ arrayBuffer });
                  setTemplateContent(result.value);
                  setTemplateFileName(file.name);
                };
                reader.readAsArrayBuffer(file);
                return false;
              }}
              style={{ display: 'inline-block' }}
            >
              <Button icon={<UploadOutlined />} size="small">
                {templateFileName || '上传 Word 模板（可选）'}
              </Button>
            </Upload>
            {templateFileName && (
              <Text type="secondary" style={{ fontSize: EYTypography.sizes.xs }}>
                {templateFileName}
              </Text>
            )}
            {templateFileName && (
              <Button
                type="link"
                size="small"
                danger
                onClick={() => { setTemplateContent(''); setTemplateFileName(''); }}
                style={{ padding: 0, height: 'auto' }}
              >
                移除
              </Button>
            )}
          </div>

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
              filename={`TS_${selectedObject?.name || 'document'}`}
            />
          }
        >
          <MarkdownPreview
            content={displayContent}
            style={{ maxHeight: 600, overflowY: 'auto', padding: 8 }}
          />
          {status === 'done' && (
            <Alert
              type="warning"
              showIcon
              message="本文档由 AI 自动生成，内容仅供参考，请务必人工复核后使用"
              style={{ marginTop: 12 }}
            />
          )}
        </Card>
      )}
    </Space>
  );
}
