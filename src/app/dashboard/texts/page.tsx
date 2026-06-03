'use client';
import { useTexts } from '@/hooks/useTexts';
import { TextEditor } from '@/components/TextEditor';
import { TextList } from '@/components/TextList';
import { Input } from '@/components/ui/input';

export default function TextsPage() {
  const { items, q, setQ, loading, error, create, update, remove } = useTexts();

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">텍스트 메모</h1>
        <p className="text-sm text-muted-foreground">제목/태그/내용으로 자유롭게 작성하세요.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border p-4">
          <h2 className="mb-3 text-base font-medium">새 메모</h2>
          <TextEditor
            onSubmit={async (i) => {
              await create(i);
            }}
          />
        </section>
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Input
              placeholder="제목/설명 검색"
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
            />
          </div>
          {loading && <p className="text-sm text-muted-foreground">불러오는 중…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <TextList items={items} onUpdate={update} onDelete={remove} />
        </section>
      </div>
    </div>
  );
}
