import React from 'react';
import { Card as AntCard } from 'antd';
import type { CardProps } from 'antd';
import { EYColors, EYBorderRadius, EYShadows, EYAnimations, EYSpacing } from '../../styles/ey-theme';

interface EYCardProps extends Omit<CardProps, 'title'> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  hoverable?: boolean;
}

/**
 * EY风格的卡片组件
 * 带有黄色顶部分隔线和悬停动画效果
 */
export default function EYCard({ 
  title, 
  icon, 
  children, 
  hoverable = true,
  style,
  headStyle,
  bodyStyle,
  ...props 
}: EYCardProps) {
  const cardTitle = title ? (
    <span style={{ fontWeight: 600, fontSize: 14 }}>
      {icon && <span style={{ marginRight: 8, color: EYColors.yellow }}>{icon}</span>}
      {title}
    </span>
  ) : undefined;

  return (
    <AntCard
      title={cardTitle}
      size="small"
      {...props}
      style={{
        borderRadius: EYBorderRadius.lg,
        boxShadow: EYShadows.sm,
        border: `1px solid ${EYColors.borderGray}`,
        transition: EYAnimations.transitions.all,
        ...style,
      }}
      headStyle={{
        borderBottom: `2px solid ${EYColors.yellow}`,
        background: 'rgba(255,230,0,0.03)',
        padding: `${EYSpacing.md}px ${EYSpacing.lg}px`,
        ...headStyle,
      }}
      bodyStyle={{
        padding: EYSpacing.lg,
        ...bodyStyle,
      }}
      hoverable={hoverable}
      className="ey-card"
    >
      {children}
    </AntCard>
  );
}

// 添加全局CSS样式
if (typeof document !== 'undefined') {
  const styleId = 'ey-card-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .ey-card {
        transition: all 0.2s ease !important;
      }
      .ey-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(46,46,56,0.12) !important;
      }
    `;
    document.head.appendChild(style);
  }
}
