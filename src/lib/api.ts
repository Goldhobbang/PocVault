/**
 * API 호출 래퍼. 서버 응답의 `{ success, data, error }` 통합 포맷 처리.
 */

export type ApiError = {
  code:
    | 'AUTH_REQUIRED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'QUOTA_EXCEEDED'
    | 'VALIDATION_FAILED'
    | 'INTERNAL'
    | 'UNKNOWN';
  message?: string;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

export class HttpError extends Error {
  status: number;
  payload: ApiEnvelope<unknown>;
  constructor(status: number, payload: ApiEnvelope<unknown>) {
    super(payload.error?.message ?? `HTTP ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

async function parse<T>(res: Response): Promise<T> {
  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new HttpError(res.status, { success: false, error: { code: 'UNKNOWN' } });
  }
  if (!res.ok || !json.success) {
    throw new HttpError(res.status, json);
  }
  return json.data as T;
}

export const api = {
  async get<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, method: 'GET' });
    return parse<T>(res);
  },
  async post<T>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
    const isForm = body instanceof FormData;
    const res = await fetch(url, {
      ...init,
      method: 'POST',
      headers: isForm
        ? (init?.headers as Record<string, string> | undefined)
        : { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string>) },
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
    return parse<T>(res);
  },
  async patch<T>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string>) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return parse<T>(res);
  },
  async delete<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, method: 'DELETE' });
    return parse<T>(res);
  },
};
