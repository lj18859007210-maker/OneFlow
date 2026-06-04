const EVENT_LABELS = {
  approval_updated: '审批结果',
  requirement_created: '新需求提交',
  status_updated: '流转更新',
  comment_created: '发布评论',
  attachment_uploaded: '附件上传'
};

function uniqueEmails(values) {
  return [...new Set((Array.isArray(values) ? values : [values])
    .filter(Boolean)
    .map(value => String(value).trim())
    .filter(Boolean))];
}

function queueKey(to, cc) {
  return JSON.stringify({
    to: uniqueEmails(to).sort(),
    cc: uniqueEmails(cc).sort()
  });
}

function formatDigestEmail(group) {
  const title = group.events[0]?.requirementTitle || '需求动态';
  const subject = `需求动态汇总：${title}`;
  const lines = [
    '以下是邮件发送间隔内汇总的需求动态：',
    ''
  ];

  group.events.forEach((event, index) => {
    const label = EVENT_LABELS[event.eventType] || '需求动态';
    const time = event.createdAt ? new Date(event.createdAt).toLocaleString('zh-CN') : '';
    lines.push(`${index + 1}. [${label}] ${event.requirementTitle || '未命名需求'}`);
    if (event.actorName) lines.push(`   操作人：${event.actorName}`);
    if (time) lines.push(`   时间：${time}`);
    if (event.summary) lines.push(`   内容：${event.summary}`);
    lines.push('');
  });

  return {
    to: uniqueEmails(group.to),
    cc: uniqueEmails(group.cc),
    subject,
    body: lines.join('\n').trim()
  };
}

function createEmailDigestService({
  getIntervalMinutes,
  sendEmail,
  scheduler = (fn, delayMs) => {
    const timer = setTimeout(fn, delayMs);
    return { cancel: () => clearTimeout(timer) };
  },
  now = () => new Date(),
  maxRetryAttempts = 3,
  retryDelayMs = 60 * 1000
}) {
  const groups = new Map();

  function scheduleFlush(key, delayMs) {
    return scheduler(() => {
      Promise.resolve(flushGroup(key)).catch(error => {
        console.error('flush email digest error:', error.message);
      });
    }, delayMs);
  }

  async function flushGroup(key) {
    const group = groups.get(key);
    if (!group) return null;

    const email = formatDigestEmail(group);
    if (!email.to.length) {
      groups.delete(key);
      return null;
    }

    try {
      const result = await sendEmail(email);
      groups.delete(key);
      return result;
    } catch (error) {
      group.attempts = (group.attempts || 0) + 1;
      group.lastError = String(error.message || error);
      if (group.attempts >= maxRetryAttempts) {
        groups.delete(key);
      } else {
        group.timer = scheduleFlush(key, retryDelayMs);
      }
      throw error;
    }
  }

  async function enqueue(event) {
    const to = uniqueEmails(event.to);
    const cc = uniqueEmails(event.cc);
    if (!to.length) return { queued: false, reason: 'missing recipient' };

    const key = queueKey(to, cc);
    let group = groups.get(key);
    if (!group) {
      const intervalMinutes = await getIntervalMinutes();
      group = {
        to,
        cc,
        events: [],
        attempts: 0,
        timer: null
      };
      group.timer = scheduleFlush(key, intervalMinutes * 60 * 1000);
      groups.set(key, group);
    }

    group.events.push({
      eventType: event.eventType,
      requirementTitle: event.requirementTitle,
      actorName: event.actorName,
      summary: event.summary,
      createdAt: event.createdAt || now().toISOString()
    });

    return { queued: true, queueSize: groups.size };
  }

  async function flushAll() {
    const keys = [...groups.keys()];
    for (const key of keys) {
      const group = groups.get(key);
      if (group?.timer?.cancel) group.timer.cancel();
      await flushGroup(key);
    }
  }

  return {
    enqueue,
    flushAll,
    getQueueSize: () => groups.size
  };
}

module.exports = {
  createEmailDigestService,
  formatDigestEmail,
  uniqueEmails
};
