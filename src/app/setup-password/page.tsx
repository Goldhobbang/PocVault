import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SetupPasswordForm } from '@/components/SetupPasswordForm';
import { SignOutButton } from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function SetupPasswordPage() {
  // 1) 미로그인 → 로그인으로
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  // 2) 이미 비밀번호가 설정된 유저 → 대시보드로 (이 페이지는 의미 없음)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, passwordHash: true },
  });
  if (!user) {
    redirect('/login');
  }
  if (user.passwordHash) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">비밀번호 설정이 필요해요</h1>
        <p className="text-sm text-muted-foreground">
          {user.email} 계정으로 Google 로그인을 완료했어요.
          다음부터는 Google 로그인 대신 이메일 + 비밀번호로도 들어올 수 있도록 비밀번호를 등록해 주세요.
        </p>
      </header>

      <section className="rounded-md border bg-white p-6 shadow-sm">
        <SetupPasswordForm />
      </section>

      <section className="rounded-md border border-dashed p-4 text-sm">
        <p className="font-medium">비밀번호 규칙</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
          <li>8자 이상</li>
          <li>영문, 숫자, 특수문자를 각각 1자 이상 포함</li>
        </ul>
      </section>

      <div className="flex justify-between text-sm text-muted-foreground">
        <a href="/login" className="hover:underline">다른 계정으로 로그인</a>
        <SignOutButton />
      </div>
    </main>
  );
}
