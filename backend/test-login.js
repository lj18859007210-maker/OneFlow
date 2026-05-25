const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');

const config = {
  user: process.env.ORACLE_USER || 'SYSTEM',
  password: process.env.ORACLE_PASSWORD || '6764979Mm..',
  connectString: process.env.ORACLE_CONNECT_STRING || '217.142.185.239:1521/FREE'
};

async function test() {
  console.log('=== 1. 测试数据库连接 ===');
  let connection;
  try {
    connection = await oracledb.getConnection(config);
    console.log('数据库连接成功');
  } catch (e) {
    console.error('数据库连接失败:', e.message);
    process.exit(1);
  }

  console.log('\n=== 2. 查询 admin 用户 ===');
  try {
    const result = await connection.execute(
      `SELECT id, username, password, name, email, role FROM users WHERE username = :username`,
      { username: 'admin' },
      { outFormat: oracledb.OBJECT }
    );
    const user = result.rows[0];
    if (!user) {
      console.error('未找到 admin 用户');
      await connection.close();
      process.exit(1);
    }
    console.log('用户数据:', JSON.stringify(user, null, 2));
    console.log('password 字段类型:', typeof user.PASSWORD);
    console.log('password 值:', user.PASSWORD);
    console.log('password 长度:', user.PASSWORD ? user.PASSWORD.length : 'null');
  } catch (e) {
    console.error('查询失败:', e.message);
    await connection.close();
    process.exit(1);
  }

  console.log('\n=== 3. 测试 bcrypt 验证 ===');
  try {
    const result = await connection.execute(
      `SELECT password FROM users WHERE username = :username`,
      { username: 'admin' },
      { outFormat: oracledb.OBJECT }
    );
    const storedHash = result.rows[0].PASSWORD;
    
    const testPassword = 'admin';
    const valid = await bcrypt.compare(testPassword, storedHash);
    console.log('输入密码:', testPassword);
    console.log('数据库 hash:', storedHash);
    console.log('验证结果:', valid ? '通过' : '失败');
    
    if (!valid) {
      console.error('\n验证失败！生成新 hash...');
      const newHash = bcrypt.hashSync(testPassword, 10);
      console.log('新 hash:', newHash);
      console.log('执行以下 SQL 更新:');
      console.log(`UPDATE users SET password = '${newHash}' WHERE username = 'admin';`);
    }
  } catch (e) {
    console.error('bcrypt 验证失败:', e.message);
  }

  await connection.close();
  console.log('\n=== 测试完成 ===');
}

test();
