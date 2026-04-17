# 快速启动指南（精简版）

本文档对应当前精简后的项目版本，仅包含 3 个核心能力：
- 代码反向工程（TS）
- 代码反向工程（FS）
- 规格驱动代码生成

## 1) 环境准备

- Node.js >= 18
- npm >= 9
- 可访问 SAP 系统
- 可用 LLM API Key

## 2) 安装依赖

在项目根目录执行：

```bash
npm install
npm run install:all
npm run build:mcp
```

或手动执行：

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../mcp-abap-abap-adt-api && npm install && npm run build
```

## 3) 配置 `backend/.env`

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173

SAP_URL=http://your-sap-host:8000
SAP_USER=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
SAP_LANGUAGE=ZH

LLM_API_KEY=your_api_key
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-max

MCP_SERVER_PATH=../mcp-abap-abap-adt-api/dist/index.js
NODE_TLS_REJECT_UNAUTHORIZED=0
```

## 4) 启动项目

在根目录执行：

```bash
npm run dev
```

启动后可访问：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

说明：
- `npm run dev` 会先执行 MCP 构建，再并行启动前后端
- 若 `mcp-abap-abap-adt-api/dist/index.js` 不存在，请先执行 `npm run build:mcp`

## 5) 快速验证

健康检查：

```bash
curl http://localhost:3001/api/health
```

前端页面应只包含以下菜单：
- 代码反向工程(TS)
- 代码反向工程(FS)
- 规格驱动代码生成

## 6) 常见问题

- 后端连不上 SAP：检查 `SAP_URL` 是否带端口（如 `:8000`）
- 前端请求失败：确认后端已启动且 `CORS_ORIGIN` 正确
- MCP 启动失败：确认 `mcp-abap-abap-adt-api/dist/index.js` 已构建
