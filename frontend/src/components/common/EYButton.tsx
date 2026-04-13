import React from 'react';
import { Button as AntButton } from 'antd';
import type { ButtonProps } from 'antd';
import { EYColors, EYTypography, EYBorderRadius, EYAnimations } from '../../styles/ey-theme';

interface EYButtonProps extends Omit<ButtonProps, 'variant'> {
  eyVariant?: 'primary' | 'danger' | 'default';
}

/**
 * EY风格的按钮组件
 * 主按钮使用黄色主题，带有悬停动画
 */
export default function EYButton({ 
  children, 
  eyVariant = 'default',
  style,
  onMouseEnter,
  onMouseLeave,
  ...props 
}: EYButtonProps) {
  const getButtonStyle = () => {
    const baseStyle = {
      height: 40,
      fontWeight: EYTypography.weights.semibold,
      fontSize: 13,
      borderRadius: EYBorderRadius.md,
      transition: EYAnimations.transitions.all,
      ...style,
    };

    if (eyVariant === 'primary') {
      return {
        ...baseStyle,
        background: EYColors.yellow,
        color: EYColors.deepGray,
        border: 'none',
        boxShadow: '0 2px 4px rgba(255,230,0,0.3)',
      };
    }

    if (eyVariant === 'danger') {
      return {
        ...baseStyle,
        borderColor: EYColors.error,
        color: EYColors.error,
      };
    }

    return baseStyle;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (eyVariant === 'primary') {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,230,0,0.5)';
    } else if (eyVariant === 'danger') {
      e.currentTarget.style.background = EYColors.error;
      e.currentTarget.style.color = EYColors.white;
    }
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (eyVariant === 'primary') {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(255,230,0,0.3)';
    } else if (eyVariant === 'danger') {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = EYColors.error;
    }
    onMouseLeave?.(e);
  };

  return (
    <AntButton
      {...props}
      type={eyVariant === 'primary' ? 'primary' : eyVariant === 'danger' ? 'default' : 'default'}
      style={getButtonStyle()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </AntButton>
  );
}
