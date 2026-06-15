# Implementation Plan

## [Overview]
PocVault의 인증/계정 시스템을 'Google 신원 1개 = PocVault Identity 1행, 그 아래 id/pw 별명(CredentialAccount) 최대 5개' 구조로 재설계하여, 등록 후 자동으로 /setup-password가 아닌 /login으로 안내하고, 1인의 남용(id/pw 5개 초과)을 DB/UI/서버 3중으로 제재하며, 최종 로그인은 항상 id/pw로만 허용한다.

현재 시스템은 'Google OAuth → /setup-password → /main' 단일-페르소나 흐름인데, 이를 'Google OAuth → /login(또는 자동 id/pw 로그인) → /main'로 바꾸고, 동시에 1 Google 신원 아래 N개의 id/pw 페르소나(최대 5)를 운용하는 모델로 전환한다. Files/Texts는 CredentialAccount 단위로 격리된 1GB 스토리지를 가지며, 6번째 CredentialAccount 생성 시도는 서버/DB/UI 모두에서 차단한다.

핵심 결정:
- **1인 기준 = Google 계정 1개** (Google sub `googleId` UNIQUE)
- **1 Google 신원당 CredentialAccount(loginId) 최대 5개** (DB CHECK 제약 + 서버 검증 + UI 카운터)
- **최종 로그인 = 항상 id/pw** (Google로 들어와도 세션이 만들어지면 즉시 그 신원에 속한 첫 번째 CredentialAccount로 자동 로그인시키거나, 사용자에게 id/pw 입력을 요구)
- **Files/Texts는 CredentialAccount 소유**로 변경 → 각 id/pw별 격리된 1GB 스토리지
- **등록/온보딩 분리**: 신규 가입은 Google OAuth로만, 첫 로그인 시 본인이 사용할 id/pw(첫 번째 CredentialAccount) 생성 → 이후 추가 id/pw는 /main/settings에서 생성

---

## [Types]

### Type System Changes (NextAuth Session/JWT)
**파일**: `src/types/index.ts` (전체 재작성)

```ts
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;             // = google 신원 id (기존과 동일하게 User.id 사용)
      email: string;
      name?: string | null;
      image?: string | null;
      // [변경] 이제 session은 "Google 신원" 기준이므로, "현재 활성 CredentialAccount"를 함께 가짐
      activeAccountId: string | null;     // 현재 로그인된 CredentialAccount.id
      activeLoginId: string | null;       // 사용자 노출용
      accountCount: number;                // 이 신원 아래 활성 CredentialAccount 수 (UI 카운터/제재 판단용)
      maxAccounts: number;                 // 상수 5
      hasPassword: boolean;                // activeAccount 기준
      storageQuota: number;                // activeAccount 기준
      usedStorage: number;                 // activeAccount 기준
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;                          // Google 신원 id
    activeAccountId?: string | null;
    activeLoginId?: string | null;
    accountCount?: number;
    maxAccounts?: number;
    hasPassword?: boolean;
    storageQuota?: number;
    usedStorage?: number;
  }
}
```

### Prisma Schema Changes
**파일**: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

/// Google 신원 (1인 = User 1행, googleId UNIQUE)
model User {
  id            String   @id @default(cuid())
  email         String   @unique               // Google 이메일 (식별자)
  name          String?
  image         String?
  googleId      String   @unique               // Google sub (Strict 1:1)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  accounts      CredentialAccount[]
  oauthAccounts OAuthAccount[]   // @auth/prisma-adapter 호환용

  @@index([email])
  @@index([googleId])
}

/// NextAuth PrismaAdapter가 요구하는 Account 테이블 (구글 OAuth 연결)
/// (이 모델은 v4 어댑터 호환용 — 실제 인증은 우리가 User/CredentialAccount로 직접 다룸)
model OAuthAccount {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

/// [신규] id/pw 별명 (1 User에 N개, 최대 5개 — DB CHECK 제약)
/// 1 CredentialAccount = 1개의 격리된 1GB 스토리지
model CredentialAccount {
  id            String   @id @default(cuid())
  userId        String                              // FK → User.id (Google 신원)
  loginId       String   @unique                   // 사용자 정의 ID (이메일 아님)
  passwordHash  String
  storageQuota  Int      @default(1073741824)      // 1GB
  usedStorage   Int      @default(0)
  isActive      Boolean  @default(true)             // false면 soft-delete (제재 후 폐기)
  isPrimary     Boolean  @default(false)            // true면 첫 로그인 시 자동 진입 대상
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastLoginAt   DateTime?

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  files   File[]
  texts   Text[]

  @@index([userId])
  @@index([userId, isActive])
}

/// [변경] File: 소유자가 User → CredentialAccount 로 변경
model File {
  id          String   @id @default(cuid())
  accountId   String                              // FK → CredentialAccount.id
  filename    String
  storedName  String
  mimeType    String
  size        Int
  storagePath String                              // public/uploads/<accountId>/<storedName>
  description String?
  createdAt   DateTime @default(now())

  account CredentialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([accountId, createdAt])
}

/// [변경] Text: 소유자가 User → CredentialAccount 로 변경
model Text {
  id        String   @id @default(cuid())
  accountId String
  title     String
  content   String
  tags      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  account CredentialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([accountId, updatedAt])
}
```

**SQLite 제약 (마이그레이션에 추가)**:
- `accountCount` 제약을 트리거로 강제:
  ```sql
  CREATE TRIGGER enforce_max_5_credential_accounts
  BEFORE INSERT ON CredentialAccount
  FOR EACH ROW
  WHEN (SELECT COUNT(*) FROM CredentialAccount WHERE userId = NEW.userId AND isActive = 1) >= 5
  BEGIN
    SELECT RAISE(ABORT, 'MAX_ACCOUNTS_REACHED: 1 Google 계정당 id/pw는 최대 5개까지 생성 가능합니다.');
  END;
  ```
- 기존 컬럼 이전용:
  - `User.passwordHash` 컬럼 제거(또는 유지 후 unused 표시) — 비밀번호는 이제 CredentialAccount에 저장
  - `User.loginId` 컬럼 제거 — loginId는 이제 CredentialAccount에 저장
  - `User.usedStorage` / `User.storageQuota` 제거
  - `File.userId` → `File.accountId` 로 rename + 데이터 마이그레이션
  - `Text.userId` → `Text.accountId` 로 rename + 데이터 마이그레이션

---

## [Files]

### New Files
- **`prisma/migrations/20260607100000_identity_credential_split/migration.sql`**
  - 새 테이블 `CredentialAccount`, `OAuthAccount` 생성
  - `User`에서 `passwordHash`, `loginId`, `usedStorage`, `storageQuota` 컬럼 제거
  - `File.userId` → `File.accountId`, `Text.userId` → `Text.accountId` (데이터 마이그레이션 포함)
  - 5개 제한 트리거 추가
  - 기존 `User.loginId` / `User.passwordHash`가 있는 경우, 그 값을 새 `CredentialAccount` 행으로 옮긴 뒤 컬럼 드롭

- **`src/lib/identity.ts`** (신규 헬퍼)
  - `getActiveAccount(session)` : session.token → 활성 CredentialAccount 조회
  - `countActiveAccounts(userId)` : userId 기준 isActive=1 카운트
  - `enforceAccountLimit(userId)` : 5 초과 시 throw
  - `MAX_ACCOUNTS_PER_IDENTITY = 5` 상수 export

- **`src/app/api/auth/identity/route.ts`** (신규)
  - `GET` : 현재 세션이 가리키는 Google 신원의 CredentialAccount 목록 반환
  - `POST` : Google 신원 아래 새 CredentialAccount(loginId/pw) 생성 → 5개 초과 시 403 `MAX_ACCOUNTS_REACHED`

- **`src/app/api/auth/switch-account/route.ts`** (신규)
  - `POST { accountId }` : 같은 User(Google 신원) 안에서 활성 CredentialAccount 전환
  - 세션 토큰의 `activeAccountId` 갱신

- **`src/components/CreateLoginIdForm.tsx`** (신규)
  - /main/settings 내부에서 "추가 id/pw 만들기" 폼 (기존 `SetupPasswordForm`과 거의 동일, server endpoint만 다름)
  - 5개 도달 시 비활성화 + 안내 메시지

- **`src/components/AccountSwitcher.tsx`** (신규)
  - 헤더에서 현재 활성 id/pw와 다른 id/pw로 전환 드롭다운 (≤5개)

- **`src/app/api/auth/identity/select/route.ts`** (신규)
  - `POST { accountId }` : Google 로그인 직후 (Credentials 로그인 안 한 상태) 사용자에게 "이 신원에 속한 어떤 id/pw로 들어갈지" 선택시키는 페이지에서 호출
  - 1개면 자동 선택, 2~5개면 선택 UI

- **`src/app/(auth)/select-account/page.tsx`** (신규)
  - Google OAuth 직후 진입점. session.user.id(Google 신원)는 있는데 session.activeAccountId가 없으면 여기로 라우팅
  - "이 Google 계정으로 N개의 PocVault id/pw가 있습니다. 어떤 id/pw로 들어가시겠어요?" UI

### Modified Files
- **`prisma/schema.prisma`** — 전면 재작성 (위 [Types] 참고)
- **`src/lib/auth.ts`** — 아래 [Functions] 참고
- **`src/types/index.ts`** — 위 [Types] 참고
- **`src/app/page.tsx`**
  - `redirect('/main')` 조건을 'session.user.id && session.user.activeAccountId' 둘 다 있는 경우로 강화
  - "Google로 시작하기" 버튼 라벨 유지 (신규 가입의 유일한 경로)
  - 기존 "기존 계정으로 로그인 (이메일+비밀번호)" 버튼 → 그대로 /login으로 (변경 없음)
- **`src/app/(auth)/login/page.tsx`**
  - 입력 필드는 이미 `loginId` (3~20 영소문자/숫자/_). 변경 없음. 단 `redirect` 후 동작은 server-side에서 처리
- **`src/app/(auth)/login/page.tsx` (SignIn 호출 부분)**
  - signIn 성공 시 서버에서 session token의 `activeAccountId`가 비어있으면 `/select-account`로, 채워졌으면 `/main`으로 보내도록 변경 (현재는 `router.push(res.url || callbackUrl)` → 이걸 server endpoint가 `?redirect=` 형태로 응답하도록)
- **`src/app/(auth)/setup-password/page.tsx`**
  - **삭제하지 않고, 내부 동작 변경**:
    - 더 이상 Google OAuth 직후 자동 진입점이 아님
    - 오직 '추가 id/pw 만들기' 전용 화면. 진입 조건 = `session.user.id` 가 있고, `accountCount < 5` 이어야 함
    - 폼 submit이 `/api/auth/identity` 로 가도록 변경
  - URL은 `/setup-password` 그대로 유지 (UI 텍스트는 "추가 id/pw 만들기")
- **`src/components/SetupPasswordForm.tsx`**
  - 내부 fetch endpoint를 `/api/auth/credentials` → `/api/auth/identity` 로 변경
  - 성공 시 `/main` 으로 push (현재와 동일)
- **`src/app/api/auth/credentials/route.ts`**
  - **의미 변경**: 이제 '특정 CredentialAccount의 비밀번호 변경' 엔드포인트
  - `POST { loginId?, password, currentPassword? }` : 자기 자신의 활성 CredentialAccount 비밀번호 변경
  - 또는 `POST { accountId, newPassword }` (admin/self): 특정 계정의 비밀번호 재설정
  - loginId로 로그인하는 흐름은 NextAuth의 `CredentialsProvider`가 직접 담당 (변경 없음)
- **`src/lib/auth.ts` signIn 콜백**
  - Google 신규: `User` 1행만 생성 (CredentialAccount는 만들지 않음). `passwordHash`/`loginId` 필드는 schema에서 제거됨
  - Google 기존: 그냥 통과
  - 완료 후: `redirect: '/select-account'` (Google 신원은 있으나 activeAccount 선택 안 했을 때) — credentials로 들어왔으면 `/main`
- **`src/lib/auth.ts` jwt/session 콜백**
  - token/세션에 `activeAccountId`, `activeLoginId`, `accountCount`, `maxAccounts`, `hasPassword`, `storageQuota`, `usedStorage` 모두 채움
  - 매 요청마다 `CredentialAccount`를 다시 조회해 최신값 반영
- **`src/lib/auth.ts` CredentialsProvider.authorize**
  - 입력: `loginId` (email 아님), `password`
  - `prisma.credentialAccount.findUnique({ where: { loginId } })` 로 조회
  - `isActive=false` 인 경우 null 반환
  - 비밀번호 검증 후 `lastLoginAt` 업데이트 + `{ id, email: user.email, accountId: account.id, loginId: account.loginId }` 반환
  - 반환 객체에 `accountId`가 있으면 jwt 콜백이 activeAccountId로 사용
- **`src/app/(main)/layout.tsx`**
  - 가드 조건 강화: `session.user.id` + `session.user.activeAccountId` 모두 있어야 통과
  - 둘 중 하나라도 없으면:
    - `activeAccountId`가 없고 `accountCount === 0` 이면 → `/setup-password` (첫 id/pw 만들기)
    - `activeAccountId`가 없고 `accountCount >= 1` 이면 → `/select-account` (이미 만든 id/pw 중 선택)
  - 헤더에 `<AccountSwitcher />` 추가
- **`src/app/(main)/main/page.tsx`**
  - 모든 Prisma 쿼리에서 `where: { userId }` → `where: { accountId: session.user.activeAccountId }` 로 변경
  - `usedStorage`/`storageQuota` 출처를 `User` → `CredentialAccount` 로
- **`src/app/(main)/main/settings/page.tsx`**
  - "계정 추가" 섹션 신설: `<CreateLoginIdForm />` + 현재 `accountCount/5` 카운터 표시
  - "이 Google 신원의 모든 id/pw 목록" 섹션 추가
- **`src/app/api/files/route.ts`** & **`src/app/api/files/[id]/route.ts`**
  - `where: { userId: session.user.id }` → `where: { accountId: session.user.activeAccountId }`
  - `session.user.usedStorage` → `account.usedStorage` (Prisma 다시 조회)
  - 디스크 경로: `public/uploads/<userId>` → `public/uploads/<accountId>` (정리 스크립트 필요)
- **`src/app/api/texts/route.ts`** & **`src/app/api/texts/[id]/route.ts`**
  - 동일하게 `userId` → `accountId`
- **`src/app/api/me/quota/route.ts`**
  - CredentialAccount 기준으로 변경
- **`middleware.ts`**
  - matcher 그대로, pages.signIn 그대로 (`/login`)
  - 별도 변경 없음 (단, `/main/*` 진입 시 layout에서 activeAccountId 검사)

### Files to Delete
- 없음 (기존 setup-password 페이지는 재활용)

### Config Files
- **`package.json`** : 변경 없음
- **`.env`** : 변경 없음 (단, 트리거 작동을 위해 Prisma는 SQLite에 raw SQL 트리거 지원 — 별도 처리 불필요)

---

## [Functions]

### New Functions

| 이름 | 시그니처 | 파일 | 목적 |
|------|----------|------|------|
| `getActiveAccount` | `(userId: string, accountId: string \| null) => Promise<CredentialAccount \| null>` | `src/lib/identity.ts` | 세션의 activeAccountId로 CredentialAccount 조회, 없으면 null |
| `countActiveAccounts` | `(userId: string) => Promise<number>` | `src/lib/identity.ts` | userId 기준 isActive=1 카운트 (UI/제재용) |
| `enforceAccountLimit` | `(userId: string) => Promise<void>` | `src/lib/identity.ts` | 5개 초과면 throw `MAX_ACCOUNTS_REACHED` |
| `assertCanCreateAccount` | `(userId: string) => Promise<{ count: number; max: number }>` | `src/lib/identity.ts` | 클라이언트 UI 사전 확인용 |
| `selectActiveAccount` | `(userId: string, accountId: string) => Promise<CredentialAccount>` | `src/lib/identity.ts` | 본인 신원 안의 활성 계정인지 검증 후 반환 |

### Modified Functions

| 이름 | 현재 파일 | 변경 |
|------|-----------|------|
| `isFullyOnboarded` | `src/lib/auth.ts` | **제거** (이제 '완전 등록'은 `accountCount >= 1 && activeAccountId != null` 로 정의) |
| `signIn` callback | `src/lib/auth.ts` | Google 분기: `User` 1행만 생성/조회 (CredentialAccount 생성 X). `redirect` 반환값을 `/select-account`로 변경. **단, 이미 그 신원에 `activeAccountId`가 결정된 경우(쿠키에 remember)에는 `/main` 직행 가능** |
| `jwt` callback | `src/lib/auth.ts` | `user.accountId` → `token.activeAccountId`, `prisma.user` → `prisma.credentialAccount` 조회로 변경. `accountCount`/`maxAccounts` 추가 |
| `session` callback | `src/lib/auth.ts` | 새 필드 매핑 (activeAccountId, activeLoginId, accountCount, maxAccounts) |
| `authorize` (Credentials) | `src/lib/auth.ts` | `prisma.user.findUnique({where:{email}})` → `prisma.credentialAccount.findUnique({where:{loginId}})` + `include: { user: true }`. `isActive=false` 차단. 반환 객체에 `accountId` 포함. 성공 시 `lastLoginAt` 갱신 |
| `redirect` callback | `src/lib/auth.ts` | `'/select-account'` 도 통과시키도록 추가 |
| `POST` (credentials) | `src/app/api/auth/credentials/route.ts` | 의미 변경: '활성 CredentialAccount의 비밀번호 변경'으로. 현재 비밀번호 검증 + 새 비밀번호로 update |
| `POST` (identity) | `src/app/api/auth/identity/route.ts` (신규) | `enforceAccountLimit` 호출 후 `CredentialAccount` 생성 |
| `POST` (files) | `src/app/api/files/route.ts` | 쿼리 키 `userId` → `accountId`, 디렉터리 경로 동일 변경 |
| `GET/POST` (texts) | `src/app/api/texts/route.ts` | 동일 |
| `SetupPasswordPage` | `src/app/(auth)/setup-password/page.tsx` | 진입 조건: 이미 activeAccountId 있으면 /main 리다이렉트, accountCount<5 아니면 차단 |

### Removed Functions
- 없음 (`isFullyOnboarded`는 제거되지만, 같은 의미는 `(main)/layout.tsx`에서 다른 형태로 표현)

---

## [Classes]

### New Classes
- 없음 (Prisma 모델은 class가 아니라 schema로 표현)

### Modified Classes (Prisma 모델은 schema로 표현 — 위 [Types] 참고)

### Removed
- 없음

---

## [Dependencies]

### New Packages
- 없음 (기존 `bcryptjs`, `next-auth`, `@prisma/client`, `@auth/prisma-adapter` 로 충분)

### Version Changes
- 없음

### Integration Requirements
- **Prisma raw SQL 트리거**: `prisma migrate dev` 가 생성한 마이그레이션에 트리거 SQL을 직접 포함 (SQLite는 Prisma schema의 `@@check` 미지원이므로 trigger 방식)
- **데이터 마이그레이션**: 기존 `User` 의 `loginId`/`passwordHash` 가 있다면 새 `CredentialAccount` 행으로 옮긴 후 User 컬럼 드롭
- **디스크 마이그레이션**: `public/uploads/<userId>/*` → `public/uploads/<accountId>/*` 로 이동하는 스크립트 (`scripts/migrate-storage-by-account.js` 신규)

---

## [Testing]

### Test File Requirements
- **신규**: `tests/auth/account-limit.test.ts` (간이 통합 테스트)
  - 1 User에 CredentialAccount 5개까지 생성 OK
  - 6번째 생성 시 `POST /api/auth/identity` 가 403 + `{ code: 'MAX_ACCOUNTS_REACHED' }` 반환
  - DB 트리거로도 차단되는지 raw SQL로 확인
- **신규**: `tests/auth/google-flow.test.ts`
  - mock Google OAuth → signIn 콜백 → User 1행 생성, CredentialAccount 0개 → `/select-account` redirect
  - select-account에서 계정 1개 선택 → `/main` 접근 가능
- **신규**: `tests/api/storage-isolation.test.ts`
  - 같은 Google 신원의 다른 CredentialAccount 끼리 files/texts 격리 확인
  - accountA의 업로드가 accountB의 GET 목록에 나오지 않음
- **신규**: `tests/api/credentials-login.test.ts`
  - 잘못된 loginId / 잘못된 password → 401
  - isActive=false 계정 → 401
  - 정상 → 200 + 세션에 activeAccountId 세팅

### Existing Test Modifications
- 기존 테스트 없음 (todo.md 기준 모두 완료 항목). 시드(`scripts/reset-google-users.js`)도 그대로 활용 가능

### Validation Strategies
- Prisma 마이그레이션 후 `scripts/inspect-db.js` 로 트리거/제약 확인
- `next dev` 실행 후 `curl` 로 `/api/auth/identity` 5번 호출 → 마지막이 403인지 확인
- 로그: `console.log('[auth] enforceAccountLimit', { count, max })` 추가

---

## [Implementation Order]

1. **스키마 마이그레이션**
   1. `prisma/schema.prisma` 재작성 (User 단순화, CredentialAccount/OAuthAccount 추가, File/Text → accountId)
   2. `prisma migrate dev --name identity_credential_split` 실행 → 생성된 SQL에 `enforce_max_5_credential_accounts` 트리거 추가
   3. `prisma generate`
   4. `scripts/migrate-storage-by-account.js` 작성 및 실행: `public/uploads/<userId>` → `public/uploads/<accountId>` 이동, 기존 User의 loginId/passwordHash를 CredentialAccount로 옮기는 SQL 패치

2. **Identity 헬퍼 + 타입**
   1. `src/types/index.ts` 재작성 (activeAccountId/accountCount 등)
   2. `src/lib/identity.ts` 신규 (getActiveAccount, countActiveAccounts, enforceAccountLimit 등)
   3. `tsc --noEmit` 0 errors 확인

3. **NextAuth 콜백 재작성**
   1. `src/lib/auth.ts` 의 `authorize` 를 CredentialAccount 조회로 변경
   2. `signIn` 콜백이 `/select-account` 로 redirect 하도록 변경
   3. `jwt`/`session` 콜백에서 `activeAccountId`/`accountCount` 채움
   4. `redirect` 콜백에 `/select-account` 허용 추가

4. **API 라우트 신설/수정**
   1. `POST /api/auth/identity` (생성) — 5개 초과 403
   2. `POST /api/auth/switch-account` (전환)
   3. `POST /api/auth/identity/select` (Google 로그인 후 활성 계정 선택)
   4. `POST /api/auth/credentials` (비밀번호 변경으로 의미 변경)
   5. `src/app/api/files/*`, `src/app/api/texts/*` 의 `userId` → `accountId` 일괄 변경
   6. `src/app/api/me/quota/route.ts` 의 출처 변경

5. **페이지/컴포넌트**
   1. `src/app/(auth)/select-account/page.tsx` 신규
   2. `src/app/(auth)/setup-password/page.tsx` 진입 조건 변경 (accountCount<5)
   3. `src/components/SetupPasswordForm.tsx` 의 fetch endpoint를 `/api/auth/identity` 로
   4. `src/components/CreateLoginIdForm.tsx` 신규 (settings 내부)
   5. `src/components/AccountSwitcher.tsx` 신규 (헤더)
   6. `src/app/(main)/layout.tsx` 가드 강화 + AccountSwitcher 삽입
   7. `src/app/(main)/main/settings/page.tsx` 에 "계정 추가" 섹션
   8. `src/app/(main)/main/page.tsx` 의 쿼리를 accountId 기준으로

6. **검증/테스트**
   1. `npx tsc --noEmit` 0 errors
   2. `npm run dev` 후 1 User에 5개 생성 → 6번째 403 확인 (curl)
   3. `scripts/inspect-db.js` 로 트리거 존재 확인
   4. `tests/auth/account-limit.test.ts` 등 신규 테스트 통과
   5. UI에서: /login → id/pw 로그인 → /main, /main/settings → "계정 추가" 클릭 → 5번째까지 OK, 6번째부터 "5개 초과, 제재되었습니다" 메시지

7. **문서 갱신**
   1. `PLANNING.md` 의 §3.1, §3.2, §4.1, §4.2, §4.3 갱신
   2. `README.md` 에 '계정 정책' 섹션 추가
