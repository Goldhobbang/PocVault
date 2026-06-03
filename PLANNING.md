# PLANNING.md

> **서비스명**: PocVault  
> **버전**: v1.0  
> **핵심 컨셉**: "내 파일과 텍스트를 한 곳에 모아, 클릭 한 번으로 복사하자" — 1인 1스토리지 개인 클라우드 클립보드

---

## 1. 프로젝트 개요

### 1.1 서비스 정의
- **형태**: Next.js 14+ 단일 프로젝트 (App Router + 내장 Route Handlers)
- **목적**: 파일(이미지/PDF/문서 등)과 텍스트 스니펫을 업로드·저장·관리하고, 한 번의 클릭으로 클립보드에 복사하여 어디서든 재사용
- **저장 정책**: 1계정 = 1개의 독립된 스토리지 (기본 1GB)
- **인증 정책 (Strict 1:1)**:
  - **최초 가입**: Google OAuth 2.0로만 가능
  - **가입 직후/이후**: 이메일(고유) + 비밀번호를 설정하여, 이후에는 Google 로그인 또는 ID/PW 로그인 둘 다 사용 가능
  - **제약**: Google 계정 1개당 우리 서비스 User 1개만 생성·연동 (Unique `googleId`)

### 1.2 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **Next.js 14+ (App Router, TS)** | SSR/CSR 혼합, 내장 API Routes |
| 인증 | **NextAuth.js (Auth.js v5)** | Google Provider + Credentials Provider |
| ORM | **Prisma** | 타입 안전, 마이그레이션 자동화 |
| DB | **SQLite** | 단일 파일, 무료, 로컬 개발 최적 |
| 스타일 | **Tailwind CSS** | 빠른 UI |
| 컴포넌트 | **shadcn/ui** | 복사·붙여넣기 가능한 컴포넌트 |
| 상태 | **@tanstack/react-query** + **zustand** | 서버/클라이언트 상태 분리 |
| 파일 업로드 | **Next.js 내장 `formData()` + `fs/promises`** | 외부 스토리지 의존성 제거 |
| 해시 | **bcryptjs** | Node·Edge 호환 |
| 토스트 | **sonner** | 가볍고 모던 |
| 아이콘 | **lucide-react** | 트리쉐이킹 친화 |

---

## 2. 폴더 구조 (Single Repo, Minimal)

```
PocVault/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ public/
│  └─ uploads/                    # 업로드 파일 (gitignore, 런타임 생성)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx               # 루트 레이아웃 (title: PocVault)
│  │  ├─ page.tsx                 # 랜딩 (h1: PocVault)
│  │  ├─ login/
│  │  │  └─ page.tsx              # Google + ID/PW 로그인 폼
│  │  ├─ (dashboard)/
│  │  │  ├─ layout.tsx            # 인증 가드 + 사이드바 (로고: PocVault)
│  │  │  ├─ dashboard/
│  │  │  │  └─ page.tsx           # 홈 (통계 + 최근 항목)
│  │  │  ├─ files/
│  │  │  │  └─ page.tsx           # 파일 그리드 + 업로드존
│  │  │  ├─ texts/
│  │  │  │  └─ page.tsx           # 텍스트 리스트 + 추가 모달
│  │  │  └─ settings/
│  │  │     └─ page.tsx           # 프로필 + 비밀번호 설정
│  │  └─ api/
│  │     ├─ auth/
│  │     │  └─ [...nextauth]/
│  │     │     └─ route.ts        # NextAuth 핸들러
│  │     ├─ auth/
│  │     │  ├─ signup-callback/
│  │     │  │  └─ route.ts        # Google 가입 후 ID/PW 설정
│  │     │  └─ credentials/
│  │     │     └─ route.ts        # 비밀번호 설정/변경
│  │     ├─ files/
│  │     │  ├─ route.ts           # GET(목록), POST(업로드)
│  │     │  └─ [id]/
│  │     │     ├─ route.ts        # GET(메타), PATCH, DELETE
│  │     │     └─ download/
│  │     │        └─ route.ts     # GET (스트림 다운로드)
│  │     └─ texts/
│  │        ├─ route.ts           # GET(목록/검색), POST
│  │        └─ [id]/
│  │           └─ route.ts        # GET, PATCH, DELETE
│  ├─ components/
│  │  ├─ ui/                      # shadcn 컴포넌트
│  │  ├─ CopyButton.tsx
│  │  ├─ FileCard.tsx
│  │  ├─ TextCard.tsx
│  │  ├─ UploadDropzone.tsx
│  │  └─ Sidebar.tsx
│  ├─ lib/
│  │  ├─ prisma.ts                # PrismaClient 싱글톤
│  │  ├─ auth.ts                  # NextAuth 옵션/헬퍼
│  │  ├─ api.ts                   # fetch 래퍼 (에러 처리)
│  │  ├─ quota.ts                 # 용량 체크/포맷 유틸
│  │  └─ utils.ts
│  ├─ hooks/
│  │  ├─ useFiles.ts
│  │  └─ useTexts.ts
│  ├─ stores/
│  │  └─ useUiStore.ts
│  └─ types/
│     └─ index.ts
├─ .env.example
├─ .gitignore
├─ middleware.ts                  # 보호 라우트 가드
├─ next.config.mjs
├─ tailwind.config.ts
├─ postcss.config.mjs
├─ tsconfig.json
├─ package.json                   # name: "pocvault"
└─ README.md                      # PocVault
```

---

## 3. DB 스키마 (Prisma · SQLite)

> `User` 중심의 단순한 1:N 관계. Account 테이블 제거.

### 3.1 ERD
```
User (1) ──< (N) File
User (1) ──< (N) Text
```

### 3.2 `prisma/schema.prisma` (전체)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

/// 한 명의 사용자 = 한 개의 독립된 스토리지
model User {
  id            String   @id @default(cuid())
  email         String   @unique               // 로컬 로그인 ID (이메일)
  name          String?
  image         String?

  // 인증 (Strict 1:1)
  googleId      String?  @unique              // Google sub (1계정 1매핑)
  passwordHash  String?                       // 미설정 시 Google 전용 계정

  // 스토리지
  storageQuota  Int      @default(1073741824) // 1GB
  usedStorage   Int      @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  files         File[]
  texts         Text[]

  @@index([email])
  @@index([googleId])
}

model File {
  id          String   @id @default(cuid())
  userId      String
  filename    String                          // 원본 파일명
  storedName  String                          // 디스크 uuid
  mimeType    String
  size        Int
  storagePath String                          // public/uploads/<userId>/<storedName>
  description String?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

model Text {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String
  tags      String?  // CSV: "work,email,signature"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, updatedAt])
}
```

### 3.3 인덱스/제약 요약
- `User.email` UNIQUE, `User.googleId` UNIQUE → **Strict 1:1** 보장
- `File(userId, createdAt)`, `Text(userId, updatedAt)` → 대시보드 최신순 페이지네이션

### 3.4 용량 관리 규칙
- 업로드 시: `usedStorage + file.size ≤ storageQuota` 검증
- 삭제 시: 디스크 파일 제거 + `usedStorage -= file.size` (트랜잭션)
- 설정 화면에서 `usedStorage / storageQuota` 진행바로 시각화

---

## 4. 인증/인가 흐름 (Strict 1:1)

### 4.1 핵심 규칙
1. **최초 가입 = Google OAuth만 허용**
2. **가입 완료 직후** → 이메일(Google과 동일) + 비밀번호 설정 단계로 자동 이동
3. **이후 로그인**: Google 또는 ID/PW 두 가지 모두 가능
4. **Google 계정 1개 → User 1개** (`googleId` UNIQUE) 강제
5. **ID/PW 로그인 시도 시** `passwordHash != null` 이어야만 인증 허용

### 4.2 흐름 다이어그램

```
[최초 방문]
랜딩(/) → [Google로 시작하기]
        → Google OAuth 동의
        → NextAuth signIn 콜백
            ├─ googleId 존재? → 기존 User 로그인
            └─ 없음? → User 신규 생성 (googleId, email, image 저장, passwordHash=null)
        → 세션 생성 + (dashboard)/onboarding으로 리다이렉트
        → 비밀번호 설정 폼 → POST /api/auth/credentials
        → (dashboard)/dashboard 진입

[재방문]
/login → [Google 로그인] 또는 [이메일+비밀번호]
      → NextAuth Credentials/Google Provider
      → 세션 발급 → 대시보드
```

### 4.3 NextAuth 핵심 설정 (`src/lib/auth.ts`)
- **Providers**: `Google`, `Credentials`
- **Session 전략**: JWT
- **Callbacks**:
  - `signIn`: `googleId` UNIQUE 검증·생성 (1:1 강제)
  - `jwt`: `userId`, `hasPassword` 주입
  - `session`: 클라이언트에서 `hasPassword` 확인 → 비밀번호 설정 안내

### 4.4 보안 체크리스트
- [ ] bcrypt rounds ≥ 10 (Edge 호환: `bcryptjs`)
- [ ] NEXTAUTH_SECRET ≥ 32바이트
- [ ] `middleware.ts`로 `(dashboard)/*` 보호
- [ ] 모든 API는 `getServerSession()`로 사용자 확인 → 누락 시 401
- [ ] `userId` 필터를 모든 쿼리에 강제 (Service 함수 인자화)
- [ ] CORS/CSRF: SameSite=Lax 쿠키 + NextAuth 기본 처리

---

## 5. API 명세 (Next.js Route Handlers)

> Base: `/api`  
> 인증: `getServerSession()` → `userId` 추출  
> 응답: `{ success, data, error }` 통합 포맷

### 5.1 Auth

| Method | Path | 목적 | 인증 |
|--------|------|------|------|
| GET | `/api/auth/[...nextauth]` | NextAuth 핸들러 (Google/Credentials) | - |
| POST | `/api/auth/signup-callback` | Google 신규 가입 후 온보딩용 ID/PW 설정 (선택) | O |
| POST | `/api/auth/credentials` | 비밀번호 **설정/변경** (기존 Google 계정에 PW 부여) | O |
| POST | `/api/auth/login` | 명시적 ID/PW 로그인 (선택, Credentials Provider로 충분하면 생략 가능) | - |

#### `POST /api/auth/credentials` 요청/응답
```json
// Request
{ "password": "newPassword123!" }

// Response 200
{ "success": true, "data": { "hasPassword": true } }
```
- 검증: `password` 8자+, 영문+숫자+특수문자 1개 이상
- 처리: `bcrypt.hash` → `User.passwordHash` 업데이트

### 5.2 Files

| Method | Path | 목적 | 인증 |
|--------|------|------|------|
| GET | `/api/files` | 내 파일 목록 (`?page=1&limit=20&q=`) | O |
| POST | `/api/files` | 업로드 (multipart `formData()` + quota 검증) | O |
| GET | `/api/files/[id]` | 메타데이터 | O |
| GET | `/api/files/[id]/download` | 파일 스트림 | O |
| PATCH | `/api/files/[id]` | `description` 수정 | O |
| DELETE | `/api/files/[id]` | 삭제 (디스크+DB) | O |

#### `POST /api/files` 동작
1. `formData.get('file')` → `File | null`
2. `getServerSession()` → `userId`
3. `prisma.$transaction`:
   - 사용자 `usedStorage + size <= storageQuota` 검증
   - 초과 시 413 `QUOTA_EXCEEDED` + 디스크에 저장하지 않음
4. 파일을 `public/uploads/<userId>/<uuid>.<ext>`로 저장
5. `File` row 생성 + `User.usedStorage += size`

### 5.3 Texts

| Method | Path | 목적 | 인증 |
|--------|------|------|------|
| GET | `/api/texts` | 내 텍스트 목록 (`?q=`) | O |
| POST | `/api/texts` | 생성 `{ title, content, tags? }` | O |
| GET | `/api/texts/[id]` | 단건 | O |
| PATCH | `/api/texts/[id]` | 수정 | O |
| DELETE | `/api/texts/[id]` | 삭제 | O |

> **클립보드 복사 최적화**: GET 목록에서 `content` 전체를 그대로 반환(별도 호출 X) → 클라이언트에서 즉시 `CopyButton` 호출.

### 5.4 에러 코드
| code | HTTP | 의미 |
|------|------|------|
| `AUTH_REQUIRED` | 401 | 미로그인 |
| `FORBIDDEN` | 403 | 타인 리소스 접근 |
| `NOT_FOUND` | 404 | 없음 |
| `QUOTA_EXCEEDED` | 413 | 용량 초과 |
| `VALIDATION_FAILED` | 422 | 입력 검증 실패 |
| `INTERNAL` | 500 | 서버 오류 |

---

## 6. 핵심 코드 스케치

### 6.1 `prisma/schema.prisma`
> §3.2 참고 (위 전체 코드)

### 6.2 `src/app/api/files/route.ts` — 업로드 + Quota 검증

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';              // Edge ❌ (fs 사용)
export const maxDuration = 60;

const UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 100 * 1024 * 1024;     // 100MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const userId = session.user.id as string;

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_FAILED', message: 'file 누락' } }, { status: 422 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_FAILED', message: '파일 크기 초과' } }, { status: 413 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.usedStorage + file.size > user.storageQuota) {
    return NextResponse.json({ success: false, error: { code: 'QUOTA_EXCEEDED' } }, { status: 413 });
  }

  const ext = extname(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const userDir = join(UPLOAD_ROOT, userId);
  await mkdir(userDir, { recursive: true });
  const fullPath = join(userDir, storedName);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buf);

  const description = (form.get('description') as string | null) ?? null;

  const created = await prisma.$transaction(async (tx) => {
    const f = await tx.file.create({
      data: {
        userId,
        filename: file.name,
        storedName,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        storagePath: `/uploads/${userId}/${storedName}`,
        description,
      },
    });
    await tx.user.update({ where: { id: userId }, data: { usedStorage: { increment: file.size } } });
    return f;
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const files = await prisma.file.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ success: true, data: files });
}
```

### 6.3 `src/app/api/auth/credentials/route.ts` — 비밀번호 설정/변경

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const PWD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !PWD_RE.test(password)) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_FAILED', message: '비밀번호는 8자+, 영문/숫자/특수문자 포함' } },
      { status: 422 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, email: session.user.email ?? undefined }, // 이메일은 Google = 로그인 ID
  });

  return NextResponse.json({ success: true, data: { hasPassword: true } });
}
```

### 6.4 NextAuth 핵심 (`src/lib/auth.ts` — 발췌)

```ts
import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Email & Password',
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user?.passwordHash) return null;       // 비밀번호 미설정 계정 차단
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Strict 1:1: googleId UNIQUE + 신규 시 passwordHash=null
        const exists = await prisma.user.findUnique({ where: { googleId: account.providerAccountId } });
        if (!exists) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name ?? null,
              image: user.image ?? null,
              googleId: account.providerAccountId,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.uid = (user as any).id;
      if (token.uid) {
        const u = await prisma.user.findUnique({ where: { id: token.uid as string } });
        if (u) token.hasPassword = !!u.passwordHash;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).hasPassword = !!token.hasPassword;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};
```

### 6.5 `src/components/CopyButton.tsx`

```tsx
'use client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function CopyButton({ value, label = '복사' }: { value: string; label?: string }) {
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('복사됐어요 ✓');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
      toast.success('복사됐어요 ✓');
    }
  };
  return <Button onClick={onCopy} size="sm" variant="outline">{label}</Button>;
}
```

---

## 7. 환경 변수 (`.env.example`)

```env
# DB
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET=change-me-32bytes-minimum
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# App
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE_MB=100
DEFAULT_QUOTA_MB=1024
```

---

## 8. 구현 로드맵 (단순 순서)

1. **부트스트랩** — `create-next-app` (TS, App Router, Tailwind), Prisma 설치, shadcn 초기화
2. **DB/스키마** — §3.2 `schema.prisma` 적용 → `prisma migrate dev`
3. **인증** — NextAuth(Google + Credentials) + `middleware.ts` 가드
4. **비밀번호 설정** — `POST /api/auth/credentials` (온보딩/설정 화면)
5. **텍스트 CRUD** — `/api/texts` + `TextCard` + `CopyButton`
6. **파일 업로드** — `POST /api/files` (quota 검증 포함) + `UploadDropzone` + 다운로드
7. **UX 다듬기** — 다크모드, 토스트, 빈/로딩/에러 상태
8. **보안/배포 (선택)** — Rate limit, 로깅, Vercel 배포

---

## 9. 향후 확장 (v2+)

- 폴더/태그 정리, 공유 링크, 이미지 썸네일, TOTP 2FA, 다국어, PWA
