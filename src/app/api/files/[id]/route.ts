import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

const UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads');

async function getOwnedFile(userId: string, id: string) {
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) return { code: 'NOT_FOUND' as const };
  if (file.userId !== userId) return { code: 'FORBIDDEN' as const };
  return { file };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const r = await getOwnedFile(session.user.id, params.id);
  if ('code' in r) {
    return NextResponse.json(
      { success: false, error: { code: r.code } },
      { status: r.code === 'NOT_FOUND' ? 404 : 403 },
    );
  }
  return NextResponse.json({ success: true, data: r.file });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const r = await getOwnedFile(session.user.id, params.id);
  if ('code' in r) {
    return NextResponse.json(
      { success: false, error: { code: r.code } },
      { status: r.code === 'NOT_FOUND' ? 404 : 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { description?: string | null };
  if (body.description === undefined) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_FAILED', message: '수정할 필드가 없습니다.' } },
      { status: 422 },
    );
  }
  const description = body.description?.trim() || null;
  const updated = await prisma.file.update({
    where: { id: params.id },
    data: { description },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const r = await getOwnedFile(session.user.id, params.id);
  if ('code' in r) {
    return NextResponse.json(
      { success: false, error: { code: r.code } },
      { status: r.code === 'NOT_FOUND' ? 404 : 403 },
    );
  }

  const file = r.file;
  await prisma.$transaction(async (tx: any) => {
    await tx.file.delete({ where: { id: file.id } });
    await tx.user.update({
      where: { id: file.userId },
      data: { usedStorage: { decrement: file.size } },
    });
  });

  const fullPath = join(UPLOAD_ROOT, file.userId, file.storedName);
  await unlink(fullPath).catch(() => undefined);

  return NextResponse.json({ success: true, data: { id: file.id } });
}
