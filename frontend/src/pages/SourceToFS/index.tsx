import React, { useRef, useState } from 'react';
import { Card, Button, Alert, Steps, Space, Typography, Upload, message } from 'antd';
import { ThunderboltOutlined, StopOutlined, UploadOutlined } from '@ant-design/icons';
import mammoth from 'mammoth';
import ObjectSearchInput from '../../components/sap/ObjectSearchInput';
import SourceAnalysisPanel from '../../components/sap/SourceAnalysis';
import MarkdownPreview from '../../components/common/MarkdownPreview';
import ExportButton from '../../components/common/ExportButton';
import CustomPromptPanel from '../../components/common/CustomPromptPanel';
import { useSSE } from '../../hooks/useSSE';
import { optimizePrompt } from '../../api/prompt.api';
import { SAPObject, RelatedObject, SourceAnalysis } from '../../types';
import { EYSpacing, EYTypography } from '../../styles/ey-theme';

const { Text } = Typography;

export default function SourceToFS() {
  const [selectedObject, setSelectedObject] = useState<SAPObject | null>(null);
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const [checkedRelated, setCheckedRelated] = useState<RelatedObject[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const contentRef = useRef('');
  const [displayContent, setDisplayContent] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateFileName, setTemplateFileName] = useState('');
  
  // 自定义提示词状态
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [optimizing, setOptimizing] = useState(false);

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

  // 优化提示词
  const handleOptimizePrompt = async () => {
    if (!customPrompt.trim()) {
      message.warning('请先输入提示词内容');
      return;
    }

    setOptimizing(true);
    try {
      const optimized = await optimizePrompt({
        currentPrompt: customPrompt,
        context: '从SAP ABAP源码生成功能规格书(FS)',
        requirements: ['保持业务导向', '增强可读性'],
      });
      setCustomPrompt(optimized);
      message.success('提示词已优化');
    } catch (error) {
      message.error('优化失败：' + (error as Error).message);
    } finally {
      setOptimizing(false);
    }
  };

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
      // 只有勾选且非空时才传递自定义提示词
      ...(useCustomPrompt && customPrompt.trim() ? { customSystemPrompt: customPrompt } : {}),
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
          {/* Template upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: EYSpacing.sm, marginBottom: EYSpacing.md }}>
            <Upload
              accept=".docx"
              showUploadList={false}
              beforeUpload={(file) => {
                if (!file.name.toLowerCase().endsWith('.docx')) {
                  message.error('仅支持上传 .docx 模板文件');
                  return false;
                }
                const reader = new FileReader();
                reader.onload = async (e) => {
                  try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    if (!arrayBuffer) {
                      throw new Error('模板读取失败');
                    }
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    setTemplateContent(result.value);
                    setTemplateFileName(file.name);
                  } catch (err) {
                    message.error(`模板解析失败：${(err as Error).message}`);
                    setTemplateContent('');
                    setTemplateFileName('');
                  }
                };
                reader.onerror = () => {
                  message.error('模板读取失败，请重试');
                  setTemplateContent('');
                  setTemplateFileName('');
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

          {/* Custom Prompt Panel */}
          <CustomPromptPanel
            enabled={useCustomPrompt}
            customPrompt={customPrompt}
            onEnabledChange={setUseCustomPrompt}
            onPromptChange={setCustomPrompt}
            onOptimizePrompt={handleOptimizePrompt}
            optimizing={optimizing}
            placeholder="定义AI生成FS文档的特定要求，如：强调业务流程、包含用户界面原型说明等..."
          />

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
