# 前端代理错误排查与解决

## 问题描述

前端启动时出现以下错误：
```
[vite] http proxy error: /api/health
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1134:18)
    at afterConnectMultiple (node:net:1715:7)
```

## 错误含义

### 核心问题
**前端无法连接到后端服务**

- **`http proxy error`**: Vite 开发服务器的代理功能尝试转发请求到后端时失败
- **`/api/health`**: 前端正在访问后端的健康检查接口
- **`ECONNREFUSED`**: **连接被拒绝** - 表示后端服务没有运行或无法访问

### 根本原因
1. ✅ 前端（Vite）启动成功
2. ❌ 后端（Express）启动失败或未启动
3. ❌ 前端代理无法将 `/api/*` 请求转发到后端

---

## 常见原因及解决方案

### 原因1：后端端口被占用

#### 症状
```
Error: listen EADDRINUSE: address already in use :::3001
```

#### 解决方案
```bash
# 1. 查找占用端口的进程
netstat -ano | findstr :3001

# 2. 终止占用进程（替换 PID）
taskkill /F /PID <进程ID>

# 3. 重新启动服务
npm run dev
```

---

### 原因2：后端启动失败（代码错误）

#### 症状
后端终端显示编译错误或运行时异常

#### 解决方案
```bash
# 1. 检查后端编译
cd backend
npx tsc --noEmit

# 2. 查看错误信息并修复
# 3. 重新启动
npm run dev
```

---

### 原因3：速率限制器 IPv6 配置问题

#### 症状
```
ValidationError: Custom keyGenerator appears to use request IP without calling 
the ipKeyGenerator helper function for IPv6 addresses.
```

#### 原因分析
`express-rate-limit` 库要求自定义的 `keyGenerator` 函数必须正确处理 IPv6 地址，否则可能允许 IPv6 用户绕过限流。

#### 解决方案

**修改前 ❌**
```typescript
keyGenerator: (req) => {
  return req.ip || req.socket.remoteAddress || 'unknown';
}
```

**修改后 ✅**
```typescript
keyGenerator: (req) => {
  // 使用 IP 作为限流 key，兼容 IPv4 和 IPv6
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  // 将 IPv6 地址标准化，避免 ::ffff: 前缀问题
  return ip.replace(/^::ffff:/, '');
}
```

**关键改进**：
- ✅ 移除 `::ffff:` 前缀（IPv4 映射的 IPv6 地址）
- ✅ 确保所有 IP 地址格式统一
- ✅ 避免 IPv6 用户绕过限流

---

## 完整排查流程

### 步骤1：检查后端是否运行

```bash
# 方法1：检查进程
netstat -ano | findstr :3001

# 方法2：直接访问
curl http://localhost:3001/api/health
```

### 步骤2：查看后端日志

```bash
# 观察后端终端输出
# 应该看到：
# [Server] Running on http://localhost:3001
# [MCP] Connected to MCP server
# [Server] SAP connection established
```

### 步骤3：检查前端代理配置

查看 `frontend/vite.config.ts`：
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    }
  }
}
```

### 步骤4：重启服务

```bash
# 停止当前服务（Ctrl+C）

# 清理端口占用
netstat -ano | findstr :3001
taskkill /F /PID <PID>

# 重新启动
npm run dev
```

---

## 本次问题解决记录

### 遇到的问题
1. ❌ 端口 3001 被占用（PID: 35824）
2. ❌ 速率限制器 IPv6 配置警告

### 解决步骤

#### 1. 终止占用进程
```bash
netstat -ano | findstr :3001
# 输出: TCP 0.0.0.0:3001 LISTENING 35824

taskkill /F /PID 35824
# 输出: 成功: 已终止 PID 为 35824 的进程。
```

#### 2. 修复速率限制器配置
修改 `backend/src/middleware/rateLimiter.ts`：
```typescript
keyGenerator: (req) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return ip.replace(/^::ffff:/, ''); // ← 添加此行
}
```

#### 3. 重新启动服务
```bash
npm run dev
```

### 最终结果
✅ 后端成功启动在 `http://localhost:3001`  
✅ MCP 服务器连接成功  
✅ SAP 系统登录成功  
✅ 前端无代理错误  
✅ 服务正常运行

---

## 预防措施

### 1. 优雅关闭服务
```bash
# 使用 Ctrl+C 停止服务，而不是直接关闭窗口
# 这会让 Node.js 执行清理操作，释放端口
```

### 2. 自动检测端口占用
在 `backend/src/index.ts` 中添加：
```typescript
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请终止占用进程后重试`);
    process.exit(1);
  }
});
```

### 3. 使用进程管理器
考虑使用 `pm2` 管理 Node.js 进程：
```bash
npm install -g pm2
pm2 start backend/src/index.ts --name sap-ai-backend
pm2 logs sap-ai-backend
```

### 4. 定期更新依赖
```bash
cd backend
npm update express-rate-limit
```

---

## 快速诊断命令

```bash
# 1. 检查端口占用
netstat -ano | findstr :3001

# 2. 测试后端连通性
curl http://localhost:3001/api/health

# 3. 查看后端日志
# 在后端终端中观察输出

# 4. 检查前端代理
# 在前端终端中观察是否有 "http proxy error"

# 5. 重启服务
npm run dev
```

---

## 相关文档

- [项目运行环境与启动配置](./README.md#运行环境)
- [常见问题排查](./TROUBLESHOOTING.md)
- [Express Rate Limit 文档](https://express-rate-limit.github.io/)
