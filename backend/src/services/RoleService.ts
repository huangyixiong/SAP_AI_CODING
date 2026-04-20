import prisma from '../lib/prisma';
import { AppError } from '../errors';
import { Prisma } from '@prisma/client';

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
  try {
    const role = await prisma.role.update({
      where: { id }, data,
      include: { rolePermissions: { include: { permission: true } } },
    });
    return formatRole(role);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      throw new AppError('NOT_FOUND', '角色不存在', 404);
    }
    throw e;
  }
}

export async function assignPermissions(roleId: number, permissionIds: number[]) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AppError('NOT_FOUND', '角色不存在', 404);

  if (permissionIds.length > 0) {
    const found = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });
    if (found.length !== permissionIds.length) {
      throw new AppError('BAD_REQUEST', '存在无效的权限ID', 400);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      });
    }
  });
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
