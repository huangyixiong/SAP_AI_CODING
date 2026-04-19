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

  let adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!adminUser) {
    const hashed = await bcrypt.hash('Admin@123', 12);
    adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        fullName: '系统管理员',
        email: 'admin@example.com',
        hashedPassword: hashed,
        mustChangePassword: true,
      },
    });
    console.log('Created admin user (admin / Admin@123)');
  } else {
    console.log('Admin user already exists, skipping');
  }

  // Always ensure admin has the admin role (idempotent)
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log('Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
