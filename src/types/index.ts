import type { DefaultSession } from 'next-auth';

/**
 * ============================================================================
 *  PocVault — 세션 / JWT 타입 정의
 * ============================================================================
 *
 *  session.user.type === 'google'     → google.db 에서 데이터를 읽는다.
 *  session.user.type === 'credential' → credential.db 에서 데이터를 읽는다.
 *
 *  두 흐름은 완전히 분리되어 있으며, 어떤 코드도 session.user.type 에 따라
 *  다른 Prisma 클라이언트를 선택해 사용한다.
 * ============================================================================
 */

declare module 'next-auth' {
  interface Session {
    user: {
      id: string; // google.db 또는 credential.db 의 user id
      type: 'google' | 'credential' | null; // 로그인 종류
      loginId: string | null; // id/pw 로그인 시 loginId
      email?: string | null; // Google 로그인 시만 실제 이메일
      name?: string | null;
      image?: string | null;
      storageQuota: number;
      usedStorage: number;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    loginType?: 'google' | 'credential';
    loginId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string | null;
    type?: 'google' | 'credential' | null;
    provider?: string | null;
    loginId?: string | null;
    storageQuota?: number;
    usedStorage?: number;
  }
}
