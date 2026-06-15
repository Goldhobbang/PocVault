import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prismaGoogle } from '@/lib/prisma-google';
import { prismaCredential } from '@/lib/prisma-credential';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** /main/settings — 프로필/계정 정보 */
export const dynamic = 'force-dynamic';

type GoogleView = {
  kind: 'google';
  email: string;
  name: string | null;
  image: string | null;
  usedStorage: number;
  storageQuota: number;
};

type CredView = {
  kind: 'credential';
  loginId: string;
  name: string | null;
  lastLoginAt: Date | null;
  usedStorage: number;
  storageQuota: number;
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) redirect('/');

  let view: GoogleView | CredView;
  if (session.user.type === 'google') {
    const u = await prismaGoogle.googleUser.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { email: true, name: true, image: true, storageQuota: true, usedStorage: true },
    });
    view = { kind: 'google', ...u };
  } else {
    const u = await prismaCredential.credentialUser.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { loginId: true, storageQuota: true, usedStorage: true, lastLoginAt: true },
    });
    view = { kind: 'credential', name: null, ...u };
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">설정</h1>
        <p className="text-sm text-muted-foreground">계정 정보를 확인합니다.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">계정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {view.kind === 'google' ? (
            <>
              <p>로그인 방식: Google</p>
              <p>이메일: {view.email}</p>
              {view.name && <p>이름: {view.name}</p>}
            </>
          ) : (
            <>
              <p>로그인 방식: ID / 비밀번호</p>
              <p>ID: {view.loginId}</p>
              {view.name && <p>이름: {view.name}</p>}
              <p>마지막 로그인: {view.lastLoginAt ? new Date(view.lastLoginAt).toLocaleString('ko-KR') : '없음'}</p>
            </>
          )}
          <p>
            저장소 사용량: {(view.usedStorage / (1024 * 1024)).toFixed(1)} MB /{' '}
            {(view.storageQuota / (1024 * 1024)).toFixed(0)} MB
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">로그아웃</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            우측 상단 사용자 메뉴에서 로그아웃할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
