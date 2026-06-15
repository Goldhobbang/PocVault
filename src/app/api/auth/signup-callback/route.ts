/**
 * Google 로그인 직후 호출되는 콜백 라우트.
 *
 * 새 정책: Google 로그인은 곧바로 /main 으로 보낸다.
 * 더 이상 "비밀번호 추가 등록" 단계가 없으므로
 * needsPassword 같은 플래그도 반환하지 않는다.
 *
 * (이전 버전의 "Google 신규 가입 → 비밀번호 설정 → /main" 흐름은 제거됨.
 *  정책 1·3 에 따라, 최종 로그인은 항상 id/pw 이고,
 *  Google 은 편한 첫 진입용으로만 사용한다.)
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaGoogle } from '@/lib/prisma-google';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED' } },
      { status: 401 },
    );
  }

  if (session.user.type !== 'google') {
    return NextResponse.json(
      { success: false, error: { code: 'WRONG_FLOW', message: 'Google 로그인이 아닙니다.' } },
      { status: 400 },
    );
  }

  const u = await prismaGoogle.googleUser.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true },
  });
  if (!u) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND' } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      // 더 이상 비밀번호 설정 단계가 없음
      needsPassword: false,
      email: u.email,
      name: u.name,
    },
  });
}
