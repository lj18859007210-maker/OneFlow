const oracledb = require('oracledb');

async function testWithDifferentPasswords() {
  const passwords = [
    '6764979Mm..',
    'YourStrongPassword123',
    'oracle',
    'admin',
    'manager',
    'system',
    '123456'
  ];
  
  for (const pwd of passwords) {
    let connection;
    try {
      console.log(`尝试密码：${pwd}`);
      connection = await oracledb.getConnection({
        user: 'SYSTEM',
        password: pwd,
        connectString: '217.142.185.239:1521/FREE'
      });
      console.log(`✓ 成功！密码是：${pwd}`);
      await connection.close();
      return pwd;
    } catch (err) {
      console.log(`✗ 失败`);
      if (connection) await connection.close();
    }
  }
  
  console.log('\n所有常用密码都失败');
  return null;
}

testWithDifferentPasswords();
