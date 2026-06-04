const assert = require('assert');

const { buildCurrentUser } = require('./utils/sessionUser');
const permissionModel = require('./models/permission');

async function run() {
  const originalGetByRoleId = permissionModel.getByRoleId;
  permissionModel.getByRoleId = async (roleId) => {
    assert.strictEqual(roleId, 'role-admin');
    return [
      { code: 'permission:manage' },
      { code: 'developer:view' },
      { code: 'developer:view' },
      { code: 'permission:manage' }
    ];
  };

  try {
    const sessionUser = await buildCurrentUser({
      id: 'u-1',
      username: 'admin',
      name: '管理员',
      email: 'admin@example.com',
      role: 'admin'
    });

    assert.deepStrictEqual(sessionUser, {
      id: 'u-1',
      username: 'admin',
      name: '管理员',
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['permission:manage', 'developer:view']
    });
  } finally {
    permissionModel.getByRoleId = originalGetByRoleId;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
