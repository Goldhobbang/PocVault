const fs = require('fs');
const s = fs.readFileSync('prisma/schema.prisma', 'utf8');
console.log('--- schema.prisma ---');
console.log(s);
console.log('--- contains loginId? ---', s.includes('loginId'));
