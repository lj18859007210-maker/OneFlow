const permissionModel = require('../models/permission');

async function getAll(req, res) {
  try {
    const permissions = await permissionModel.getAll();
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('getAll error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getByRole(req, res) {
  try {
    const { roleId } = req.params;
    const permissions = await permissionModel.getByRoleId(roleId);
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('getByRole error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function assignPermissions(req, res) {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;
    
    await permissionModel.assignPermissions(roleId, permissionIds);
    res.json({ success: true, message: '权限分配成功' });
  } catch (error) {
    console.error('assignPermissions error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getModules(req, res) {
  try {
    const modules = await permissionModel.getModules();
    res.json({ success: true, data: modules });
  } catch (error) {
    console.error('getModules error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

module.exports = {
  getAll,
  getByRole,
  assignPermissions,
  getModules
};
