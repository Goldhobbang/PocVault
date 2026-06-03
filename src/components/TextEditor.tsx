'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface TextEditorProps {
  initial?: { id?: string; title?: string; content?: string; tags?: string | null };
  submitting?: boolean;
  onSubmit: (input: { title: string; content: string; tags?: string }) => Promise<void> | void;
  onCancel?: () => void;
}

export function TextEditor({ initial, submitting, onSubmit, onCancel }: TextEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [tags, setTags] = useState(initial?.tags ?? '');

  useEffect(() => {
    setTitle(initial?.title ?? '');
    setContent(initial?.content ?? '');
    setTags(initial?.tags ?? '');
  }, [initial?.title, initial?.content, initial?.tags]);

  const isEdit = Boolean(initial?.id);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        await onSubmit({ title: title.trim(), content, tags: tags.trim() || undefined });
        if (!isEdit) {
          setTitle('');
          setContent('');
          setTags('');
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="text-title">제목</Label>
        <Input
          id="text-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="텍스트 제목"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="text-tags">태그 (쉼표 구분, 선택)</Label>
        <Input
          id="text-tags"
          value={tags ?? ''}
          onChange={(e) => setTags(e.target.value)}
          placeholder="예: 일기, 공부, 아이디어"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="text-content">내용</Label>
        <Textarea
          id="text-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="자유롭게 작성하세요."
          rows={10}
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting || !title.trim() || !content.trim()}>
          {isEdit ? '수정' : '저장'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            취소
          </Button>
        )}
      </div>
    </form>
  );
}
