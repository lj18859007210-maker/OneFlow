const notificationModel = require('../models/notification');

async function getList(req, res) {
  try {
    const { id: userId } = req.user;
    const filters = {
      isRead: req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined,
      type: req.query.type || undefined,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20
    };
    
    const result = await notificationModel.getByUserId(userId, filters);
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    console.error('getList error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function getUnreadCount(req, res) {
  try {
    const { id: userId } = req.user;
    const count = await notificationModel.getUnreadCount(userId);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function markAsRead(req, res) {
  try {
    await notificationModel.markAsRead(req.params.id);
    res.json({ success: true, message: '已标记为已读' });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function markAllAsRead(req, res) {
  try {
    const { id: userId } = req.user;
    await notificationModel.markAllAsRead(userId);
    res.json({ success: true, message: '全部已标记为已读' });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function remove(req, res) {
  try {
    const { id: userId } = req.user;
    const success = await notificationModel.remove(req.params.id, userId);
    if (!success) {
      return res.status(404).json({ success: false, message: '通知不存在' });
    }
    res.json({ success: true, message: '通知删除成功' });
  } catch (error) {
    console.error('remove error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

module.exports = {
  getList,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  remove
};
