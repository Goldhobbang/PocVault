const fs = require('fs');
const p = 'src/components/SetupPasswordForm.tsx';
const content = `'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ID_RE = /^[a-z0-9_]{3,20}$/;
const PWD_RE = /^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function SetupPasswordForm() {
  const router = useRouter();
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
        if (!ID_RE.test(id)) {
          setErr('ID는 3~20자의 영문 소문자, 숫자, 언더스코어만 사용 가능합니다.');
          return;
        }
        if (!PWD_RE.test(password)) {
          setErr('비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다.');
          return;
        }

        setBusy(true);
        try {
          const res = await fetch('/api/auth/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: id, password }),
          });
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
            throw new Error(j.error?.message ?? '설정에 실패했습니다.');
          }
          router.push('/main');
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
          autoComplete="new-password"
          required
        />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? '저장 중…' : '저장하고 시작하기'}
      </Button>
    </form>
  );
}
`;
fs.writeFileSync(p, content, 'utf8');
console.log('SetupPasswordForm rewritten');
