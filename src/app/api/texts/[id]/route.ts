import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaGoogle } from '@/lib/prisma-google';
import { prismaCredential } from '@/lib/prisma-credential';

export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  if (session.user.type === 'google') {
    const t = await prismaGoogle.googleText.findUnique({ where: { id: params.id } });
    if (!t) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (t.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }
    return NextResponse.json({ success: true, data: t });
  }

  const t = await prismaCredential.credentialText.findUnique({ where: { id: params.id } });
  if (!t) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  if (t.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  return NextResponse.json({ success: true, data: t });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
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

  if (session.user.type === 'google') {
    const t = await prismaGoogle.googleText.findUnique({ where: { id: params.id } });
    if (!t) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (t.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }
    const updated = await prismaGoogle.googleText.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, data: updated });
  }

  const t = await prismaCredential.credentialText.findUnique({ where: { id: params.id } });
  if (!t) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  if (t.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  const updated = await prismaCredential.credentialText.update({ where: { id: params.id }, data });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  if (session.user.type === 'google') {
    const t = await prismaGoogle.googleText.findUnique({ where: { id: params.id } });
    if (!t) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (t.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }
    await prismaGoogle.googleText.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, data: { id: params.id } });
  }

  const t = await prismaCredential.credentialText.findUnique({ where: { id: params.id } });
  if (!t) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  if (t.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  await prismaCredential.credentialText.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true, data: { id: params.id } });
}
