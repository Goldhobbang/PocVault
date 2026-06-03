import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads');

function encodeRFC5987(filename: string) {
  // 한글/특수문자 안전 처리
  return encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');
}

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED' } }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  const userId = session.user.id;

  const file = await prisma.file.findUnique({ where: { id: params.id } });
  if (!file) {
    return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND' } }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (file.userId !== userId) {
    return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN' } }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  const fullPath = join(UPLOAD_ROOT, file.userId, file.storedName);
  let info;
  try {
    info = await stat(fullPath);
  } catch {
    return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: '디스크에 파일이 없습니다.' } }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  const nodeStream = createReadStream(fullPath);
  // Next 14: Response에 Web ReadableStream을 넣어야 함. Node Readable → Web 변환
  const { Readable } = await import('node:stream');
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  const filenameStar = `filename*=UTF-8''${encodeRFC5987(file.filename)}`;
  return new Response(webStream, {
    status: 200,
    headers: {
      'content-type': file.mimeType || 'application/octet-stream',
      'content-length': String(info.size),
      'content-disposition': `attachment; filename="${file.filename.replace(/"/g, '')}"; ${filenameStar}`,
      'cache-control': 'private, no-store',
    },
  });
}
