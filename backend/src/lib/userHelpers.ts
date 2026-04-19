import prisma from './prisma';
import { AppError } from '../errors';

export async function getUserWithRolesAndPerms(userId: number) {
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
