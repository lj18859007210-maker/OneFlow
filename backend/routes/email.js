const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const emailSettingsController = require('../controllers/emailSettingsController');
const { sendEmail } = require('../utils/emailSender');

router.use(authMiddleware);

router.get('/settings', requirePermission('email:settings:manage'), emailSettingsController.getSettings);
router.put('/settings', requirePermission('email:settings:manage'), emailSettingsController.updateSettings);

router.post('/send', async (req, res) => {
  const { to, cc, subject, body } = req.body;
  const result = await sendEmail({ to, cc, subject, body });
  res.json(result);
});

module.exports = router;
