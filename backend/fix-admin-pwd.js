const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');

const config = { user: 'SYSTEM', password: '6764979Mm..', connectString: '217.142.185.239:1521/FREE' };

async function run() {
  const conn = await oracledb.getConnection(config);
  const hash = bcrypt.hashSync('admin', 10);
  console.log('新 hash:', hash);
  
  await conn.execute(
    "UPDATE users SET password = :hash WHERE username = 'admin'",
    { hash }
  );
  await conn.commit();
  console.log('密码更新成功');
  
  // 验证
  const result = await conn.execute(
    "SELECT password FROM users WHERE username = 'admin'",
    {},
    { outFormat: oracledb.OBJECT }
  );
  const valid = bcrypt.compareSync('admin', result.rows[0].PASSWORD);
  console.log('验证结果:', valid ? '通过' : '失败');
  
  await conn.close();
}

run().catch(e => console.error(e.message));
