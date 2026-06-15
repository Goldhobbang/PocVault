import { withAuth } from 'next-auth/middleware';

/**
 * 보호 라우트 가드
 *
 * - /main/* : 인증 필요 (미들웨어가 차단 → 로그인 페이지로 보냄)
 * - /login, /signup, /, /api/auth/*, 정적 파일 : 통과
 *
 * 두 흐름(google / id+pw) 모두 JWT 세션을 사용하므로, withAuth 가
 * session.user.type 을 가리지 않고 동일하게 보호한다.
 * 추가 가드(자기 DB 접근)는 (main)/layout.tsx 에서 처리한다.
 */
export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    // /main/* 만 보호 (route group "(main)"은 URL에 노출되지 않음)
    '/main/:path*',
  ],
};
