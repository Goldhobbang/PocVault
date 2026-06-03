'use client';
import { useEffect } from 'react';

export interface ToastProps {
  message: string;
  tone?: 'default' | 'destructive';
  durationMs?: number;
  onClose?: () => void;
}

export function Toast({ message, tone = 'default', durationMs = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onClose]);

  const bg = tone === 'destructive' ? 'bg-destructive text-destructive-foreground' : 'bg-foreground text-background';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md px-4 py-2 text-sm shadow-lg ${bg}`}
    >
      {message}
    </div>
  );
}
