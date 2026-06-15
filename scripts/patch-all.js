const fs = require('fs');
function W(p, c) { fs.writeFileSync(p, c, 'utf8'); console.log('W', p, 'len=' + c.length); }

// 1) /setup-password page: 단순화 (현재 비번/디스크립션 제거)
W('src/app/(auth)/setup-password/page.tsx', `import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SetupPasswordForm } from '@/components/SetupPasswordForm';
import { SignOutButton } from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

/**
 * /setup-password — ID/비밀번호 등록 페이지
 *
 * [플로우 1] Google 신규가입 후 1회성 화면
 *   / (시작) → Google OAuth → /setup-password (여기) → /main
 *
 * 이미 ID/비번이 등록된 유저는 /main으로 보냅니다.
 */
export default async function SetupPasswordPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, loginId: true, passwordHash: true },
  });
  if (!user) {
    redirect('/');
  }
  if (user.passwordHash) {
    redirect('/main');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">ID와 비밀번호를 정해 주세요</h1>
        <p className="text-sm text-muted-foreground">
          {user.email} 계정으로 Google 로그인을 완료했어요.
          다음부터는 Google 로그인 대신, 직접 정한 ID + 비밀번호로도 들어올 수 있습니다.
        </p>
      </header>

      <section className="rounded-md border bg-white p-6 shadow-sm">
        <SetupPasswordForm />
      </section>

      <section className="rounded-md border border-dashed p-4 text-sm">
        <p className="font-medium">규칙</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
          <li>ID: 3~20자, 영문 소문자 / 숫자 / 언더스코어</li>
          <li>비밀번호: 8자 이상, 영문/숫자/특수문자 각각 1자 이상</li>
        </ul>
      </section>

      <div className="flex justify-between text-sm text-muted-foreground">
        <a href="/" className="hover:underline">다른 계정으로 로그인</a>
        <SignOutButton />
      </div>
    </main>
  );
}
`);

// 2) /api/auth/credentials : loginId 받아 중복 검사 + passwordHash 저장
W('src/app/api/auth/credentials/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

const ID_RE = /^[a-z0-9_]{3,20}$/;
const PWD_RE = /^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED' } },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    loginId?: string;
    password?: string;
  };
  const loginId = (body.loginId ?? '').trim().toLowerCase();
  const password = body.password ?? '';

  if (!ID_RE.test(loginId)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'ID는 3~20자의 영문 소문자, 숫자, 언더스코어만 사용 가능합니다.' },
      },
      { status: 422 },
    );
  }
  if (!PWD_RE.test(password)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_FAILED', message: '비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다.' },
      },
      { status: 422 },
    );
  }

  // ID 중복 검사 (본인 외)
  const dup = await prisma.user.findFirst({
    where: { loginId, NOT: { id: session.user.id } },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json(
      { success: false, error: { code: 'CONFLICT', message: '이미 사용 중인 ID입니다.' } },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { loginId, passwordHash },
  });

  return NextResponse.json({ success: true, data: { loginId, hasPassword: true } });
}
`);

// 3) /login page : email → id
W('src/app/(auth)/login/page.tsx', `'use client';
import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
      <p className="text-sm text-muted-foreground">불러오는 중…</p>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get('callbackUrl') || '/main';

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    if (!loginId || !password) {
      setErr('ID와 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    const res = await signIn('credentials', {
      loginId: loginId.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl,
    });
    setBusy(false);
    if (!res || res.error) {
      setErr('ID 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    router.push(res.url || callbackUrl);
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <header className="text-center">
        <h1 className="text-2xl font-semibold">PocVault 로그인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          가입 시 정한 ID와 비밀번호로 로그인하세요.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="w-full space-y-4 rounded-md border p-6"
        data-testid="login-credentials"
      >
        <div className="space-y-1">
          <Label htmlFor="login-id">ID</Label>
          <Input
            id="login-id"
            type="text"
            autoComplete="username"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        처음이신가요?{' '}
        <Link href="/" className="underline">
          Google로 가입하기
        </Link>
      </p>
    </main>
  );
}
`);

// 4) src/lib/auth.ts : authorize()의 credential 키와 search 키 변경
let auth = fs.readFileSync('src/lib/auth.ts', 'utf8');
auth = auth.replace(
  `    CredentialsProvider({
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
    }),`,
  `    CredentialsProvider({
      name: 'ID & Password',
      credentials: {
        loginId: { label: 'ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        const loginId = (creds?.loginId ?? '').toString().trim().toLowerCase();
        if (!loginId || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { loginId } });
        if (!user?.passwordHash) return null; // 비밀번호 미설정 계정 차단
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image, loginId: user.loginId ?? null };
      },
    }),`,
);
W('src/lib/auth.ts', auth);

// 5) src/types/index.ts : User에 loginId 필드, Session에는 user.loginId
W('src/types/index.ts', `import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      loginId: string | null;
      hasPassword: boolean;
      storageQuota: number;
      usedStorage: number;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    loginId?: string | null;
    name?: string | null;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    loginId?: string | null;
    hasPassword?: boolean;
    storageQuota?: number;
    usedStorage?: number;
  }
}
`);

// 6) auth.ts: jwt / session callback에서 loginId도 토큰/세션에 복사
auth = fs.readFileSync('src/lib/auth.ts', 'utf8');
auth = auth.replace(
  `      if (user?.id) {
        token.uid = user.id;
      }
      if (token.uid) {
        const u = await prisma.user.findUnique({ where: { id: token.uid } });
        if (u) {
          token.hasPassword = !!u.passwordHash;
          token.storageQuota = u.storageQuota;
          token.usedStorage = u.usedStorage;
        }
      }`,
  `      if (user?.id) {
        token.uid = user.id;
        token.loginId = (user as { loginId?: string | null }).loginId ?? null;
      }
      if (token.uid) {
        const u = await prisma.user.findUnique({ where: { id: token.uid } });
        if (u) {
          token.hasPassword = !!u.passwordHash;
          token.loginId = u.loginId ?? null;
          token.storageQuota = u.storageQuota;
          token.usedStorage = u.usedStorage;
        }
      }`,
);
auth = auth.replace(
  `      if (session.user && token.uid) {
        // types/index.ts에서 Session.user.id, hasPassword, storageQuota, usedStorage를 string으로 augment.
        session.user.id = token.uid;
        session.user.hasPassword = !!token.hasPassword;
        session.user.storageQuota = token.storageQuota ?? 0;
        session.user.usedStorage = token.usedStorage ?? 0;
      }`,
  `      if (session.user && token.uid) {
        session.user.id = token.uid;
        session.user.loginId = token.loginId ?? null;
        session.user.hasPassword = !!token.hasPassword;
        session.user.storageQuota = token.storageQuota ?? 0;
        session.user.usedStorage = token.usedStorage ?? 0;
      }`,
);
W('src/lib/auth.ts', auth);

// 7) (main)/layout.tsx : loginId 표시
W('src/app/(main)/layout.tsx', `import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SignOutButton } from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

/**
 * /main/* 공통 레이아웃 — 인증 가드 + 내비게이션
 *
 * [인증 규칙]
 *  1) 미로그인 → / (시작 페이지)
 *  2) ID/비번 미설정(Google 1회성 단계) → /setup-password
 *  3) ID/비번 설정 완료 → /main 컨텐츠
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, loginId: true, name: true, usedStorage: true, storageQuota: true, passwordHash: true },
  });
  if (!user) {
    redirect('/');
  }
  if (!user.passwordHash) {
    redirect('/setup-password');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/main" className="text-lg font-semibold">
            PocVault
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/main" className="hover:underline">홈</Link>
            <Link href="/main/texts" className="hover:underline">텍스트</Link>
            <Link href="/main/files" className="hover:underline">파일</Link>
            <Link href="/main/settings" className="hover:underline">설정</Link>
            <span className="text-muted-foreground" data-testid="current-login-id">
              {user.loginId ?? user.email}
            </span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
`);

console.log('ALL DONE');
