'use client';
import { useFiles } from '@/hooks/useFiles';
import { FileUploader } from '@/components/FileUploader';
import { FileList } from '@/components/FileList';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function FilesPage() {
  const { items, q, setQ, loading, error, upload, update, remove, downloadHref } = useFiles();
  const [quota, setQuota] = useState<{ usedStorage: number; storageQuota: number } | null>(null);

  useEffect(() => {
    void api
      .get<{ usedStorage: number; storageQuota: number }>('/api/me/quota')
      .then(setQuota)
      .catch(() => undefined);
  }, [items.length]);

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">파일 보관함</h1>
        <p className="text-sm text-muted-foreground">
          {quota
            ? `사용량: ${(quota.usedStorage / 1024 / 1024).toFixed(1)} MB / ${(quota.storageQuota / 1024 / 1024).toFixed(0)} MB`
            : '사용량 불러오는 중…'}
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-medium">업로드</h2>
          {quota ? (
            <FileUploader
              usedStorage={quota.usedStorage}
              storageQuota={quota.storageQuota}
              onUpload={upload}
            />
          ) : (
            <p className="text-sm text-muted-foreground">준비 중…</p>
          )}
        </section>
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Input
              placeholder="파일명/설명 검색"
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
            />
          </div>
          {loading && <p className="text-sm text-muted-foreground">불러오는 중…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <FileList items={items} onUpdate={update} onDelete={remove} downloadHref={downloadHref} />
        </section>
      </div>
    </div>
  );
}
