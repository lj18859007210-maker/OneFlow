const permissionModel = require('../models/permission');
const { normalizeRoleId } = require('./roleAccess');

function uniquePermissionCodes(permissions) {
  return [...new Set(
    permissions
      .map(permission => permission.code)
      .filter(Boolean)
  )];
}

async function buildCurrentUser(user) {
  if (!user) {
    return null;
  }

  const roleId = normalizeRoleId(user.role) || user.role;
  const permissions = await permissionModel.getByRoleId(roleId);

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: uniquePermissionCodes(permissions)
  };
}

module.exports = {
  buildCurrentUser,
  uniquePermissionCodes
};
