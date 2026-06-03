'use client';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'choice' | 'password';

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get('callbackUrl') || '/dashboard';

  const [mode, setMode] = useState<Mode>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onGoogle = async () => {
    setErr(null);
    setBusy(true);
    try {
      // setup-password로 강제 이동하는 로직은 서버(dashboard layout)에서 처리됨.
      await signIn('google', { callbackUrl });
    } catch {
      setBusy(false);
    }
  };

  const onEmailPw = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    if (!email || !password) {
      setErr('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setBusy(false);
    if (!res || res.error) {
      setErr('이메일 또는 비밀번호가 올바르지 않습니다.');
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
          처음 오셨나요? Google로 가입하거나, 기존 계정이면 이메일+비밀번호로 로그인하세요.
        </p>
      </header>

      {mode === 'choice' && (
        <div className="w-full space-y-3 rounded-md border p-6">
          {/* 1) Google로 시작 — 신규 가입의 유일한 진입점 */}
          <Button
            className="w-full"
            onClick={onGoogle}
            disabled={busy}
            data-testid="login-google"
          >
            <span className="mr-2 inline-block h-4 w-4 rounded-full bg-white" aria-hidden />
            Google로 시작하기
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            새 계정이라면 비밀번호 설정 단계로 바로 안내해 드려요.
          </p>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-muted-foreground">또는</span>
            </div>
          </div>

          {/* 2) 기존 계정 — 이메일+비밀번호 */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setErr(null);
              setMode('password');
            }}
            data-testid="login-show-password"
          >
            기존 계정으로 로그인 (이메일+비밀번호)
          </Button>
        </div>
      )}

      {mode === 'password' && (
        <form
          onSubmit={onEmailPw}
          className="w-full space-y-4 rounded-md border p-6"
          data-testid="login-credentials"
        >
          <div className="space-y-1">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground hover:underline"
            onClick={() => {
              setErr(null);
              setMode('choice');
            }}
          >
            ← 돌아가기
          </button>
        </form>
      )}
    </main>
  );
}
