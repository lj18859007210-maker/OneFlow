const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/send', (req, res) => {
  const { to, cc, subject, body } = req.body;
  
  console.log('======== 中国移动 · 模拟邮件发送 ========');
  console.log(`收件人: ${to}`);
  console.log(`抄送人: ${cc ? cc.join(', ') : '无'}`);
  console.log(`主题: ${subject}`);
  console.log(`正文: ${body}`);
  console.log(`发送时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('==========================================');
  
  res.json({
    success: true,
    message: '邮件发送成功（模拟）',
    email: { to, cc, subject, body, sentAt: new Date().toISOString() }
  });
});

module.exports = router;
