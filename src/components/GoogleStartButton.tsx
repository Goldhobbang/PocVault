'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

/**
 * Google OAuth 시작 버튼 (클라이언트 컴포넌트)
 *
 * - Google 로그인은 google.db 에서만 처리되며, /setup-password 단계는 없다.
 *   (신규 사용자든 기존 사용자든 일단 /main 으로 보낸다.)
 * - callbackUrl 은 '/main' 으로 둔다.
 */
export function GoogleStartButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      className="w-full"
      onClick={async () => {
        setBusy(true);
        try {
          await signIn('google', { callbackUrl: '/main' });
        } catch {
          setBusy(false);
        }
      }}
      disabled={busy}
      data-testid="start-google"
    >
      <span className="mr-2 inline-block h-4 w-4 rounded-full bg-white" aria-hidden />
      {busy ? 'Google로 이동 중…' : 'Google로 시작하기'}
    </Button>
  );
}
