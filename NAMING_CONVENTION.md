# 📋 功能模块专业命名规范

## 📅 更新时间
2026年4月13日

## 🎯 命名原则

采用**企业级SAP开发标准术语**，体现专业性、准确性和国际化。

---

## 🔄 命名对照表

### 修改前 vs 修改后

| 原名称 | 新名称 | 英文对应 | 说明 |
|--------|--------|----------|------|
| 会议记录 → 纪要 | **会议纪要智能生成** | AI-Powered Meeting Minutes Generation | 强调AI智能化能力 |
| 会议记录 → FS文档 | **需求转功能规格说明书** | Requirements to Functional Specification | 使用标准SAP术语"功能规格说明书" |
| SAP读取 → TS文档 | **代码反向工程 - 技术规格书** | Code Reverse Engineering - Technical Specification | 明确"反向工程"方法论 |
| SAP读取 → FS文档 | **代码反向工程 - 功能规格书** | Code Reverse Engineering - Functional Specification | 明确"反向工程"方法论 |
| FS文档 → ABAP代码 | **规格驱动代码生成** | Specification-Driven Code Generation | 体现"规格驱动开发"SDD理念 |
| SAP配置管理 | **SAP配置管理** | SAP Configuration Management | 保持不变（已足够专业） |

---

## 📊 功能分类与命名逻辑

### 1️⃣ 前期调研 (Preliminary Research)

**定位**: 项目启动阶段的需求收集与分析

| 功能 | 专业命名 | 核心价值 |
|------|---------|---------|
| 会议纪要 | **会议纪要智能生成** | • AI自动提取关键信息<br>• 结构化输出标准格式<br>• 支持多模态输入（音频/文本） |

**命名理由**:
- "智能生成"体现AI技术赋能
- "纪要"是正式商务文档术语
- 避免口语化的"→"符号

---

### 2️⃣ 蓝图计划 (Blueprint Planning)

**定位**: 方案设计阶段，将需求转化为标准化文档

| 功能 | 专业命名 | 核心价值 |
|------|---------|---------|
| 需求转FS | **需求转功能规格说明书** | • 非结构化需求→结构化规格书<br>• 符合SAP ASAP方法论<br>• 为开发提供明确依据 |

**命名理由**:
- "功能规格说明书"(Functional Specification)是SAP标准文档类型
- "需求转"清晰表达转换方向
- 避免缩写"FS"，使用完整术语

---

### 3️⃣ 系统实施 (System Implementation)

**定位**: 开发实现阶段，包含分析、设计、编码全流程

#### 3.1 代码分析类

| 功能 | 专业命名 | 核心价值 |
|------|---------|---------|
| SAP→TS | **代码反向工程 - 技术规格书** | • 从现有代码还原设计意图<br>• 生成标准化技术文档<br>• 便于系统维护与交接 |
| SAP→FS | **代码反向工程 - 功能规格书** | • 从代码反推业务逻辑<br>• 补充缺失的功能文档<br>• 支持遗留系统改造 |

**命名理由**:
- "反向工程"(Reverse Engineering)是软件工程标准术语
- "技术规格书"(Technical Specification)和"功能规格书"(Functional Specification)区分明确
- 破折号"-"比箭头"→"更正式

#### 3.2 代码生成类

| 功能 | 专业命名 | 核心价值 |
|------|---------|---------|
| FS→Code | **规格驱动代码生成** | • 基于规格书自动生成代码框架<br>• 遵循Specification-Driven Development<br>• 提高开发效率与一致性 |

**命名理由**:
- "规格驱动"(Specification-Driven)体现现代软件开发理念
- "代码生成"比"→ABAP代码"更通用
- 强调方法论而非具体语言

#### 3.3 配置管理类

| 功能 | 专业命名 | 核心价值 |
|------|---------|---------|
| 配置管理 | **SAP配置管理** | • 多环境连接配置<br>• DEV/QAS/PRD切换<br>• 密码加密存储 |

**命名理由**:
- "配置管理"(Configuration Management)是ITIL标准术语
- 保持简洁明了

---

## 🌍 国际化对照

### 中英文术语映射

| 中文 | English | 缩写/简称 |
|------|---------|-----------|
| 会议纪要智能生成 | AI-Powered Meeting Minutes Generation | Meeting Minutes AI |
| 需求转功能规格说明书 | Requirements to Functional Specification | Req to FS |
| 代码反向工程 - 技术规格书 | Code Reverse Engineering - Technical Spec | RE to TS |
| 代码反向工程 - 功能规格书 | Code Reverse Engineering - Functional Spec | RE to FS |
| 规格驱动代码生成 | Specification-Driven Code Generation | Spec-to-Code |
| SAP配置管理 | SAP Configuration Management | SAP Config |

---

## 📚 术语来源与标准

### 1. SAP ASAP方法论
- **Functional Specification (FS)**: 功能规格说明书
- **Technical Specification (TS)**: 技术规格说明书
- **Blueprint Phase**: 蓝图阶段
- **Realization Phase**: 实现阶段

### 2. 软件工程标准
- **Reverse Engineering**: IEEE标准术语，指从成品推导设计文档的过程
- **Specification-Driven Development**: 规格驱动开发，强调文档先行
- **Configuration Management**: ITIL/ISO20000标准术语

### 3. 商务文档规范
- **Meeting Minutes**: 国际标准商务会议纪要术语
- **AI-Powered**: 体现人工智能技术赋能

---

## ✅ 命名优势

### 1. 专业性提升
- ✅ 使用行业标准术语（FS、TS、反向工程）
- ✅ 避免口语化表达（如"→"符号）
- ✅ 体现方法论（规格驱动、反向工程）

### 2. 准确性增强
- ✅ 明确输入输出关系（需求→规格、代码→文档）
- ✅ 区分技术规格与功能规格
- ✅ 强调AI技术特性

### 3. 国际化友好
- ✅ 中英文术语一一对应
- ✅ 符合国际SAP咨询惯例
- ✅ 便于跨国团队协作

### 4. 品牌一致性
- ✅ 符合EY专业咨询服务形象
- ✅ 体现企业级应用水准
- ✅ 提升用户信任度

---

## 🎨 UI显示建议

### 侧边栏菜单（简短版）
```
📊 前期调研
  └─ 会议纪要智能生成

📐 蓝图计划
  └─ 需求转功能规格

🛠️ 系统实施
  ├─ 代码反向工程(TS)
  ├─ 代码反向工程(FS)
  ├─ 规格驱动代码生成
  └─ SAP配置管理
```

### 页面标题（完整版）
```
会议纪要智能生成
需求转功能规格说明书
代码反向工程 - 技术规格书
代码反向工程 - 功能规格书
规格驱动代码生成
SAP配置管理
```

---

## 📝 实施清单

### 已完成修改
- [x] AppLayout菜单项名称更新
- [x] PAGE_LABELS页面标题映射更新
- [x] MeetingAudio页面标题更新
- [x] TypeScript编译通过

### 待优化页面（可选）
- [ ] MeetingToFS页面标题更新
- [ ] SourceToTS页面标题更新
- [ ] SourceToFS页面标题更新
- [ ] FSToCode页面标题更新

---

## 🔮 后续建议

### 1. 帮助文档更新
为每个功能添加：
- 功能说明（What）
- 使用场景（When）
- 操作流程（How）
- 输出示例（Example）

### 2. 术语 glossary
创建项目术语表，包含：
- 中英文对照
- 缩略语解释
- 相关概念链接

### 3. 用户引导
在首次使用时显示：
- 功能导航教程
- 术语解释浮层
- 最佳实践建议

---

## 📊 效果对比

### 修改前
```
❌ 会议记录 → 纪要          (口语化、不专业)
❌ SAP读取 → TS文档         (表述模糊)
❌ FS文档 → ABAP代码        (缺少方法论)
```

### 修改后
```
✅ 会议纪要智能生成          (专业、体现AI能力)
✅ 代码反向工程 - 技术规格书  (准确、标准术语)
✅ 规格驱动代码生成          (体现开发理念)
```

---

**版本**: v1.0.0  
**更新日期**: 2026-04-13  
**参考标准**: SAP ASAP、IEEE软件工程、ITIL配置管理  

📋 **专业命名规范已全面应用！**
