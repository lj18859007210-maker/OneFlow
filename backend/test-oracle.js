const oracledb = require('oracledb');

async function testConnection() {
  const configs = [
    {
      user: 'SYSTEM',
      password: 'YourStrongPassword123',
      connectString: '217.142.185.239:1521/FREE'
    },
    {
      user: 'SYSTEM',
      password: 'YourStrongPassword123',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=217.142.185.239)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=FREE)))'
    },
    {
      user: 'SYSTEM',
      password: 'YourStrongPassword123',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=217.142.185.239)(PORT=1521))(CONNECT_DATA=(SID=FREE)))'
    }
  ];
  
  for (let i = 0; i < configs.length; i++) {
    console.log(`\n尝试配置 ${i + 1}: ${configs[i].connectString.substring(0, 50)}...`);
    let connection;
    try {
      connection = await oracledb.getConnection(configs[i]);
      console.log('✓ 连接成功!');
      const result = await connection.execute('SELECT 1 FROM DUAL');
      console.log('  测试查询:', result.rows);
      await connection.close();
      return;
    } catch (err) {
      console.log('✗ 连接失败:', err.message);
      if (connection) await connection.close();
    }
  }
  
  console.log('\n所有配置都连接失败，请检查：');
  console.log('1. 数据库服务器是否运行');
  console.log('2. 用户名密码是否正确');
  console.log('3. 网络是否可达 (telnet 217.142.185.239 1521)');
}

testConnection();
