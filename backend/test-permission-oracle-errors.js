const assert = require('assert');
const permissionModel = require('./models/permission');
const { requirePermission } = require('./middleware/permission');

async function run() {
  const originalCheckPermission = permissionModel.checkPermission;

  permissionModel.checkPermission = async () => {
    throw new Error(
      'ORA-00604: Error occurred at recursive SQL level 1. Check subsequent errors.\n' +
      'ORA-04036: PGA memory used by the instance or PDB exceeds PGA_AGGREGATE_LIMIT.'
    );
  };

  try {
    const middleware = requirePermission('user:role:manage');
    const req = { user: { role: 'role-user', name: 'test user' } };
    const res = {
      statusCode: 200,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.payload = body;
        return body;
      }
    };

    let nextCalled = false;
    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.payload.code, 'ORACLE_PGA_LIMIT_EXCEEDED');
    assert.match(res.payload.message, /PGA/);
  } finally {
    permissionModel.checkPermission = originalCheckPermission;
  }

  console.log('permission oracle error tests passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
