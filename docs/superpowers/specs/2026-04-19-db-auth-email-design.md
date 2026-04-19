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
| 认证 | JWT (jsonwebtoken) | access token 8h + refresh token 30d |
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
│   │   │   ├── AuthService.ts     ← 登录 / 刷新 token / 登出
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
│           └── authStore.ts       ← Zustand：存 token、用户信息、权限列表
```

---

## 4. 数据模型（Prisma Schema）

```prisma
model User {
  id             Int      @id @default(autoincrement())
  username       String   @unique
  fullName       String
  email          String   @unique
  hashedPassword String
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  userRoles       UserRole[]
  emailRecipients EmailRecipient[]
}

model Role {
  id          Int    @id @default(autoincrement())
  name        String @unique   // "admin" | "developer" | "viewer"
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

// SMTP 服务器配置，isActive=true 的记录为当前生效配置
model SmtpConfig {
  id        Int      @id @default(autoincrement())
  host      String
  port      Int      @default(587)
  secure    Boolean  @default(false)
  user      String?
  password  String?
  fromAddr  String
  fromName  String?
  isActive  Boolean  @default(true)
  updatedAt DateTime @updatedAt
}

// 收件人绑定角色；可选关联系统用户
model EmailRecipient {
  id        Int      @id @default(autoincrement())
  email     String
  name      String?
  roleId    Int
  userId    Int?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  role Role  @relation(fields: [roleId], references: [id])
  user User? @relation(fields: [userId], references: [id])
}

// 每次邮件发送记录
model EmailLog {
  id          Int      @id @default(autoincrement())
  toAddrs     String   // JSON 字符串，存多个收件人
  subject     String
  status      String   // "pending" | "sent" | "failed"
  errorMsg    String?
  sentAt      DateTime?
  createdAt   DateTime @default(now())
  createdById Int?
}
```

### Seed 数据

初始化时自动写入：
- 3 个权限：`ts_reverse`、`fs_reverse`、`spec_gen`
- 2 个角色：`admin`（拥有全部权限）、`developer`（拥有全部权限）
- 1 个超级管理员账号：`admin / Admin@123`（首次登录后强制改密码）

---

## 5. API 接口

### 认证

| Method | Path | 描述 |
|--------|------|------|
| POST | `/api/auth/login` | 用户名+密码登录，返回 access_token + refresh_token |
| POST | `/api/auth/refresh` | 用 refresh_token 换新 access_token |
| POST | `/api/auth/logout` | 登出（前端清除 token） |
| GET  | `/api/auth/me` | 获取当前登录用户信息及权限列表 |

### 用户管理（需 admin 角色）

| Method | Path | 描述 |
|--------|------|------|
| GET    | `/api/users` | 用户列表 |
| POST   | `/api/users` | 创建用户 |
| PUT    | `/api/users/:id` | 编辑用户信息 |
| DELETE | `/api/users/:id` | 禁用用户（软删除，isActive=false） |
| PUT    | `/api/users/:id/roles` | 分配角色 |

### 角色管理（需 admin 角色）

| Method | Path | 描述 |
|--------|------|------|
| GET    | `/api/roles` | 角色列表（含权限） |
| POST   | `/api/roles` | 创建角色 |
| PUT    | `/api/roles/:id` | 编辑角色 |
| PUT    | `/api/roles/:id/permissions` | 分配权限 |

### 邮件配置（需 admin 角色）

| Method | Path | 描述 |
|--------|------|------|
| GET    | `/api/mail-config/smtp` | 查看当前 SMTP 配置 |
| PUT    | `/api/mail-config/smtp` | 更新 SMTP 配置 |
| GET    | `/api/mail-config/recipients` | 收件人列表 |
| POST   | `/api/mail-config/recipients` | 新增收件人 |
| DELETE | `/api/mail-config/recipients/:id` | 删除收件人 |
| GET    | `/api/mail-config/logs` | 邮件发送记录 |

### 现有接口

保持不变，全部加 `auth.middleware.ts` 统一鉴权。

---

## 6. 认证流程

```
1. 用户 POST /api/auth/login（username + password）
2. 后端验证 → 返回 { access_token, refresh_token, user }
3. 前端存入 authStore（内存）+ localStorage（refresh_token）
4. 每次请求带 Authorization: Bearer <access_token>
5. access_token 过期（401）→ 自动用 refresh_token 换新 token
6. refresh_token 过期 → 跳转登录页
7. 登出 → 清除 localStorage + authStore
```

---

## 7. 前端路由变更

```
/login                    ← 公开，未登录跳转此页
/                         ← 需登录
/admin/users              ← 需 admin 角色
/admin/roles              ← 需 admin 角色
/admin/mail-config        ← 需 admin 角色
```

路由守卫：在 `router.tsx` 中封装 `<PrivateRoute>` 组件，检查 authStore 中的 token 和角色。

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

SMTP 配置从 `.env` 迁移到数据库 `SmtpConfig` 表，`.env` 中的 SMTP 相关变量废弃。

---

## 9. 实现顺序

1. 安装 Prisma，初始化 schema，首次迁移
2. Seed 脚本（权限、角色、初始管理员）
3. `AuthService` + `auth.routes.ts` + JWT 中间件
4. 现有路由接入鉴权中间件
5. `UserService` + `RoleService` + 对应路由
6. `EmailService` 扩展（从 DB 读 SMTP 配置，收件人按角色查询，发送记录写入）
7. 邮件配置路由
8. 前端：登录页 + authStore + axios 拦截器（自动带 token，处理 401 刷新）
9. 前端：Admin 管理后台（用户 / 角色 / 邮件配置）
10. 前端：路由守卫
