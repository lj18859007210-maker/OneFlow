const oracledb = require('oracledb');
const config = require('../config');

const dbConfig = {
  user: config.oracle.user,
  password: config.oracle.password,
  connectString: `${config.oracle.host}:${config.oracle.port}/${config.oracle.serviceName}`
};

let pool = null;
let useDirectConnection = false;

async function initialize() {
  if (pool) return;
  
  try {
    pool = await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      poolMin: config.oracle.poolMin,
      poolMax: config.oracle.poolMax,
      poolIncrement: config.oracle.poolIncrement
    });
    console.log('Oracle 数据库连接池初始化成功');
  } catch (error) {
    console.error('Oracle 数据库连接池初始化失败:', error.message);
    console.log('尝试使用直接连接方式...');
    useDirectConnection = true;
  }
}

async function getConnection() {
  if (!pool) {
    await initialize();
  }
  
  if (useDirectConnection) {
    return await oracledb.getConnection(config);
  }
  
  return await pool.getConnection();
}

async function close() {
  if (pool) {
    await pool.close();
    pool = null;
  }
  useDirectConnection = false;
}

module.exports = {
  getConnection,
  close,
  initialize,
  config,
  
  // Helper: read LOB content as string
  async readLob(lob) {
    if (!lob) return null;
    if (typeof lob === 'string') return lob;
    return new Promise((resolve, reject) => {
      let data = '';
      lob.setEncoding('utf8');
      lob.on('data', chunk => { data += chunk; });
      lob.on('end', () => resolve(data));
      lob.on('error', reject);
    });
  }
};
