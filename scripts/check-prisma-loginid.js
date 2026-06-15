const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const r = await p.user.findFirst({
      select: { id: true, loginId: true, passwordHash: true, googleId: true, email: true },
    });
    console.log('OK', r);
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    await p.$disconnect();
  }
})();
