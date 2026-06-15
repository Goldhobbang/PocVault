import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prismaCredential } from '@/lib/prisma-credential';

export const runtime = 'nodejs';

/**
 * POST /api/auth/credentials
 * body: { loginId, password }
 *
 *  1) ID/비번 정합성 검사
 *  2) credential.db 에서 loginId 로 사용자 조회
 *  3) bcrypt.compare 로 해시 비교
 *  4) 성공 시 lastLoginAt 갱신
 *  5) { ok, userId, loginId } 반환
 *
 *  이 라우트는 DB 검증만 한다.
 *  실제 JWT 발급은 next-auth 의 signIn('credentials', ...) 가 처리한다.
 *  (signIn 은 /api/auth/[...nextauth]/route.ts 의 CredentialsProvider.authorize 와 연결됨)
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    loginId?: string;
    password?: string;
  };
  const loginId = (body.loginId ?? '').trim().toLowerCase();
  const password = body.password ?? '';

  if (!loginId || !password) {
    return NextResponse.json(
      { ok: false, error: '아이디와 비밀번호를 모두 입력해 주세요.' },
      { status: 400 },
    );
  }

  const user = await prismaCredential.credentialUser.findFirst({
    where: { loginId },
    select: { id: true, loginId: true, passwordHash: true, isActive: true },
  });

  // 사용자 존재 / 비활성 / 비밀번호 불일치를 단일 메시지로 통합
  // → 사용자 열거 공격 방어
  if (!user || !user.isActive) {
    return NextResponse.json(
      { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    );
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    );
  }

  // lastLoginAt 갱신
  await prismaCredential.credentialUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return NextResponse.json({ ok: true, userId: user.id, loginId: user.loginId });
}
