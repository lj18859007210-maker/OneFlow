const developerModel = require('../models/developer');

async function getAll(req, res) {
  try {
    const filters = {
      department: req.query.department || null,
      status: req.query.status !== undefined ? parseInt(req.query.status) : 1
    };
    
    const developers = await developerModel.getAll(filters);
    res.json({ success: true, data: developers });
  } catch (error) {
    console.error('getAll error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getAssignable(req, res) {
  try {
    const developers = await developerModel.getAssignable();
    res.json({ success: true, data: developers });
  } catch (error) {
    console.error('getAssignable error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getById(req, res) {
  try {
    const developer = await developerModel.getById(req.params.id);
    if (!developer) {
      return res.status(404).json({ success: false, message: '开发人员不存在' });
    }
    res.json({ success: true, data: developer });
  } catch (error) {
    console.error('getById error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function create(req, res) {
  try {
    const developer = await developerModel.create(req.body);
    res.status(201).json({ success: true, data: developer, message: '开发人员创建成功' });
  } catch (error) {
    console.error('create error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function update(req, res) {
  try {
    const developer = await developerModel.update(req.params.id, req.body);
    if (!developer) {
      return res.status(404).json({ success: false, message: '开发人员不存在' });
    }
    res.json({ success: true, data: developer, message: '开发人员更新成功' });
  } catch (error) {
    console.error('update error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function remove(req, res) {
  try {
    const success = await developerModel.remove(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: '开发人员不存在' });
    }
    res.json({ success: true, message: '开发人员删除成功' });
  } catch (error) {
    console.error('remove error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getLoadStats(req, res) {
  try {
    const stats = await developerModel.getLoadStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('getLoadStats error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getDepartments(req, res) {
  try {
    const departments = await developerModel.getDepartments();
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('getDepartments error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

module.exports = {
  getAll,
  getAssignable,
  getById,
  create,
  update,
  remove,
  getLoadStats,
  getDepartments
};
