import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaGoogle } from '@/lib/prisma-google';
import { prismaCredential } from '@/lib/prisma-credential';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MAX_FILE_SIZE_MB } from '@/lib/quota';

export const runtime = 'nodejs';
export const maxDuration = 60;

const UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * /api/files
 *
 * session.user.type 에 따라 google.db / credential.db 로 분기.
 *  - Google 흐름: GoogleUser / GoogleFile
 *  - id/pw 흐름 : CredentialUser / CredentialFile
 *
 * 두 흐름 모두 "본인 데이터만" 반환 (userId 필터).
 */

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const userId = session.user.id;
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (session.user.type === 'google') {
    const files = await prismaGoogle.googleFile.findMany({
      where: {
        userId,
        ...(q
          ? {
              OR: [
                { filename: { contains: q } },
                { description: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: files });
  }

  const files = await prismaCredential.credentialFile.findMany({
    where: {
      userId,
      ...(q
        ? {
            OR: [
              { filename: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ success: true, data: files });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const userId = session.user.id;

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_FAILED', message: 'file 누락' } },
      { status: 422 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_FAILED', message: '빈 파일입니다.' } },
      { status: 422 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: `파일 크기는 최대 ${MAX_FILE_SIZE_MB}MB 입니다.`,
        },
      },
      { status: 413 },
    );
  }

  const ext = extname(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const userDir = join(UPLOAD_ROOT, userId);
  await mkdir(userDir, { recursive: true });
  const fullPath = join(userDir, storedName);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buf);

  const description = (form.get('description') as string | null)?.trim() || null;

  try {
    if (session.user.type === 'google') {
      const user = await prismaGoogle.googleUser.findUniqueOrThrow({ where: { id: userId } });
      if (user.usedStorage + file.size > user.storageQuota) {
        await unlink(fullPath).catch(() => undefined);
        return NextResponse.json({ success: false, error: { code: 'QUOTA_EXCEEDED' } }, { status: 413 });
      }
      const created = await prismaGoogle.$transaction(async (tx) => {
        const f = await tx.googleFile.create({
          data: {
            userId,
            filename: file.name,
            storedName,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            storagePath: `/uploads/${userId}/${storedName}`,
            description,
          },
        });
        await tx.googleUser.update({
          where: { id: userId },
          data: { usedStorage: { increment: file.size } },
        });
        return f;
      });
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    const user = await prismaCredential.credentialUser.findUniqueOrThrow({ where: { id: userId } });
    if (user.usedStorage + file.size > user.storageQuota) {
      await unlink(fullPath).catch(() => undefined);
      return NextResponse.json({ success: false, error: { code: 'QUOTA_EXCEEDED' } }, { status: 413 });
    }
    const created = await prismaCredential.$transaction(async (tx) => {
      const f = await tx.credentialFile.create({
        data: {
          userId,
          filename: file.name,
          storedName,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          storagePath: `/uploads/${userId}/${storedName}`,
          description,
        },
      });
      await tx.credentialUser.update({
        where: { id: userId },
        data: { usedStorage: { increment: file.size } },
      });
      return f;
    });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    // DB 실패 시 디스크 파일 정리
    await unlink(fullPath).catch(() => undefined);
    throw err;
  }
}
