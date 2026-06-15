const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const us = await p.user.findMany({ select: { id: true, email: true, googleId: true, passwordHash: true } });
  console.log('USERS:', JSON.stringify(us, null, 2));
  console.log('DB file in env:', process.env.DATABASE_URL);
  console.log('cwd:', process.cwd());
  await p.$disconnect();
})();
