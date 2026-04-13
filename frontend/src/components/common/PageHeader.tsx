import React from 'react';
import { Typography } from 'antd';
import { EYColors, EYTypography, EYSpacing, EYBorderRadius, EYShadows, EYAnimations } from '../../styles/ey-theme';

const { Title, Text } = Typography;

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

/**
 * EY风格的页面头部组件
 * 带有动画效果和悬停交互
 */
export default function PageHeader({ icon, title, description }: PageHeaderProps) {
  return (
    <div 
      style={{ 
        marginBottom: EYSpacing.xxl,
        padding: `${EYSpacing.xl}px ${EYSpacing.xxl}px`,
        background: EYColors.white,
        borderRadius: EYBorderRadius.lg,
        boxShadow: EYShadows.sm,
        borderLeft: `5px solid ${EYColors.yellow}`,
        transition: EYAnimations.transitions.boxShadow,
        animation: EYAnimations.fadeIn.animation,
        cursor: 'default',
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
        {icon}
        <span style={{ marginLeft: EYSpacing.md }}>{title}</span>
      </Title>
      <Text style={{ 
        marginTop: EYSpacing.sm, 
        display: 'block',
        color: EYColors.mediumGray,
        fontSize: EYTypography.sizes.md,
        lineHeight: EYTypography.lineHeights.relaxed
      }}>
        {description}
      </Text>
    </div>
  );
}
