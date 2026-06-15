import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prismaGoogle } from '@/lib/prisma-google';
import { prismaCredential } from '@/lib/prisma-credential';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * /main — 로그인 후 사용자의 스토리지가 보이는 메인 홈
 *
 * session.user.type 에 따라 다른 Prisma 클라이언트로 분기한다.
 * - type === 'google'     → google.db
 * - type === 'credential' → credential.db
 */
export default async function MainHome() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  if (!session.user.type) redirect('/login');

  if (session.user.type === 'google') {
    // ---- Google 흐름 ----
    const u = await prismaGoogle.googleUser.findUnique({
      where: { id: session.user.id },
      select: { id: true, storageQuota: true, usedStorage: true, email: true },
    });
    if (!u) redirect('/login');

    const [textCount, fileCount] = await Promise.all([
      prismaGoogle.googleText.count({ where: { userId: u.id } }),
      prismaGoogle.googleFile.count({ where: { userId: u.id } }),
    ]);

    const pct = u.storageQuota > 0 ? (u.usedStorage / u.storageQuota) * 100 : 0;

    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold">내 스토리지</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">텍스트 메모</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{textCount}</p>
              <Link href="/main/texts" className="mt-2 inline-block text-sm underline">
                텍스트 관리 →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">파일</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{fileCount}</p>
              <Link href="/main/files" className="mt-2 inline-block text-sm underline">
                파일 관리 →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">저장소 사용량</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {formatBytes(u.usedStorage)} / {formatBytes(u.storageQuota)} ({pct.toFixed(1)}%)
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex gap-2">
          <Link href="/main/texts"><Button>텍스트 작성</Button></Link>
          <Link href="/main/files"><Button variant="outline">파일 업로드</Button></Link>
        </div>
      </div>
    );
  }

  // ---- id/pw 흐름 ----
  const acc = await prismaCredential.credentialUser.findUnique({
    where: { id: session.user.id },
    select: { id: true, loginId: true, usedStorage: true, storageQuota: true, isActive: true },
  });
  if (!acc || !acc.isActive) redirect('/login');

  const [textCount, fileCount] = await Promise.all([
    prismaCredential.credentialText.count({ where: { userId: acc.id } }),
    prismaCredential.credentialFile.count({ where: { userId: acc.id } }),
  ]);

  const pct = acc.storageQuota > 0 ? (acc.usedStorage / acc.storageQuota) * 100 : 0;

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">내 스토리지</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">텍스트 메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{textCount}</p>
            <Link href="/main/texts" className="mt-2 inline-block text-sm underline">
              텍스트 관리 →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">파일</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{fileCount}</p>
            <Link href="/main/files" className="mt-2 inline-block text-sm underline">
              파일 관리 →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">저장소 사용량</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {formatBytes(acc.usedStorage)} / {formatBytes(acc.storageQuota)} ({pct.toFixed(1)}%)
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex gap-2">
        <Link href="/main/texts"><Button>텍스트 작성</Button></Link>
        <Link href="/main/files"><Button variant="outline">파일 업로드</Button></Link>
      </div>
    </div>
  );
}
