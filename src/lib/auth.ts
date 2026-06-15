import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prismaGoogle } from '@/lib/prisma-google';
import { prismaCredential } from '@/lib/prisma-credential';
import { logger } from '@/lib/logger';

/**
 * ============================================================================
 *  PocVault — 인증 일원화 (두 개의 **완전히 분리된** 인증 흐름)
 * ============================================================================
 *
 *  [핵심 정책]
 *   - Google 로그인 → Google DB(google.db) 만 사용. id/pw 계정과 일절 공유 안 함.
 *   - id/pw 로그인 → Credential DB(credential.db) 만 사용. Google 계정과 일절 공유 안 함.
 *   - 두 DB 는 다른 SQLite 파일이며, 이 모듈이 두 클라이언트를 모두 import 하지
 *     않는 경우도 많다 (흐름에 따라 한쪽만 사용).
 *   - 최종 로그인은 **항상 id + pw** 다. email 로그인은 지원 안 함.
 *   - NextAuth JWT 세션 사용. signIn 콜백에서 직접 upsert 한다.
 *
 *  [라우팅 매트릭스]
 *   - 미로그인                              → /login
 *   - Google 로그인 성공                    → /main (Google DB 의 자기 파일/텍스트)
 *   - id/pw 로그인 성공                     → /main (Credential DB 의 자기 파일/텍스트)
 *   - 회원가입은 별개 페이지 /signup 에서 직접 처리 (POST /api/auth/credentials/signup)
 * ============================================================================
 */

const ID_RE = /^[a-z0-9_]{3,20}$/;
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}[\]:;"'<>,.?/~`|\\])[A-Za-z\d!@#$%^&*()_+\-={}[\]:;"'<>,.?/~`|\\]{8,}$/;

function dbg(label: string, payload?: unknown) {
  // eslint-disable-next-line no-console
  console.log('[auth]', label, payload ?? '');
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: { prompt: 'select_account' },
      },
    }),

    // 최종 로그인은 ID + Password. email 은 받지 않음.
    CredentialsProvider({
      id: 'credentials',
      name: 'ID & Password',
      credentials: {
        loginId: { label: 'ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.loginId || !creds?.password) return null;
        const loginId = String(creds.loginId).trim();
        if (!ID_RE.test(loginId)) return null;

        // ---- Credential DB 만 사용. Google DB 는 절대 건드리지 않음.
        const acc = await prismaCredential.credentialUser.findUnique({
          where: { loginId },
          select: {
            id: true,
            passwordHash: true,
            isActive: true,
          },
        });
        if (!acc) return null;
        if (!acc.isActive) return null;

        const ok = await bcrypt.compare(String(creds.password), acc.passwordHash);
        if (!ok) return null;

        // lastLoginAt 비동기 갱신 (실패해도 로그인은 성공)
        prismaCredential.credentialUser
          .update({ where: { id: acc.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {});

        // type 필드로 로그인 종류를 JWT 에 명시
        return {
          id: acc.id,
          email: `${loginId}@credential.local`, // 표시용 더미 (절대 식별자로 안 씀)
          name: loginId,
          loginType: 'credential',
          loginId,
        } as any;
      },
    }),
  ],

  callbacks: {
    /**
     * signIn 콜백
     *  - id/pw 로그인은 authorize 단계에서 이미 검증됨 → true
     *  - Google 로그인은 googleId 로 GoogleUser upsert 후 true
     *
     *  어떤 경우에도 외부 URL 로의 리다이렉트는 허용하지 않으며,
     *  callbackUrl 이 '/main' 이면 그대로 통과.
     */
    async signIn({ user, account, profile }) {
      // ---- id/pw 로그인 ----
      if (account?.provider !== 'google') {
        logger.debug('auth', 'signIn.credentials: non-google provider, allowing', { provider: account?.provider });
        return true;
      }

      // ---- Google 로그인 ----
      logger.info('auth', 'signIn.google: starting Google OAuth flow', { account: account?.provider });
      try {
        const googleId = account.providerAccountId;
        const email =
          user.email ?? (profile as { email?: string } | undefined)?.email ?? null;
        if (!email) {
          logger.warn('auth', 'signIn.google: no email found, denying', { googleId });
          return false;
        }

        logger.debug('auth', 'signIn.google: looking up existing GoogleUser', { email, googleId });
        let u = await prismaGoogle.googleUser.findUnique({
          where: { googleId },
          select: { id: true, googleId: true, email: true, name: true, image: true },
        });
        if (!u) {
          const byEmail = await prismaGoogle.googleUser.findUnique({
            where: { email },
            select: { id: true, googleId: true, email: true, name: true, image: true },
          });
          if (byEmail) {
            logger.debug('auth', 'signIn.google: updating existing user with new googleId', { id: byEmail.id, email });
            u = await prismaGoogle.googleUser.update({
              where: { id: byEmail.id },
              data: { googleId },
              select: { id: true, googleId: true, email: true, name: true, image: true },
            });
          } else {
            logger.info('auth', 'signIn.google: creating new GoogleUser', { email });
            u = await prismaGoogle.googleUser.create({
              data: {
                email,
                googleId,
                name: user.name ?? null,
                image: user.image ?? null,
              },
              select: { id: true, googleId: true, email: true, name: true, image: true },
            });
            logger.info('auth', 'signIn.google: new GoogleUser created successfully', { id: u.id, email });
          }
        } else {
          logger.debug('auth', 'signIn.google: existing user found, updating lastLoginAt', { id: u.id });
          prismaGoogle.googleUser
            .update({ where: { id: u.id }, data: { lastLoginAt: new Date() } })
            .catch((e) => logger.warn('auth', 'signIn.google: failed to update lastLoginAt', { error: (e as Error).message }));
        }

        // attach DB id to NextAuth user object so jwt callback receives uid
        try {
          (user as any).id = u.id;
          logger.debug('auth', 'signIn.google: attached user.id to NextAuth user object', { attachedId: u.id });
        } catch (attachErr) {
          logger.warn('auth', 'signIn.google: failed to attach user.id', { error: (attachErr as Error).message });
        }

        logger.info('auth', 'signIn.google: successfully authenticated Google user', { userId: u.id, email: u.email });
        return true;
      } catch (e) {
        logger.error('auth', 'signIn.google: unexpected error', { error: (e as Error).message, stack: (e as Error).stack });
        return true;
      }
    },

    /**
     * jwt 콜백
     *  - user 가 있으면 (최초 로그인) 기본 정보 기록
     *  - token.type = 'google' | 'credential' (로그인 종류 — DB 스코프 결정의 핵심)
     */
    async jwt({ token, user, account }) {
      // Log incoming user object to diagnose missing id
      logger.debug('auth', 'jwt callback: incoming user param', { user });
      if (user && (user as any).id) {
        logger.debug('auth', 'jwt callback: new user login, setting token.uid', { uid: (user as any).id });
        token.uid = (user as any).id;
      }
      if (account?.provider) {
        logger.debug('auth', 'jwt callback: setting token provider', { provider: account.provider });
        token.provider = account.provider;
        token.type = account.provider === 'google' ? 'google' : 'credential';
      } else if (!token.type) {
        // token.type 이 없는 경우 uid 가 있으면 그에 맞게 추론
        logger.debug('auth', 'jwt callback: inferring token.type from provider', { provider: token.provider });
        token.type = token.provider === 'google' ? 'google' : 'credential';
      }

      if (token.type === 'credential' && token.uid) {
        logger.debug('auth', 'jwt callback: syncing credential user data', { uid: token.uid });
        const acc = await prismaCredential.credentialUser.findUnique({
          where: { id: token.uid as string },
          select: { id: true, loginId: true, isActive: true, storageQuota: true, usedStorage: true },
        });
        if (acc && acc.isActive) {
          token.loginId = acc.loginId;
          token.storageQuota = acc.storageQuota;
          token.usedStorage = acc.usedStorage;
          logger.debug('auth', 'jwt callback: credential user data synced', { loginId: acc.loginId });
        } else {
          logger.warn('auth', 'jwt callback: credential user not found or inactive', { uid: token.uid });
          token.uid = null;
        }
      } else if (token.type === 'google' && token.uid) {
        logger.debug('auth', 'jwt callback: syncing google user data', { uid: token.uid });
        const u = await prismaGoogle.googleUser.findUnique({
          where: { id: token.uid as string },
          select: { id: true, storageQuota: true, usedStorage: true },
        });
        if (u) {
          token.storageQuota = u.storageQuota;
          token.usedStorage = u.usedStorage;
          logger.debug('auth', 'jwt callback: google user data synced', { uid: token.uid });
        } else {
          logger.warn('auth', 'jwt callback: google user not found', { uid: token.uid });
          token.uid = null;
        }
      }

      return token;
    },

    /**
     * session 콜백
     *  - token.type 을 그대로 노출
     *  - uid, loginId, storageQuota, usedStorage 만 노출 (email 등은 Google 인 경우만)
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? '';
        session.user.type = (token.type as 'google' | 'credential') ?? null;
        session.user.loginId = (token.loginId as string) ?? null;
        session.user.storageQuota = (token.storageQuota as number) ?? 0;
        session.user.usedStorage = (token.usedStorage as number) ?? 0;
        logger.debug('auth', 'session callback: session created', {
          userId: session.user.id,
          type: session.user.type,
          loginId: session.user.loginId,
        });
      }
      return session;
    },

    /**
     * redirect 콜백
     *  - 같은 origin 의 path 면 그대로 통과
     *  - 외부 URL 이면 baseUrl 로
     */
    async redirect({ url, baseUrl }) {
      if (typeof url !== 'string' || !url) return baseUrl;

      try {
        const u = new URL(url, baseUrl);
        if (u.origin === new URL(baseUrl).origin) {
          return u.pathname + u.search + u.hash;
        }
        return baseUrl;
      } catch {
        // fall-through
      }
      if (url.startsWith('/')) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: '/login',
  },
};

/** 정규식 export (클라이언트/서버 양쪽에서 공용으로 사용 가능) */
export { ID_RE, PW_RE };
