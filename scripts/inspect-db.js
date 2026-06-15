const { spawnSync } = require('child_process');
const DB = 'prisma/dev.db';
function runSql(sql) {
  const r = spawnSync('sqlite3', [DB, sql], { encoding: 'utf8' });
  console.log('SQL:', sql);
  console.log('  out:', r.stdout.trim());
  console.log('  err:', r.stderr.trim());
  return r;
}
console.log('=== .tables ===');
runSql('.tables');
console.log('=== User rows ===');
runSql('SELECT id, email, loginId, googleId, length(passwordHash) AS pw_len, createdAt FROM User;');
console.log('=== row counts ===');
runSql('SELECT (SELECT COUNT(*) FROM User) AS users, (SELECT COUNT(*) FROM File) AS files, (SELECT COUNT(*) FROM Text) AS texts;');
