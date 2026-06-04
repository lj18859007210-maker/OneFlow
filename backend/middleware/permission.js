const permissionModel = require('../models/permission');
const logger = require('../utils/logger');
const { normalizeRoleId, normalizeRoleName } = require('../utils/roleAccess');
const { toOracleResourceResponse } = require('../utils/oracleErrors');

function sendPermissionCheckError(res, error) {
  const oracleResponse = toOracleResourceResponse(error);
  if (oracleResponse) {
    return res.status(oracleResponse.status).json(oracleResponse.body);
  }

  return res.status(500).json({ success: false, message: 'permission check failed' });
}

function requirePermission(permissionCode) {
  return async (req, res, next) => {
    const userRole = req.user?.role;
    const normalizedRoleId = normalizeRoleId(userRole);

    if (!normalizedRoleId) {
      logger.warn(`Permission denied: ${req.user?.name || 'unknown'} (${userRole || 'unknown'}) tried to access ${permissionCode}`);
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permissionCode} is required`
      });
    }

    if (normalizedRoleId === 'role-admin') {
      return next();
    }

    try {
      const hasPermission = await permissionModel.checkPermission(normalizedRoleId, permissionCode);
      if (!hasPermission) {
        logger.warn(`Permission denied: ${req.user?.name || 'unknown'} (${userRole}) tried to access ${permissionCode}`);
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permissionCode} is required`
        });
      }

      return next();
    } catch (error) {
      logger.error(`Permission check failed: ${error.message}`);
      return sendPermissionCheckError(res, error);
    }
  };
}

function requireAnyPermission(...permissionCodes) {
  return async (req, res, next) => {
    const userRole = req.user?.role;
    const normalizedRoleId = normalizeRoleId(userRole);

    if (!normalizedRoleId) {
      logger.warn(`Permission denied: ${req.user?.name || 'unknown'} (${userRole || 'unknown'}) tried to access ${permissionCodes.join(' or ')}`);
      return res.status(403).json({
        success: false,
        message: `Permission denied: one of ${permissionCodes.join(', ')} is required`
      });
    }

    if (normalizedRoleId === 'role-admin') {
      return next();
    }

    try {
      for (const permissionCode of permissionCodes) {
        const hasPermission = await permissionModel.checkPermission(normalizedRoleId, permissionCode);
        if (hasPermission) {
          return next();
        }
      }

      logger.warn(`Permission denied: ${req.user?.name || 'unknown'} (${userRole}) tried to access ${permissionCodes.join(' or ')}`);
      return res.status(403).json({
        success: false,
        message: `Permission denied: one of ${permissionCodes.join(', ')} is required`
      });
    } catch (error) {
      logger.error(`Permission check failed: ${error.message}`);
      return sendPermissionCheckError(res, error);
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const normalizedRoleName = normalizeRoleName(userRole) || userRole;

    if (!roles.includes(normalizedRoleName)) {
      logger.warn(`Role denied: ${req.user?.name || 'unknown'} (${userRole || 'unknown'}) tried to access role-gated resource [${roles.join(', ')}]`);
      return res.status(403).json({
        success: false,
        message: `Permission denied: one of roles ${roles.join(', ')} is required`
      });
    }

    return next();
  };
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireRole
};
