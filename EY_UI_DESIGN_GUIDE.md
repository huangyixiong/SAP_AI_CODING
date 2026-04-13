# 🎨 EY (安永) UI设计规范

## 📅 设计时间
2026年4月13日

## 🎯 设计理念

基于**EY (Ernst & Young)** 全球品牌视觉识别系统，打造专业、现代、简洁的企业级SAP AI开发平台界面。

---

## 🎨 品牌色彩体系

### 主色调 (Primary Colors)

| 颜色名称 | 色值 | 用途 | 示例 |
|---------|------|------|------|
| **EY Yellow** | `#FFE600` | 品牌主色、强调色、CTA按钮 | <span style="background:#FFE600;padding:4px 12px;">主要按钮</span> |
| **Deep Gray** | `#2E2E38` | 侧边栏背景、标题文字 | <span style="background:#2E2E38;color:white;padding:4px 12px;">深色区域</span> |
| **Pure Black** | `#000000` | 重要文本、Logo | - |
| **Pure White** | `#FFFFFF` | 背景、卡片 | - |

### 辅助色 (Secondary Colors)

| 颜色名称 | 色值 | 用途 |
|---------|------|------|
| **Light Gray** | `#F6F6FA` | 页面背景、次要区域 |
| **Medium Gray** | `#747480` | 次要文字、说明文字 |
| **Border Gray** | `#E8E8ED` | 边框、分隔线 |

### 状态色 (Status Colors)

| 状态 | 色值 | 应用场景 |
|------|------|----------|
| ✅ Success | `#52c41a` | 成功、已连接 |
| ❌ Error | `#ff4d4f` | 错误、未连接 |
| ⚠️ Warning | `#faad14` | 警告、编辑操作 |
| ℹ️ Info | `#1890ff` | 信息、测试连接 |

---

## 📐 排版系统 (Typography)

### 字体家族

```typescript
// 正文字体
fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"

// 标题字体（EY Logo使用）
headingFontFamily: "'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif"
```

### 字号阶梯 (Font Sizes)

| 级别 | 大小 | 用途 | CSS变量 |
|------|------|------|---------|
| XS | 11px | 标签、辅助信息 | `EYTypography.sizes.xs` |
| SM | 12px | 小字说明 | `EYTypography.sizes.sm` |
| MD | 13px | 正文默认 | `EYTypography.sizes.md` |
| LG | 14px | 强调文字 | `EYTypography.sizes.lg` |
| XL | 16px | 小标题 | `EYTypography.sizes.xl` |
| XXL | 18px | 中等标题 | `EYTypography.sizes.xxl` |
| XXXL | 24px | 大标题 | `EYTypography.sizes.xxxl` |
| Display | 32px | EY Logo | `EYTypography.sizes.display` |

### 字重 (Font Weights)

| 级别 | 数值 | 用途 |
|------|------|------|
| Regular | 400 | 普通文本 |
| Medium | 500 | 次要加强 |
| Semibold | 600 | 按钮、标签 |
| Bold | 700 | 标题 |
| Black | 900 | EY Logo |

### 行高 (Line Heights)

- **Tight**: 1.2 - 紧凑布局、Logo
- **Normal**: 1.5 - 正文默认
- **Relaxed**: 1.8 - 长文本阅读

### 字间距 (Letter Spacing)

- **Tight**: `-0.02em` - Logo、大标题
- **Normal**: `0` - 正文
- **Wide**: `0.05em` - 标签、小字
- **Wider**: `0.1em` - 英文大写标语

---

## 📏 间距系统 (Spacing)

基于**8px网格系统**，确保视觉节奏统一：

| 级别 | 数值 | 用途 |
|------|------|------|
| XS | 4px | 微小间距 |
| SM | 8px | 小组件间距 |
| MD | 12px | 常规间距 |
| LG | 16px | 组件内边距 |
| XL | 24px | 组件间距 |
| XXL | 32px | 区块间距 |
| XXXL | 48px | 大区块间距 |

---

## 🔲 圆角系统 (Border Radius)

| 级别 | 数值 | 用途 |
|------|------|------|
| SM | 2px | 小型元素 |
| MD | 4px | 按钮、输入框默认 |
| LG | 8px | 卡片、模态框 |
| XL | 12px | 大型容器 |
| Round | 9999px | 圆形徽章、标签 |

---

## 💫 阴影系统 (Shadows)

| 级别 | 效果 | 用途 |
|------|------|------|
| SM | `0 1px 2px rgba(46,46,56,0.06)` | 卡片轻微浮起 |
| MD | `0 2px 8px rgba(46,46,56,0.08)` | 卡片默认、头部 |
| LG | `0 4px 16px rgba(46,46,56,0.12)` | 悬浮卡片 |
| XL | `0 8px 32px rgba(46,46,56,0.16)` | 模态框、弹出层 |

---

## 🎭 组件设计规范

### 1. 侧边栏 (Sidebar)

**尺寸**:
- 宽度: 280px
- Logo区高度: 80px

**样式**:
```typescript
{
  background: '#2E2E38',
  borderRight: '3px solid #FFE600',
}
```

**Logo区域**:
- EY字体: 32px, Black (900), 黄色
- 副标题: 12px, Bold, 黄色
- 描述: 11px, 白色60%透明度

**导航菜单**:
- 选中背景: `rgba(255,230,0,0.1)`
- 悬停背景: `rgba(255,230,0,0.05)`
- 选中文字: `#FFE600`

**状态面板**:
- 背景: `rgba(0,0,0,0.15)`
- 顶部边框: `1px solid rgba(255,230,0,0.2)`
- 连接指示器: 10px圆形，带发光效果

### 2. 顶部标题栏 (Header)

**尺寸**:
- 高度: 72px
- 左右内边距: 32px

**样式**:
```typescript
{
  background: '#FFFFFF',
  borderBottom: '4px solid #FFE600',
  boxShadow: '0 2px 8px rgba(46,46,56,0.08)'
}
```

**标题文字**:
- 字号: 18px
- 字重: Bold (700)
- 颜色: `#2E2E38`

**标语**:
- 字号: 11px
- 样式: Italic
- 颜色: `#747480`, 80%透明度
- 字间距: `0.06em`

### 3. 卡片 (Card)

**默认样式**:
```typescript
{
  borderRadius: 8,
  boxShadow: '0 1px 2px rgba(46,46,56,0.06)',
  border: '1px solid #E8E8ED'
}
```

**头部样式**:
```typescript
{
  borderBottom: '2px solid #FFE600',
  background: 'rgba(255,230,0,0.03)',
  padding: '12px 16px'
}
```

**标题图标**:
- 颜色: `#FFE600`
- 右边距: 8px

### 4. 按钮 (Button)

**主按钮 (Primary)**:
```typescript
{
  background: '#FFE600',
  color: '#2E2E38',
  border: 'none',
  fontWeight: 600,
  borderRadius: 4,
  height: 40
}
```

**悬停状态**:
- 背景: `#E6CF00`

**激活状态**:
- 背景: `#CCB800`

**危险按钮 (Danger)**:
- 边框颜色: `#ff4d4f`
- 文字颜色: `#ff4d4f`

### 5. 输入框 (Input)

**默认样式**:
```typescript
{
  borderRadius: 4,
  borderColor: '#E8E8ED'
}
```

**悬停/聚焦**:
- 边框颜色: `#FFE600`

**尺寸**:
- 大号: height 40px

### 6. 表格 (Table)

**表头**:
- 背景: `rgba(255,230,0,0.03)`
- 底部边框: `2px solid #FFE600`
- 字体: Semibold

**状态标签**:
- 圆角: 9999px (完全圆形)
- 内边距: `2px 12px`
- 字重: Medium

### 7. 上传组件 (Upload.Dragger)

**样式**:
```typescript
{
  padding: '24px 0',
  borderRadius: 8,
  border: '2px dashed #E8E8ED',
  background: '#F6F6FA'
}
```

**图标**:
- 大小: 40px
- 颜色: `#FFE600`

### 8. 模态框 (Modal)

**确定按钮**:
```typescript
{
  background: '#FFE600',
  color: '#2E2E38',
  border: 'none',
  fontWeight: 600,
  borderRadius: 4
}
```

**标题**:
- 字号: 18px
- 字重: Bold
- 颜色: `#2E2E38`

---

## 🎪 页面布局规范

### 页面容器

```typescript
{
  maxWidth: 1600,  // 或 1400，根据内容
  margin: '0 auto'
}
```

### 页面头部卡片

```typescript
{
  marginBottom: 32,
  padding: '24px 32px',
  background: '#FFFFFF',
  borderRadius: 8,
  boxShadow: '0 1px 2px rgba(46,46,56,0.06)',
  borderLeft: '5px solid #FFE600'
}
```

**标题**:
- 字号: 24px
- 字重: Bold
- 图标颜色: `#FFE600`
- 图标右边距: 12px

**副标题/说明**:
- 字号: 13px
- 颜色: `#747480`
- 上边距: 8px

### 内容区域

- 内边距: 32px
- 背景: `#F6F6FA`
- 列间距 (Row gutter): 32px

---

## ✨ 交互反馈规范

### 加载状态

- 使用Ant Design原生loading
- 主按钮loading时保持黄色背景

### 成功提示

- 颜色: `#52c41a`
- 图标: ✓ CheckCircleOutlined
- 示例: "✓ 连接测试成功"

### 错误提示

- 颜色: `#ff4d4f`
- 图标: ✗ CloseCircleOutlined
- 示例: "✗ 连接失败: [错误信息]"

### 过渡动画

- 默认时长: 0.2s - 0.3s
- 缓动函数: ease
- 应用属性: all / background / box-shadow

---

## 📱 响应式设计

### 断点 (Breakpoints)

- **LG**: 992px - 侧边栏可折叠
- 侧边栏折叠宽度: 0px

### 适配策略

- 侧边栏在小屏幕自动隐藏
- 表格支持横向滚动 (`scroll={{ x: 1200 }}`)
- 卡片布局从多列变为单列

---

## 🎯 设计原则

### 1. 品牌一致性 (Brand Consistency)

- ✅ 所有强调色使用EY黄 `#FFE600`
- ✅ 侧边栏使用深灰 `#2E2E38`
- ✅ Logo严格按照品牌规范
- ✅ 标语 "Building a better working world" 始终显示

### 2. 专业简洁 (Professional & Clean)

- ✅ 大量留白，避免拥挤
- ✅ 清晰的视觉层次
- ✅ 统一的圆角和阴影
- ✅ 克制的色彩使用

### 3. 易用性 (Usability)

- ✅ 明确的视觉反馈
- ✅ 清晰的操作引导
- ✅ 一致的操作模式
- ✅ 即时的状态提示

### 4. 可访问性 (Accessibility)

- ✅ 足够的对比度
- ✅ 清晰的文字大小
- ✅ 明确的状态指示
- ✅ 键盘友好

---

## 🔧 技术实现

### 主题配置文件

位置: `frontend/src/styles/ey-theme.ts`

**导出内容**:
- `EYColors` - 颜色常量
- `EYTypography` - 排版系统
- `EYSpacing` - 间距系统
- `EYBorderRadius` - 圆角系统
- `EYShadows` - 阴影系统
- `eyAntdTheme` - Ant Design主题配置

### 使用方式

```typescript
import { EYColors, EYTypography, EYSpacing, EYBorderRadius, EYShadows } from '../../styles/ey-theme';

// 在组件中使用
<div style={{ 
  color: EYColors.deepGray,
  fontSize: EYTypography.sizes.md,
  padding: EYSpacing.lg,
  borderRadius: EYBorderRadius.md,
  boxShadow: EYShadows.sm
}}>
  内容
</div>
```

### ConfigProvider全局配置

在AppLayout中包裹ConfigProvider：

```typescript
<ConfigProvider theme={eyAntdTheme}>
  {/* 应用内容 */}
</ConfigProvider>
```

---

## 📋 检查清单

### 视觉检查

- [ ] 所有按钮使用EY黄色
- [ ] 侧边栏为深灰色背景
- [ ] 标题栏有黄色底边框
- [ ] 卡片有黄色顶部分隔线
- [ ] Logo符合品牌规范
- [ ] 标语正确显示

### 功能检查

- [ ] 所有交互有视觉反馈
- [ ] 加载状态清晰
- [ ] 错误提示明确
- [ ] 成功提示友好
- [ ] 响应式布局正常

### 代码质量

- [ ] TypeScript无错误
- [ ] 使用主题常量而非硬编码
- [ ] 样式统一管理
- [ ] 组件复用良好

---

## 🎨 设计资源

### 官方资源

- EY Brand Guidelines: https://brand.ey.com
- EY Color Palette: #FFE600 (Yellow), #2E2E38 (Deep Gray)

### 内部文件

- `frontend/src/styles/ey-theme.ts` - 主题配置
- `frontend/src/components/layout/AppLayout.tsx` - 布局组件
- 各页面组件 - 具体实现

---

## 🚀 后续优化建议

1. **暗色主题**: 添加Dark Mode支持
2. **主题切换**: 允许用户自定义主题
3. **动画增强**: 添加页面转场动画
4. **微交互**: 增强按钮点击、悬停效果
5. **无障碍**: 完善ARIA标签和键盘导航
6. **性能优化**: 懒加载、代码分割

---

## ✅ 完成状态

- ✅ EY品牌色彩体系建立
- ✅ 排版系统定义
- ✅ 间距、圆角、阴影系统
- ✅ 核心组件样式规范
- ✅ 页面布局模板
- ✅ 主题配置文件
- ✅ AppLayout重构完成
- ✅ MeetingAudio页面重构完成
- ✅ SAPConfig页面重构完成
- ✅ TypeScript编译通过

---

**设计版本**: v1.0.0  
**完成日期**: 2026-04-13  
**设计师**: Lingma AI Assistant  
**品牌标准**: EY (Ernst & Young) Global Brand Guidelines  

🎨 **EY风格UI系统设计完成！**
