const assert = require('assert');

process.env.DB_TYPE = 'dm';
process.env.DM_HOST = '10.44.131.243';
process.env.DM_PORT = '5236';
process.env.DM_USER = 'ONEFLOW';
process.env.DM_PASSWORD = 'secret';
process.env.DM_SCHEMA = 'ONEFLOW';
process.env.DM_POOL_MIN = '0';
process.env.JWT_SECRET = 'test-secret';

const db = require('./db/oracle');

assert.strictEqual(db.isDm, true);
assert.strictEqual(db.config.dbType, 'dm');
assert.strictEqual(db.config.dm.host, '10.44.131.243');
assert.strictEqual(db.config.dm.port, 5236);
assert.strictEqual(db.config.dm.poolMin, 0);
assert.ok(db.driver.OUT_FORMAT_OBJECT);
assert.strictEqual(db.driver.OBJECT, db.driver.OUT_FORMAT_OBJECT);

console.log('test-db-driver-selection passed');
