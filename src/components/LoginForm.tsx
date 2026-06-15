'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * /login 페이지 폼
 *
 *  정책 (요구사항 3): 최종 로그인은 항상 ID/비밀번호.
 *  흐름:
 *   1) 입력값 클라이언트 검증 (loginId 비었는지)
 *   2) signIn('credentials', { loginId, password, redirect:false })
 *      → /api/auth/[...nextauth] 의 CredentialsProvider.authorize 가 호출됨
 *   3) 성공 시 callbackUrl(또는 /main) 로 이동
 */
export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get('callbackUrl') || '/main';

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);

        const id = loginId.trim().toLowerCase();
        if (!id || !password) {
          setErr('아이디와 비밀번호를 모두 입력해 주세요.');
          return;
        }

        setBusy(true);
        try {
          const res = await signIn('credentials', {
            loginId: id,
            password,
            redirect: false,
            callbackUrl,
          });
          if (!res || res.error) {
            throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
          }
          router.push(callbackUrl);
          router.refresh();
        } catch (e2) {
          setErr((e2 as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="login-id">ID</Label>
        <Input
          id="login-id"
          type="text"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          placeholder="아이디"
          autoComplete="username"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pw">비밀번호</Label>
        <Input
          id="pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoComplete="current-password"
          required
        />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? '로그인 중…' : '로그인'}
      </Button>
    </form>
  );
}
