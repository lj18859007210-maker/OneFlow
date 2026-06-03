const assert = require('assert');

const permissionModel = require('./models/permission');
const { requireAnyPermission } = require('./middleware/permission');

async function run() {
  assert.strictEqual(
    typeof requireAnyPermission,
    'function',
    'permission middleware should expose requireAnyPermission'
  );

  const originalCheckPermission = permissionModel.checkPermission;
  const checked = [];

  permissionModel.checkPermission = async (roleId, permissionCode) => {
    checked.push({ roleId, permissionCode });
    return permissionCode === 'requirement:create';
  };

  try {
    const middleware = requireAnyPermission('requirement:create', 'developer:view');
    const req = { user: { role: 'role-user', name: '提交人' } };
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

    assert.strictEqual(nextCalled, true);
    assert.deepStrictEqual(checked, [
      { roleId: 'role-user', permissionCode: 'requirement:create' }
    ]);
  } finally {
    permissionModel.checkPermission = originalCheckPermission;
  }

  console.log('permission any middleware tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
