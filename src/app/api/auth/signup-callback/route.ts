/**
 * Google 신규 가입 직후 호출되는 콜백 라우트.
 * - 계정 존재 확인
 * - 온보딩 메타(예: 비밀번호 설정 필요 여부) 반환
 * (비밀번호 자체 설정은 /api/auth/credentials 에서 처리)
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED' } },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND' } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      needsPassword: !user.passwordHash,
      email: user.email,
    },
  });
}
