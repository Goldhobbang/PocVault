import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaGoogle } from '@/lib/prisma-google';
import { prismaCredential } from '@/lib/prisma-credential';
import { SignOutButton } from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

/**
 * /main/* 공통 레이아웃 — 인증 가드 + 내비게이션
 *
 * [인증 규칙]
 *  1) 미로그인                          → /login
 *  2) Google 로그인 (type=google)       → google.db 에서 자기 정보 조회, /main 컨텐츠
 *  3) id/pw 로그인 (type=credential)    → credential.db 에서 자기 정보 조회, /main 컨텐츠
 *
 *  두 흐름은 완전히 분리되어 있으며, session.user.type 에 따라
 *  다른 Prisma 클라이언트를 선택한다.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const type = session.user.type;

  if (type === 'google') {
    // ---- Google 흐름 ----
    const u = await prismaGoogle.googleUser.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, image: true, storageQuota: true, usedStorage: true },
    });
    if (!u) redirect('/login');

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
                {u.email}
              </span>
              <SignOutButton />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    );
  }

  // ---- id/pw 흐름 ----
  const acc = await prismaCredential.credentialUser.findUnique({
    where: { id: session.user.id },
    select: { id: true, loginId: true, isActive: true, storageQuota: true, usedStorage: true },
  });
  if (!acc || !acc.isActive) redirect('/login');

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
              {acc.loginId}
            </span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
