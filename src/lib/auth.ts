import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user?.passwordHash) return null; // 비밀번호 미설정 계정 차단
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Strict 1:1: googleId UNIQUE + 신규 시 passwordHash=null
        const exists = await prisma.user.findUnique({
          where: { googleId: account.providerAccountId },
        });
        if (!exists && user.email) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? null,
              image: user.image ?? null,
              googleId: account.providerAccountId,
            },
          });
          // 신규 가입자: 비밀번호 미설정이므로 설정 화면으로 즉시 이동
          return '/setup-password';
        }
        // 기존 Google 유저인데 아직 PW가 없으면(취소/중단 후 재로그인) 같은 화면으로
        if (exists && !exists.passwordHash) {
          return '/setup-password';
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // user는 초기 로그인 시에만 존재. types/index.ts에서 User.id를 string으로 augment 했으므로 캐스트 불필요.
      if (user?.id) {
        token.uid = user.id;
      }
      if (token.uid) {
        const u = await prisma.user.findUnique({ where: { id: token.uid } });
        if (u) {
          token.hasPassword = !!u.passwordHash;
          token.storageQuota = u.storageQuota;
          token.usedStorage = u.usedStorage;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        // types/index.ts에서 Session.user.id, hasPassword, storageQuota, usedStorage를 string으로 augment.
        session.user.id = token.uid;
        session.user.hasPassword = !!token.hasPassword;
        session.user.storageQuota = token.storageQuota ?? 0;
        session.user.usedStorage = token.usedStorage ?? 0;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};
