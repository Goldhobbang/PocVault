import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaGoogle } from '@/lib/prisma-google';
import { prismaCredential } from '@/lib/prisma-credential';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

const UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads');

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  if (session.user.type === 'google') {
    const file = await prismaGoogle.googleFile.findUnique({ where: { id: params.id } });
    if (!file) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (file.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }
    return NextResponse.json({ success: true, data: file });
  }

  const file = await prismaCredential.credentialFile.findUnique({ where: { id: params.id } });
  if (!file) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  if (file.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  return NextResponse.json({ success: true, data: file });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { description?: string | null };
  if (body.description === undefined) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_FAILED', message: '수정할 필드가 없습니다.' } },
      { status: 422 },
    );
  }
  const description = body.description?.trim() || null;

  if (session.user.type === 'google') {
    const file = await prismaGoogle.googleFile.findUnique({ where: { id: params.id } });
    if (!file) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (file.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }
    const updated = await prismaGoogle.googleFile.update({
      where: { id: params.id },
      data: { description },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  const file = await prismaCredential.credentialFile.findUnique({ where: { id: params.id } });
  if (!file) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  if (file.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  const updated = await prismaCredential.credentialFile.update({
    where: { id: params.id },
    data: { description },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  if (session.user.type === 'google') {
    const file = await prismaGoogle.googleFile.findUnique({ where: { id: params.id } });
    if (!file) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (file.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }
    await prismaGoogle.$transaction(async (tx) => {
      await tx.googleFile.delete({ where: { id: file.id } });
      await tx.googleUser.update({
        where: { id: file.userId },
        data: { usedStorage: { decrement: file.size } },
      });
    });
    const fullPath = join(UPLOAD_ROOT, file.userId, file.storedName);
    await unlink(fullPath).catch(() => undefined);
    return NextResponse.json({ success: true, data: { id: file.id } });
  }

  const file = await prismaCredential.credentialFile.findUnique({ where: { id: params.id } });
  if (!file) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  if (file.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  await prismaCredential.$transaction(async (tx) => {
    await tx.credentialFile.delete({ where: { id: file.id } });
    await tx.credentialUser.update({
      where: { id: file.userId },
      data: { usedStorage: { decrement: file.size } },
    });
  });
  const fullPath = join(UPLOAD_ROOT, file.userId, file.storedName);
  await unlink(fullPath).catch(() => undefined);
  return NextResponse.json({ success: true, data: { id: file.id } });
}
