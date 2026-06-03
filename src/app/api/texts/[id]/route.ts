import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

async function getOwnedText(userId: string, id: string) {
  const text = await prisma.text.findUnique({ where: { id } });
  if (!text) return { code: 'NOT_FOUND' as const };
  if (text.userId !== userId) return { code: 'FORBIDDEN' as const };
  return { text };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const r = await getOwnedText(session.user.id, params.id);
  if ('code' in r) {
    return NextResponse.json({ success: false, error: { code: r.code } }, { status: r.code === 'NOT_FOUND' ? 404 : 403 });
  }
  return NextResponse.json({ success: true, data: r.text });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const r = await getOwnedText(session.user.id, params.id);
  if ('code' in r) {
    return NextResponse.json({ success: false, error: { code: r.code } }, { status: r.code === 'NOT_FOUND' ? 404 : 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    content?: string;
    tags?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string') data.title = body.title.trim();
  if (typeof body.content === 'string') data.content = body.content;
  if (body.tags !== undefined) data.tags = body.tags?.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_FAILED', message: '수정할 필드가 없습니다.' } },
      { status: 422 },
    );
  }

  const updated = await prisma.text.update({ where: { id: params.id }, data });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const r = await getOwnedText(session.user.id, params.id);
  if ('code' in r) {
    return NextResponse.json({ success: false, error: { code: r.code } }, { status: r.code === 'NOT_FOUND' ? 404 : 403 });
  }
  await prisma.text.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true, data: { id: params.id } });
}
