import React, { useRef, useState } from 'react';
import {
  Card, Button, Input, Alert, Space, Typography, Row, Col, Steps, Divider, message
} from 'antd';
import { ThunderboltOutlined, StopOutlined, CloudUploadOutlined } from '@ant-design/icons';
import MarkdownPreview from '../../components/common/MarkdownPreview';
import ExportButton from '../../components/common/ExportButton';
import { useSSE } from '../../hooks/useSSE';
import { writeBackToSAP } from '../../api/sap.api';

const { TextArea } = Input;
const { Text } = Typography;

type WriteBackStatus = 'idle' | 'loading' | 'success' | 'error';

export default function FSToCode() {
  const [fsContent, setFsContent] = useState('');
  const [targetProgramName, setTargetProgramName] = useState('');
  const [objectUrl, setObjectUrl] = useState('');
  const [transportNumber, setTransportNumber] = useState('');
  const codeRef = useRef('');
  const [displayCode, setDisplayCode] = useState('');
  const [writeBackStatus, setWriteBackStatus] = useState<WriteBackStatus>('idle');
  const [writeBackError, setWriteBackError] = useState('');

  const { status, error, start, cancel } = useSSE({
    url: '/api/documents/code/stream',
    onChunk: (chunk) => {
      codeRef.current += chunk;
      setDisplayCode(codeRef.current);
    },
  });

  const handleGenerate = () => {
    if (!fsContent.trim()) return;
    codeRef.current = '';
    setDisplayCode('');
    setWriteBackStatus('idle');
    start({ fsContent, targetProgramName: targetProgramName || undefined });
  };

  const handleWriteBack = async () => {
    if (!objectUrl.trim() || !targetProgramName.trim() || !codeRef.current) return;

    // Extract pure ABAP code from markdown code block if wrapped
    let source = codeRef.current;
    const codeBlockMatch = source.match(/```abap\n([\s\S]*?)```/);
    if (codeBlockMatch) source = codeBlockMatch[1];

    setWriteBackStatus('loading');
    setWriteBackError('');
    try {
      const result = await writeBackToSAP({
        objectUrl: objectUrl.trim(),
        objectName: targetProgramName.trim(),
        source,
        transportNumber: transportNumber.trim() || undefined,
      });
      if (result.success) {
        setWriteBackStatus('success');
        message.success('代码已成功写回 SAP 并激活！');
      } else {
        setWriteBackStatus('error');
        setWriteBackError(result.error || '写回失败');
      }
    } catch (err) {
      setWriteBackStatus('error');
      setWriteBackError((err as Error).message);
    }
  };

  const currentStep = status === 'idle' ? 0 : status === 'loading' ? 1 : status === 'generating' ? 2 : 3;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="第一步：输入 FS 文档" size="small" style={{ height: '100%' }}>
            <Input
              placeholder="目标程序名称（如 ZMM_NEW_REPORT）"
              value={targetProgramName}
              onChange={(e) => setTargetProgramName(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <TextArea
              placeholder="在此粘贴功能说明书（FS）内容，支持 Markdown 格式..."
              rows={18}
              value={fsContent}
              onChange={(e) => setFsContent(e.target.value)}
              style={{ fontFamily: 'Consolas, monospace', fontSize: 13 }}
            />
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              block
              style={{ marginTop: 12 }}
              disabled={!fsContent.trim() || status === 'loading' || status === 'generating'}
              loading={status === 'loading'}
              onClick={handleGenerate}
            >
              生成 ABAP 代码
            </Button>
            {(status === 'loading' || status === 'generating') && (
              <Button block style={{ marginTop: 8 }} icon={<StopOutlined />} onClick={cancel}>
                停止生成
              </Button>
            )}
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title="生成的 ABAP 代码"
            size="small"
            style={{ height: '100%' }}
            extra={
              displayCode && (
                <ExportButton
                  content={displayCode}
                  filename={targetProgramName || 'abap_code'}
                  showCopy
                />
              )
            }
          >
            {status !== 'idle' && (
              <Steps
                size="small"
                current={currentStep}
                status={status === 'error' ? 'error' : 'process'}
                style={{ marginBottom: 12 }}
                items={[
                  { title: '等待' },
                  { title: '处理中' },
                  { title: '生成中' },
                  { title: '完成' },
                ]}
              />
            )}
            {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
            {displayCode ? (
              <MarkdownPreview
                content={displayCode}
                style={{ maxHeight: 520, overflowY: 'auto' }}
              />
            ) : (
              <div style={{ color: '#747480', textAlign: 'center', padding: '60px 0', borderTop: '3px solid #FFE600' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#FFE600', fontFamily: 'Arial Black, Arial, sans-serif', letterSpacing: -1 }}>EY</div>
                <div style={{ marginTop: 8, fontSize: 13 }}>生成的 ABAP 代码将在此处显示</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {displayCode && status === 'done' && (
        <Card title="第二步：写回 SAP 系统（可选）" size="small">
          <Row gutter={16} align="middle">
            <Col span={10}>
              <Input
                placeholder="SAP 对象 URL（如 /sap/bc/adt/programs/programs/zmm_xxx）"
                value={objectUrl}
                onChange={(e) => setObjectUrl(e.target.value)}
              />
            </Col>
            <Col span={6}>
              <Input
                placeholder="Transport 编号（可选，如 DEVK900123）"
                value={transportNumber}
                onChange={(e) => setTransportNumber(e.target.value)}
              />
            </Col>
            <Col span={4}>
              <Button
                type="primary"
                danger
                icon={<CloudUploadOutlined />}
                block
                loading={writeBackStatus === 'loading'}
                disabled={!objectUrl.trim() || !targetProgramName.trim() || writeBackStatus === 'loading'}
                onClick={handleWriteBack}
              >
                写回 SAP 并激活
              </Button>
            </Col>
            <Col span={4}>
              {writeBackStatus === 'success' && (
                <Text type="success">✓ 写回并激活成功</Text>
              )}
              {writeBackStatus === 'error' && (
                <Text type="danger">✗ {writeBackError}</Text>
              )}
            </Col>
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            注意：写回操作将直接修改 SAP 系统中的程序源码并激活。请确认程序名称和对象 URL 正确无误。
          </Text>
        </Card>
      )}
    </Space>
  );
}
