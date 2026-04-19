# DB / Auth / Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PostgreSQL + Prisma ORM, JWT authentication, role/permission-based access control, and email service enhancements (SMTP config in DB, role-based recipient lists) to SAP_AI_CODING.

**Architecture:** Prisma ORM manages all DB access via a singleton client. A JWT middleware guards every `/api/*` route (except `/api/health` and `/api/auth/*`). Roles own permissions (codes matching feature endpoint groups); users own roles. A `requirePermission(code)` middleware decorator protects individual LLM feature endpoints. Frontend stores access_token in Zustand memory and refresh_token in localStorage; an axios interceptor handles 401 auto-refresh transparently.

**Tech Stack:** Prisma 5, @prisma/client, bcryptjs, jsonwebtoken, express-rate-limit (existing), zod (existing), Antd (existing), Zustand (existing), React Router v6 (existing)

---

## Feature → Permission Code Mapping

| Feature endpoint | Permission code |
|-----------------|-----------------|
| `POST /api/documents/ts/stream` | `ts_reverse` |
| `POST /api/documents/fs/stream` | `fs_reverse` |
| `POST /api/documents/requirement-fs/stream` | `spec_gen` |

SAP query endpoints (`/api/sap/search`, `/api/sap/source`, `/api/sap/analyze`, write-back) are **not** permission-gated — any authenticated user can access them.

---

## File Map

### New files — backend
| File | Responsibility |
|------|---------------|
| `backend/prisma/schema.prisma` | All table definitions |
| `backend/prisma/seed.ts` | Seed permissions / roles / admin user |
| `backend/prisma/reset-admin.ts` | Reset admin password script |
| `backend/src/lib/prisma.ts` | Prisma client singleton |
| `backend/src/lib/asyncHandler.ts` | Express async wrapper — forwards errors to `next()` |
| `backend/src/middleware/auth.middleware.ts` | Verify JWT, attach `req.user` |
| `backend/src/middleware/requirePermission.ts` | Check `req.user.permissions` contains code |
| `backend/src/services/AuthService.ts` | login / refresh / logout / changePassword |
| `backend/src/services/UserService.ts` | User CRUD |
| `backend/src/services/RoleService.ts` | Role & permission CRUD |
| `backend/src/routes/auth.routes.ts` | Auth endpoints |
| `backend/src/routes/users.routes.ts` | User management endpoints |
| `backend/src/routes/roles.routes.ts` | Role management endpoints |
| `backend/src/routes/mail-config.routes.ts` | SMTP config, recipients, logs |

### Modified files — backend
| File | Change |
|------|--------|
| `backend/package.json` | Add prisma, @prisma/client, bcryptjs, jsonwebtoken + types |
| `backend/src/config/index.ts` | Add DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN |
| `backend/src/routes/index.ts` | Register new routes; apply authMiddleware globally |
| `backend/src/routes/document.routes.ts` | Add `requirePermission` to the three LLM endpoints |
| `backend/src/services/EmailService.ts` | Read SMTP from DB; log sends; query recipients by role |
| `backend/src/types/api.types.ts` | Add AuthUser type, extend Express Request |
| `backend/.env` | Add DATABASE_URL, JWT_SECRET env vars |

### New files — frontend
| File | Responsibility |
|------|---------------|
| `frontend/src/store/useAuthStore.ts` | Zustand: access_token (memory), user, permissions |
| `frontend/src/api/auth.api.ts` | login / refresh / logout / changePassword API calls |
| `frontend/src/api/users.api.ts` | User CRUD API calls |
| `frontend/src/api/roles.api.ts` | Role CRUD API calls |
| `frontend/src/api/mail-config.api.ts` | SMTP / recipients / logs API calls |
| `frontend/src/components/auth/PrivateRoute.tsx` | Route guard: restore session or redirect to /login |
| `frontend/src/components/auth/AdminRoute.tsx` | Route guard: redirect if not admin role |
| `frontend/src/pages/Login/index.tsx` | Login form page |
| `frontend/src/pages/ChangePassword/index.tsx` | Forced password change page |
| `frontend/src/pages/Admin/Users/index.tsx` | User management table |
| `frontend/src/pages/Admin/Roles/index.tsx` | Role & permission management |
| `frontend/src/pages/Admin/MailConfig/index.tsx` | SMTP config + recipients + logs |

### Modified files — frontend
| File | Change |
|------|--------|
| `frontend/src/api/client.ts` | Add auth interceptor (attach token, handle 401 refresh) |
| `frontend/src/App.tsx` | Remove `<AppLayout>` wrapper — layout now lives inside router |
| `frontend/src/router.tsx` | Add /login, /change-password, /admin/*; wrap routes in guards |
| `frontend/src/components/layout/AppLayout.tsx` | Replace `{children}` with `<Outlet />`; add logout + user display |

---

## Task 1: Install dependencies & set up Prisma

**Files:**
- Modify: `backend/package.json`
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/lib/prisma.ts`
- Modify: `backend/src/config/index.ts`
- Modify: `backend/.env`

- [ ] **Step 1: Install backend packages**

```bash
cd backend
npm install prisma @prisma/client bcryptjs jsonwebtoken
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
npx prisma init --datasource-provider postgresql
```

Expected: `backend/prisma/schema.prisma` created, `DATABASE_URL` placeholder added to `backend/.env`.

- [ ] **Step 2: Write schema.prisma**

Replace the full contents of `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                 Int      @id @default(autoincrement())
  username           String   @unique
  fullName           String
  email              String   @unique
  hashedPassword     String
  isActive           Boolean  @default(true)
  mustChangePassword Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  userRoles       UserRole[]
  emailRecipients EmailRecipient[]
  refreshTokens   RefreshToken[]
  emailLogs       EmailLog[]
}

model RefreshToken {
  id          Int       @id @default(autoincrement())
  tokenPrefix String    @unique   // first 8 chars of raw token for fast lookup
  tokenHash   String               // bcrypt hash of full raw token for verification
  userId      Int
  expiresAt   DateTime
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Role {
  id          Int      @id @default(autoincrement())
  name        String   @unique
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
  code        String @unique
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

model SmtpConfig {
  id        Int      @id @default(autoincrement())
  host      String
  port      Int      @default(587)
  secure    Boolean  @default(false)
  user      String?
  password  String?
  fromAddr  String
  fromName  String?
  updatedAt DateTime @updatedAt
}

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

model EmailLog {
  id          Int       @id @default(autoincrement())
  toAddrs     String
  subject     String
  status      String
  errorMsg    String?
  sentAt      DateTime?
  createdAt   DateTime  @default(now())
  createdById Int?

  createdBy User? @relation(fields: [createdById], references: [id], onDelete: SetNull)
}
```

- [ ] **Step 3: Add env vars to backend/.env**

Append to `backend/.env`:
```env
# PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/sap_ai_coding

# JWT
JWT_SECRET=replace_with_64_char_random_hex
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d
```

> Replace `postgres:password@localhost:5432` with your actual credentials. Create the `sap_ai_coding` database first: `createdb sap_ai_coding`

- [ ] **Step 4: Add DB + JWT config to config/index.ts**

In `backend/src/config/index.ts`, append inside the exported `config` object (after the `mail` block):

```typescript
  db: {
    url: process.env.DATABASE_URL || '',
  },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
```

- [ ] **Step 5: Create Prisma client singleton**

Create `backend/src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
```

- [ ] **Step 6: Run first migration**

```bash
cd backend
npx prisma migrate dev --name init
```

Expected: `backend/prisma/migrations/` folder created, all tables in PostgreSQL.
> Note: `migrate dev` auto-runs the seed script (configured in Task 2 Step 3) after migration. Run Task 2 first if you want seed to run automatically.

- [ ] **Step 7: Generate Prisma client**

```bash
cd backend
npx prisma generate
```

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/ backend/src/lib/prisma.ts backend/src/config/index.ts backend/package.json backend/package-lock.json
git commit -m "feat: add prisma schema and initial migration"
```

---

## Task 2: Seed script — permissions, roles, admin user

**Files:**
- Create: `backend/prisma/seed.ts`
- Create: `backend/prisma/reset-admin.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Write seed.ts**

Create `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { code: 'ts_reverse', description: '代码反向工程(TS)' },
    { code: 'fs_reverse', description: '代码反向工程(FS)' },
    { code: 'spec_gen', description: '规格驱动代码生成' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({ where: { code: p.code }, update: {}, create: p });
  }

  const allPerms = await prisma.permission.findMany();
  const allPermIds = allPerms.map((p) => ({ permissionId: p.id }));

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: '系统管理员，拥有全部权限' },
  });

  const devRole = await prisma.role.upsert({
    where: { name: 'developer' },
    update: {},
    create: { name: 'developer', description: '开发者，拥有全部功能权限' },
  });

  await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: { name: 'viewer', description: '只读用户，默认无功能权限' },
  });

  for (const role of [adminRole, devRole]) {
    for (const { permissionId } of allPermIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existing) {
    const hashed = await bcrypt.hash('Admin@123', 12);
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        fullName: '系统管理员',
        email: 'admin@example.com',
        hashedPassword: hashed,
        mustChangePassword: true,
      },
    });
    await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
    console.log('Created admin user (admin / Admin@123)');
  } else {
    console.log('Admin user already exists, skipping');
  }

  console.log('Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Write reset-admin.ts**

Create `backend/prisma/reset-admin.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('Admin@123', 12);
  await prisma.user.update({
    where: { username: 'admin' },
    data: { hashedPassword: hashed, mustChangePassword: true, isActive: true },
  });
  await prisma.refreshToken.updateMany({
    where: { user: { username: 'admin' } },
    data: { revokedAt: new Date() },
  });
  console.log('Admin password reset to Admin@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Register scripts in package.json**

In `backend/package.json`, add to `"scripts"`:
```json
"db:seed": "tsx prisma/seed.ts",
"db:reset-admin": "tsx prisma/reset-admin.ts",
"db:migrate": "prisma migrate deploy"
```

Also add a `"prisma"` top-level key in `backend/package.json`:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 4: Run seed**

```bash
cd backend
npm run db:seed
```

Expected:
```
Created admin user (admin / Admin@123)
Seed complete
```

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed.ts backend/prisma/reset-admin.ts backend/package.json
git commit -m "feat: add seed script for permissions, roles, and admin user"
```

---

## Task 3: asyncHandler utility + AuthService + JWT middleware

**Files:**
- Create: `backend/src/lib/asyncHandler.ts`
- Create: `backend/src/services/AuthService.ts`
- Create: `backend/src/middleware/auth.middleware.ts`
- Create: `backend/src/middleware/requirePermission.ts`
- Modify: `backend/src/types/api.types.ts`

- [ ] **Step 1: Create asyncHandler utility**

Create `backend/src/lib/asyncHandler.ts`:

```typescript
import { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

This ensures any thrown `AppError` (or other error) is forwarded to Express's `errorHandler` middleware instead of causing an unhandled rejection crash.

- [ ] **Step 2: Extend Express Request type**

Add to `backend/src/types/api.types.ts`:

```typescript
export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
```

- [ ] **Step 3: Write AuthService.ts**

Create `backend/src/services/AuthService.ts`:

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { config } from '../config';
import { AppError } from '../errors';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends TokenPair {
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    roles: string[];
    permissions: string[];
    mustChangePassword: boolean;
  };
}

async function getUserWithRolesAndPerms(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: { rolePermissions: { include: { permission: true } } },
          },
        },
      },
    },
  });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = [
    ...new Set(
      user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.code)
      )
    ),
  ];
  return { user, roles, permissions };
}

function generateAccessToken(userId: number): string {
  return jwt.sign({ sub: userId, type: 'access' }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

async function generateRefreshToken(userId: number): Promise<string> {
  const raw = crypto.randomBytes(40).toString('hex');
  const prefix = raw.slice(0, 8);
  const hash = await bcrypt.hash(raw, 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: { tokenPrefix: prefix, tokenHash: hash, userId, expiresAt },
  });
  return raw;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
    throw new AppError('UNAUTHORIZED', 'Invalid username or password', 401);
  }
  if (!user.isActive) {
    throw new AppError('FORBIDDEN', 'Account is disabled', 403);
  }

  const { roles, permissions } = await getUserWithRolesAndPerms(user.id);
  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      roles,
      permissions,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function refreshTokens(rawToken: string): Promise<TokenPair> {
  const prefix = rawToken.slice(0, 8);

  // Use prefix for O(1) DB lookup, then bcrypt verify for security
  const record = await prisma.refreshToken.findUnique({
    where: { tokenPrefix: prefix },
  });

  if (
    !record ||
    record.revokedAt ||
    record.expiresAt < new Date() ||
    !(await bcrypt.compare(rawToken, record.tokenHash))
  ) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || !user.isActive) {
    throw new AppError('UNAUTHORIZED', 'User not found or disabled', 401);
  }

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);
  return { accessToken, refreshToken };
}

export async function logout(userId: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  if (!(await bcrypt.compare(oldPassword, user.hashedPassword))) {
    throw new AppError('UNAUTHORIZED', 'Current password is incorrect', 401);
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword: hashed, mustChangePassword: false },
  });

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: number) {
  const { user, roles, permissions } = await getUserWithRolesAndPerms(userId);
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    roles,
    permissions,
    mustChangePassword: user.mustChangePassword,
  };
}
```

- [ ] **Step 4: Write auth.middleware.ts**

Create `backend/src/middleware/auth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../lib/prisma';

// Paths that bypass the mustChangePassword check (user must be able to call these even before changing password)
const MUST_CHANGE_PASSWORD_ALLOWLIST = ['/change-password', '/logout', '/me'];

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
  }

  const token = header.slice(7);
  let payload: { sub: number; type: string };

  try {
    payload = jwt.verify(token, config.jwt.secret) as typeof payload;
  } catch {
    return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Token 已过期，请刷新' } });
  }

  if (payload.type !== 'access') {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '无效 token' } });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      userRoles: {
        include: {
          role: { include: { rolePermissions: { include: { permission: true } } } },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '用户不存在或已禁用' } });
  }

  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = [
    ...new Set(
      user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.code)
      )
    ),
  ];

  req.user = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    roles,
    permissions,
    mustChangePassword: user.mustChangePassword,
  };

  // Block access if mustChangePassword, except for allowlisted auth paths
  if (user.mustChangePassword) {
    const isAllowed = MUST_CHANGE_PASSWORD_ALLOWLIST.some((p) => req.originalUrl.includes(p));
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'MUST_CHANGE_PASSWORD', message: '请先修改初始密码' },
      });
    }
  }

  next();
}
```

- [ ] **Step 5: Write requirePermission.ts**

Create `backend/src/middleware/requirePermission.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

export function requirePermission(code: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
    }
    if (!req.user.permissions.includes(code)) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: `缺少权限: ${code}` },
      });
    }
    next();
  };
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.roles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: `需要角色: ${role}` },
      });
    }
    next();
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/asyncHandler.ts backend/src/services/AuthService.ts backend/src/middleware/auth.middleware.ts backend/src/middleware/requirePermission.ts backend/src/types/api.types.ts
git commit -m "feat: add asyncHandler, AuthService, JWT middleware, and permission guard"
```

---

## Task 4: Auth routes + wire auth into all routes

**Files:**
- Create: `backend/src/routes/auth.routes.ts`
- Modify: `backend/src/routes/index.ts`
- Modify: `backend/src/routes/document.routes.ts`
- Modify: `backend/src/middleware/rateLimiter.ts`

- [ ] **Step 1: Add login rate limiter to rateLimiter.ts**

Append to `backend/src/middleware/rateLimiter.ts`:

```typescript
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('[RateLimit] Login brute-force attempt', { ip: req.ip });
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: '登录尝试过于频繁，请15分钟后重试' },
    });
  },
});
```

- [ ] **Step 2: Write auth.routes.ts**

Create `backend/src/routes/auth.routes.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import * as AuthService from '../services/AuthService';

const router = Router();

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const changePwSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8, '新密码至少8位'),
});

router.post('/login', loginRateLimiter, asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await AuthService.login(body.username, body.password);
  res.json(result);
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, error: { message: 'refreshToken required' } });
  const tokens = await AuthService.refreshTokens(refreshToken);
  res.json(tokens);
}));

router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  await AuthService.logout(req.user!.id);
  res.json({ success: true });
}));

router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await AuthService.getMe(req.user!.id);
  res.json(user);
}));

router.put('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const body = changePwSchema.parse(req.body);
  await AuthService.changePassword(req.user!.id, body.oldPassword, body.newPassword);
  res.json({ success: true });
}));

export default router;
```

- [ ] **Step 3: Create stub route files (needed before updating routes/index.ts)**

Create three empty stub files so TypeScript compiles:

```bash
# Run from the backend/ directory
printf "import { Router } from 'express';\nexport default Router();\n" > src/routes/users.routes.ts
printf "import { Router } from 'express';\nexport default Router();\n" > src/routes/roles.routes.ts
printf "import { Router } from 'express';\nexport default Router();\n" > src/routes/mail-config.routes.ts
```

- [ ] **Step 4: Update routes/index.ts**

Replace `backend/src/routes/index.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import sapRoutes from './sap.routes';
import documentRoutes from './document.routes';
import promptRoutes from './prompt.routes';
import mailRoutes from './mail.routes';
import usersRoutes from './users.routes';
import rolesRoutes from './roles.routes';
import mailConfigRoutes from './mail-config.routes';

const router = Router();

// Public
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Protected — authMiddleware applied globally to everything below
router.use(authMiddleware);

router.use('/sap', sapRoutes);
router.use('/documents', documentRoutes);
router.use('/prompt', promptRoutes);
router.use('/mail', mailRoutes);
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/mail-config', mailConfigRoutes);

export default router;
```

- [ ] **Step 5: Add permission guards to document.routes.ts**

Open `backend/src/routes/document.routes.ts`. The three LLM feature endpoints map to permissions as follows:

| Route | Permission |
|-------|-----------|
| `POST /documents/ts/stream` | `ts_reverse` |
| `POST /documents/fs/stream` | `fs_reverse` |
| `POST /documents/requirement-fs/stream` | `spec_gen` |

Add `requirePermission` import and middleware:

```typescript
import { requirePermission } from '../middleware/requirePermission';

// Update these three routes:
router.post('/ts/stream', llmRateLimiter, requirePermission('ts_reverse'), generateTS);
router.post('/fs/stream', llmRateLimiter, requirePermission('fs_reverse'), generateFS);
router.post('/requirement-fs/stream', llmRateLimiter, requirePermission('spec_gen'), generateFSFromRequirement);

// Leave unchanged:
router.post('/reference-prompt/stream', llmRateLimiter, generateReferencePrompt);
router.post('/pseudocode/stream', llmRateLimiter, generatePseudocode);
```

- [ ] **Step 6: Verify server compiles and auth works**

```bash
cd backend && npm run dev
```

Test public endpoint (should pass):
```bash
curl -s http://localhost:3001/api/health
# Expected: {"status":"ok"}
```

Test protected endpoint without token (should fail):
```bash
curl -s http://localhost:3001/api/sap/search?query=test
# Expected: {"success":false,"error":{"code":"UNAUTHORIZED","message":"未登录"}}
```

Test login:
```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' | jq .
# Expected: {"accessToken":"...","refreshToken":"...","user":{"mustChangePassword":true,...}}
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/ backend/src/middleware/rateLimiter.ts
git commit -m "feat: add auth routes, global auth middleware, permission guards on feature endpoints"
```

---

## Task 5: User management routes

**Files:**
- Create: `backend/src/services/UserService.ts`
- Modify: `backend/src/routes/users.routes.ts`

- [ ] **Step 1: Write UserService.ts**

Create `backend/src/services/UserService.ts`:

```typescript
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AppError } from '../errors';

export async function listUsers(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip, take: limit,
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);
  return { users: users.map(formatUser), total, page, limit };
}

export async function createUser(data: {
  username: string; fullName: string; email: string; password: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: data.username }, { email: data.email }] },
  });
  if (existing) throw new AppError('CONFLICT', '用户名或邮箱已存在', 409);

  const hashed = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      username: data.username, fullName: data.fullName,
      email: data.email, hashedPassword: hashed, mustChangePassword: true,
    },
    include: { userRoles: { include: { role: true } } },
  });
  return formatUser(user);
}

export async function updateUser(
  id: number,
  data: Partial<{ fullName: string; email: string; isActive: boolean }>
) {
  const user = await prisma.user.update({
    where: { id }, data,
    include: { userRoles: { include: { role: true } } },
  });
  return formatUser(user);
}

export async function deactivateUser(id: number) {
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await prisma.refreshToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function assignRoles(userId: number, roleIds: number[]) {
  await prisma.userRole.deleteMany({ where: { userId } });
  if (roleIds.length > 0) {
    await prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
    });
  }
}

function formatUser(user: any) {
  return {
    id: user.id, username: user.username, fullName: user.fullName,
    email: user.email, isActive: user.isActive, mustChangePassword: user.mustChangePassword,
    roles: user.userRoles?.map((ur: any) => ({ id: ur.role.id, name: ur.role.name })) ?? [],
    createdAt: user.createdAt,
  };
}
```

- [ ] **Step 2: Write users.routes.ts**

Replace `backend/src/routes/users.routes.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/requirePermission';
import { asyncHandler } from '../lib/asyncHandler';
import * as UserService from '../services/UserService';

const router = Router();
router.use(requireRole('admin'));

router.get('/', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  res.json(await UserService.listUsers(page, limit));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = z.object({
    username: z.string().min(2), fullName: z.string().min(1),
    email: z.string().email(), password: z.string().min(8),
  }).parse(req.body);
  res.status(201).json(await UserService.createUser(data));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const data = z.object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);
  res.json(await UserService.updateUser(Number(req.params.id), data));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await UserService.deactivateUser(Number(req.params.id));
  res.json({ success: true });
}));

router.put('/:id/roles', asyncHandler(async (req, res) => {
  const { roleIds } = z.object({ roleIds: z.array(z.number()) }).parse(req.body);
  await UserService.assignRoles(Number(req.params.id), roleIds);
  res.json({ success: true });
}));

export default router;
```

- [ ] **Step 3: Test**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' | jq -r .accessToken)

curl -s http://localhost:3001/api/users -H "Authorization: Bearer $TOKEN" | jq .
# Expected: {"users":[...],"total":1,...}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/UserService.ts backend/src/routes/users.routes.ts
git commit -m "feat: add user management service and routes"
```

---

## Task 6: Role management routes

**Files:**
- Create: `backend/src/services/RoleService.ts`
- Modify: `backend/src/routes/roles.routes.ts`

- [ ] **Step 1: Write RoleService.ts**

Create `backend/src/services/RoleService.ts`:

```typescript
import prisma from '../lib/prisma';
import { AppError } from '../errors';

export async function listRoles() {
  const roles = await prisma.role.findMany({
    include: { rolePermissions: { include: { permission: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return roles.map(formatRole);
}

export async function createRole(data: { name: string; description?: string }) {
  const existing = await prisma.role.findUnique({ where: { name: data.name } });
  if (existing) throw new AppError('CONFLICT', '角色名已存在', 409);
  const role = await prisma.role.create({
    data,
    include: { rolePermissions: { include: { permission: true } } },
  });
  return formatRole(role);
}

export async function updateRole(id: number, data: { name?: string; description?: string }) {
  const role = await prisma.role.update({
    where: { id }, data,
    include: { rolePermissions: { include: { permission: true } } },
  });
  return formatRole(role);
}

export async function assignPermissions(roleId: number, permissionIds: number[]) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    });
  }
}

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { code: 'asc' } });
}

function formatRole(role: any) {
  return {
    id: role.id, name: role.name, description: role.description, createdAt: role.createdAt,
    permissions: role.rolePermissions?.map((rp: any) => ({
      id: rp.permission.id, code: rp.permission.code, description: rp.permission.description,
    })) ?? [],
  };
}
```

- [ ] **Step 2: Write roles.routes.ts**

Replace `backend/src/routes/roles.routes.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/requirePermission';
import { asyncHandler } from '../lib/asyncHandler';
import * as RoleService from '../services/RoleService';

const router = Router();
router.use(requireRole('admin'));

router.get('/', asyncHandler(async (_req, res) => { res.json(await RoleService.listRoles()); }));

router.get('/permissions', asyncHandler(async (_req, res) => {
  res.json(await RoleService.listPermissions());
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = z.object({ name: z.string().min(2), description: z.string().optional() }).parse(req.body);
  res.status(201).json(await RoleService.createRole(data));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const data = z.object({ name: z.string().min(2).optional(), description: z.string().optional() }).parse(req.body);
  res.json(await RoleService.updateRole(Number(req.params.id), data));
}));

router.put('/:id/permissions', asyncHandler(async (req, res) => {
  const { permissionIds } = z.object({ permissionIds: z.array(z.number()) }).parse(req.body);
  await RoleService.assignPermissions(Number(req.params.id), permissionIds);
  res.json({ success: true });
}));

export default router;
```

> **Note:** Role deletion is intentionally not implemented. If a role has assigned users, deleting it would orphan those assignments. The UI in Task 10 does not show a delete button for roles.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/RoleService.ts backend/src/routes/roles.routes.ts
git commit -m "feat: add role management service and routes"
```

---

## Task 7: Email config routes (SMTP / recipients / logs)

**Files:**
- Modify: `backend/src/services/EmailService.ts`
- Modify: `backend/src/routes/mail-config.routes.ts`

- [ ] **Step 1: Extend EmailService.ts**

In `backend/src/services/EmailService.ts`, add a `prisma` import at the top:
```typescript
import prisma from '../lib/prisma';
```

Replace the `createTransport` call inside `sendSpecDocuments` so it reads from `SmtpConfig` in the database instead of `config.mail`. Add this private helper and update the method:

```typescript
private async getSmtpConfig() {
  const cfg = await prisma.smtpConfig.findFirst({ orderBy: { id: 'asc' } });
  if (!cfg) throw new Error('SMTP 未配置，请在系统设置中配置邮件服务器');
  return cfg;
}

async sendSpecDocuments(params: SendSpecDocumentsParams & { userId?: number }): Promise<void> {
  const cfg = await this.getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user && cfg.password ? { user: cfg.user, pass: cfg.password } : undefined,
  });

  const text = [
    '======== FS（功能规格） ========', '',
    params.fsContent.trim(), '',
    '======== 代码参考提示词 ========', '',
    params.referencePrompt?.trim() || '（未生成或为空）',
  ].join('\n');

  const info = await transporter.sendMail({
    from: cfg.fromName ? `"${cfg.fromName}" <${cfg.fromAddr}>` : cfg.fromAddr,
    to: params.to.join(', '),
    cc: params.cc?.length ? params.cc.join(', ') : undefined,
    subject: params.subject,
    text,
  });

  await prisma.emailLog.create({
    data: {
      toAddrs: JSON.stringify(params.to),
      subject: params.subject,
      status: 'sent',
      sentAt: new Date(),
      createdById: params.userId ?? null,
    },
  });

  logger.info('[EmailService] Mail sent', { messageId: info.messageId, to: params.to });
}

async getRecipientsByRole(roleName: string): Promise<{ email: string; name?: string }[]> {
  const recipients = await prisma.emailRecipient.findMany({
    where: { isActive: true, role: { name: roleName } },
  });
  return recipients.map((r) => ({ email: r.email, name: r.name ?? undefined }));
}
```

Also remove the `config.mail.enabled` check at the top of the old method — SMTP config is now always read from DB.

- [ ] **Step 2: Write mail-config.routes.ts**

Replace `backend/src/routes/mail-config.routes.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/requirePermission';
import { asyncHandler } from '../lib/asyncHandler';
import prisma from '../lib/prisma';
import EmailService from '../services/EmailService';
import logger from '../lib/logger';

const router = Router();
router.use(requireRole('admin'));

// ── SMTP Config ──────────────────────────────────────────────────────────────

router.get('/smtp', asyncHandler(async (_req, res) => {
  const cfg = await prisma.smtpConfig.findFirst({ orderBy: { id: 'asc' } });
  if (!cfg) return res.json(null);
  res.json({ ...cfg, password: cfg.password ? '***' : null });
}));

router.put('/smtp', asyncHandler(async (req, res) => {
  const schema = z.object({
    host: z.string().min(1), port: z.number().int().min(1).max(65535),
    secure: z.boolean(), user: z.string().optional(),
    password: z.string().optional(), fromAddr: z.string().email(),
    fromName: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const existing = await prisma.smtpConfig.findFirst({ orderBy: { id: 'asc' } });
  const keepPassword =
    !data.password || data.password === '***' ? existing?.password ?? null : data.password;

  const cfg = await prisma.smtpConfig.upsert({
    where: { id: existing?.id ?? 0 },
    update: { ...data, password: keepPassword },
    create: { ...data, password: keepPassword },
  });
  res.json({ ...cfg, password: cfg.password ? '***' : null });
}));

router.post('/smtp/test', asyncHandler(async (req, res) => {
  const { to } = z.object({ to: z.string().email() }).parse(req.body);
  const emailService = new EmailService();
  await emailService.sendSpecDocuments({
    to: [to], subject: 'SMTP 测试邮件',
    fsContent: '这是一封测试邮件，验证 SMTP 配置是否正确。',
    referencePrompt: '',
  });
  logger.info('[MailConfig] SMTP test email sent', { to });
  res.json({ success: true });
}));

// ── Recipients ────────────────────────────────────────────────────────────────

router.get('/recipients', asyncHandler(async (req, res) => {
  const roleId = req.query.roleId ? Number(req.query.roleId) : undefined;
  const recipients = await prisma.emailRecipient.findMany({
    where: roleId ? { roleId } : {},
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(recipients);
}));

router.post('/recipients', asyncHandler(async (req, res) => {
  const data = z.object({
    email: z.string().email(), name: z.string().optional(), roleId: z.number().int(),
  }).parse(req.body);
  const recipient = await prisma.emailRecipient.create({ data, include: { role: true } });
  res.status(201).json(recipient);
}));

router.put('/recipients/:id', asyncHandler(async (req, res) => {
  const data = z.object({
    email: z.string().email().optional(), name: z.string().optional(),
  }).parse(req.body);
  const recipient = await prisma.emailRecipient.update({
    where: { id: Number(req.params.id) }, data, include: { role: true },
  });
  res.json(recipient);
}));

router.delete('/recipients/:id', asyncHandler(async (req, res) => {
  await prisma.emailRecipient.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
}));

// ── Email Logs ────────────────────────────────────────────────────────────────

router.get('/logs', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      skip, take: limit, orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { username: true, fullName: true } } },
    }),
    prisma.emailLog.count(),
  ]);
  res.json({ logs, total, page, limit });
}));

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/EmailService.ts backend/src/routes/mail-config.routes.ts
git commit -m "feat: extend email service with DB-backed SMTP, recipients, and send logs"
```

---

## Task 8: Frontend — authStore + axios interceptor

**Files:**
- Create: `frontend/src/store/useAuthStore.ts`
- Create: `frontend/src/api/auth.api.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Write useAuthStore.ts**

Create `frontend/src/store/useAuthStore.ts`:

```typescript
import { create } from 'zustand';

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  hasPermission: (code: string) => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,

  setAuth: (accessToken, user) => set({ accessToken, user }),

  clearAuth: () => {
    localStorage.removeItem('refreshToken');
    set({ accessToken: null, user: null });
  },

  hasPermission: (code) => get().user?.permissions.includes(code) ?? false,
  isAdmin: () => get().user?.roles.includes('admin') ?? false,
}));
```

- [ ] **Step 2: Write auth.api.ts**

Create `frontend/src/api/auth.api.ts`:

```typescript
import apiClient from './client';
import type { AuthUser } from '../store/useAuthStore';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { username, password }),

  refresh: (refreshToken: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<AuthUser>('/auth/me'),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.put('/auth/change-password', { oldPassword, newPassword }),
};
```

- [ ] **Step 3: Replace client.ts**

Replace `frontend/src/api/client.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401: try refresh, else redirect to login
let refreshing: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const raw = localStorage.getItem('refreshToken');
    if (!raw) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (!refreshing) {
      refreshing = apiClient
        .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken: raw })
        .then((res) => {
          const { accessToken, refreshToken } = res.data;
          const { user } = useAuthStore.getState();
          useAuthStore.getState().setAuth(accessToken, user!);
          localStorage.setItem('refreshToken', refreshToken);
          return accessToken;
        })
        .catch(() => {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
          return Promise.reject(new Error('Session expired'));
        })
        .finally(() => { refreshing = null; });
    }

    const newToken = await refreshing;
    original._retry = true;
    original.headers.Authorization = `Bearer ${newToken}`;
    return apiClient(original);
  }
);

export default apiClient;

// SSE streaming helper — now attaches auth token
export function createSSEStream(
  url: string,
  body: object,
  onEvent: (event: Record<string, unknown>) => void,
  onDone: (reason: 'done' | 'error' | 'eof') => void,
  onError: (err: Error) => void
): AbortController {
  const controller = new AbortController();
  const token = useAuthStore.getState().accessToken;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok || !response.body) throw new Error(`HTTP error: ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data) {
              try {
                const parsed = JSON.parse(data);
                onEvent(parsed);
                if (parsed.type === 'done' || parsed.type === 'error') {
                  onDone(parsed.type === 'done' ? 'done' : 'error');
                  return;
                }
              } catch { /* ignore */ }
            }
          }
        }
      }
      onDone('eof');
    })
    .catch((err: Error) => { if (err.name !== 'AbortError') onError(err); });

  return controller;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/useAuthStore.ts frontend/src/api/auth.api.ts frontend/src/api/client.ts
git commit -m "feat: add auth store, auth API, and JWT axios interceptor"
```

---

## Task 9: Frontend — Login, ChangePassword, route guards, layout fixes

**Files:**
- Create: `frontend/src/components/auth/PrivateRoute.tsx`
- Create: `frontend/src/components/auth/AdminRoute.tsx`
- Create: `frontend/src/pages/Login/index.tsx`
- Create: `frontend/src/pages/ChangePassword/index.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Update App.tsx — remove AppLayout wrapper**

`App.tsx` currently wraps `<AppRouter />` inside `<AppLayout>`. This must be removed because `AppLayout` will now be a route element with `<Outlet />` inside it. The router controls layout mounting.

In `frontend/src/App.tsx`, find:
```tsx
<AppLayout>
  <AppRouter />
</AppLayout>
```

Replace with:
```tsx
<AppRouter />
```

Also remove the `AppLayout` import from `App.tsx` if it's no longer used directly there.

- [ ] **Step 2: Update AppLayout.tsx — replace children with Outlet, add logout**

In `frontend/src/components/layout/AppLayout.tsx`:

1. Add imports at the top:
```tsx
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/auth.api';
import { LogoutOutlined } from '@ant-design/icons';
```

2. Inside the component function, add:
```tsx
const { user, clearAuth } = useAuthStore();
const navigate = useNavigate();

const handleLogout = async () => {
  try { await authApi.logout(); } catch { /* ignore network errors */ }
  clearAuth();
  navigate('/login', { replace: true });
};
```

3. Find where `{children}` is rendered in the JSX (inside `<Content>`) and replace it with `<Outlet />`.

4. In the header/sider area, add user display and logout button. Find a suitable location in the existing header JSX and add:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{user?.fullName}</span>
  <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}
    style={{ color: 'rgba(255,255,255,0.75)' }} title="退出登录" />
</div>
```

5. Remove the `children` prop from the component signature: change `function AppLayout({ children }: { children: React.ReactNode })` to `function AppLayout()`.

- [ ] **Step 3: Write PrivateRoute.tsx**

Create `frontend/src/components/auth/PrivateRoute.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/auth.api';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, setAuth, clearAuth } = useAuthStore();
  const [checking, setChecking] = useState(!accessToken);

  useEffect(() => {
    if (accessToken) return;
    const raw = localStorage.getItem('refreshToken');
    if (!raw) { setChecking(false); return; }

    authApi.refresh(raw)
      .then((res) => {
        const { accessToken: newToken, refreshToken } = res.data;
        localStorage.setItem('refreshToken', refreshToken);
        return authApi.me().then((meRes) => setAuth(newToken, meRes.data));
      })
      .catch(() => clearAuth())
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <Spin fullscreen tip="加载中..." />;
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Write AdminRoute.tsx**

Create `frontend/src/components/auth/AdminRoute.tsx`:

```tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminRoute() {
  const isAdmin = useAuthStore((s) => s.isAdmin());
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
```

- [ ] **Step 5: Write Login page**

Create `frontend/src/pages/Login/index.tsx`:

```tsx
import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.login(values.username, values.password);
      const { accessToken, refreshToken, user } = res.data;
      localStorage.setItem('refreshToken', refreshToken);
      setAuth(accessToken, user);
      navigate(user.mustChangePassword ? '/change-password' : '/', { replace: true });
    } catch (err: any) {
      message.error(err.response?.data?.error?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="SAP AI CODING 平台登录" style={{ width: 380 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true }]}>
            <Input.Password onPressEnter={() => document.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true }))} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Write ChangePassword page**

Create `frontend/src/pages/ChangePassword/index.tsx`:

```tsx
import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/useAuthStore';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { oldPassword: string; newPassword: string }) => {
    setLoading(true);
    try {
      await authApi.changePassword(values.oldPassword, values.newPassword);
      message.success('密码已修改，请重新登录');
      useAuthStore.getState().clearAuth();
      navigate('/login', { replace: true });
    } catch (err: any) {
      message.error(err.response?.data?.error?.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="修改初始密码" style={{ width: 420 }}>
        <p>您正在使用初始密码，请立即修改后才能使用系统。</p>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item label="当前密码" name="oldPassword" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="新密码（至少8位）" name="newPassword" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="确认新密码" name="confirm" dependencies={['newPassword']}
            rules={[{ required: true }, ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('两次密码不一致'));
              },
            })]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>确认修改</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Create admin page stub files**

```bash
mkdir -p frontend/src/pages/Admin/Users frontend/src/pages/Admin/Roles frontend/src/pages/Admin/MailConfig
printf "import React from 'react';\nexport default function AdminUsers() { return <div>Users</div>; }\n" > frontend/src/pages/Admin/Users/index.tsx
printf "import React from 'react';\nexport default function AdminRoles() { return <div>Roles</div>; }\n" > frontend/src/pages/Admin/Roles/index.tsx
printf "import React from 'react';\nexport default function AdminMailConfig() { return <div>MailConfig</div>; }\n" > frontend/src/pages/Admin/MailConfig/index.tsx
```

- [ ] **Step 8: Update router.tsx**

Replace `frontend/src/router.tsx`:

```tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/Login';
import ChangePasswordPage from './pages/ChangePassword';
import SourceToTS from './pages/SourceToTS';
import SourceToFS from './pages/SourceToFS';
import SpecWorkspace from './pages/SpecWorkspace';
import AdminUsers from './pages/Admin/Users';
import AdminRoles from './pages/Admin/Roles';
import AdminMailConfig from './pages/Admin/MailConfig';

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Protected — AppLayout renders <Outlet /> for nested pages */}
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/workspace/spec" replace />} />
        <Route path="workspace/spec" element={<SpecWorkspace />} />
        <Route path="implementation/sap-ts" element={<SourceToTS />} />
        <Route path="implementation/sap-fs" element={<SourceToFS />} />

        {/* Admin — AdminRoute checks isAdmin(), renders <Outlet /> */}
        <Route path="admin" element={<AdminRoute />}>
          <Route path="users" element={<AdminUsers />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="mail-config" element={<AdminMailConfig />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 9: Start frontend and test auth flow**

```bash
cd frontend && npm run dev
```

1. `http://localhost:5173` → redirects to `/login` ✓
2. Login `admin / Admin@123` → redirects to `/change-password` ✓
3. Change password → redirects to `/login` ✓
4. Login with new password → reaches main app ✓
5. Navigate to `/admin/users` → shows "Users" stub ✓
6. Hard refresh on main page → session restored, no redirect to login ✓

- [ ] **Step 10: Commit**

```bash
git add frontend/src/
git commit -m "feat: add login, change-password, route guards, AppLayout Outlet, logout"
```

---

## Task 10: Frontend — Admin pages (Users, Roles, MailConfig) + API files

**Files:**
- Create: `frontend/src/api/users.api.ts`
- Create: `frontend/src/api/roles.api.ts`
- Create: `frontend/src/api/mail-config.api.ts`
- Modify: `frontend/src/pages/Admin/Users/index.tsx`
- Modify: `frontend/src/pages/Admin/Roles/index.tsx`
- Modify: `frontend/src/pages/Admin/MailConfig/index.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx` (add admin menu items)

- [ ] **Step 1: Write API files**

Create `frontend/src/api/users.api.ts`:
```typescript
import apiClient from './client';
export const usersApi = {
  list: (page = 1, limit = 20) => apiClient.get('/users', { params: { page, limit } }),
  create: (data: any) => apiClient.post('/users', data),
  update: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
  deactivate: (id: number) => apiClient.delete(`/users/${id}`),
  assignRoles: (id: number, roleIds: number[]) => apiClient.put(`/users/${id}/roles`, { roleIds }),
};
```

Create `frontend/src/api/roles.api.ts`:
```typescript
import apiClient from './client';
export const rolesApi = {
  list: () => apiClient.get('/roles'),
  listPermissions: () => apiClient.get('/roles/permissions'),
  create: (data: any) => apiClient.post('/roles', data),
  update: (id: number, data: any) => apiClient.put(`/roles/${id}`, data),
  assignPermissions: (id: number, permissionIds: number[]) =>
    apiClient.put(`/roles/${id}/permissions`, { permissionIds }),
};
```

Create `frontend/src/api/mail-config.api.ts`:
```typescript
import apiClient from './client';
export const mailConfigApi = {
  getSmtp: () => apiClient.get('/mail-config/smtp'),
  updateSmtp: (data: any) => apiClient.put('/mail-config/smtp', data),
  testSmtp: (to: string) => apiClient.post('/mail-config/smtp/test', { to }),
  getRecipients: (roleId?: number) => apiClient.get('/mail-config/recipients', { params: roleId ? { roleId } : {} }),
  addRecipient: (data: any) => apiClient.post('/mail-config/recipients', data),
  updateRecipient: (id: number, data: any) => apiClient.put(`/mail-config/recipients/${id}`, data),
  deleteRecipient: (id: number) => apiClient.delete(`/mail-config/recipients/${id}`),
  getLogs: (page = 1, limit = 20) => apiClient.get('/mail-config/logs', { params: { page, limit } }),
};
```

- [ ] **Step 2: Write Users admin page**

Replace `frontend/src/pages/Admin/Users/index.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { usersApi } from '../../../api/users.api';
import { rolesApi } from '../../../api/roles.api';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();

  const load = async (p = page) => {
    const res = await usersApi.list(p, 20);
    setUsers(res.data.users);
    setTotal(res.data.total);
  };

  useEffect(() => { load(); rolesApi.list().then((r) => setRoles(r.data)); }, []);

  const handleCreate = async (values: any) => {
    try {
      await usersApi.create(values);
      message.success('用户已创建，初始密码需首次登录修改');
      setCreateOpen(false); form.resetFields(); load();
    } catch (e: any) { message.error(e.response?.data?.error?.message || '创建失败'); }
  };

  const handleDeactivate = async (id: number) => {
    await usersApi.deactivate(id);
    message.success('用户已禁用');
    load();
  };

  const handleAssignRoles = async (values: { roleIds: number[] }) => {
    await usersApi.assignRoles(roleOpen.userId!, values.roleIds);
    message.success('角色已更新'); setRoleOpen({ open: false, userId: null }); load();
  };

  const columns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'fullName' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '状态', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '启用' : '禁用'}</Tag> },
    { title: '角色', dataIndex: 'roles', render: (rs: any[]) => rs.map((r) => <Tag key={r.id}>{r.name}</Tag>) },
    {
      title: '操作', render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => {
            roleForm.setFieldsValue({ roleIds: record.roles.map((r: any) => r.id) });
            setRoleOpen({ open: true, userId: record.id });
          }}>分配角色</Button>
          <Popconfirm title="确认禁用此用户？" onConfirm={() => handleDeactivate(record.id)}>
            <Button size="small" danger disabled={!record.isActive}>禁用</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建用户</Button>
      </div>
      <Table rowKey="id" dataSource={users} columns={columns}
        pagination={{ current: page, total, pageSize: 20, onChange: (p) => { setPage(p); load(p); } }} />

      <Modal title="新建用户" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); }} onOk={form.submit}>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
          <Form.Item name="fullName" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="password" label="初始密码（至少8位）" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>
        </Form>
      </Modal>

      <Modal title="分配角色" open={roleOpen.open} onCancel={() => setRoleOpen({ open: false, userId: null })} onOk={roleForm.submit}>
        <Form form={roleForm} onFinish={handleAssignRoles} layout="vertical">
          <Form.Item name="roleIds" label="角色">
            <Select mode="multiple" options={roles.map((r) => ({ label: r.name, value: r.id }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
```

- [ ] **Step 3: Write Roles admin page**

Replace `frontend/src/pages/Admin/Roles/index.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Checkbox, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { rolesApi } from '../../../api/roles.api';

export default function AdminRoles() {
  const [roles, setRoles] = useState<any[]>([]);
  const [allPerms, setAllPerms] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [permOpen, setPermOpen] = useState<{ open: boolean; roleId: number | null }>({ open: false, roleId: null });
  const [form] = Form.useForm();
  const [permForm] = Form.useForm();

  const load = async () => {
    const [r, p] = await Promise.all([rolesApi.list(), rolesApi.listPermissions()]);
    setRoles(r.data); setAllPerms(p.data);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (values: any) => {
    try {
      await rolesApi.create(values);
      message.success('角色已创建');
      setCreateOpen(false); form.resetFields(); load();
    } catch (e: any) { message.error(e.response?.data?.error?.message || '创建失败'); }
  };

  const handleAssignPerms = async (values: { permissionIds: number[] }) => {
    await rolesApi.assignPermissions(permOpen.roleId!, values.permissionIds);
    message.success('权限已更新'); setPermOpen({ open: false, roleId: null }); load();
  };

  const columns = [
    { title: '角色名', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description' },
    { title: '权限', dataIndex: 'permissions', render: (ps: any[]) => ps.map((p) => <Tag key={p.code} color="blue">{p.code}</Tag>) },
    {
      title: '操作', render: (_: any, record: any) => (
        <Button size="small" onClick={() => {
          permForm.setFieldsValue({ permissionIds: record.permissions.map((p: any) => p.id) });
          setPermOpen({ open: true, roleId: record.id });
        }}>编辑权限</Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建角色</Button>
      </div>
      <Table rowKey="id" dataSource={roles} columns={columns} pagination={false} />

      <Modal title="新建角色" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); }} onOk={form.submit}>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="角色名" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="分配权限" open={permOpen.open} onCancel={() => setPermOpen({ open: false, roleId: null })} onOk={permForm.submit}>
        <Form form={permForm} onFinish={handleAssignPerms} layout="vertical">
          <Form.Item name="permissionIds">
            <Checkbox.Group
              options={allPerms.map((p) => ({ label: `${p.code} — ${p.description}`, value: p.id }))}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
```

- [ ] **Step 4: Write MailConfig admin page**

Replace `frontend/src/pages/Admin/MailConfig/index.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Tabs, Form, Input, InputNumber, Switch, Button, Table, Modal, message, Space, Popconfirm, Select, Tag } from 'antd';
import { mailConfigApi } from '../../../api/mail-config.api';
import { rolesApi } from '../../../api/roles.api';

export default function AdminMailConfig() {
  return (
    <Tabs items={[
      { key: 'smtp', label: 'SMTP 配置', children: <SmtpTab /> },
      { key: 'recipients', label: '收件人', children: <RecipientsTab /> },
      { key: 'logs', label: '发送记录', children: <LogsTab /> },
    ]} />
  );
}

function SmtpTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    mailConfigApi.getSmtp().then((res) => { if (res.data) form.setFieldsValue(res.data); });
  }, []);

  const onSave = async (values: any) => {
    setLoading(true);
    try { await mailConfigApi.updateSmtp(values); message.success('SMTP 配置已保存'); }
    catch (e: any) { message.error(e.response?.data?.error?.message || '保存失败'); }
    finally { setLoading(false); }
  };

  const onTest = async () => {
    if (!testEmail) return message.warning('请输入测试收件人邮箱');
    try { await mailConfigApi.testSmtp(testEmail); message.success('测试邮件已发送'); }
    catch (e: any) { message.error(e.response?.data?.error?.message || '发送失败'); }
  };

  return (
    <Form form={form} onFinish={onSave} layout="vertical" style={{ maxWidth: 480 }}>
      <Form.Item name="host" label="SMTP 服务器" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="port" label="端口" rules={[{ required: true }]}><InputNumber min={1} max={65535} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="secure" label="SSL/TLS" valuePropName="checked"><Switch /></Form.Item>
      <Form.Item name="user" label="用户名"><Input /></Form.Item>
      <Form.Item name="password" label="密码（留空不修改）"><Input.Password placeholder="***" /></Form.Item>
      <Form.Item name="fromAddr" label="发件人地址" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
      <Form.Item name="fromName" label="发件人名称"><Input /></Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
        <Input placeholder="测试收件人邮箱" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} style={{ width: 220 }} />
        <Button onClick={onTest}>发送测试邮件</Button>
      </Space>
    </Form>
  );
}

function RecipientsTab() {
  const [recipients, setRecipients] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const [r, ro] = await Promise.all([mailConfigApi.getRecipients(), rolesApi.list()]);
    setRecipients(r.data); setRoles(ro.data);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (values: any) => {
    try {
      await mailConfigApi.addRecipient(values);
      message.success('收件人已添加');
      setOpen(false); form.resetFields(); load();
    } catch (e: any) { message.error(e.response?.data?.error?.message || '添加失败'); }
  };

  const handleDelete = async (id: number) => {
    await mailConfigApi.deleteRecipient(id); message.success('已删除'); load();
  };

  const columns = [
    { title: '邮箱', dataIndex: 'email' },
    { title: '姓名', dataIndex: 'name' },
    { title: '绑定角色', dataIndex: 'role', render: (r: any) => <Tag>{r?.name}</Tag> },
    { title: '操作', render: (_: any, record: any) => (
      <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
        <Button size="small" danger>删除</Button>
      </Popconfirm>
    )},
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setOpen(true)}>添加收件人</Button>
      </div>
      <Table rowKey="id" dataSource={recipients} columns={columns} pagination={false} />
      <Modal title="添加收件人" open={open} onCancel={() => { setOpen(false); form.resetFields(); }} onOk={form.submit}>
        <Form form={form} onFinish={handleAdd} layout="vertical">
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="name" label="姓名"><Input /></Form.Item>
          <Form.Item name="roleId" label="绑定角色" rules={[{ required: true }]}>
            <Select options={roles.map((r) => ({ label: r.name, value: r.id }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const load = async (p = page) => {
    const res = await mailConfigApi.getLogs(p, 20);
    setLogs(res.data.logs); setTotal(res.data.total);
  };

  useEffect(() => { load(); }, []);

  const columns = [
    { title: '收件人', dataIndex: 'toAddrs', render: (v: string) => JSON.parse(v).join(', ') },
    { title: '主题', dataIndex: 'subject' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'sent' ? 'green' : 'red'}>{v}</Tag> },
    { title: '发送人', dataIndex: 'createdBy', render: (u: any) => u?.fullName ?? '-' },
    { title: '时间', dataIndex: 'sentAt', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <Table rowKey="id" dataSource={logs} columns={columns}
      pagination={{ current: page, total, pageSize: 20, onChange: (p) => { setPage(p); load(p); } }} />
  );
}
```

- [ ] **Step 5: Add admin menu items to AppLayout.tsx**

In `frontend/src/components/layout/AppLayout.tsx`, find the `menuItems` array and add an admin section visible only to admins. Import `useAuthStore` (already added in Task 9 Step 2) and use `isAdmin()`:

```tsx
// Inside the component, after the existing menu items:
const isAdmin = useAuthStore((s) => s.isAdmin());

// Add to menuItems array (conditionally):
...(isAdmin ? [{
  key: 'admin',
  label: '系统管理',
  type: 'group' as const,
  children: [
    { key: '/admin/users', label: '用户管理' },
    { key: '/admin/roles', label: '角色权限' },
    { key: '/admin/mail-config', label: '邮件配置' },
  ],
}] : []),
```

- [ ] **Step 6: End-to-end test**

1. Admin logs in → sees "系统管理" group in sidebar
2. Non-admin user logs in → does NOT see admin menu; trying `/admin/users` redirects to `/`
3. Admin creates user, assigns `developer` role
4. New user logs in → forced to change password → can access TS/FS/Spec features
5. Admin configures SMTP, sends test email → success
6. Admin adds recipient tied to `developer` role
7. Developer triggers spec generation + email send → log appears in mail-config/logs

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add admin pages for users, roles, and email config"
```

---

## Task 11: Final cleanup and startup script

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Update package.json start script (production only)**

In `backend/package.json`, update only the `"start"` script (for production deployments — not `"dev"`):

```json
"start": "prisma migrate deploy && node dist/index.js"
```

Leave `"dev"` unchanged as `"tsx watch src/index.ts"`. During development, run migrations manually with `npx prisma migrate dev`.

> **First-time setup sequence:**
> ```bash
> cd backend
> npx prisma migrate dev --name init   # creates tables + auto-runs seed
> npm run dev
> ```

- [ ] **Step 2: Final smoke test**

```bash
npm run dev   # from project root
```

Verify:
- `http://localhost:5173` → redirects to `/login` ✓
- `curl http://localhost:3001/api/health` → `{"status":"ok"}` ✓
- Login flow, change password, admin pages all work ✓

- [ ] **Step 3: Commit**

```bash
git add backend/package.json
git commit -m "chore: update production start script to run migrations before server start"
```
