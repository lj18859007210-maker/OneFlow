const userModel = require('../models/userModel');

const VALID_ROLE_FILTERS = new Set(['admin', 'user', 'developer', 'role-admin', 'role-user', 'role-developer']);

function toOptionalString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

async function getAll(req, res) {
  try {
    const role = toOptionalString(req.query.role);
    const result = await userModel.getAll({
      page: req.query.page,
      pageSize: req.query.pageSize,
      role: VALID_ROLE_FILTERS.has(role) ? role : '',
      keyword: toOptionalString(req.query.keyword)
    });
    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize
    });
  } catch (error) {
    console.error('getAll users error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, message: 'role is required' });
    }

    const updated = await userModel.updateRole(id, role);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'user not found' });
    }

    res.json({ success: true, data: updated, message: '用户角色更新成功' });
  } catch (error) {
    console.error('updateRole error:', error);
    if (String(error.message || '').includes('Invalid role')) {
      return res.status(400).json({ success: false, message: 'invalid role' });
    }
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

module.exports = {
  getAll,
  updateRole
};
