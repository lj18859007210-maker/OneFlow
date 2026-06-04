const assert = require('assert');
const userController = require('./controllers/userController');
const userModel = require('./models/userModel');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

async function run() {
  const originalGetAll = userModel.getAll;
  userModel.getAll = async () => {
    throw new Error(
      'ORA-00604: Error occurred at recursive SQL level 1. Check subsequent errors.\n' +
      'ORA-04036: PGA memory used by the instance or PDB exceeds PGA_AGGREGATE_LIMIT.'
    );
  };

  try {
    const req = { query: { page: '1', pageSize: '10', role: '', keyword: '' } };
    const res = createResponse();

    await userController.getAll(req, res);

    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'ORACLE_PGA_LIMIT_EXCEEDED');
    assert.match(res.body.message, /PGA/);
    assert.doesNotMatch(res.body.message, /ORA-00604/);
  } finally {
    userModel.getAll = originalGetAll;
  }

  console.log('user controller oracle error tests passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
