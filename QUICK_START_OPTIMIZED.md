# 快速开始指南 - 优化版

## 🚀 启动项目

### 方式一：使用一键启动脚本（推荐）

**Windows PowerShell:**
```powershell
.\start.ps1
```

**Windows Batch:**
```batch
start.bat
```

### 方式二：手动启动

#### 1. 启动MCP服务器
```bash
cd mcp-abap-abap-adt-api
npm install
npm run build
```

#### 2. 启动后端服务
```bash
cd backend
npm install
npm run dev
```

#### 3. 启动前端应用
```bash
cd frontend
npm install
npm run dev
```

#### 4. 访问应用
打开浏览器访问: `http://localhost:5173`

---

## ⚙️ 环境配置

### 1. 后端环境变量

在 `backend` 目录创建 `.env` 文件：

```env
# 服务器配置
PORT=3001
CORS_ORIGIN=http://localhost:5173

# SAP系统配置（可选，可通过前端动态配置）
SAP_URL=http://192.168.20.41:8000
SAP_USER=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
SAP_LANGUAGE=ZH

# LLM API配置（阿里云通义千问示例）
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-max

# MCP服务器路径
MCP_SERVER_PATH=../mcp-abap-abap-adt-api/dist/index.js

# TLS配置（开发环境）
NODE_TLS_REJECT_UNAUTHORIZED=0

# 加密密钥（生产环境请修改）
ENCRYPTION_KEY=your-secret-encryption-key-change-in-production
```

### 2. 前端无需额外配置

前端会自动连接到 `http://localhost:3001` 的后端服务。

---

## 📋 首次使用步骤

### 1. 配置SAP系统连接

1. 访问 `http://localhost:5173/implementation/config`
2. 点击"新增配置"按钮
3. 填写您的SAP系统信息：
   ```
   配置名称: DEV环境
   SAP URL: http://192.168.20.41:8000  (必须包含端口号)
   用户名: YOUR_SAP_USER
   密码: YOUR_SAP_PASSWORD
   Client: 100
   语言: ZH
   ```
4. 点击"测试"验证连接
5. 点击"激活"启用该配置

### 2. 测试功能

#### 测试会议纪要生成
1. 访问 `/research/meeting-audio`
2. 在文本框输入一些会议记录
3. 点击"生成会议纪要"
4. 查看AI生成的结构化纪要

#### 测试SAP代码分析
1. 访问 `/research/sap-ts`
2. 输入SAP程序名称（如 `ZTEST_PROGRAM`）
3. 点击"生成TS文档"
4. 等待分析完成

---

## 🔧 常见问题

### Q1: 启动时提示端口被占用
**解决**:
```powershell
# 查找占用端口的进程
netstat -ano | findstr :3001
netstat -ano | findstr :5173

# 终止进程（替换<PID>为实际进程ID）
taskkill /F /PID <PID>
```

### Q2: SAP连接失败
**检查清单**:
- [ ] SAP URL格式正确（必须包含端口号）
- [ ] SAP系统ADT服务已启用
- [ ] 用户名和密码正确
- [ ] Client编号正确
- [ ] 网络可达SAP服务器
- [ ] 防火墙未阻止连接

**测试方法**:
1. 在SAP配置管理页面点击"测试"按钮
2. 查看后端日志中的错误信息
3. 访问 `http://localhost:3001/api/health` 检查连接状态

### Q3: TypeScript编译错误
**解决**:
```bash
cd frontend
npx tsc --noEmit

cd backend
npx tsc --noEmit
```

### Q4: MCP服务器启动失败
**解决**:
```bash
cd mcp-abap-abap-adt-api
npm run build
# 检查 dist/index.js 是否存在
```

### Q5: 配置文件丢失
**说明**: `backend/src/config/sap-configs.json` 不会被Git跟踪

**恢复方法**:
1. 在前端重新创建SAP配置
2. 或从备份恢复该文件

---

## 📁 项目结构

```
SAP_AI_CODING/
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   │   ├── MeetingAudio/    # ✨ 新增：会议录音转纪要
│   │   │   ├── MeetingToFS/     # 会议记录→FS
│   │   │   ├── SourceToTS/      # SAP→TS
│   │   │   ├── SourceToFS/      # SAP→FS
│   │   │   ├── FSToCode/        # FS→ABAP代码
│   │   │   └── SAPConfig/       # ✨ 新增：SAP配置管理
│   │   ├── components/      # 通用组件
│   │   ├── api/            # API调用
│   │   ├── store/          # 状态管理
│   │   └── router.tsx      # ✨ 更新：路由配置
│   └── package.json
│
├── backend/                  # Node.js后端服务
│   ├── src/
│   │   ├── config/
│   │   │   └── sap-configs.json  # ✨ 新增：SAP配置存储
│   │   ├── services/
│   │   │   ├── SAPConfigService.ts  # ✨ 新增：配置管理
│   │   │   ├── MCPClientService.ts  # ✨ 更新：支持动态配置
│   │   │   └── DocumentService.ts   # ✨ 更新：新增会议纪要
│   │   ├── controllers/
│   │   │   ├── sap-config.controller.ts  # ✨ 新增：配置控制器
│   │   │   └── document.controller.ts    # ✨ 更新：新增会议纪要
│   │   ├── routes/
│   │   │   ├── sap-config.routes.ts      # ✨ 新增：配置路由
│   │   │   └── document.routes.ts        # ✨ 更新：新增会议纪要
│   │   └── index.ts          # ✨ 更新：动态配置加载
│   └── package.json
│
├── mcp-abap-abap-adt-api/   # MCP协议实现
│   └── src/
│
├── .gitignore               # ✨ 新增：Git忽略配置
├── OPTIMIZATION_GUIDE.md    # ✨ 新增：优化说明文档
└── QUICK_START_OPTIMIZED.md # ✨ 本文件
```

---

## 🎯 新功能演示

### 1. 导航菜单分组

左侧菜单现在分为三个清晰的类别：

**前期调研** 📊
- 🎙️ 会议录音 → 纪要
- 👥 会议记录 → FS文档
- 📄 SAP读取 → TS文档
- 📋 SAP读取 → FS文档

**蓝图计划** 📐
- 💻 FS文档 → ABAP代码

**系统实施** 🛠️
- ⚙️ SAP配置管理

### 2. 会议录音转纪要

**支持的输入方式**:
- ✅ 直接粘贴文本
- ✅ 上传PDF文件
- ✅ 上传Word文件（.doc/.docx）
- ✅ 上传TXT文件
- ✅ 上传音频文件（MP3/WAV/M4A）*

*\* 需要集成语音识别服务*

**输出格式**:
```markdown
# 会议纪要

## 1. 基本信息
- 会议主题: ...
- 会议时间: ...
- 参会人员: ...

## 2. 会议背景
...

## 3. 讨论要点
...

## 4. 决策与结论
...

## 5. 待办事项
| 序号 | 任务 | 负责人 | 截止日期 | 状态 |
|------|------|--------|----------|------|
...
```

### 3. SAP配置管理

**核心功能**:
- ➕ 添加多个SAP系统配置
- ✏️ 编辑现有配置
- 🗑️ 删除不需要的配置
- ✅ 测试连接是否正常
- 🔄 一键切换激活配置
- 🔐 密码AES-256加密存储

**配置字段**:
- 配置名称（例如：DEV/QAS/PRD）
- SAP URL（必须包含端口号）
- 用户名
- 密码（加密存储）
- Client编号
- 语言代码

---

## 🔒 安全建议

### 生产环境部署

1. **修改加密密钥**:
   ```env
   ENCRYPTION_KEY=<strong-random-key-at-least-32-chars>
   ```

2. **限制CORS**:
   ```env
   CORS_ORIGIN=https://your-domain.com
   ```

3. **使用HTTPS**:
   - 配置SSL证书
   - 设置 `NODE_TLS_REJECT_UNAUTHORIZED=1`

4. **保护配置文件**:
   - 确保 `sap-configs.json` 权限正确
   - 定期备份配置
   - 不要提交到版本控制

5. **添加认证**:
   - 实现用户登录
   - 添加JWT token验证
   - 基于角色的访问控制

---

## 📞 技术支持

如遇到问题，请检查：

1. **后端日志**: `backend` 控制台输出
2. **前端控制台**: 浏览器开发者工具 Console
3. **网络请求**: 浏览器 Network 标签页
4. **健康检查**: 访问 `http://localhost:3001/api/health`

---

## 🎉 开始使用

现在您已经完成了所有配置，可以开始使用优化后的SAP AI CODING平台了！

**推荐体验路径**:
1. 配置SAP系统 → `/implementation/config`
2. 测试会议纪要生成 → `/research/meeting-audio`
3. 尝试SAP代码分析 → `/research/sap-ts`
4. 探索其他功能...

祝您使用愉快！🚀
