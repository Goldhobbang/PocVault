'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SetupPasswordForm() {
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        setErr(null);
        try {
          const res = await fetch('/api/auth/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, currentPassword: currentPassword || undefined }),
          });
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
            throw new Error(j.error?.message ?? '설정에 실패했습니다.');
          }
          setMsg('비밀번호가 저장되었습니다. 새로고침하면 입력창이 사라집니다.');
          setPassword('');
          setCurrentPassword('');
        } catch (e2) {
          setErr((e2 as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="cur-pw">현재 비밀번호 (변경 시)</Label>
        <Input
          id="cur-pw"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-pw">새 비밀번호 (8자+, 영문/숫자/특수문자)</Label>
        <Input
          id="new-pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={busy || !password}>
          {busy ? '저장 중…' : '저장'}
        </Button>
      </div>
      {msg && <p className="text-sm text-emerald-700 sm:col-span-3">{msg}</p>}
      {err && <p className="text-sm text-destructive sm:col-span-3">{err}</p>}
    </form>
  );
}
