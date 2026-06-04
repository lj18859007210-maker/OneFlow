const platformSettingModel = require('../models/platformSetting');

async function getPlatforms(req, res) {
  try {
    const platforms = await platformSettingModel.getPlatforms();
    res.json({ success: true, data: platforms });
  } catch (error) {
    console.error('get platforms error:', error);
    res.status(500).json({ success: false, message: String(error.message || error) });
  }
}

async function updatePlatforms(req, res) {
  try {
    const platforms = await platformSettingModel.updatePlatforms(req.body?.platforms);
    res.json({ success: true, data: platforms, message: '平台配置已保存' });
  } catch (error) {
    const message = String(error.message || error);
    const status = /platforms|平台/.test(message) ? 400 : 500;
    res.status(status).json({ success: false, message });
  }
}

module.exports = {
  getPlatforms,
  updatePlatforms
};
