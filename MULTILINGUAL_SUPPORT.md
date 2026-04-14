# 多语言支持 (i18n)

## 功能概述

AI Assistant 现已支持多语言切换，用户可以在界面右上角选择偏好语言。

## 支持的语言

- **简体中文 (zh-CN)** - 默认语言
- **English (en-US)**
- **日本語 (ja-JP)** ✨ 新增
- **Deutsch (de-DE)** ✨ 新增

## 使用方法

1. 在界面右上角找到语言选择器（带有地球图标 🌐）
2. 点击下拉菜单
3. 选择您偏好的语言
4. 界面将立即切换到所选语言

## 技术实现

### 文件结构

```
frontend/src/
├── i18n/
│   └── locales.ts          # 多语言配置文件
├── store/
│   └── useLanguageStore.ts # 语言状态管理
└── components/layout/
    └── AppLayout.tsx       # 集成语言切换UI
```

### 核心组件

1. **locales.ts** - 翻译配置文件
   - 定义所有支持语言的文本映射
   - 包含菜单项、页面标题、系统状态等文本
   - 当前支持：中文、英文、日语、德语

2. **useLanguageStore.ts** - Zustand状态管理
   - 持久化存储用户语言选择（localStorage）
   - 提供 `language` 和 `setLanguage` API

3. **AppLayout.tsx** - UI集成
   - 右上角语言选择器（Ant Design Select）
   - 动态生成多语言菜单
   - 实时切换界面文本

### 添加新语言

如需添加新语言（如法语、西班牙语等），请按照以下步骤：

1. 在 `locales.ts` 中添加新的语言代码：
```typescript
export type Language = 'zh-CN' | 'en-US' | 'ja-JP' | 'de-DE' | 'fr-FR'; // 添加新语言
```

2. 添加翻译内容：
```typescript
export const locales: Record<Language, LocaleMessages> = {
  // ... 现有语言
  'fr-FR': {
    appTitle: 'Assistant IA',
    sapConnected: 'SAP Connecté',
    // ... 其他翻译
  }
};
```

3. 更新语言选项：
```typescript
export const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'fr-FR', label: 'Français' }, // 新增
];
```

## 注意事项

- 语言选择会自动保存到浏览器本地存储
- 刷新页面后保持上次选择的语言
- 部分第三方组件（如Ant Design）可能需要额外配置才能完全国际化

## 翻译质量

当前翻译由AI自动生成，建议根据实际业务场景进行校对和优化。特别是：
- 专业术语的准确性
- 行业特定用语
- 文化适应性调整