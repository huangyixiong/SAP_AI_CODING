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
