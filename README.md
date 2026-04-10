# SAP AI CODING Platform

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![SAP](https://img.shields.io/badge/SAP-ABAP-0FAAFF)
![License](https://img.shields.io/badge/License-ISC-yellow)

**基于 AI 的 SAP ABAP 智能开发平台**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [项目结构](#-项目结构) • [API 文档](#-api-文档) • [技术栈](#-技术栈)

</div>

---

## 📋 目录

- [项目简介](#-项目简介)
- [功能特性](#-功能特性)
- [系统架构](#-系统架构)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [环境配置](#-环境配置)
- [API 文档](#-api-文档)
- [开发指南](#-开发指南)
- [常见问题](#-常见问题)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## 🎯 项目简介

**SAP AI CODING Platform** 是一个智能化的 SAP ABAP 开发辅助平台,通过集成大语言模型(LLM)和 SAP ADT (ABAP Development Tools) API,为开发人员提供从需求分析到代码生成的全流程 AI 辅助开发体验。

### 核心价值

- 🚀 **提升开发效率**: AI 自动生成 ABAP 代码,减少重复性工作
- 📝 **智能文档转换**: 将会议纪要、功能规格自动转换为技术文档和代码
- 🔍 **代码智能分析**: 深度分析 SAP 对象结构和依赖关系
- 🔄 **全链路追溯**: 从需求到代码的完整追溯链条
- 🎨 **友好交互界面**: 现代化的 Web 界面,支持实时预览和编辑

---

## ✨ 功能特性

### 1️⃣ 会议纪要转功能规格 (MeetingToFS)
- 📄 上传会议记录或需求文档
- 🤖 AI 自动提取关键信息并生成功能规格说明书
- 📊 结构化展示业务需求和技术要点
- 💾 支持导出为 Word/PDF 格式

### 2️⃣ 功能规格转代码 (FSToCode)
- 📋 基于功能规格说明书生成技术方案
- 💻 AI 自动生成 ABAP 代码框架
- 🔧 支持代码在线编辑和优化
- 📦 一键创建 SAP 传输请求

### 3️⃣ 源代码转功能规格 (SourceToFS)
- 🔍 反向工程:从现有 ABAP 代码生成功能说明
- 📈 自动分析代码逻辑和业务流程
- 📝 生成详细的技术文档
- 🔗 建立代码与需求的映射关系

### 4️⃣ 源代码转技术规格 (SourceToTS)
- 🏗️ 深度分析 SAP 对象结构
- 📊 生成类图、数据流图等技术文档
- 🔍 识别代码依赖和调用关系
- 📋 输出标准化技术规格书

### 5️⃣ SAP 对象智能搜索
- 🔎 多维度搜索 SAP 对象(类、函数组、表等)
- 📂 可视化展示对象层级结构
- 🔗 查看对象引用和依赖关系
- 📝 实时预览对象源代码

### 6️⃣ 代码质量检查
- ✅ 集成 ATC (ABAP Test Cockpit) 检查
- 🐛 实时语法检查和错误提示
- 💡 智能代码修复建议
- 📊 代码质量报告生成

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Meeting   │ │FS to     │ │Source    │ │Source    │  │
│  │to FS     │ │Code      │ │to FS     │ │to TS     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────▼────────────────────────────────────┐
│                  Backend (Node.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Document      │  │SAP Object    │  │Claude/LLM    │  │
│  │Controller    │  │Controller    │  │Service       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         MCP Client Service (Protocol)            │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ MCP Protocol
┌────────────────────▼────────────────────────────────────┐
│          MCP ABAP ADT API Server                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │Object  │ │Transport│ │Debug  │ │ATC     │           │
│  │Mgmt    │ │Mgmt     │ │Tools  │ │Check   │           │
│  └────────┘ └────────┘ └────────┘ └────────┘           │
└────────────────────┬────────────────────────────────────┘
                     │ ADT Protocol
┌────────────────────▼────────────────────────────────────┐
│                  SAP ABAP System                         │
│              (ECC / S/4HANA)                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ 技术栈

### 后端 (Backend)
- **运行时**: Node.js
- **框架**: Express.js
- **语言**: TypeScript 5.7
- **AI 集成**: 
  - Anthropic Claude SDK
  - OpenAI SDK (兼容阿里云通义千问等)
- **协议**: Model Context Protocol (MCP) SDK
- **其他**: CORS, dotenv, Zod (数据验证), P-Queue (任务队列)

### 前端 (Frontend)
- **框架**: React 18
- **构建工具**: Vite 6
- **UI 组件库**: Ant Design 5
- **状态管理**: Zustand 5
- **路由**: React Router 7
- **代码编辑器**: Monaco Editor
- **Markdown**: React Markdown + remark-gfm
- **HTTP 客户端**: Axios
- **文档导出**: docx, jsPDF, html2canvas, file-saver

### MCP 服务器
- **核心库**: abap-adt-api 6.2
- **协议**: @modelcontextprotocol/sdk
- **测试**: Jest + ts-jest
- **部署**: Docker 支持

---

## 🚀 快速开始

### 前置要求

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **SAP 系统**: ECC 6.0+ 或 S/4HANA (需启用 ADT 服务)
- **LLM API Key**: 阿里云通义千问或其他兼容 OpenAI 格式的 API

### 安装步骤

#### 1. 克隆项目

```bash
git clone <repository-url>
cd SAP_AI_CODING
```

#### 2. 配置环境变量

在 `backend` 目录下创建 `.env` 文件:

```bash
cd backend
cp .env.example .env  # 如果存在示例文件
```

编辑 `.env` 文件:

```env
# 服务器配置
PORT=3001
CORS_ORIGIN=http://localhost:5173

# SAP 系统配置
SAP_URL=https://your-sap-system.com
SAP_USER=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
SAP_LANGUAGE=ZH

# LLM 配置 (以阿里云通义千问为例)
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-max

# MCP 服务器路径 (相对路径或绝对路径)
MCP_SERVER_PATH=../mcp-abap-abap-adt-api/dist/index.js

# TLS 配置 (开发环境可设为 0)
NODE_TLS_REJECT_UNAUTHORIZED=0
```

#### 3. 安装依赖并启动

##### 启动 MCP 服务器

```bash
cd mcp-abap-abap-adt-api
npm install
npm run build
```

##### 启动后端服务

```bash
cd ../backend
npm install
npm run dev  # 开发模式 (热重载)
# 或
npm run build && npm start  # 生产模式
```

后端服务将在 `http://localhost:3001` 启动

##### 启动前端应用

```bash
cd ../frontend
npm install
npm run dev
```

前端应用将在 `http://localhost:5173` 启动

#### 4. 访问应用

打开浏览器访问: `http://localhost:5173`

---

## 📁 项目结构

```
SAP_AI_CODING/
├── backend/                          # 后端服务
│   ├── src/
│   │   ├── config/                   # 配置文件
│   │   │   └── index.ts
│   │   ├── controllers/              # 控制器层
│   │   │   ├── document.controller.ts   # 文档处理控制器
│   │   │   └── sap.controller.ts        # SAP 对象操作控制器
│   │   ├── middleware/               # 中间件
│   │   │   ├── cors.ts                  # CORS 配置
│   │   │   └── errorHandler.ts          # 错误处理
│   │   ├── prompts/                  # AI Prompt 模板
│   │   │   ├── code.prompt.ts           # 代码生成 prompt
│   │   │   ├── fs-from-meeting.prompt.ts # 会议转功能规格 prompt
│   │   │   ├── fs.prompt.ts             # 功能规格 prompt
│   │   │   └── ts.prompt.ts             # 技术规格 prompt
│   │   ├── routes/                   # 路由定义
│   │   │   ├── document.routes.ts
│   │   │   ├── health.routes.ts
│   │   │   ├── index.ts
│   │   │   └── sap.routes.ts
│   │   ├── services/                 # 业务逻辑层
│   │   │   ├── ABAPAnalyzer.ts          # ABAP 代码分析器
│   │   │   ├── ClaudeService.ts         # LLM 服务封装
│   │   │   ├── DocumentService.ts       # 文档处理服务
│   │   │   └── MCPClientService.ts      # MCP 客户端服务
│   │   ├── types/                    # TypeScript 类型定义
│   │   │   ├── api.types.ts
│   │   │   └── mcp.types.ts
│   │   └── index.ts                  # 应用入口
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                          # 环境变量 (需自行创建)
│
├── frontend/                         # 前端应用
│   ├── src/
│   │   ├── api/                      # API 接口封装
│   │   │   ├── client.ts                # Axios 实例配置
│   │   │   └── sap.api.ts               # SAP 相关 API
│   │   ├── components/               # React 组件
│   │   │   ├── common/                  # 通用组件
│   │   │   │   ├── ExportButton.tsx
│   │   │   │   └── MarkdownPreview.tsx
│   │   │   ├── layout/                  # 布局组件
│   │   │   │   └── AppLayout.tsx
│   │   │   └── sap/                     # SAP 专用组件
│   │   │       ├── ObjectSearchInput.tsx
│   │   │       └── SourceAnalysis.tsx
│   │   ├── hooks/                    # 自定义 Hooks
│   │   │   └── useSSE.ts                # Server-Sent Events
│   │   ├── pages/                    # 页面组件
│   │   │   ├── FSToCode/                # 功能规格转代码
│   │   │   ├── MeetingToFS/             # 会议转功能规格
│   │   │   ├── SourceToFS/              # 源码转功能规格
│   │   │   └── SourceToTS/              # 源码转技术规格
│   │   ├── store/                    # 状态管理
│   │   │   └── useAppStore.ts           # Zustand store
│   │   ├── styles/                   # 样式文件
│   │   │   └── ey.css                   # EY 主题样式
│   │   ├── types/                    # 类型定义
│   │   │   └── index.ts
│   │   ├── App.tsx                   # 根组件
│   │   ├── main.tsx                  # 应用入口
│   │   └── router.tsx                # 路由配置
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
│
└── mcp-abap-abap-adt-api/           # MCP ABAP ADT 服务器
    ├── src/
    │   ├── handlers/                  # MCP 工具处理器
    │   │   ├── AtcHandlers.ts           # ATC 检查
    │   │   ├── AuthHandlers.ts          # 认证处理
    │   │   ├── BaseHandler.ts           # 基础处理器
    │   │   ├── ClassHandlers.ts         # 类操作
    │   │   ├── CodeAnalysisHandlers.ts  # 代码分析
    │   │   ├── DdicHandlers.ts          # DDIC 对象
    │   │   ├── DebugHandlers.ts         # 调试工具
    │   │   ├── DiscoveryHandlers.ts     # 服务发现
    │   │   ├── FeedHandlers.ts          # Feed 管理
    │   │   ├── GitHandlers.ts           # Git 集成
    │   │   ├── NodeHandlers.ts          # 节点操作
    │   │   ├── ObjectDeletionHandlers.ts # 对象删除
    │   │   ├── ObjectHandlers.ts        # 对象管理
    │   │   ├── ObjectLockHandlers.ts    # 对象锁定
    │   │   ├── ObjectManagementHandlers.ts # 对象维护
    │   │   ├── ObjectRegistrationHandlers.ts # 对象注册
    │   │   ├── ObjectSourceHandlers.ts  # 源代码管理
    │   │   ├── PrettyPrinterHandlers.ts # 代码格式化
    │   │   ├── QueryHandlers.ts         # 查询处理
    │   │   ├── RefactorHandlers.ts      # 重构工具
    │   │   ├── RenameHandlers.ts        # 重命名
    │   │   ├── RevisionHandlers.ts      # 版本管理
    │   │   ├── ServiceBindingHandlers.ts # 服务绑定
    │   │   ├── TraceHandlers.ts         # 跟踪工具
    │   │   ├── TransportHandlers.ts     # 传输管理
    │   │   └── UnitTestHandlers.ts      # 单元测试
    │   ├── lib/
    │   │   └── logger.ts                # 日志工具
    │   ├── types/
    │   │   └── tools.ts                 # 工具类型定义
    │   └── index.ts                   # MCP 服务器入口
    ├── package.json
    ├── tsconfig.json
    ├── jest.config.js
    ├── Dockerfile
    └── README.md
```

---

## ⚙️ 环境配置

### 必需的环境变量

| 变量名 | 说明 | 示例值 | 必填 |
|--------|------|--------|------|
| `PORT` | 后端服务端口 | `3001` | 否 (默认 3001) |
| `CORS_ORIGIN` | 允许的前端域名 | `http://localhost:5173` | 否 |
| `SAP_URL` | SAP 系统 URL | `https://sap.example.com` | **是** |
| `SAP_USER` | SAP 用户名 | `DEVELOPER01` | **是** |
| `SAP_PASSWORD` | SAP 密码 | `your_password` | **是** |
| `SAP_CLIENT` | SAP Client | `100` | 否 (默认 100) |
| `SAP_LANGUAGE` | SAP 语言 | `ZH` 或 `EN` | 否 (默认 ZH) |
| `LLM_API_KEY` | LLM API 密钥 | `sk-xxxxx` | **是** |
| `LLM_BASE_URL` | LLM API 地址 | `https://dashscope...` | 否 |
| `LLM_MODEL` | LLM 模型名称 | `qwen-max` | 否 (默认 qwen-max) |
| `MCP_SERVER_PATH` | MCP 服务器路径 | `../mcp-.../dist/index.js` | 否 |
| `NODE_TLS_REJECT_UNAUTHORIZED` | TLS 验证开关 | `0` (开发环境) | 否 |

### SAP 系统要求

- **最低版本**: SAP NetWeaver 7.40+
- **推荐版本**: SAP S/4HANA 2020+
- **必需服务**: 
  - ADT (ABAP Development Tools) 服务已启用
  - HTTPS 连接可用
  - 用户具有必要的开发权限

### LLM 提供商支持

本项目支持任何兼容 OpenAI API 格式的 LLM 服务:

- ✅ **阿里云通义千问** (推荐)
- ✅ **Anthropic Claude**
- ✅ **OpenAI GPT**
- ✅ **本地部署模型** (如 Ollama)

---

## 📚 API 文档

### 健康检查

```http
GET /api/health
```

**响应:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-10T08:00:00.000Z",
  "uptime": 3600
}
```

### 文档处理 API

#### 1. 会议纪要转功能规格

```http
POST /api/document/meeting-to-fs
Content-Type: application/json

{
  "meetingContent": "会议记录文本...",
  "options": {
    "language": "ZH",
    "detailLevel": "high"
  }
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "functionalSpec": "生成的功能规格内容...",
    "sections": [...],
    "metadata": {...}
  }
}
```

#### 2. 功能规格转技术方案

```http
POST /api/document/fs-to-ts
Content-Type: application/json

{
  "functionalSpec": "功能规格文本...",
  "context": {
    "systemType": "S/4HANA",
    "module": "MM"
  }
}
```

#### 3. 源代码转功能规格

```http
POST /api/document/source-to-fs
Content-Type: application/json

{
  "objectType": "CLAS",
  "objectName": "ZCL_EXAMPLE",
  "includeSource": true
}
```

### SAP 对象 API

#### 1. 搜索 SAP 对象

```http
POST /api/sap/search
Content-Type: application/json

{
  "query": "ZCL*",
  "type": "CLAS",
  "maxResults": 50
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "objects": [
      {
        "name": "ZCL_EXAMPLE",
        "type": "CLAS",
        "description": "示例类",
        "uri": "/sap/bc/adt/oo/classes/zcl_example"
      }
    ],
    "total": 10
  }
}
```

#### 2. 获取对象源代码

```http
GET /api/sap/object/:type/:name/source
```

**参数:**
- `type`: 对象类型 (CLAS, FUGR, PROG 等)
- `name`: 对象名称

#### 3. 分析对象结构

```http
POST /api/sap/object/analyze
Content-Type: application/json

{
  "objectType": "CLAS",
  "objectName": "ZCL_EXAMPLE",
  "analysisType": "full"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "structure": {...},
    "dependencies": [...],
    "methods": [...],
    "attributes": [...]
  }
}
```

### SSE (Server-Sent Events)

某些长时间运行的操作支持 SSE 实时推送进度:

```javascript
const eventSource = new EventSource('/api/document/process-stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.progress);
};
```

---

## 💻 开发指南

### 后端开发

#### 添加新的 API 端点

1. 在 `src/controllers/` 创建控制器
2. 在 `src/routes/` 定义路由
3. 在 `src/routes/index.ts` 注册路由

**示例:**

```typescript
// src/controllers/example.controller.ts
import { Request, Response } from 'express';

export class ExampleController {
  static async getData(req: Request, res: Response) {
    try {
      // 业务逻辑
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

// src/routes/example.routes.ts
import { Router } from 'express';
import { ExampleController } from '../controllers/example.controller';

const router = Router();
router.get('/example', ExampleController.getData);
export default router;

// src/routes/index.ts
import exampleRoutes from './example.routes';
app.use('/api', exampleRoutes);
```

#### 添加新的 AI Prompt

在 `src/prompts/` 目录下创建新的 prompt 文件:

```typescript
// src/prompts/custom.prompt.ts
export const CUSTOM_PROMPT = `
你是一个专业的 SAP ABAP 开发助手。
请根据以下需求生成代码:

{{requirements}}

要求:
1. 遵循 SAP 最佳实践
2. 包含必要的注释
3. 考虑性能优化
`;
```

### 前端开发

#### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `src/router.tsx` 注册路由
3. 在导航菜单中添加链接

**示例:**

```tsx
// src/pages/CustomFeature/index.tsx
import React from 'react';
import { Card, Button } from 'antd';

const CustomFeature: React.FC = () => {
  return (
    <Card title="自定义功能">
      <p>这里是新功能的内容</p>
    </Card>
  );
};

export default CustomFeature;

// src/router.tsx
import CustomFeature from './pages/CustomFeature';

<Route path="/custom" element={<CustomFeature />} />
```

#### 状态管理

使用 Zustand 进行全局状态管理:

```typescript
// src/store/useAppStore.ts
import { create } from 'zustand';

interface AppState {
  currentUser: string | null;
  setCurrentUser: (user: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}));
```

### MCP 服务器开发

#### 添加新的 MCP 工具

1. 在 `src/handlers/` 创建处理器
2. 在 `src/types/tools.ts` 定义工具 schema
3. 在 `src/index.ts` 注册工具

**示例:**

```typescript
// src/handlers/CustomHandlers.ts
import { BaseHandler } from './BaseHandler';

export class CustomHandlers extends BaseHandler {
  async executeCustomTool(params: any) {
    // 实现工具逻辑
    return {
      content: [{ type: 'text', text: '结果' }]
    };
  }
}

// src/index.ts
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'custom_tool':
      return await customHandlers.executeCustomTool(request.params.arguments);
    // ...
  }
});
```

---

## ❓ 常见问题

### Q1: 无法连接到 SAP 系统?

**A:** 检查以下几点:
1. 确认 `SAP_URL` 正确且可访问
2. 验证 `SAP_USER` 和 `SAP_PASSWORD` 是否正确
3. 确认 SAP 系统的 ADT 服务已启用
4. 检查防火墙和网络连接
5. 查看后端日志: `[Server] SAP connection failed`

### Q2: LLM API 调用失败?

**A:** 
1. 确认 `LLM_API_KEY` 有效且有余额
2. 检查 `LLM_BASE_URL` 是否正确
3. 验证 `LLM_MODEL` 名称是否受支持
4. 查看网络代理设置 (如果需要)

### Q3: 前端页面空白或报错?

**A:**
1. 打开浏览器开发者工具查看控制台错误
2. 确认后端服务正在运行 (`http://localhost:3001`)
3. 检查 CORS 配置是否正确
4. 清除浏览器缓存后重试

### Q4: 如何切换 LLM 提供商?

**A:** 修改 `.env` 文件中的配置:

```env
# OpenAI
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4

# Claude (需要通过代理)
LLM_BASE_URL=https://api.anthropic.com/v1
LLM_MODEL=claude-3-opus

# 本地 Ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3
```

### Q5: MCP 服务器启动失败?

**A:**
1. 确认已执行 `npm run build` 编译 TypeScript
2. 检查 `MCP_SERVER_PATH` 路径是否正确
3. 查看 MCP 服务器日志
4. 确认 `abap-adt-api` 依赖已正确安装

### Q6: 代码生成质量不佳?

**A:**
1. 优化 Prompt 模板 (`src/prompts/`)
2. 调整 `LLM_MODEL` 使用更强大的模型
3. 降低 `temperature` 参数提高确定性
4. 提供更详细的上下文信息

---

## 🤝 贡献指南

我们欢迎社区贡献!如果您想参与项目开发,请遵循以下步骤:

1. **Fork** 本仓库
2. 创建您的特性分支: `git checkout -b feature/AmazingFeature`
3. 提交您的更改: `git commit -m 'Add some AmazingFeature'`
4. 推送到分支: `git push origin feature/AmazingFeature`
5. 开启一个 **Pull Request**

### 开发规范

- 遵循 TypeScript 严格模式
- 使用 ESLint 和 Prettier 保持代码风格一致
- 为新功能编写单元测试
- 更新文档和注释
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范

---

## 📄 许可证

本项目采用 **ISC** 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 📞 联系我们

- **项目主页**: [GitHub Repository](your-repo-url)
- **问题反馈**: [Issues](your-repo-url/issues)
- **技术支持**: support@example.com

---

## 🙏 致谢

感谢以下开源项目的支持:

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP 协议
- [abap-adt-api](https://github.com/marcellourbani/abap-adt-api) - ABAP ADT API
- [Ant Design](https://ant.design/) - UI 组件库
- [Vite](https://vitejs.dev/) - 前端构建工具
- [Zustand](https://zustand-demo.pmnd.rs/) - 状态管理

---

<div align="center">

**Made with ❤️ by SAP AI CODING Team**

⭐ 如果这个项目对您有帮助,请给我们一个 Star!

</div>
