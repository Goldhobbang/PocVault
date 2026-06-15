/**
 * 중앙 로깅 유틸리티
 * 서버/클라이언트 모두에서 사용 가능하며, 타임스탐프와 함수명을 자동 추가합니다.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatLog(level: LogLevel, module: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;
  const payload = data ? ` ${JSON.stringify(data)}` : '';
  return `${prefix} ${message}${payload}`;
}

export const logger = {
  debug: (module: string, message: string, data?: unknown) => {
    const log = formatLog('debug', module, message, data);
    if (typeof window === 'undefined') {
      // Server-side
      console.log(log);
    } else {
      // Client-side
      console.log(log);
    }
  },

  info: (module: string, message: string, data?: unknown) => {
    const log = formatLog('info', module, message, data);
    if (typeof window === 'undefined') {
      console.log(log);
    } else {
      console.info(log);
    }
  },

  warn: (module: string, message: string, data?: unknown) => {
    const log = formatLog('warn', module, message, data);
    if (typeof window === 'undefined') {
      console.warn(log);
    } else {
      console.warn(log);
    }
  },

  error: (module: string, message: string, data?: unknown) => {
    const log = formatLog('error', module, message, data);
    if (typeof window === 'undefined') {
      console.error(log);
    } else {
      console.error(log);
    }
  },
};
