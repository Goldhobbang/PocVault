'use client';
import { useEffect, useState } from 'react';
import { useSession, signIn, getSession } from 'next-auth/react';
import { SignupForm } from '@/components/SignupForm';
import { GoogleSignupButton } from '@/components/GoogleSignupButton';
import { logger } from '@/lib/logger';

export default function SignupClient() {
  const { data: session, status } = useSession();
  const [googleAuthed, setGoogleAuthed] = useState<boolean>(session?.user?.type === 'google');

  useEffect(() => {
    if (status === 'loading') {
      logger.debug('SignupClient', 'useSession still loading');
      return;
    }

    logger.debug('SignupClient', 'useSession status changed', { status, currentGoogleAuthed: googleAuthed });

    let mounted = true;
    async function ensureSession() {
      logger.debug('SignupClient', 'ensureSession: starting session check');
      // immediate check
      const s = await getSession();
      if (!mounted) return;
      logger.debug('SignupClient', 'getSession result', { hasSession: !!s, userType: s?.user?.type });
      if (s?.user?.type === 'google') {
        logger.info('SignupClient', 'Google session confirmed on first check');
        setGoogleAuthed(true);
        return;
      }

      // Poll for session (useful when redirect flow returns but client session not yet established)
      logger.debug('SignupClient', 'starting polling for session');
      let attempts = 0;
      while (mounted && attempts < 8) {
        await new Promise((r) => setTimeout(r, 500));
        const s2 = await getSession();
        if (!mounted) return;
        logger.debug('SignupClient', 'polling attempt', { attempt: attempts + 1, hasSession: !!s2, userType: s2?.user?.type });
        if (s2?.user?.type === 'google') {
          logger.info('SignupClient', 'Google session confirmed on poll', { attempt: attempts + 1 });
          setGoogleAuthed(true);
          return;
        }
        attempts += 1;
      }
      logger.warn('SignupClient', 'polling timeout: Google session not found after 8 attempts');
    }

    ensureSession();
    return () => {
      mounted = false;
    };
  }, [status]);

  if (status === 'loading') {
    logger.debug('SignupClient', 'rendering loading state');
    return <div className="p-4">인증 상태 확인 중…</div>;
  }

  logger.debug('SignupClient', 'rendering signup client', { googleAuthed });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">회원가입을 위해 Google로 먼저 인증해주세요.</p>
      <GoogleSignupButton />

      <div className="pt-2">
        <SignupForm googleAuthed={googleAuthed} />
      </div>

      {!googleAuthed && (
        <p className="text-xs text-muted-foreground">Google 인증을 완료하면 가입 버튼이 활성화됩니다.</p>
      )}

      {googleAuthed && (
        <p className="text-xs text-muted-foreground">Google 인증이 확인되었습니다. 폼을 작성하여 가입하세요.</p>
      )}
    </div>
  );
}
