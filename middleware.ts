import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    // 보호 대상: 대시보드 영역만 (api/auth, 정적 파일, 로그인 페이지는 제외)
    '/dashboard/:path*',
    '/files/:path*',
    '/texts/:path*',
    '/settings/:path*',
  ],
};
