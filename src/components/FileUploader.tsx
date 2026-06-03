'use client';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_FILE_SIZE_MB } from '@/lib/quota';

export interface FileUploaderProps {
  usedStorage: number;
  storageQuota: number;
  onUpload: (file: File, description?: string) => Promise<unknown>;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function FileUploader({ usedStorage, storageQuota, onUpload }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = Math.max(0, storageQuota - usedStorage);
  const overLimit = file ? file.size > remaining : false;
  const overSize = file ? file.size > MAX_FILE_SIZE_MB * 1024 * 1024 : false;

  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return;
        setBusy(true);
        setError(null);
        try {
          await onUpload(file, description.trim() || undefined);
          setFile(null);
          setDescription('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
          const e2 = err as { message?: string };
          setError(e2?.message ?? '업로드에 실패했습니다.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="file-input">파일</Label>
        <Input
          id="file-input"
          type="file"
          ref={fileInputRef}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy}
        />
        {file && (
          <p className="text-xs text-muted-foreground">
            {file.name} · {formatBytes(file.size)} · {file.type || 'unknown'}
          </p>
        )}
        {overSize && (
          <p className="text-xs text-destructive">
            파일이 {MAX_FILE_SIZE_MB}MB를 초과합니다.
          </p>
        )}
        {overLimit && !overSize && (
          <p className="text-xs text-destructive">
            저장소 잔량이 부족합니다. (잔여: {formatBytes(remaining)})
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="file-desc">설명 (선택)</Label>
        <Input
          id="file-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="파일에 대한 간단한 메모"
          disabled={busy}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!file || busy || overSize || overLimit}>
        {busy ? '업로드 중…' : '업로드'}
      </Button>
    </form>
  );
}
