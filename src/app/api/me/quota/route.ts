import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaGoogle } from '@/lib/prisma-google';
import { prismaCredential } from '@/lib/prisma-credential';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.type) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  if (session.user.type === 'google') {
    const u = await prismaGoogle.googleUser.findUnique({
      where: { id: session.user.id },
      select: { usedStorage: true, storageQuota: true },
    });
    if (!u) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    return NextResponse.json({ success: true, data: u });
  }

  // credential
  const u = await prismaCredential.credentialUser.findUnique({
    where: { id: session.user.id },
    select: { usedStorage: true, storageQuota: true },
  });
  if (!u) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  return NextResponse.json({ success: true, data: u });
}
