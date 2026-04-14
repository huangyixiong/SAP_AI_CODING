import React, { useRef, useState } from 'react';
import { Card, Button, Input, Alert, Space, Row, Col, Typography, Divider, message } from 'antd';
import { ThunderboltOutlined, StopOutlined, TeamOutlined, FileTextOutlined } from '@ant-design/icons';
import MarkdownPreview from '../../components/common/MarkdownPreview';
import ExportButton from '../../components/common/ExportButton';
import CustomPromptPanel from '../../components/common/CustomPromptPanel';
import { useSSE } from '../../hooks/useSSE';
import { optimizePrompt } from '../../api/prompt.api';
import { EYColors, EYTypography, EYSpacing, EYBorderRadius, EYShadows, EYAnimations } from '../../styles/ey-theme';

const { TextArea } = Input;
const { Title, Text } = Typography;

export default function MeetingToFS() {
  const [meetingContent, setMeetingContent] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const contentRef = useRef('');
  const [displayContent, setDisplayContent] = useState('');
  
  // 自定义提示词状态
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [optimizing, setOptimizing] = useState(false);

  const { status, error, start, cancel } = useSSE({
    url: '/api/documents/fs-from-meeting/stream',
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
        context: '从会议纪要生成功能规格书(FS)',
        requirements: ['保持业务导向', '结构清晰'],
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
    if (!meetingContent.trim()) return;
    contentRef.current = '';
    setDisplayContent('');
    start({
      meetingContent,
      projectContext: projectContext.trim() || undefined,
      // 只有勾选且非空时才传递自定义提示词
      ...(useCustomPrompt && customPrompt.trim() ? { customSystemPrompt: customPrompt } : {}),
    });
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
      {/* Page Header - EY Style with Animation */}
      <div style={{ 
        marginBottom: EYSpacing.xxl,
        padding: `${EYSpacing.xl}px ${EYSpacing.xxl}px`,
        background: EYColors.white,
        borderRadius: EYBorderRadius.lg,
        boxShadow: EYShadows.sm,
        borderLeft: `5px solid ${EYColors.yellow}`,
        transition: EYAnimations.transitions.boxShadow,
        animation: EYAnimations.fadeIn.animation,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = EYShadows.lg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = EYShadows.sm;
      }}
      >
        <Title level={3} style={{ 
          margin: 0, 
          color: EYColors.deepGray,
          fontWeight: EYTypography.weights.bold,
          fontSize: EYTypography.sizes.xxxl
        }}>
          <TeamOutlined style={{ marginRight: EYSpacing.md, color: EYColors.yellow }} />
          需求转功能规格说明书
        </Title>
        <Text style={{ 
          marginTop: EYSpacing.sm, 
          display: 'block',
          color: EYColors.mediumGray,
          fontSize: EYTypography.sizes.md
        }}>
          将非结构化的会议记录和需求文档，智能转化为标准化的SAP功能规格说明书(FS)
        </Text>
      </div>

      <Row gutter={EYSpacing.xxl}>
        {/* Left Panel - Input Area */}
        <Col span={11}>
          <Space direction="vertical" style={{ width: '100%' }} size={EYSpacing.lg}>
            
            {/* Meeting Content Input */}
            <Card 
              title={
                <span style={{ fontWeight: EYTypography.weights.semibold, fontSize: EYTypography.sizes.lg }}>
                  <FileTextOutlined style={{ marginRight: EYSpacing.sm, color: EYColors.yellow }} />
                  会议记录 / 需求文档
                </span>
              }
              size="small"
              style={{ 
                borderRadius: EYBorderRadius.lg,
                boxShadow: EYShadows.sm,
                border: `1px solid ${EYColors.borderGray}`,
                transition: EYAnimations.transitions.all,
              }}
              headStyle={{
                borderBottom: `2px solid ${EYColors.yellow}`,
                background: 'rgba(255,230,0,0.03)'
              }}
              bodyStyle={{ padding: EYSpacing.lg }}
              hoverable
            >
              <TextArea
                placeholder="在此粘贴会议记录、需求访谈记录、客户沟通邮件等内容..."
                rows={18}
                value={meetingContent}
                onChange={(e) => setMeetingContent(e.target.value)}
                style={{ 
                  fontSize: EYTypography.sizes.md,
                  borderRadius: EYBorderRadius.md,
                  borderColor: EYColors.borderGray,
                  transition: EYAnimations.transitions.all,
                }}
              />
            </Card>
            
            {/* Project Context Input */}
            <Card 
              title={
                <span style={{ fontWeight: EYTypography.weights.semibold, fontSize: EYTypography.sizes.lg }}>
                  💼 项目背景（可选）
                </span>
              }
              size="small"
              style={{ 
                borderRadius: EYBorderRadius.lg,
                boxShadow: EYShadows.sm,
                border: `1px solid ${EYColors.borderGray}`,
                transition: EYAnimations.transitions.all,
              }}
              headStyle={{
                borderBottom: `2px solid ${EYColors.yellow}`,
                background: 'rgba(255,230,0,0.03)'
              }}
              bodyStyle={{ padding: EYSpacing.lg }}
              hoverable
            >
              <TextArea
                placeholder="补充项目背景信息，如：EY SAP MM 模块实施项目，客户为某制造企业..."
                rows={4}
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                style={{ 
                  fontSize: EYTypography.sizes.md,
                  borderRadius: EYBorderRadius.md,
                  borderColor: EYColors.borderGray,
                  transition: EYAnimations.transitions.all,
                }}
              />
            </Card>
            
            {/* Action Buttons - EY Style */}
            <Card 
              size="small"
              style={{ 
                borderRadius: EYBorderRadius.lg,
                boxShadow: EYShadows.sm,
                border: `1px solid ${EYColors.borderGray}`,
                background: EYColors.white,
                transition: EYAnimations.transitions.boxShadow,
              }}
              bodyStyle={{ padding: EYSpacing.lg }}
            >
              {/* Custom Prompt Panel */}
              <CustomPromptPanel
                enabled={useCustomPrompt}
                customPrompt={customPrompt}
                onEnabledChange={setUseCustomPrompt}
                onPromptChange={setCustomPrompt}
                onOptimizePrompt={handleOptimizePrompt}
                optimizing={optimizing}
                placeholder="定义AI从会议纪要生成FS文档的特定要求，如：强调业务流程、包含用户故事等..."
              />

              <Space size={EYSpacing.md}>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  disabled={!meetingContent.trim() || status === 'loading' || status === 'generating'}
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
                    border: 'none',
                    transition: EYAnimations.transitions.all,
                    boxShadow: '0 2px 4px rgba(255,230,0,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,230,0,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(255,230,0,0.3)';
                  }}
                >
                  生成 FS 文档
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
                      color: EYColors.error,
                      transition: EYAnimations.transitions.all,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = EYColors.error;
                      e.currentTarget.style.color = EYColors.white;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = EYColors.error;
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
                  style={{ 
                    marginTop: EYSpacing.md, 
                    borderRadius: EYBorderRadius.md,
                    animation: EYAnimations.fadeIn.animation,
                  }}
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
                📄 生成的 FS 文档
              </span>
            }
            size="small"
            style={{ 
              height: '100%',
              borderRadius: EYBorderRadius.lg,
              boxShadow: EYShadows.md,
              border: `1px solid ${EYColors.borderGray}`,
              transition: EYAnimations.transitions.boxShadow,
            }}
            headStyle={{
              borderBottom: `2px solid ${EYColors.yellow}`,
              background: 'rgba(255,230,0,0.03)'
            }}
            bodyStyle={{ padding: EYSpacing.lg }}
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
                style={{ 
                  maxHeight: 700, 
                  overflowY: 'auto', 
                  padding: EYSpacing.lg,
                  fontSize: EYTypography.sizes.md,
                  lineHeight: EYTypography.lineHeights.relaxed,
                  animation: EYAnimations.fadeIn.animation,
                }}
              />
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: `${EYSpacing.xxxl}px 0`,
                color: EYColors.mediumGray,
                animation: EYAnimations.fadeIn.animation,
              }}>
                <div style={{ 
                  fontSize: 64, 
                  fontWeight: EYTypography.weights.black, 
                  color: EYColors.yellow, 
                  fontFamily: EYTypography.headingFontFamily, 
                  letterSpacing: EYTypography.letterSpacings.tight,
                  marginBottom: EYSpacing.lg,
                  transition: EYAnimations.transitions.transform,
                }}>
                  EY
                </div>
                <div style={{ 
                  fontSize: EYTypography.sizes.lg, 
                  color: EYColors.deepGray,
                  fontWeight: EYTypography.weights.semibold,
                  marginBottom: EYSpacing.sm
                }}>
                  生成的功能规格说明书将在此处显示
                </div>
                <div style={{ 
                  fontSize: EYTypography.sizes.sm, 
                  color: EYColors.mediumGray 
                }}>
                  <TeamOutlined style={{ marginRight: EYSpacing.xs }} />
                  从会议记录和需求文档智能生成功能规格
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
