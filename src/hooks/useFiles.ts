'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface StoredFile {
  id: string;
  filename: string;
  storedName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

function readError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return '요청 처리에 실패했습니다.';
}

export function useFiles(initialQuery: string = '') {
  const [items, setItems] = useState<StoredFile[]>([]);
  const [q, setQ] = useState<string>(initialQuery);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<StoredFile[]>(
        `/api/files${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      );
      setItems(data);
    } catch (e) {
      setError(readError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll(q);
  }, [fetchAll, q]);

  const upload = useCallback(async (file: File, description?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (description) form.append('description', description);
    const created = await api.post<StoredFile>('/api/files', form);
    setItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, description: string | null) => {
    const updated = await api.patch<StoredFile>(`/api/files/${id}`, { description });
    setItems((prev) => prev.map((f) => (f.id === id ? updated : f)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/files/${id}`);
    setItems((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const downloadHref = useCallback((id: string) => `/api/files/${id}/download`, []);

  return {
    items,
    q,
    setQ,
    loading,
    error,
    refresh: () => fetchAll(q),
    upload,
    update,
    remove,
    downloadHref,
  };
}
