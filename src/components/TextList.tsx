'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TextEditor } from './TextEditor';
import type { Text } from '@/hooks/useTexts';

export interface TextListProps {
  items: Text[];
  onUpdate: (id: string, input: Partial<{ title: string; content: string; tags: string | null }>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString('ko-KR');
  } catch {
    return s;
  }
}

export function TextList({ items, onUpdate, onDelete }: TextListProps) {
  const [editing, setEditing] = useState<Text | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">아직 저장된 텍스트가 없습니다. 첫 텍스트를 작성해 보세요.</p>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((t) => (
        <Card key={t.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">{t.title}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(t.updatedAt)}
                {t.tags ? ` · ${t.tags}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={openId === t.id} onOpenChange={(o) => setOpenId(o ? t.id : null)}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm">열기</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t.title}</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-auto whitespace-pre-wrap text-sm">
                    {t.content}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={editing?.id === t.id} onOpenChange={(o) => setEditing(o ? t : null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">수정</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>텍스트 수정</DialogTitle>
                  </DialogHeader>
                  {editing?.id === t.id && (
                    <TextEditor
                      initial={editing}
                      submitting={busy}
                      onSubmit={async (input) => {
                        setBusy(true);
                        try {
                          await onUpdate(t.id, input);
                          setEditing(null);
                        } finally {
                          setBusy(false);
                        }
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  )}
                </DialogContent>
              </Dialog>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!confirm('정말 삭제하시겠습니까?')) return;
                  await onDelete(t.id);
                }}
              >
                삭제
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {t.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
