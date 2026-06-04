const assert = require('assert');
const {
  isOraclePgaLimitError,
  isOracleResourceExhaustedError,
  toOracleResourceResponse
} = require('./utils/oracleErrors');

function run() {
  const pgaError = new Error('ORA-04036: PGA memory used by the instance or PDB exceeds PGA_AGGREGATE_LIMIT.');
  const recursiveError = new Error(
    'ORA-00604: Error occurred at recursive SQL level 1. Check subsequent errors.\n' +
    'ORA-04036: PGA memory used by the instance or PDB exceeds PGA_AGGREGATE_LIMIT.'
  );

  assert.strictEqual(isOraclePgaLimitError(pgaError), true);
  assert.strictEqual(isOraclePgaLimitError(recursiveError), true);
  assert.strictEqual(isOracleResourceExhaustedError(recursiveError), true);
  assert.strictEqual(isOracleResourceExhaustedError(new Error('ORA-00001: unique constraint violated')), false);

  const response = toOracleResourceResponse(recursiveError);
  assert.strictEqual(response.status, 503);
  assert.strictEqual(response.body.success, false);
  assert.strictEqual(response.body.code, 'ORACLE_PGA_LIMIT_EXCEEDED');
  assert.match(response.body.message, /PGA/);

  console.log('oracle error handling tests passed');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
