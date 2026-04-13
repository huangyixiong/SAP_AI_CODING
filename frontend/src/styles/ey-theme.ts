/**
 * EY (安永) 品牌设计规范
 * 
 * 主色调:
 * - EY Yellow: #FFE600 (品牌黄)
 * - Deep Gray: #2E2E38 (深灰)
 * - Black: #000000 (纯黑)
 * - White: #FFFFFF (纯白)
 * 
 * 辅助色:
 * - Light Gray: #F6F6FA (浅灰背景)
 * - Medium Gray: #747480 (中灰文字)
 * - Border Gray: #E8E8ED (边框灰)
 */

export const EYColors = {
  // 主色
  yellow: '#FFE600',
  deepGray: '#2E2E38',
  black: '#000000',
  white: '#FFFFFF',
  
  // 辅助色
  lightGray: '#F6F6FA',
  mediumGray: '#747480',
  borderGray: '#E8E8ED',
  
  // 状态色
  success: '#52c41a',
  error: '#ff4d4f',
  warning: '#faad14',
  info: '#1890ff',
} as const;

export const EYTypography = {
  // 字体家族
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  headingFontFamily: "'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  
  // 字号
  sizes: {
    xs: 11,
    sm: 12,
    md: 13,
    lg: 14,
    xl: 16,
    xxl: 18,
    xxxl: 24,
    display: 32,
  },
  
  // 字重
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },
  
  // 行高
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
  
  // 字间距
  letterSpacings: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
  },
} as const;

export const EYSpacing = {
  // 间距系统 (基于8px网格)
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const EYBorderRadius = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  round: 9999,
} as const;

export const EYShadows = {
  sm: '0 1px 2px rgba(46,46,56,0.06)',
  md: '0 2px 8px rgba(46,46,56,0.08)',
  lg: '0 4px 16px rgba(46,46,56,0.12)',
  xl: '0 8px 32px rgba(46,46,56,0.16)',
} as const;

// 动画配置
export const EYAnimations = {
  // 过渡时长
  durations: {
    fast: '0.15s',
    normal: '0.2s',
    slow: '0.3s',
    slower: '0.5s',
  },
  
  // 缓动函数
  easings: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    cubicBezier: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // 常用过渡组合
  transitions: {
    all: 'all 0.2s ease',
    allFast: 'all 0.15s ease',
    allSlow: 'all 0.3s ease',
    background: 'background 0.2s ease',
    boxShadow: 'box-shadow 0.2s ease',
    transform: 'transform 0.2s ease',
    opacity: 'opacity 0.2s ease',
  },
  
  // 悬停效果
  hoverEffects: {
    liftUp: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 16px rgba(46,46,56,0.12)',
    },
    scaleUp: {
      transform: 'scale(1.02)',
    },
    glowYellow: {
      boxShadow: '0 0 12px rgba(255,230,0,0.4)',
    },
  },
  
  // 淡入动画
  fadeIn: {
    keyframes: `
      @keyframes eyFadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,
    animation: 'eyFadeIn 0.3s ease-out',
  },
  
  // 滑入动画
  slideIn: {
    keyframes: `
      @keyframes eySlideIn {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `,
    animation: 'eySlideIn 0.3s ease-out',
  },
  
  // 脉冲动画（用于加载/强调）
  pulse: {
    keyframes: `
      @keyframes eyPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
    `,
    animation: 'eyPulse 2s ease-in-out infinite',
  },
  
  // 闪烁动画（用于黄色强调）
  shimmer: {
    keyframes: `
      @keyframes eyShimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `,
    background: 'linear-gradient(90deg, transparent, rgba(255,230,0,0.1), transparent)',
    backgroundSize: '200% 100%',
    animation: 'eyShimmer 2s linear infinite',
  },
} as const;

// Ant Design 主题配置
export const eyAntdTheme = {
  token: {
    colorPrimary: EYColors.yellow,
    colorSuccess: EYColors.success,
    colorWarning: EYColors.warning,
    colorError: EYColors.error,
    colorInfo: EYColors.info,
    
    // 圆角
    borderRadius: EYBorderRadius.md,
    borderRadiusLG: EYBorderRadius.lg,
    
    // 字体
    fontFamily: EYTypography.fontFamily,
    fontSize: EYTypography.sizes.md,
    
    // 间距
    padding: EYSpacing.lg,
    paddingSM: EYSpacing.md,
    paddingLG: EYSpacing.xl,
    
    // 阴影
    boxShadow: EYShadows.md,
    
    // 动画
    motionDurationMid: EYAnimations.durations.normal,
    motionEaseInOut: EYAnimations.easings.easeInOut,
  },
  components: {
    Button: {
      primaryColor: EYColors.deepGray,
      primaryBg: EYColors.yellow,
      primaryHoverBg: '#E6CF00',
      primaryActiveBg: '#CCB800',
      fontWeight: EYTypography.weights.semibold,
      borderRadius: EYBorderRadius.md,
      controlHeight: 40,
    },
    Card: {
      headerBg: EYColors.white,
      borderRadius: EYBorderRadius.lg,
      boxShadow: EYShadows.sm,
    },
    Input: {
      borderRadius: EYBorderRadius.md,
      hoverBorderColor: EYColors.yellow,
      activeBorderColor: EYColors.yellow,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(255,230,0,0.1)',
      itemSelectedColor: EYColors.yellow,
      itemHoverBg: 'rgba(255,230,0,0.05)',
      motionDurationMid: EYAnimations.durations.fast,
    },
  },
} as const;
