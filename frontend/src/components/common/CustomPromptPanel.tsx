import React from 'react';
import { Checkbox, Input, Button, Space, Tooltip, Typography } from 'antd';
import { RocketOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { EYColors, EYBorderRadius, EYSpacing, EYTypography } from '../../styles/ey-theme';

const { TextArea } = Input;
const { Text } = Typography;

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
  const handleReset = () => {
    onEnabledChange(false);
    onPromptChange('');
  };

  return (
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
        
        {defaultPrompt && (
          <Tooltip title="查看系统默认提示词">
            <Button
              type="text"
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => {
                // TODO: 实现弹窗显示默认提示词
                console.log('Default prompt:', defaultPrompt);
              }}
            />
          </Tooltip>
        )}
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
  );
}
