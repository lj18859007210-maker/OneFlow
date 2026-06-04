const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const emailSettingsController = require('../controllers/emailSettingsController');
const { sendEmail } = require('../utils/emailSender');

router.use(authMiddleware);

router.get('/settings', requirePermission('email:settings:manage'), emailSettingsController.getSettings);
router.put('/settings', requirePermission('email:settings:manage'), emailSettingsController.updateSettings);

router.post('/send', requirePermission('email:settings:manage'), async (req, res) => {
  try {
    const { to, cc, subject, body } = req.body;
    const result = await sendEmail({ to, cc, subject, body });
    res.json(result);
  } catch (error) {
    console.error('send email error:', error);
    const message = String(error.message || error);
    const status = /required|invalid/i.test(message) ? 400 : 500;
    res.status(status).json({ success: false, message });
  }
});

module.exports = router;
