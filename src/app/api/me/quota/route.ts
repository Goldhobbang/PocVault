import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { usedStorage: true, storageQuota: true },
  });
  return NextResponse.json({ success: true, data: u });
}
