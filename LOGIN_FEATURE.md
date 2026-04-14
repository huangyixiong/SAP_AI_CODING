# 登录功能使用说明

## 功能概述

AI Assistant 现已添加完整的用户认证系统，支持用户登录、会话管理和路由保护。

## 快速开始

### 测试账号

系统预置了演示账号：
- **用户名**: `admin`
- **密码**: `admin123`

### 使用流程

1. **访问系统**
   - 打开浏览器访问 http://localhost:5173
   - 系统会自动重定向到登录页面 `/login`

2. **登录**
   - 输入用户名和密码
   - 点击"登录"按钮
   - 登录成功后自动跳转到主页面

3. **使用系统**
   - 登录后可以访问所有功能模块
   - 右上角显示当前登录用户
   - 可以点击"登出"按钮退出登录

4. **登出**
   - 点击右上角的"登出"按钮
   - 确认后即可退出登录
   - 系统会清除会话并重定向到登录页

---

## 技术实现

### 前端架构

#### 1. 登录页面 (`frontend/src/pages/Login/index.tsx`)
- EY品牌风格的登录界面
- 金黄色主题色，符合品牌规范
- 表单验证和错误提示
- 加载状态显示

#### 2. 认证Store (`frontend/src/store/useAuthStore.ts`)
- 使用Zustand进行状态管理
- localStorage持久化存储
- 提供 `user`、`isAuthenticated`、`login`、`logout` API

#### 3. 路由保护 (`frontend/src/components/auth/ProtectedRoute.tsx`)
- 检查用户认证状态
- 未登录用户自动重定向到登录页
- 保存原始访问路径，登录后自动跳转

#### 4. API接口 (`frontend/src/api/auth.api.ts`)
- 封装登录请求
- 统一错误处理
- TypeScript类型安全

### 后端架构

#### 1. 登录API (`backend/src/routes/auth.routes.ts`)
- POST `/api/auth/login`
- 请求体验证（Zod）
- 简单的用户名密码验证（演示用）
- 返回用户信息和token

#### 2. 路由注册 (`backend/src/routes/index.ts`)
- 统一注册auth路由
- 路径前缀: `/api/auth`

---

## 文件结构

```
frontend/src/
├── pages/
│   └── Login/
│       └── index.tsx          # 登录页面组件
├── store/
│   └── useAuthStore.ts        # 认证状态管理
├── components/
│   └── auth/
│       └── ProtectedRoute.tsx # 路由保护组件
├── api/
│   └── auth.api.ts            # 登录API函数
└── router.tsx                 # 路由配置（已更新）

backend/src/
└── routes/
    ├── auth.routes.ts         # 登录API路由
    └── index.ts               # 路由注册（已更新）
```

---

## 安全增强建议（生产环境）

### 1. 密码加密
当前使用明文密码对比，生产环境应：
```typescript
import bcrypt from 'bcrypt';

// 密码哈希存储
const hashedPassword = await bcrypt.hash(password, 10);

// 密码验证
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### 2. JWT Token
当前使用简单token，生产环境应使用JWT：
```typescript
import jwt from 'jsonwebtoken';

// 生成token
const token = jwt.sign(
  { userId, username }, 
  process.env.JWT_SECRET, 
  { expiresIn: '24h' }
);

// 验证token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

### 3. HTTPS
- 生产环境必须使用HTTPS
- 防止中间人攻击和token泄露

### 4. 数据库集成
- 使用MySQL/PostgreSQL存储用户信息
- 添加用户角色和权限管理
- 记录登录日志

### 5. 安全措施
- 添加验证码防止暴力破解
- 限制登录尝试次数
- 实施账户锁定机制
- 添加双因素认证（2FA）

---

## 自定义配置

### 修改默认账号

编辑 `backend/src/routes/auth.routes.ts`：

```typescript
if (username === 'your_username' && password === 'your_password') {
  // 登录逻辑
}
```

### 调整会话过期时间

在 `useAuthStore.ts` 中添加过期检查：

```typescript
interface User {
  username: string;
  token: string;
  loginTime: string;
  expiresAt?: string; // 添加过期时间
}

// 登录时设置过期时间
login: (user) => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  set({ user: { ...user, expiresAt }, isAuthenticated: true });
}
```

---

## 常见问题

### Q1: 刷新页面后需要重新登录？
A: 不会。认证信息存储在localStorage中，刷新页面后会保持登录状态。

### Q2: 如何清除登录状态？
A: 点击右上角的"登出"按钮，或手动清除浏览器localStorage中的 `auth-storage` 项。

### Q3: 忘记密码怎么办？
A: 当前为演示版本，暂不支持密码重置。生产环境应添加"忘记密码"功能。

### Q4: 如何添加更多用户？
A: 需要集成数据库，在 `auth.routes.ts` 中查询数据库验证用户。

---

## 下一步优化

1. ✅ 基础登录功能（已完成）
2. 🔲 密码加密存储（bcrypt）
3. 🔲 JWT Token认证
4. 🔲 用户注册功能
5. 🔲 密码重置功能
6. 🔲 角色权限管理
7. 🔲 登录日志记录
8. 🔲 双因素认证（2FA）
9. 🔲 OAuth第三方登录（Google、GitHub等）

---

## 注意事项

- ⚠️ 当前为演示版本，使用硬编码账号密码
- ⚠️ 生产环境务必实施上述安全建议
- ⚠️ 不要在生产环境中使用明文密码
- ⚠️ Token应设置合理的过期时间
- ⚠️ 建议使用环境变量存储敏感信息
