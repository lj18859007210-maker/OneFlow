export function hasPermission(user, permissionCode) {
  if (!user || !permissionCode) {
    return false;
  }

  if (user.role === 'admin' || user.role === 'role-admin') {
    return true;
  }

  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return permissions.includes(permissionCode);
}

export function getUserPermissions(user) {
  return Array.isArray(user?.permissions) ? user.permissions : [];
}
