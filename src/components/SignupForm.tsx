'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logger } from '@/lib/logger';

const ID_RE = /^[a-z0-9_]{3,20}$/;

/**
 * /signup 페이지 폼
 *
 *  흐름:
 *   1) POST /api/auth/credentials/signup  → credential.db 에 CredentialUser 생성
 *   2) 즉시 signIn('credentials', ...)  → JWT 발급 (type='credential')
 *   3) /main 으로 이동
 *
 *  정책:
 *   - loginId 는 server 측에서 unique 검증 + 정합성 검증
 *   - password 는 bcryptjs(10 rounds) 로 해시 후 저장
 *   - loginId 와 email 매핑은 없음 (id/pw 계정은 email 식별을 사용하지 않음)
 */
export function SignupForm({ googleAuthed = false }: { googleAuthed?: boolean }) {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        logger.debug('SignupForm', 'form submission started', { googleAuthed });
        setErr(null);

        if (!googleAuthed) {
          logger.warn('SignupForm', 'form submission blocked: googleAuthed=false');
          setErr('회원가입하려면 Google 계정으로 먼저 인증해야 합니다.');
          return;
        }

        const id = loginId.trim().toLowerCase();
        logger.debug('SignupForm', 'validating loginId', { loginId: id });
        if (!ID_RE.test(id)) {
          logger.warn('SignupForm', 'loginId validation failed', { loginId: id });
          setErr('ID는 3~20자의 영문 소문자, 숫자, 언더스코어만 사용 가능합니다.');
          return;
        }
        if (!password) {
          logger.warn('SignupForm', 'password validation failed: empty');
          setErr('비밀번호를 입력해주세요.');
          return;
        }
        if (password !== confirm) {
          logger.warn('SignupForm', 'password confirmation mismatch');
          setErr('비밀번호 확인이 일치하지 않습니다.');
          return;
        }

        logger.info('SignupForm', 'all validations passed, submitting', { loginId: id });
        setBusy(true);
        try {
          // 1) credential.db 에 가입
          logger.debug('SignupForm', 'calling /api/auth/credentials/signup', { loginId: id });
          const res = await fetch('/api/auth/credentials/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: id, password }),
            credentials: 'include',
          });
          logger.debug('SignupForm', 'signup API response', { status: res.status, ok: res.ok });
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
            const errMsg = j.error?.message ?? '가입에 실패했습니다.';
            logger.error('SignupForm', 'signup API error', { status: res.status, message: errMsg });
            throw new Error(errMsg);
          }
          const signupData = await res.json();
          logger.info('SignupForm', 'signup API success', { userId: signupData.data?.userId, loginId: signupData.data?.loginId });

          // 2) 바로 로그인 → JWT 발급
          logger.debug('SignupForm', 'calling signIn with credentials', { loginId: id });
          const signinRes = await signIn('credentials', {
            loginId: id,
            password,
            redirect: false,
            callbackUrl: '/main',
          });
          logger.debug('SignupForm', 'signIn result', { ok: !!signinRes?.ok, error: signinRes?.error });
          if (!signinRes || signinRes.error) {
            logger.error('SignupForm', 'signIn failed', { error: signinRes?.error });
            throw new Error('가입은 완료됐지만 자동 로그인에 실패했습니다. 로그인 페이지로 이동합니다.');
          }

          // 3) /main
          logger.info('SignupForm', 'signup flow completed, redirecting to /main');
          router.push('/main');
          router.refresh();
        } catch (e2) {
          const errMsg = (e2 as Error).message;
          logger.error('SignupForm', 'signup flow error', { error: errMsg });
          setErr(errMsg);
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
          placeholder="영문 소문자 / 숫자 / _ (3~20자)"
          autoComplete="username"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-pw">비밀번호</Label>
        <Input
          id="new-pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8자 이상, 영문/숫자/특수문자 포함"
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm-pw">비밀번호 확인</Label>
        <Input
          id="confirm-pw"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="다시 한번 입력"
          autoComplete="new-password"
          required
        />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="w-full" disabled={busy || !googleAuthed}>
        {busy ? '가입 중…' : googleAuthed ? '가입하기' : '먼저 Google 인증 필요'}
      </Button>
    </form>
  );
}
