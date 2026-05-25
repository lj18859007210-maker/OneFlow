const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'admin';
const hash = bcrypt.hashSync(password, 10);

console.log('密码:', password);
console.log('Hash:', hash);
console.log('验证:', bcrypt.compareSync(password, hash) ? '通过' : '失败');
console.log('');
console.log('执行以下 SQL 更新密码:');
console.log("UPDATE users SET password = '" + hash + "' WHERE username = 'admin';");
