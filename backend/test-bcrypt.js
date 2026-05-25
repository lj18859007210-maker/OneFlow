const bcrypt = require('bcryptjs');

const password = 'admin';
const hash = bcrypt.hashSync(password, 10);

console.log('=== bcrypt 测试 ===');
console.log('密码:', password);
console.log('Hash:', hash);
console.log('Hash 长度:', hash.length);

const result = bcrypt.compareSync(password, hash);
console.log('compareSync 结果:', result);

if (!result) {
  console.error('ERROR: bcrypt 验证失败！');
  process.exit(1);
}

console.log('\n=== 模拟 Oracle 存储测试 ===');
// 模拟 Oracle VARCHAR2(100) 存储
const stored = hash.substring(0, 100);
console.log('存储后:', stored);
console.log('存储长度:', stored.length);

const verifyResult = bcrypt.compareSync(password, stored);
console.log('验证结果:', verifyResult);

if (!verifyResult) {
  console.error('ERROR: 存储后验证失败！');
  process.exit(1);
}

console.log('\n✅ 全部测试通过！');
console.log('\n执行以下 SQL:');
console.log(`UPDATE users SET password = '${hash}' WHERE username = 'admin';`);
