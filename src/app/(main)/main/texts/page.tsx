'use client';
import { useTexts } from '@/hooks/useTexts';
import { TextList } from '@/components/TextList';
import { TextEditor } from '@/components/TextEditor';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

/** /main/texts — 텍스트 메모 */
export default function TextsPage() {
  const { items, q, setQ, loading, error, create, update, remove } = useTexts();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">텍스트 메모</h1>
          <p className="text-sm text-muted-foreground">제목·태그·내용으로 메모를 저장하고 검색하세요.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>새 메모</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>새 텍스트</DialogTitle>
            </DialogHeader>
            <TextEditor
              submitting={busy}
              onSubmit={async (input) => {
                setBusy(true);
                try {
                  await create(input);
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </header>
      <div className="mb-2 flex items-center gap-2">
        <Input
          placeholder="검색 (제목/태그/내용)"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
        />
      </div>
      {loading && <p className="text-sm text-muted-foreground">불러오는 중…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <TextList items={items} onUpdate={update} onDelete={remove} />
    </div>
  );
}
