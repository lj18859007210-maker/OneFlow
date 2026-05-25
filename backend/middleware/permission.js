const permissionModel = require('../models/permission');
const logger = require('../utils/logger');
const { normalizeRoleId, normalizeRoleName } = require('../utils/roleAccess');

function requirePermission(permissionCode) {
  return async (req, res, next) => {
    const userRole = req.user?.role;
    const normalizedRoleId = normalizeRoleId(userRole);

    if (!normalizedRoleId) {
      logger.warn(`权限不足: ${req.user?.name || 'unknown'} (${userRole || 'unknown'}) 尝试访问 ${permissionCode}`);
      return res.status(403).json({
        success: false,
        message: `权限不足：需要 ${permissionCode} 权限`
      });
    }

    // admin 角色拥有全部权限
    if (normalizedRoleId === 'role-admin') {
      return next();
    }

    try {
      const hasPermission = await permissionModel.checkPermission(normalizedRoleId, permissionCode);
      if (!hasPermission) {
        logger.warn(`权限不足: ${req.user?.name || 'unknown'} (${userRole}) 尝试访问 ${permissionCode}`);
        return res.status(403).json({
          success: false,
          message: `权限不足：需要 ${permissionCode} 权限`
        });
      }
      next();
    } catch (error) {
      logger.error(`权限检查失败: ${error.message}`);
      res.status(500).json({ success: false, message: '权限检查失败' });
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const normalizedRoleName = normalizeRoleName(userRole) || userRole;

    if (!roles.includes(normalizedRoleName)) {
      logger.warn(`角色不足: ${req.user?.name || 'unknown'} (${userRole || 'unknown'}) 尝试访问需要 [${roles.join(', ')}] 的资源`);
      return res.status(403).json({
        success: false,
        message: `权限不足：需要 ${roles.join(' 或 ')} 角色`
      });
    }

    next();
  };
}

module.exports = {
  requirePermission,
  requireRole
};
