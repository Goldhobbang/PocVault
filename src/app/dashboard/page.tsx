import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const [textCount, fileCount, user] = await Promise.all([
    prisma.text.count({ where: { userId: session.user.id } }),
    prisma.file.count({ where: { userId: session.user.id } }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { usedStorage: true, storageQuota: true },
    }),
  ]);

  const pct = user.storageQuota > 0 ? (user.usedStorage / user.storageQuota) * 100 : 0;

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">대시보드</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">텍스트 메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{textCount}</p>
            <Link href="/dashboard/texts" className="mt-2 inline-block text-sm underline">
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
            <Link href="/dashboard/files" className="mt-2 inline-block text-sm underline">
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
              {formatBytes(user.usedStorage)} / {formatBytes(user.storageQuota)} ({pct.toFixed(1)}%)
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
        <Link href="/dashboard/texts"><Button>텍스트 작성</Button></Link>
        <Link href="/dashboard/files"><Button variant="outline">파일 업로드</Button></Link>
      </div>
    </div>
  );
}
