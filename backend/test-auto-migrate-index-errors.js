const assert = require('assert');
const { isIgnorableIndexError, shouldAbortMigration } = require('./db/auto-migrate');

function run() {
  assert.strictEqual(isIgnorableIndexError(new Error('ORA-00955: name is already used by an existing object')), true);
  assert.strictEqual(isIgnorableIndexError(new Error('ORA-00942: table or view does not exist')), true);
  assert.strictEqual(isIgnorableIndexError(new Error('ORA-01408: such column list already indexed')), true);
  assert.strictEqual(isIgnorableIndexError(new Error('ORA-00001: unique constraint violated')), false);
  assert.strictEqual(shouldAbortMigration(new Error('ORA-04036: PGA memory used by the instance or PDB exceeds PGA_AGGREGATE_LIMIT.')), true);
  assert.strictEqual(shouldAbortMigration(new Error('ORA-00604: recursive SQL\nORA-04036: PGA memory used by the instance or PDB exceeds PGA_AGGREGATE_LIMIT.')), true);
  assert.strictEqual(shouldAbortMigration(new Error('ORA-00001: unique constraint violated')), false);

  console.log('auto migrate index error tests passed');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
