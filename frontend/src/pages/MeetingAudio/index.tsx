import React, { useRef, useState } from 'react';
import { Card, Button, Input, Alert, Space, Row, Col, Upload, message, Typography, Divider } from 'antd';
import { ThunderboltOutlined, StopOutlined, AudioOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import MarkdownPreview from '../../components/common/MarkdownPreview';
import ExportButton from '../../components/common/ExportButton';
import CustomPromptPanel from '../../components/common/CustomPromptPanel';
import { useSSE } from '../../hooks/useSSE';
import { optimizePrompt } from '../../api/prompt.api';
import { EYColors, EYTypography, EYSpacing, EYBorderRadius, EYShadows } from '../../styles/ey-theme';

const { TextArea } = Input;
const { Dragger } = Upload;
const { Text, Title } = Typography;

export default function MeetingAudio() {
  const [meetingContent, setMeetingContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const contentRef = useRef('');
  const [displayContent, setDisplayContent] = useState('');
  
  // 自定义提示词状态
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [optimizing, setOptimizing] = useState(false);

  const { status, error, start, cancel } = useSSE({
    url: '/api/documents/meeting-summary/stream',
    onChunk: (chunk) => {
      contentRef.current += chunk;
      setDisplayContent(contentRef.current);
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
        context: '从会议录音文本生成会议纪要',
        requirements: ['结构清晰', '重点突出'],
      });
      setCustomPrompt(optimized);
      message.success('提示词已优化');
    } catch (error) {
      message.error('优化失败：' + (error as Error).message);
    } finally {
      setOptimizing(false);
    }
  };

  const handleGenerate = () => {
    if (!meetingContent.trim() && uploadedFiles.length === 0) {
      message.warning('请输入会议记录或上传文件');
      return;
    }

    contentRef.current = '';
    setDisplayContent('');
    
    start({ 
      text: meetingContent || '从上传的文件中提取的内容',
      // 只有勾选且非空时才传递自定义提示词
      ...(useCustomPrompt && customPrompt.trim() ? { customSystemPrompt: customPrompt } : {}),
    });
  };

  const uploadProps = {
    name: 'files',
    multiple: true,
    accept: '.pdf,.doc,.docx,.txt,.mp3,.wav,.m4a',
    beforeUpload: (file: File) => {
      const isValidType = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
      ].includes(file.type) || /\.(pdf|doc|docx|txt|mp3|wav|m4a)$/i.test(file.name);
      
      if (!isValidType) {
        message.error(`${file.name} 不是支持的文件类型`);
        return false;
      }
      
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error(`${file.name} 文件大小超过 10MB`);
        return false;
      }
      
      setUploadedFiles(prev => [...prev, file]);
      return false;
    },
    onRemove: (file: UploadFile) => {
      const originalFile = file.originFileObj;
      if (originalFile) {
        setUploadedFiles(prev => prev.filter(f => f !== originalFile));
      }
    },
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
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
          <AudioOutlined style={{ marginRight: EYSpacing.md, color: EYColors.yellow }} />
          会议纪要智能生成
        </Title>
        <Text style={{ 
          marginTop: EYSpacing.sm, 
          display: 'block',
          color: EYColors.mediumGray,
          fontSize: EYTypography.sizes.md
        }}>
          基于AI技术，从会议录音或文字记录中智能提取关键信息，自动生成结构化会议纪要文档
        </Text>
      </div>

      <Row gutter={EYSpacing.xxl}>
        {/* Left Panel - Input Area */}
        <Col span={11}>
          <Space direction="vertical" style={{ width: '100%' }} size={EYSpacing.lg}>
            
            {/* Input Method 1: Text */}
            <Card 
              title={
                <span style={{ fontWeight: EYTypography.weights.semibold, fontSize: EYTypography.sizes.lg }}>
                  <FileTextOutlined style={{ marginRight: EYSpacing.sm, color: EYColors.yellow }} />
                  方式一：直接输入
                </span>
              }
              size="small"
              style={{ 
                borderRadius: EYBorderRadius.lg,
                boxShadow: EYShadows.sm,
                border: `1px solid ${EYColors.borderGray}`
              }}
              headStyle={{
                borderBottom: `2px solid ${EYColors.yellow}`,
                background: 'rgba(255,230,0,0.03)'
              }}
            >
              <TextArea
                placeholder="在此粘贴会议记录、需求访谈记录、客户沟通邮件等内容..."
                rows={10}
                value={meetingContent}
                onChange={(e) => setMeetingContent(e.target.value)}
                style={{ 
                  fontSize: EYTypography.sizes.md,
                  borderRadius: EYBorderRadius.md,
                  borderColor: EYColors.borderGray
                }}
              />
            </Card>
            
            {/* Divider with EY Yellow */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              margin: `${EYSpacing.md}px 0`
            }}>
              <Divider style={{ flex: 1, margin: 0, borderColor: EYColors.borderGray }} />
              <Text style={{ 
                padding: `0 ${EYSpacing.md}px`,
                color: EYColors.mediumGray,
                fontSize: EYTypography.sizes.sm,
                fontWeight: EYTypography.weights.medium
              }}>
                或
              </Text>
              <Divider style={{ flex: 1, margin: 0, borderColor: EYColors.borderGray }} />
            </div>

            {/* Input Method 2: File Upload */}
            <Card 
              title={
                <span style={{ fontWeight: EYTypography.weights.semibold, fontSize: EYTypography.sizes.lg }}>
                  <UploadOutlined style={{ marginRight: EYSpacing.sm, color: EYColors.yellow }} />
                  方式二：上传文件
                </span>
              }
              size="small"
              style={{ 
                borderRadius: EYBorderRadius.lg,
                boxShadow: EYShadows.sm,
                border: `1px solid ${EYColors.borderGray}`
              }}
              headStyle={{
                borderBottom: `2px solid ${EYColors.yellow}`,
                background: 'rgba(255,230,0,0.03)'
              }}
            >
              <Dragger 
                {...uploadProps} 
                style={{ 
                  padding: `${EYSpacing.xl}px 0`,
                  borderRadius: EYBorderRadius.lg,
                  border: `2px dashed ${EYColors.borderGray}`,
                  background: EYColors.lightGray
                }}
              >
                <p className="ant-upload-drag-icon">
                  <UploadOutlined style={{ fontSize: 40, color: EYColors.yellow }} />
                </p>
                <p className="ant-upload-text" style={{ 
                  fontSize: EYTypography.sizes.lg,
                  fontWeight: EYTypography.weights.medium,
                  color: EYColors.deepGray
                }}>
                  点击或拖拽文件到此区域
                </p>
                <p className="ant-upload-hint" style={{ 
                  fontSize: EYTypography.sizes.sm,
                  color: EYColors.mediumGray,
                  marginTop: EYSpacing.sm
                }}>
                  支持 PDF、Word、TXT 文本文件或 MP3/WAV/M4A 音频文件<br/>
                  单个文件不超过 10MB
                </p>
              </Dragger>
              
              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: EYSpacing.md }}>
                  <Text type="secondary" style={{ fontSize: EYTypography.sizes.sm }}>
                    ✓ 已上传 {uploadedFiles.length} 个文件
                  </Text>
                </div>
              )}
            </Card>
            
            {/* Action Buttons - EY Style */}
            <Card 
              size="small"
              style={{ 
                borderRadius: EYBorderRadius.lg,
                boxShadow: EYShadows.sm,
                border: `1px solid ${EYColors.borderGray}`,
                background: EYColors.white
              }}
            >
              {/* Custom Prompt Panel */}
              <CustomPromptPanel
                enabled={useCustomPrompt}
                customPrompt={customPrompt}
                onEnabledChange={setUseCustomPrompt}
                onPromptChange={setCustomPrompt}
                onOptimizePrompt={handleOptimizePrompt}
                optimizing={optimizing}
                placeholder="定义AI生成会议纪要的特定要求，如：强调行动项、包含决策记录等..."
              />

              <Space size={EYSpacing.md}>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  disabled={(!meetingContent.trim() && uploadedFiles.length === 0) || status === 'loading' || status === 'generating'}
                  loading={status === 'loading'}
                  onClick={handleGenerate}
                  style={{
                    height: 40,
                    padding: `0 ${EYSpacing.xl}px`,
                    fontWeight: EYTypography.weights.semibold,
                    fontSize: EYTypography.sizes.md,
                    borderRadius: EYBorderRadius.md,
                    background: EYColors.yellow,
                    color: EYColors.deepGray,
                    border: 'none'
                  }}
                >
                  生成会议纪要
                </Button>
                
                {(status === 'loading' || status === 'generating') && (
                  <Button 
                    icon={<StopOutlined />} 
                    onClick={cancel}
                    style={{
                      height: 40,
                      padding: `0 ${EYSpacing.lg}px`,
                      fontWeight: EYTypography.weights.medium,
                      borderRadius: EYBorderRadius.md,
                      borderColor: EYColors.error,
                      color: EYColors.error
                    }}
                  >
                    停止生成
                  </Button>
                )}
              </Space>
              
              {error && (
                <Alert 
                  type="error" 
                  message={error} 
                  showIcon 
                  style={{ marginTop: EYSpacing.md, borderRadius: EYBorderRadius.md }}
                />
              )}
            </Card>
          </Space>
        </Col>

        {/* Right Panel - Output Area */}
        <Col span={13}>
          <Card
            title={
              <span style={{ fontWeight: EYTypography.weights.semibold, fontSize: EYTypography.sizes.lg }}>
                📄 生成的会议纪要
              </span>
            }
            size="small"
            style={{ 
              height: '100%',
              borderRadius: EYBorderRadius.lg,
              boxShadow: EYShadows.md,
              border: `1px solid ${EYColors.borderGray}`
            }}
            headStyle={{
              borderBottom: `2px solid ${EYColors.yellow}`,
              background: 'rgba(255,230,0,0.03)'
            }}
            extra={
              displayContent && (
                <ExportButton
                  content={displayContent}
                  filename="Meeting_Summary"
                />
              )
            }
          >
            {displayContent ? (
              <MarkdownPreview
                content={displayContent}
                style={{ 
                  maxHeight: 700, 
                  overflowY: 'auto', 
                  padding: EYSpacing.lg,
                  fontSize: EYTypography.sizes.md,
                  lineHeight: EYTypography.lineHeights.relaxed
                }}
              />
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: `${EYSpacing.xxxl}px 0`,
                color: EYColors.mediumGray
              }}>
                <div style={{ 
                  fontSize: 64, 
                  fontWeight: EYTypography.weights.black, 
                  color: EYColors.yellow, 
                  fontFamily: EYTypography.headingFontFamily, 
                  letterSpacing: EYTypography.letterSpacings.tight,
                  marginBottom: EYSpacing.lg
                }}>
                  EY
                </div>
                <div style={{ 
                  fontSize: EYTypography.sizes.lg, 
                  color: EYColors.deepGray,
                  fontWeight: EYTypography.weights.semibold,
                  marginBottom: EYSpacing.sm
                }}>
                  生成的会议纪要将在此处显示
                </div>
                <div style={{ 
                  fontSize: EYTypography.sizes.sm, 
                  color: EYColors.mediumGray 
                }}>
                  <AudioOutlined style={{ marginRight: EYSpacing.xs }} />
                  支持从会议录音或文字记录智能提取关键信息
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
