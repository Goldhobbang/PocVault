import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

/**
 * /login — id/pw 로그인 페이지
 *
 * 정책 (요구사항 3): 최종 로그인은 항상 email 이 아닌 ID/비번.
 * 이미 로그인돼 있으면 /main 으로 보냄.
 */
export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect('/main');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">로그인</h1>
        <p className="text-sm text-muted-foreground">
          PocVault 계정의 ID와 비밀번호로 로그인합니다.
        </p>
      </header>

      <section className="rounded-md border bg-white p-6 shadow-sm">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>

      <div className="flex justify-between text-sm text-muted-foreground">
        <Link href="/signup" className="hover:underline">계정이 없어요 — 회원가입</Link>
        <Link href="/" className="hover:underline">시작 페이지</Link>
      </div>
    </main>
  );
}
