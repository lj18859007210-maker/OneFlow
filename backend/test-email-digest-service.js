const assert = require('assert');
const {
  createEmailDigestService,
  formatDigestEmail
} = require('./utils/emailDigestService');

async function run() {
  const sentEmails = [];
  const service = createEmailDigestService({
    getIntervalMinutes: async () => 1,
    sendEmail: async (email) => {
      sentEmails.push(email);
      return { success: true };
    },
    scheduler: (fn) => {
      scheduler.scheduled = fn;
      return { cancel: () => { scheduler.cancelled = true; } };
    },
    now: () => new Date('2026-06-03T08:00:00.000Z')
  });
  const scheduler = {};

  await service.enqueue({
    to: ['owner@example.com'],
    cc: ['dev@example.com'],
    actorName: 'Alice',
    requirementTitle: '需求 A',
    eventType: 'status_updated',
    summary: '状态更新为：开发中'
  });
  await service.enqueue({
    to: ['owner@example.com'],
    cc: ['dev@example.com'],
    actorName: 'Bob',
    requirementTitle: '需求 A',
    eventType: 'comment_created',
    summary: '发布评论：请看最新说明'
  });

  assert.strictEqual(sentEmails.length, 0);
  assert.strictEqual(service.getQueueSize(), 1);
  assert.strictEqual(typeof scheduler.scheduled, 'function');

  await scheduler.scheduled();

  assert.strictEqual(sentEmails.length, 1);
  assert.deepStrictEqual(sentEmails[0].to, ['owner@example.com']);
  assert.deepStrictEqual(sentEmails[0].cc, ['dev@example.com']);
  assert.match(sentEmails[0].subject, /需求动态汇总/);
  assert.match(sentEmails[0].body, /状态更新为：开发中/);
  assert.match(sentEmails[0].body, /发布评论：请看最新说明/);
  assert.strictEqual(service.getQueueSize(), 0);

  const formatted = formatDigestEmail({
    to: ['owner@example.com'],
    cc: [],
    events: [
      {
        actorName: 'Alice',
        requirementTitle: '需求 A',
        eventType: 'attachment_uploaded',
        summary: '上传附件：方案.pdf',
        createdAt: '2026-06-03T08:00:00.000Z'
      }
    ]
  });
  assert.match(formatted.body, /附件上传/);
  assert.match(formatted.body, /方案\.pdf/);

  console.log('email digest service tests passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
