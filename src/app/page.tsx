import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // 로그인 + 비번 미설정 세션은 곧장 비밀번호 설정 화면으로 보냄.
  // (signIn 콜백이 이미 1차로 보내지만, 외부 callbackUrl 누락 등 안전망)
  const session = await getServerSession(authOptions);
  if (session?.user?.id && session.user.hasPassword === false) {
    redirect('/setup-password');
  }
  if (session?.user?.id && session.user.hasPassword) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">PocVault</h1>
        <p className="text-muted-foreground">
          Google 계정으로 로그인하고, 텍스트 메모와 파일을 한 곳에 안전하게 보관하세요.
        </p>
      </header>
      <div className="flex gap-3">
        <Link href="/login">
          <Button>시작하기</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">대시보드</Button>
        </Link>
      </div>
      <ul className="mt-8 grid grid-cols-1 gap-3 text-left text-sm sm:grid-cols-3">
        <li className="rounded-md border p-3">
          <p className="font-medium">개인 텍스트</p>
          <p className="text-muted-foreground">제목/태그/내용으로 메모를 저장하고 검색</p>
        </li>
        <li className="rounded-md border p-3">
          <p className="font-medium">파일 보관함</p>
          <p className="text-muted-foreground">최대 {`~100MB`}까지 파일 업로드/다운로드</p>
        </li>
        <li className="rounded-md border p-3">
          <p className="font-medium">본인 인증</p>
          <p className="text-muted-foreground">Google 로그인 + 선택적 비밀번호</p>
        </li>
      </ul>
    </main>
  );
}
