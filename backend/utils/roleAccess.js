const ROLE_ID_MAP = {
  admin: 'role-admin',
  user: 'role-user',
  developer: 'role-developer'
};

const ROLE_NAME_MAP = Object.fromEntries(
  Object.entries(ROLE_ID_MAP).map(([roleName, roleId]) => [roleId, roleName])
);

function normalizeRoleId(role) {
  if (typeof role !== 'string') {
    return null;
  }

  const trimmed = role.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('role-')) {
    return ROLE_NAME_MAP[trimmed] ? trimmed : null;
  }

  return ROLE_ID_MAP[trimmed] || null;
}

function normalizeRoleName(role) {
  if (typeof role !== 'string') {
    return null;
  }

  const trimmed = role.trim();
  if (!trimmed) {
    return null;
  }

  if (ROLE_ID_MAP[trimmed]) {
    return trimmed;
  }

  return ROLE_NAME_MAP[trimmed] || null;
}

module.exports = {
  ROLE_ID_MAP,
  ROLE_NAME_MAP,
  normalizeRoleId,
  normalizeRoleName
};
