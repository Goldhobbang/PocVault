'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { StoredFile } from '@/hooks/useFiles';

export interface FileListProps {
  items: StoredFile[];
  onUpdate: (id: string, description: string | null) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  downloadHref: (id: string) => string;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString('ko-KR');
  } catch {
    return s;
  }
}

export function FileList({ items, onUpdate, onDelete, downloadHref }: FileListProps) {
  const [editing, setEditing] = useState<StoredFile | null>(null);
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">업로드된 파일이 없습니다.</p>;
  }

  return (
    <div className="grid gap-3">
      {items.map((f) => (
        <Card key={f.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base break-all">{f.filename}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatBytes(f.size)} · {f.mimeType || 'unknown'} · {formatDate(f.createdAt)}
              </p>
              {f.description && (
                <p className="mt-1 text-xs">{f.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <a href={downloadHref(f.id)} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">다운로드</Button>
              </a>
              <Dialog
                open={editing?.id === f.id}
                onOpenChange={(o) => {
                  setEditing(o ? f : null);
                  setDesc(o ? f.description ?? '' : '');
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">설명 수정</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>설명 수정</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="설명"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await onUpdate(f.id, desc.trim() || null);
                            setEditing(null);
                          } finally {
                            setBusy(false);
                          }
                        }}
                        disabled={busy}
                      >
                        저장
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
                        취소
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!confirm('정말 삭제하시겠습니까? (저장소 사용량도 차감됩니다)')) return;
                  await onDelete(f.id);
                }}
              >
                삭제
              </Button>
            </div>
          </CardHeader>
          <CardContent />
        </Card>
      ))}
    </div>
  );
}
