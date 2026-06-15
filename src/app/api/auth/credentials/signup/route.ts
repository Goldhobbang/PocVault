import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prismaCredential } from '@/lib/prisma-credential';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const ID_RE = /^[a-z0-9_]{3,20}$/;

/**
 * POST /api/auth/credentials/signup
 * body: { loginId, password }
 *
 * New policy: ID/PW accounts must be created while authenticated with Google.
 * Each Google user may create between 1 and 5 ID/PW accounts (enforced here).
 */
export async function POST(req: NextRequest) {
  logger.debug('api.signup', 'POST /api/auth/credentials/signup: request received');

  // Require Google-authenticated session
  const session = await getServerSession(authOptions);
  logger.debug('api.signup', 'getServerSession result', {
    hasSession: !!session,
    userId: session?.user?.id,
    userType: session?.user?.type,
  });

  if (!session?.user?.id || session.user.type !== 'google') {
    logger.warn('api.signup', 'authentication failed: not google-authenticated', {
      hasSession: !!session,
      userType: session?.user?.type,
    });
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Google 로그인으로 먼저 인증해야 합니다.' } },
      { status: 401 },
    );
  }
  const googleOwnerId = String(session.user.id);
  logger.info('api.signup', 'google-authenticated user', { googleOwnerId });

  const body = (await req.json().catch(() => ({}))) as {
    loginId?: string;
    password?: string;
  };
  const loginId = (body.loginId ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  logger.debug('api.signup', 'request body parsed', { loginId });

  if (!ID_RE.test(loginId)) {
    logger.warn('api.signup', 'loginId validation failed', { loginId });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'ID는 3~20자의 영문 소문자, 숫자, 언더스코어만 사용 가능합니다.',
        },
      },
      { status: 422 },
    );
  }
  if (!password) {
    logger.warn('api.signup', 'password validation failed: empty password');
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_FAILED', message: '비밀번호를 입력해주세요.' } },
      { status: 422 },
    );
  }

  // Enforce per-Google-user limit (1..5)
  logger.debug('api.signup', 'checking per-google-user ID limit', { googleOwnerId });
  const existing = await prismaCredential.credentialUser.count({ where: { googleOwnerId } });
  logger.debug('api.signup', 'existing credential accounts', { googleOwnerId, count: existing });
  if (existing >= 5) {
    logger.warn('api.signup', 'per-google-user limit exceeded', { googleOwnerId, count: existing });
    return NextResponse.json(
      { success: false, error: { code: 'QUOTA_EXCEEDED', message: '이 Google 계정으로 더 이상 ID를 생성할 수 없습니다 (최대 5개).' } },
      { status: 403 },
    );
  }

  // 중복 검사 (unique 인덱스 + 명시적 조회로 이중 방어)
  logger.debug('api.signup', 'checking loginId uniqueness', { loginId });
  const dup = await prismaCredential.credentialUser.findFirst({
    where: { loginId },
    select: { id: true },
  });
  if (dup) {
    logger.warn('api.signup', 'loginId already exists', { loginId });
    return NextResponse.json(
      { success: false, error: { code: 'CONFLICT', message: '이미 사용 중인 ID 입니다.' } },
      { status: 409 },
    );
  }

  logger.debug('api.signup', 'hashing password with bcrypt');
  const passwordHash = await bcrypt.hash(password, 10);

  let created;
  try {
    logger.debug('api.signup', 'creating credential user', { loginId, googleOwnerId });
    created = await prismaCredential.credentialUser.create({
      data: {
        loginId,
        passwordHash,
        isActive: true,
        googleOwnerId,
      },
      select: { id: true, loginId: true },
    });
    logger.info('api.signup', 'credential user created successfully', { userId: created.id, loginId: created.loginId });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    logger.error('api.signup', 'credential user creation failed', { error: msg, code: e?.code });
    if (msg.includes('UNIQUE') && msg.includes('loginId')) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: '이미 사용 중인 ID 입니다.' } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: msg } },
      { status: 500 },
    );
  }

  logger.info('api.signup', 'signup completed successfully', { userId: created.id, loginId: created.loginId });
  return NextResponse.json({
    success: true,
    data: { loginId: created.loginId, userId: created.id },
  });
}
