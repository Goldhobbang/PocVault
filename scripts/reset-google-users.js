const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const before = await p.user.findMany({
    select: { id: true, email: true, googleId: true, passwordHash: true, name: true },
  });
  console.log('USERS_BEFORE:', JSON.stringify(before, null, 2));

  // googleId가 있는 사용자(Google로 가입된 사용자)를 모두 삭제
  // (관련 File/Text 는 onDelete: Cascade 로 같이 삭제됨)
  const del = await p.user.deleteMany({ where: { googleId: { not: null } } });
  console.log('DELETED:', del.count);

  const after = await p.user.findMany({
    select: { id: true, email: true, googleId: true, passwordHash: true },
  });
  console.log('USERS_AFTER:', JSON.stringify(after, null, 2));

  await p.$disconnect();
})();
