const fs = require('fs');
const p = 'prisma/schema.prisma';
let s = fs.readFileSync(p, 'utf8');

// 1) email 주석 변경 + loginId 컬럼 삽입
const fromEmail = 'email        String   @unique // 로컬 로그인 ID (이메일)';
const toEmail = [
  'email        String   @unique // Google 식별자 (OAuth sub 가 없는 경우 fallback)',
  '  loginId      String?  @unique // 로컬 로그인 ID (사용자 정의, email 아님)',
].join('\n');

if (s.includes(fromEmail) && !s.includes('loginId')) {
  s = s.replace(fromEmail, toEmail);
  console.log('A) email/loginId OK');
} else if (s.includes('loginId')) {
  console.log('A) loginId already present');
} else {
  console.log('A) email line not found');
}

// 2) 인덱스 추가
if (!s.includes('@@index([loginId])')) {
  s = s.replace('@@index([googleId])\n}', '@@index([googleId])\n  @@index([loginId])\n}');
  console.log('B) index OK');
} else {
  console.log('B) index already present');
}

fs.writeFileSync(p, s, 'utf8');
console.log('written');
