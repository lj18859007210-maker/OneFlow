const assert = require('assert');

const permissionModel = require('./models/permission');
const { requirePermission } = require('./middleware/permission');

async function run() {
  const originalCheckPermission = permissionModel.checkPermission;

  let receivedRoleId = null;
  permissionModel.checkPermission = async (roleId, permissionCode) => {
    receivedRoleId = roleId;
    return roleId === 'role-developer' && permissionCode === 'permission:manage';
  };

  try {
    const middleware = requirePermission('permission:manage');
    const req = { user: { role: 'role-developer', name: '测试开发者' } };
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

    assert.strictEqual(nextCalled, true, 'role-developer should be accepted by permission middleware');
    assert.strictEqual(receivedRoleId, 'role-developer', 'middleware should pass the canonical roleId through');
  } finally {
    permissionModel.checkPermission = originalCheckPermission;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
