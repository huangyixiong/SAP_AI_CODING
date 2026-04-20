import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
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
  try {
    const user = await prisma.user.update({
      where: { id }, data,
      include: { userRoles: { include: { role: true } } },
    });
    return formatUser(user);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      throw new AppError('NOT_FOUND', '用户不存在', 404);
    }
    throw e;
  }
}

export async function deactivateUser(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('NOT_FOUND', '用户不存在', 404);
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await prisma.refreshToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function assignRoles(userId: number, roleIds: number[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', '用户不存在', 404);
  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    }
  });
}

function formatUser(user: any) {
  return {
    id: user.id, username: user.username, fullName: user.fullName,
    email: user.email, isActive: user.isActive, mustChangePassword: user.mustChangePassword,
    roles: user.userRoles?.map((ur: any) => ({ id: ur.role.id, name: ur.role.name })) ?? [],
    createdAt: user.createdAt,
  };
}
