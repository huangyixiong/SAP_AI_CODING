# SAP_AI_CODING — 数据库 / 用户认证 / 邮件服务设计文档

**日期：** 2026-04-19
**状态：** 已批准，待实现

---

## 1. 背景与目标

### 问题

当前工程无数据库、无用户体系、无持久化，所有运行时数据随进程重启丢失。工程即将面向团队多人使用，需要：

1. **多用户支持** —— 不同账号登录，权限隔离
2. **用户 / 角色 / 权限管理** —— 管理员可在系统内维护
3. **邮件服务增强** —— SMTP 配置、收件人列表在系统内维护，收件人与角色绑定

### 不在本次范围内

- 审计日志（未来迭代）
- 文件服务器 / 历史记录持久化（等文件服务器就绪后再做）
- SSO / 企业微信 / 钉钉接入

---

## 2. 技术选型

| 项目 | 选型 | 理由 |
|------|------|------|
| 数据库 | PostgreSQL | 支持并发、备份，与 AutoOfficePlatform 保持一致 |
| ORM | Prisma | TypeScript 原生支持，类型安全，迁移简单 |
| 认证 | JWT (jsonwebtoken) | access token 8h + refresh token 30d，服务端存储 refresh token |
| 密码哈希 | bcrypt | 行业标准 |
| 邮件发送 | nodemailer（现有） | 已集成，扩展 SMTP 动态配置能力 |

---

## 3. 整体架构

```
SAP_AI_CODING
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ← 所有表定义
│   │   └── migrations/            ← 自动生成迁移文件
│   ├── src/
│   │   ├── config/               ← 新增 db、jwt、mail 配置项
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts ← JWT 验证中间件，保护所有 /api/* 路由
│   │   ├── services/
│   │   │   ├── AuthService.ts     ← 登录 / 刷新 token / 登出 / 改密码
│   │   │   ├── UserService.ts     ← 用户 CRUD
│   │   │   ├── RoleService.ts     ← 角色 & 权限 CRUD
│   │   │   └── EmailService.ts    ← 扩展：SMTP配置读取 + 收件人查询 + 发送记录写入
│   │   └── routes/
│   │       ├── auth.routes.ts
│   │       ├── users.routes.ts
│   │       ├── roles.routes.ts
│   │       └── mail-config.routes.ts
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login/             ← 新增登录页（未登录自动跳转）
│       │   └── Admin/             ← 新增管理后台
│       │       ├── Users/         ← 用户管理
│       │       ├── Roles/         ← 角色与权限管理
│       │       └── MailConfig/    ← SMTP配置 + 收件人维护 + 发送记录
│       ├── api/
│       │   ├── auth.api.ts
│       │   ├── users.api.ts
│       │   ├── roles.api.ts
│       │   └── mail-config.api.ts
│       └── store/
│           └── authStore.ts       ← Zustand：存 access_token（内存）、用户信息、权限列表
```

---

## 4. 数据模型（Prisma Schema）

```prisma
model User {
  id                Int      @id @default(autoincrement())
  username          String   @unique
  fullName          String
  email             String   @unique
  hashedPassword    String
  isActive          Boolean  @default(true)
  mustChangePassword Boolean @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  userRoles       UserRole[]
  emailRecipients EmailRecipient[]
  refreshTokens   RefreshToken[]
  emailLogs       EmailLog[]
}

// 服务端存储 refresh token，支持登出吊销和强制下线
model RefreshToken {
  id        Int       @id @default(autoincrement())
  tokenHash String    @unique   // bcrypt hash of the raw token
  userId    Int
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Role {
  id          Int      @id @default(autoincrement())
  name        String   @unique   // "admin" | "developer" | "viewer"
  description String?
  createdAt   DateTime @default(now())

  userRoles       UserRole[]
  rolePermissions RolePermission[]
  recipients      EmailRecipient[]
}

model UserRole {
  userId Int
  roleId Int
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([userId, roleId])
}

model Permission {
  id          Int    @id @default(autoincrement())
  code        String @unique  // "ts_reverse" | "fs_reverse" | "spec_gen"
  description String?

  rolePermissions RolePermission[]
}

model RolePermission {
  roleId       Int
  permissionId Int
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
}

// SMTP 服务器配置，单例模式：始终只 upsert id=1 这一行
model SmtpConfig {
  id        Int      @id @default(autoincrement())
  host      String
  port      Int      @default(587)
  secure    Boolean  @default(false)
  user      String?
  password  String?  // GET 响应时脱敏返回 "***"；PUT 时传 null 或 "***" 表示不修改
  fromAddr  String
  fromName  String?
  updatedAt DateTime @updatedAt
}

// 收件人绑定角色；同一邮箱在同一角色下唯一
model EmailRecipient {
  id        Int      @id @default(autoincrement())
  email     String
  name      String?
  roleId    Int
  userId    Int?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  role Role  @relation(fields: [roleId], references: [id], onDelete: Restrict)
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@unique([email, roleId])
}

// 每次邮件发送记录
model EmailLog {
  id          Int       @id @default(autoincrement())
  toAddrs     String    // JSON 字符串，存多个收件人
  subject     String
  status      String    // "pending" | "sent" | "failed"
  errorMsg    String?
  sentAt      DateTime?
  createdAt   DateTime  @default(now())
  createdById Int?

  createdBy User? @relation(fields: [createdById], references: [id], onDelete: SetNull)
}
```

### Seed 数据

初始化时自动写入（幂等，已存在则跳过）：
- 3 个权限：`ts_reverse`、`fs_reverse`、`spec_gen`
- 3 个角色：`admin`（全部权限）、`developer`（全部权限）、`viewer`（无权限，可按需分配）
- 1 个超级管理员账号：`admin / Admin@123`，`mustChangePassword: true`

**管理员密码丢失恢复：** 重新运行 `npm run seed:reset-admin`，该脚本将 admin 密码重置为 `Admin@123` 并将 `mustChangePassword` 置为 `true`。

---

## 5. API 接口

### 认证

| Method | Path | 描述 |
|--------|------|------|
| POST | `/api/auth/login` | 用户名+密码登录，返回 access_token + refresh_token + mustChangePassword 标志 |
| POST | `/api/auth/refresh` | 用 refresh_token 换新 access_token（同时轮换 refresh_token） |
| POST | `/api/auth/logout` | 吊销 refresh_token（服务端标记 revokedAt），前端清除存储 |
| GET  | `/api/auth/me` | 获取当前登录用户信息及权限列表 |
| PUT  | `/api/auth/change-password` | 修改密码（需提供旧密码；修改成功后吊销所有 refresh_token） |

> `/api/auth/login` 单独加严格限流：每 IP 15 分钟内最多 10 次，防暴力破解。

### 用户管理（需 admin 角色）

| Method | Path | 描述 |
|--------|------|------|
| GET    | `/api/users` | 用户列表（支持 `?page=&limit=` 分页） |
| POST   | `/api/users` | 创建用户 |
| PUT    | `/api/users/:id` | 部分更新用户信息（仅传入字段生效） |
| DELETE | `/api/users/:id` | 禁用用户（软删除：`isActive=false`，同时吊销其所有 refresh_token） |
| PUT    | `/api/users/:id/roles` | 全量替换用户角色，请求体：`{ roleIds: number[] }` |

### 角色管理（需 admin 角色）

| Method | Path | 描述 |
|--------|------|------|
| GET    | `/api/roles` | 角色列表（含权限） |
| POST   | `/api/roles` | 创建角色 |
| PUT    | `/api/roles/:id` | 部分更新角色信息 |
| PUT    | `/api/roles/:id/permissions` | 全量替换角色权限，请求体：`{ permissionIds: number[] }` |

> 角色删除在 v1 中**不支持**（避免级联影响），UI 中禁用删除按钮并提示"请先移除该角色下的所有用户"。

### 邮件配置（需 admin 角色）

| Method | Path | 描述 |
|--------|------|------|
| GET    | `/api/mail-config/smtp` | 查看当前 SMTP 配置（`password` 字段返回 `"***"` 脱敏） |
| PUT    | `/api/mail-config/smtp` | 更新 SMTP 配置（upsert id=1；传 `password: "***"` 或 `null` 表示不修改密码） |
| POST   | `/api/mail-config/smtp/test` | 向指定邮箱发送测试邮件，验证 SMTP 配置是否可用 |
| GET    | `/api/mail-config/recipients` | 收件人列表（支持 `?roleId=` 过滤） |
| POST   | `/api/mail-config/recipients` | 新增收件人 |
| PUT    | `/api/mail-config/recipients/:id` | 更新收件人（邮箱 / 姓名） |
| DELETE | `/api/mail-config/recipients/:id` | 删除收件人 |
| GET    | `/api/mail-config/logs` | 邮件发送记录（支持 `?page=&limit=` 分页） |

### 现有接口

保持不变，全部加 `auth.middleware.ts` 统一鉴权。

---

## 6. 认证流程

```
1. 用户 POST /api/auth/login（username + password）
2. 后端验证密码 → 生成 access_token（JWT, 8h）+ refresh_token（随机字符串）
3. refresh_token hash 存入 RefreshToken 表，原始值返回给前端
4. 前端：access_token 存 authStore 内存；refresh_token 存 localStorage
   ※ localStorage 存储 refresh_token 是针对内部工具场景的已知权衡：
     XSS 风险在受控内网环境中可接受；如未来需要更高安全级别可迁移至 httpOnly Cookie。
5. 每次请求带 Authorization: Bearer <access_token>
6. access_token 过期（401）→ 前端自动 POST /api/auth/refresh
   - 后端验证 refresh_token hash，检查未过期且未吊销
   - 轮换：旧 token 标记 revokedAt，生成新的 access_token + refresh_token 对
7. refresh_token 过期或已吊销 → 跳转登录页
8. 登出：POST /api/auth/logout → 后端吊销 refresh_token → 前端清除内存+localStorage

mustChangePassword 强制改密流程：
- 登录响应体包含 mustChangePassword: boolean
- 前端检测到 true → 跳转 /change-password 页，阻止访问其他页面
- 业务 API 中间件也检查此标志，若为 true 返回 403 并附带 code: "MUST_CHANGE_PASSWORD"
- 用户完成改密后，服务端将 mustChangePassword 置 false，前端正常放行

页面刷新处理：
- authStore 初始化时检查 localStorage 是否有 refresh_token
- 若有，立即调用 /api/auth/refresh 恢复 access_token，再加载业务页面
- 恢复失败则跳转登录页

强制下线：
- 用户被禁用（isActive=false）时，所有 RefreshToken 记录同步 revokedAt
- 下次 /api/auth/refresh 或业务接口请求时返回 401，前端跳转登录页
```

---

## 7. 前端路由变更

```
/login                    ← 公开，未登录自动跳转
/                         ← 需登录
/admin/users              ← 需 admin 角色
/admin/roles              ← 需 admin 角色
/admin/mail-config        ← 需 admin 角色
```

路由守卫：在 `router.tsx` 中封装 `<PrivateRoute>` 组件，检查 authStore 中的 token 和角色。首次加载时优先尝试用 refresh_token 恢复会话，再决定跳转目标。

---

## 8. 环境变量新增

```env
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/sap_ai_coding

# JWT
JWT_SECRET=change_me_to_a_random_64_char_hex_string
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d
```

SMTP 配置从 `.env` 迁移到数据库 `SmtpConfig` 表，`.env` 中原有 SMTP 相关变量废弃。

---

## 9. 实现顺序

启动顺序约定（写入 `package.json` scripts）：
```
prisma migrate deploy && prisma db seed → 启动 server
```

1. 安装 Prisma，初始化 schema，执行首次迁移
2. Seed 脚本（权限 / 角色 / 初始 admin；幂等）+ `seed:reset-admin` 脚本
3. `AuthService`（登录、refresh token 轮换、登出、改密码）+ `auth.routes.ts` + JWT 中间件 + login 限流
4. 现有所有路由接入鉴权中间件
5. `UserService` + `users.routes.ts`
6. `RoleService` + `roles.routes.ts`
7. `EmailService` 扩展（从 DB 读 SMTP 配置、收件人按角色查询、发送记录写入、SMTP 测试）
8. `mail-config.routes.ts`
9. 前端：登录页 + authStore（含页面刷新恢复逻辑）+ axios 拦截器（自动带 token，401 自动刷新）
10. 前端：Admin 管理后台（用户 / 角色 / 邮件配置页面）
11. 前端：路由守卫 `<PrivateRoute>`
