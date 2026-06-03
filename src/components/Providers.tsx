'use client';
import { SessionProvider } from 'next-auth/react';
import { Toaster, toast as sonner } from 'sonner';
import { useEffect, type ReactNode } from 'react';
import { initTheme } from '@/stores/useUiStore';

/** 앱 전역 토스트 (sonner) */
export const toast = {
  show: (message: string, tone: 'default' | 'destructive' = 'default') => {
    if (tone === 'destructive') sonner.error(message);
    else sonner.message(message);
  },
};

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <SessionProvider>
      {children}
      <Toaster richColors position="top-center" closeButton />
    </SessionProvider>
  );
}
