import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SignOutButton } from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, usedStorage: true, storageQuota: true, passwordHash: true },
  });
  if (!user) {
    redirect('/login');
  }

  // 비밀번호가 아직 설정되지 않은 신규(또는 미완료) Google 계정은
  // 대시보드 진입 즉시 비밀번호 설정 화면으로 보냄.
  if (!user.passwordHash) {
    redirect('/setup-password');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-lg font-semibold">
            PocVault
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:underline">홈</Link>
            <Link href="/dashboard/texts" className="hover:underline">텍스트</Link>
            <Link href="/dashboard/files" className="hover:underline">파일</Link>
            <span className="text-muted-foreground">{user.email}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
