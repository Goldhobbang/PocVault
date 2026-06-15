import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaGoogle } from '@/lib/prisma-google';
import { prismaCredential } from '@/lib/prisma-credential';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const userId = session.user.id;
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const where = {
    userId,
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
            { tags: { contains: q } },
          ],
        }
      : {}),
  };

  if (session.user.type === 'google') {
    const texts = await prismaGoogle.googleText.findMany({ where, orderBy: { updatedAt: 'desc' } });
    return NextResponse.json({ success: true, data: texts });
  }
  const texts = await prismaCredential.credentialText.findMany({ where, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ success: true, data: texts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const userId = session.user.id;

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    content?: string;
    tags?: string;
  };

  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'title/content는 필수입니다.' },
      },
      { status: 422 },
    );
  }

  const data = {
    userId,
    title: body.title.trim(),
    content: body.content,
    tags: body.tags?.trim() || null,
  };

  if (session.user.type === 'google') {
    const created = await prismaGoogle.googleText.create({ data });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  }
  const created = await prismaCredential.credentialText.create({ data });
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
