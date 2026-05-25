const auditLogModel = require('../models/auditLog');

async function getList(req, res) {
  try {
    const filters = {
      userId: req.query.userId || null,
      action: req.query.action || null,
      resource: req.query.resource || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      status: req.query.status || null,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20
    };
    
    const result = await auditLogModel.getList(filters);
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    console.error('getList error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getActions(req, res) {
  try {
    const actions = await auditLogModel.getActions();
    res.json({ success: true, data: actions });
  } catch (error) {
    console.error('getActions error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

module.exports = {
  getList,
  getActions
};
