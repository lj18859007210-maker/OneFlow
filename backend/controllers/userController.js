const userModel = require('../models/userModel');

async function getAll(req, res) {
  try {
    const users = await userModel.getAll();
    res.json({ success: true, data: users });
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
