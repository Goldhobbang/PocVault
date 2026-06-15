import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 시작 페이지: 인터랙티브 없이 로그인 / 회원가입 버튼만 표시
export default async function StartPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect('/main');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold">PocVault</h1>
      <p className="text-sm text-muted-foreground">시작하려면 아래를 선택하세요.</p>

      <div className="w-full max-w-xs mt-6 space-y-3">
        <Link
          href="/signup"
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
          data-testid="start-go-signup"
        >
          회원가입
        </Link>

        <Link
          href="/login"
          className="inline-flex h-12 w-full items-center justify-center rounded-md border border-input bg-background text-sm font-medium"
          data-testid="start-go-login"
        >
          로그인
        </Link>
      </div>
    </main>
  );
}
