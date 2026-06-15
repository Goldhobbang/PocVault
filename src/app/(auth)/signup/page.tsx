import Link from 'next/link';
import SignupClient from '@/components/SignupClient';

export const dynamic = 'force-dynamic';

/**
 * /signup — id/pw 회원가입 페이지
 *
 * 항상 클라이언트 컴포넌트를 렌더하여 Google 인증 버튼이
 * 언제나 표시되도록 보장합니다.
 */
export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">회원가입</h1>
        <p className="text-sm text-muted-foreground">
          Google 인증 후 ID와 비밀번호를 정해 새 계정을 만듭니다. 같은 ID로 여러 계정을 만들 수 없습니다.
        </p>
      </header>

      <section className="rounded-md border bg-white p-6 shadow-sm">
        <SignupClient />
      </section>

      <section className="rounded-md border border-dashed p-4 text-sm">
        <p className="font-medium">규칙</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
          <li>ID: 3~20자, 영문 소문자 / 숫자 / 언더스코어</li>
          <li>비밀번호: (제한 없음)</li>
          <li>가입 후 최종 로그인은 항상 ID/비밀번호로 진행됩니다.</li>
        </ul>
      </section>

      <div className="flex justify-between text-sm text-muted-foreground">
        <Link href="/login" className="hover:underline">이미 계정이 있어요 — 로그인</Link>
        <Link href="/" className="hover:underline">시작 페이지</Link>
      </div>
    </main>
  );
}
