'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface Text {
  id: string;
  title: string;
  content: string;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

function readError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return '요청 처리에 실패했습니다.';
}

export function useTexts(initialQuery: string = '') {
  const [items, setItems] = useState<Text[]>([]);
  const [q, setQ] = useState<string>(initialQuery);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Text[]>(`/api/texts${query ? `?q=${encodeURIComponent(query)}` : ''}`);
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

  const create = useCallback(
    async (input: { title: string; content: string; tags?: string }) => {
      const created = await api.post<Text>('/api/texts', input);
      setItems((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const update = useCallback(
    async (id: string, input: Partial<{ title: string; content: string; tags: string | null }>) => {
      const updated = await api.patch<Text>(`/api/texts/${id}`, input);
      setItems((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/texts/${id}`);
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { items, q, setQ, loading, error, refresh: () => fetchAll(q), create, update, remove };
}
