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

export function isAdminUser(user) {
  return user?.role === 'admin' || user?.role === 'role-admin';
}

export function isDeveloperUser(user) {
  return user?.role === 'developer' || user?.role === 'role-developer';
}

export function normalizeIdentityList(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/[,;，；]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function getUserIdentityKeys(user = {}) {
  return [...new Set([user.id, user.userId, user.username, user.name]
    .map(item => String(item || '').trim())
    .filter(Boolean))];
}

export function isRequirementSubmitter(user = {}, requirement = {}) {
  const submitterId = String(requirement.submitterId || '').trim();
  const userKeys = getUserIdentityKeys(user);
  if (submitterId) return userKeys.includes(submitterId);
  const submitter = String(requirement.submitter || '').trim();
  return Boolean(submitter) && userKeys.includes(submitter);
}

export function isRequirementAssignedDeveloper(user = {}, requirement = {}) {
  const userKeys = getUserIdentityKeys(user);
  if (!userKeys.length) return false;
  const assignedKeys = [
    ...normalizeIdentityList(requirement.developerIds),
    ...normalizeIdentityList(requirement.developer)
  ];
  return userKeys.some(key => assignedKeys.includes(key));
}

export function canViewRequirement(user = {}, requirement = {}) {
  if (isAdminUser(user)) return true;
  if (requirement?.isDraft) return isRequirementSubmitter(user, requirement);
  return isRequirementSubmitter(user, requirement) || isRequirementAssignedDeveloper(user, requirement);
}

export function canEditRequirement(user = {}, requirement = {}) {
  return isAdminUser(user) || isRequirementSubmitter(user, requirement);
}

export function canFlowRequirement(user = {}, requirement = {}) {
  return isAdminUser(user) || (isDeveloperUser(user) && isRequirementAssignedDeveloper(user, requirement));
}

export function canDeleteRequirement(user = {}, requirement = {}) {
  if (isAdminUser(user)) return true;
  if (requirement?.isDraft) return isRequirementSubmitter(user, requirement);
  return isDeveloperUser(user) && isRequirementAssignedDeveloper(user, requirement);
}

export function canManageRequirementAttachment(user = {}, requirement = {}) {
  return canFlowRequirement(user, requirement);
}
