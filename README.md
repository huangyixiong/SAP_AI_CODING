# AI Assistant - SAP智能开发平台

基于AI的SAP ABAP智能开发辅助平台，采用EY品牌设计风格，实现从需求到代码的全链路智能化。

## 🚀 快速开始

### 环境要求
- Node.js >= 18.x
- npm >= 9.x
- SAP系统 (ECC 6.0+ 或 S/4HANA)
- LLM API Key

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd SAP_AI_CODING
```

2. **配置环境变量**

在 `backend` 目录创建 `.env` 文件：
```env
PORT=3001
CORS_ORIGIN=http://localhost:5173

# SAP连接信息
SAP_URL=http://your-sap-server:8000
SAP_USER=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
SAP_LANGUAGE=ZH

# LLM配置
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-max

# MCP配置
MCP_SERVER_PATH=../mcp-abap-abap-adt-api/dist/index.js

# 开发环境（生产环境请移除）
NODE_TLS_REJECT_UNAUTHORIZED=0
```

> ⚠️ **注意**: SAP URL必须包含端口号，例如 `http://192.168.20.41:8000`

3. **构建MCP服务器**
```bash
cd mcp-abap-abap-adt-api
npm install
npm run build
cd ..
```

4. **启动服务**

在项目根目录执行：
```bash
npm run dev
```

这将自动并行启动MCP服务器、后端服务和前端应用。

> 💡 **提示**: 首次运行会自动安装所有依赖。如需分别启动，可参考下方手动启动方式。

**手动启动（可选）**：
```bash
# 终端1 - MCP服务器
cd mcp-abap-abap-adt-api && npm install && npm run build

# 终端2 - 后端服务
cd backend && npm install && npm run dev

# 终端3 - 前端应用
cd frontend && npm install && npm run dev
```

5. **访问应用**

浏览器打开: http://localhost:5173

## 📋 功能模块

- **代码反向工程(TS/FS)** - 从现有代码生成技术/功能规格书
- **规格驱动代码生成** - 基于FS文档自动生成ABAP代码框架

## 🎨 技术栈

**前端**: React 18 + TypeScript + Vite + Ant Design + Zustand  
**后端**: Node.js + Express + TypeScript + Claude/OpenAI SDK  
**协议**: Model Context Protocol (MCP) + SAP ADT API

## 📁 项目结构

```
SAP_AI_CODING/
├── backend/              # 后端服务
├── frontend/             # 前端应用
├── mcp-abap-abap-adt-api/ # MCP服务器
└── README.md
```

## ⚠️ 注意事项

- SAP URL必须包含端口号
- 密码采用AES-256加密存储
- `sap-configs.json` 已加入 `.gitignore`
- 生产环境需配置合法SSL证书

## 📄 许可证

ISC License

---

<div align="center">

**Built with ❤️ for SAP Developers**

© 2026 AI Assistant

</div>
