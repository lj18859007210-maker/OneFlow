const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.log('用法: node hash-password.js <密码>');
  console.log('示例: node hash-password.js admin123');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(`密码: ${password}`);
console.log(`Hash: ${hash}`);
console.log(`\nSQL 插入语句:`);
console.log(`INSERT INTO users (id, username, password, name, email, role, status)`);
console.log(`VALUES (SYS_GUID(), '用户名', '${hash}', '姓名', 'email@example.com', 'user', 1);`);
