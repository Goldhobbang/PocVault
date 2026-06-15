'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

/**
 * Google OAuth 시작 버튼 (회원가입 흐름용)
 * callbackUrl: /signup
 */
export function GoogleSignupButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      className="w-full"
      onClick={async () => {
        setBusy(true);
        try {
          await signIn('google', { callbackUrl: '/signup' });
        } catch {
          setBusy(false);
        }
      }}
      disabled={busy}
      data-testid="start-google-signup"
    >
      <span className="mr-2 inline-block h-4 w-4 rounded-full bg-white" aria-hidden />
      {busy ? 'Google로 이동 중…' : 'Google로 인증하고 ID/PW 생성'}
    </Button>
  );
}
