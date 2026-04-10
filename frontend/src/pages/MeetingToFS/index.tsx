import React, { useRef, useState } from 'react';
import { Card, Button, Input, Alert, Space, Row, Col } from 'antd';
import { ThunderboltOutlined, StopOutlined } from '@ant-design/icons';
import MarkdownPreview from '../../components/common/MarkdownPreview';
import ExportButton from '../../components/common/ExportButton';
import { useSSE } from '../../hooks/useSSE';

const { TextArea } = Input;

export default function MeetingToFS() {
  const [meetingContent, setMeetingContent] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const contentRef = useRef('');
  const [displayContent, setDisplayContent] = useState('');

  const { status, error, start, cancel } = useSSE({
    url: '/api/documents/fs-from-meeting/stream',
    onChunk: (chunk) => {
      contentRef.current += chunk;
      setDisplayContent(contentRef.current);
    },
  });

  const handleGenerate = () => {
    if (!meetingContent.trim()) return;
    contentRef.current = '';
    setDisplayContent('');
    start({
      meetingContent,
      projectContext: projectContext.trim() || undefined,
    });
  };

  return (
    <Row gutter={16} style={{ width: '100%' }}>
      <Col span={11}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Card title="会议记录 / 需求文档" size="small">
            <TextArea
              placeholder="在此粘贴会议记录、需求访谈记录、客户沟通邮件等内容..."
              rows={20}
              value={meetingContent}
              onChange={(e) => setMeetingContent(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </Card>
          <Card title="项目背景（可选）" size="small">
            <TextArea
              placeholder="补充项目背景信息，如：EY SAP MM 模块实施项目，客户为某制造企业..."
              rows={4}
              value={projectContext}
              onChange={(e) => setProjectContext(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </Card>
          <Space>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              disabled={!meetingContent.trim() || status === 'loading' || status === 'generating'}
              loading={status === 'loading'}
              onClick={handleGenerate}
            >
              生成 FS 文档
            </Button>
            {(status === 'loading' || status === 'generating') && (
              <Button icon={<StopOutlined />} onClick={cancel}>
                停止
              </Button>
            )}
          </Space>
          {error && <Alert type="error" message={error} showIcon />}
        </Space>
      </Col>

      <Col span={13}>
        <Card
          title="生成的 FS 文档"
          size="small"
          style={{ height: '100%' }}
          extra={
            displayContent && (
              <ExportButton
                content={displayContent}
                filename="FS_from_meeting"
              />
            )
          }
        >
          {displayContent ? (
            <MarkdownPreview
              content={displayContent}
              style={{ maxHeight: 680, overflowY: 'auto', padding: 8 }}
            />
          ) : (
            <div style={{ color: '#747480', textAlign: 'center', padding: '100px 0' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#FFE600', fontFamily: 'Arial Black, Arial, sans-serif', letterSpacing: -1 }}>EY</div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#747480' }}>生成的功能说明书将在此处显示</div>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
}
