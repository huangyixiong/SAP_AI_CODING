import React, { useState } from 'react';
import { Checkbox, Input, Button, Space, Tooltip, Typography, Modal, Tabs, Spin, message } from 'antd';
import { RocketOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { EYColors, EYBorderRadius, EYSpacing, EYTypography } from '../../styles/ey-theme';
import { getDefaultPrompts, DefaultPromptsResponse } from '../../api/prompt.api';

const { TextArea } = Input;
const { Text } = Typography;
const { TabPane } = Tabs;

interface CustomPromptPanelProps {
  enabled: boolean;
  customPrompt: string;
  onEnabledChange: (enabled: boolean) => void;
  onPromptChange: (prompt: string) => void;
  onOptimizePrompt: () => Promise<void>;
  optimizing: boolean;
  placeholder?: string;
  defaultPrompt?: string;
}

export default function CustomPromptPanel({
  enabled,
  customPrompt,
  onEnabledChange,
  onPromptChange,
  onOptimizePrompt,
  optimizing,
  placeholder = '输入自定义提示词，定义AI的角色、任务要求、输出格式等...',
  defaultPrompt,
}: CustomPromptPanelProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [defaultPrompts, setDefaultPrompts] = useState<DefaultPromptsResponse | null>(null);

  const handleReset = () => {
    onEnabledChange(false);
    onPromptChange('');
  };

  const handleViewDefaultPrompts = async () => {
    setModalVisible(true);
    
    // 如果还没有加载过数据，则从API获取
    if (!defaultPrompts) {
      setLoading(true);
      try {
        const prompts = await getDefaultPrompts();
        setDefaultPrompts(prompts);
      } catch (error) {
        message.error('获取默认提示词失败：' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <div
        style={{
          border: `1px solid ${enabled ? EYColors.yellow : EYColors.lightGray}`,
          borderRadius: EYBorderRadius.md,
          padding: EYSpacing.lg,
          background: enabled ? 'rgba(255, 230, 0, 0.03)' : EYColors.white,
          transition: 'all 0.3s ease',
          marginBottom: EYSpacing.lg,
        }}
      >
        {/* Header */}
        <Space style={{ marginBottom: enabled ? EYSpacing.md : 0 }}>
          <Checkbox
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            style={{ fontWeight: EYTypography.weights.semibold }}
          >
            <Text strong>使用自定义提示词</Text>
          </Checkbox>
          
          <Tooltip title="查看系统默认提示词">
            <Button
              type="text"
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={handleViewDefaultPrompts}
            />
          </Tooltip>
        </Space>

        {/* Content Area */}
        {enabled && (
          <>
            <TextArea
              value={customPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={placeholder}
              autoSize={{ minRows: 4, maxRows: 12 }}
              style={{
                marginBottom: EYSpacing.md,
                borderRadius: EYBorderRadius.sm,
                borderColor: EYColors.mediumGray,
              }}
            />

            {/* Action Buttons */}
            <Space>
              <Button
                type="primary"
                icon={<RocketOutlined />}
                onClick={onOptimizePrompt}
                loading={optimizing}
                disabled={!customPrompt.trim()}
                style={{
                  background: EYColors.yellow,
                  color: EYColors.deepGray,
                  borderColor: EYColors.yellow,
                  fontWeight: EYTypography.weights.medium,
                }}
              >
                ✨ 优化提示词
              </Button>

              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={!customPrompt && !enabled}
              >
                恢复默认
              </Button>

              <Text type="secondary" style={{ fontSize: EYTypography.sizes.xs }}>
                {customPrompt.length} 字符
              </Text>
            </Space>

            {/* Tips */}
            <div
              style={{
                marginTop: EYSpacing.md,
                padding: EYSpacing.sm,
                background: 'rgba(255, 230, 0, 0.08)',
                borderRadius: EYBorderRadius.sm,
                borderLeft: `3px solid ${EYColors.yellow}`,
              }}
            >
              <Text style={{ fontSize: EYTypography.sizes.xs, color: EYColors.mediumGray }}>
                💡 提示：可以定义AI的专业角色、具体任务、输出格式要求、编码规范等。
                留空时将使用系统默认提示词。
              </Text>
            </div>
          </>
        )}
      </div>

      {/* Modal for viewing default prompts */}
      <Modal
        title="系统默认提示词"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={900}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : defaultPrompts ? (
          <Tabs defaultActiveKey="ts" tabPosition="left">
            <TabPane tab={defaultPrompts.ts.name} key="ts">
              <div style={{ padding: EYSpacing.md }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: EYSpacing.sm }}>
                  {defaultPrompts.ts.description}
                </Text>
                <TextArea
                  value={defaultPrompts.ts.content}
                  readOnly
                  autoSize={{ minRows: 15, maxRows: 25 }}
                  style={{
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                />
              </div>
            </TabPane>
            <TabPane tab={defaultPrompts.fs.name} key="fs">
              <div style={{ padding: EYSpacing.md }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: EYSpacing.sm }}>
                  {defaultPrompts.fs.description}
                </Text>
                <TextArea
                  value={defaultPrompts.fs.content}
                  readOnly
                  autoSize={{ minRows: 15, maxRows: 25 }}
                  style={{
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                />
              </div>
            </TabPane>
            <TabPane tab={defaultPrompts.code.name} key="code">
              <div style={{ padding: EYSpacing.md }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: EYSpacing.sm }}>
                  {defaultPrompts.code.description}
                </Text>
                <TextArea
                  value={defaultPrompts.code.content}
                  readOnly
                  autoSize={{ minRows: 15, maxRows: 25 }}
                  style={{
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                />
              </div>
            </TabPane>
          </Tabs>
        ) : null}
      </Modal>
    </>
  );
}