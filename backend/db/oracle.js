const config = require('../config');

const isDm = config.dbType === 'dm';
const driver = isDm ? require('dmdb') : require('oracledb');

if (driver.OUT_FORMAT_OBJECT && !driver.OBJECT) {
  driver.OBJECT = driver.OUT_FORMAT_OBJECT;
}

const dbConfig = isDm
  ? {
      user: config.dm.user,
      password: config.dm.password,
      connectString: `${config.dm.host}:${config.dm.port}`,
      schema: config.dm.schema,
      autoCommit: false,
      compatibleMode: 'oracle',
      columnNameCase: 'upper'
    }
  : {
      user: config.oracle.user,
      password: config.oracle.password,
      connectString: `${config.oracle.host}:${config.oracle.port}/${config.oracle.serviceName}`
    };

let pool = null;
let useDirectConnection = false;

async function initialize() {
  if (pool) return;
  
  try {
    const poolOptions = isDm
      ? {
          connectString: `dm://${encodeURIComponent(config.dm.user)}:${encodeURIComponent(config.dm.password)}@${config.dm.host}:${config.dm.port}?schema=${encodeURIComponent(config.dm.schema)}&compatibleMode=oracle&columnNameCase=upper&autoCommit=false`,
          poolMin: config.dm.poolMin,
          poolMax: config.dm.poolMax,
          poolIncrement: config.dm.poolIncrement
        }
      : {
          user: dbConfig.user,
          password: dbConfig.password,
          connectString: dbConfig.connectString,
          poolMin: config.oracle.poolMin,
          poolMax: config.oracle.poolMax,
          poolIncrement: config.oracle.poolIncrement
        };

    pool = await driver.createPool(poolOptions);
    console.log(`${isDm ? '达梦' : 'Oracle'} 数据库连接池初始化成功`);
  } catch (error) {
    console.error(`${isDm ? '达梦' : 'Oracle'} 数据库连接池初始化失败:`, error.message);
    console.log('尝试使用直接连接方式...');
    useDirectConnection = true;
  }
}

async function getConnection() {
  if (!pool) {
    await initialize();
  }
  
  if (useDirectConnection) {
    return await driver.getConnection(dbConfig);
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
  driver,
  isDm,
  
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
