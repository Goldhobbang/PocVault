import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

const PWD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED' } },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string; currentPassword?: string };
  const password = body.password;
  if (!password || !PWD_RE.test(password)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: '비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다.',
        },
      },
      { status: 422 },
    );
  }

  // 이미 passwordHash가 있으면 현재 비밀번호 확인 (변경 시)
  const existing = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (existing?.passwordHash) {
    if (!body.currentPassword) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_FAILED', message: '현재 비밀번호가 필요합니다.' },
        },
        { status: 422 },
      );
    }
    const ok = await bcrypt.compare(body.currentPassword, existing.passwordHash);
    if (!ok) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: '현재 비밀번호가 올바르지 않습니다.' },
        },
        { status: 403 },
      );
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ success: true, data: { hasPassword: true } });
}
