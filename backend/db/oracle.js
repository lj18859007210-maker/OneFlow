const config = require('../config');

const isDm = config.dbType === 'dm';
const driver = isDm ? require('dmdb') : require('oracledb');

if (driver.OUT_FORMAT_OBJECT && !driver.OBJECT) {
  driver.OBJECT = driver.OUT_FORMAT_OBJECT;
}

function buildDmConnectString() {
  const params = new URLSearchParams({
    schema: config.dm.schema,
    compatibleMode: 'oracle',
    columnNameCase: 'upper',
    autoCommit: 'false',
    connectTimeout: String(config.dm.connectTimeoutMs),
    socketTimeout: String(config.dm.socketTimeoutMs),
    sessionTimeout: String(config.dm.sessionTimeoutSec)
  });

  return `dm://${encodeURIComponent(config.dm.user)}:${encodeURIComponent(config.dm.password)}@${config.dm.host}:${config.dm.port}?${params.toString()}`;
}

const dbConfig = isDm
  ? {
      user: config.dm.user,
      password: config.dm.password,
      connectString: `${config.dm.host}:${config.dm.port}`,
      schema: config.dm.schema,
      autoCommit: false,
      compatibleMode: 'oracle',
      columnNameCase: 'upper',
      connectTimeout: config.dm.connectTimeoutMs,
      socketTimeout: config.dm.socketTimeoutMs,
      sessionTimeout: config.dm.sessionTimeoutSec
    }
  : {
      user: config.oracle.user,
      password: config.oracle.password,
      connectString: `${config.oracle.host}:${config.oracle.port}/${config.oracle.serviceName}`
    };

let pool = null;
let useDirectConnection = false;

async function validateConnection(connection) {
  await connection.execute('SELECT 1 FROM DUAL');
}

async function initialize() {
  if (pool) return;

  try {
    const poolOptions = isDm
      ? {
          connectString: buildDmConnectString(),
          poolMin: config.dm.poolMin,
          poolMax: config.dm.poolMax,
          poolIncrement: config.dm.poolIncrement,
          queueTimeout: config.dm.queueTimeoutMs,
          queueMax: config.dm.queueMax,
          testOnBorrow: true,
          validationQuery: 'SELECT 1 FROM DUAL'
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

    let connection;
    try {
      connection = await pool.getConnection();
      await validateConnection(connection);
    } finally {
      if (connection) await connection.close();
    }

    console.log(`${isDm ? 'DM' : 'Oracle'} database pool initialized and validated`);
  } catch (error) {
    console.error(`${isDm ? 'DM' : 'Oracle'} database pool initialization failed:`, error.message);
    console.log('Falling back to direct database connections...');
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
