// =============================================================================
//  PocVault — id/pw 로그인 전용 Prisma Client
// =============================================================================
//  이 클라이언트는 오직 id/pw 사용자의 데이터(credential.db)만 접근한다.
//  Google 계정의 데이터는 절대 이 클라이언트로 접근하면 안 된다.
// =============================================================================
import { PrismaClient } from '../../node_modules/.prisma/credential';

declare global {
  // eslint-disable-next-line no-var
  var __prismaCredential: PrismaClient | undefined;
}

export const prismaCredential =
  global.__prismaCredential ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prismaCredential = prismaCredential;
}
