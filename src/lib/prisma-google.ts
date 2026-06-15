// =============================================================================
//  PocVault — Google 로그인 전용 Prisma Client
// =============================================================================
//  이 클라이언트는 오직 Google OAuth 사용자의 데이터(google.db)만 접근한다.
//  id/pw 계정의 데이터는 절대 이 클라이언트로 접근하면 안 된다.
// =============================================================================
import { PrismaClient } from '../../node_modules/.prisma/google';

declare global {
  // eslint-disable-next-line no-var
  var __prismaGoogle: PrismaClient | undefined;
}

export const prismaGoogle =
  global.__prismaGoogle ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prismaGoogle = prismaGoogle;
}
