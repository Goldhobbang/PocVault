import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      hasPassword: boolean;
      storageQuota: number;
      usedStorage: number;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    hasPassword?: boolean;
    storageQuota?: number;
    usedStorage?: number;
  }
}
