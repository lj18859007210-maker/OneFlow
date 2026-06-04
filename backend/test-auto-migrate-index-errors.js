const assert = require('assert');
const { isIgnorableIndexError } = require('./db/auto-migrate');

function run() {
  assert.strictEqual(isIgnorableIndexError(new Error('ORA-00955: name is already used by an existing object')), true);
  assert.strictEqual(isIgnorableIndexError(new Error('ORA-00942: table or view does not exist')), true);
  assert.strictEqual(isIgnorableIndexError(new Error('ORA-01408: such column list already indexed')), true);
  assert.strictEqual(isIgnorableIndexError(new Error('ORA-00001: unique constraint violated')), false);

  console.log('auto migrate index error tests passed');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
