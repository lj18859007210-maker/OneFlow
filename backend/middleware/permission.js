const permissionModel = require('../models/permission');
const logger = require('../utils/logger');

function requirePermission(permissionCode) {
  return async (req, res, next) => {
    const { role: userRole } = req.user;
    
    // admin 角色拥有所有权限
    if (userRole === 'admin') {
      return next();
    }
    
    // 映射角色到 roleId
    const roleIdMap = {
      'admin': 'role-admin',
      'user': 'role-user',
      'developer': 'role-developer'
    };
    
    const roleId = roleIdMap[userRole] || 'role-user';
    
    try {
      const hasPermission = await permissionModel.checkPermission(roleId, permissionCode);
      if (!hasPermission) {
        logger.warn(`权限不足: ${req.user.name} (${userRole}) 尝试访问 ${permissionCode}`);
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
    const { role: userRole } = req.user;
    
    if (!roles.includes(userRole)) {
      logger.warn(`角色不足: ${req.user.name} (${userRole}) 尝试访问需要 [${roles.join(', ')}] 的资源`);
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
