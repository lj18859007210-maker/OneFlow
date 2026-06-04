const ACTION_LABELS = {
  create: '新增',
  update: '编辑',
  delete: '删除',
  update_status: '变更需求状态',
  approve: '审批需求',
  score: '评价需求',
  login: '登录系统',
  upload_attachment: '上传正式附件',
  upload_comment_attachment: '上传评论附件',
  upload_attachment_version: '上传附件新版本',
  promote_comment_attachment: '转为正式附件',
  delete_attachment: '删除附件'
};

const RESOURCE_LABELS = {
  requirement: '需求',
  developer: '开发人员',
  attachment: '附件',
  auth: '账号'
};

const RESULT_LABELS = {
  success: '成功',
  failed: '失败'
};

function getBody(log = {}) {
  return log.details?.body || {};
}

function getActor(log = {}) {
  return log.userName || '匿名用户';
}

function getResourceLabel(resource) {
  return RESOURCE_LABELS[resource] || resource || '资源';
}

function getActionLabel(action) {
  return ACTION_LABELS[action] || action || '未知操作';
}

function getResourceName(log = {}) {
  const body = getBody(log);
  return body.title || body.name || log.resourceId || '未记录编号';
}

function buildRequirementSummary(log) {
  const actor = getActor(log);
  const target = getResourceName(log);
  const body = getBody(log);

  if (log.action === 'create') return `${actor} 新增了需求「${target}」`;
  if (log.action === 'update') return `${actor} 编辑了需求「${target}」`;
  if (log.action === 'delete') return `${actor} 删除了需求 ${target}`;
  if (log.action === 'score') return `${actor} 将需求 ${target} 评分为 ${body.score ?? '未记录分数'}`;
  if (log.action === 'update_status') {
    return `${actor} 将需求 ${target} 的状态变更为「${body.status || '未记录状态'}」`;
  }
  if (log.action === 'approve') {
    if (body.approved === false) {
      const reason = body.comment || body.reason;
      return `${actor} 驳回了需求 ${target}${reason ? `，原因：${reason}` : ''}`;
    }
    return `${actor} 审批通过了需求 ${target}`;
  }

  return null;
}

function buildDeveloperSummary(log) {
  const actor = getActor(log);
  const target = getResourceName(log);

  if (log.action === 'create') return `${actor} 新增了开发人员「${target}」`;
  if (log.action === 'update') return `${actor} 编辑了开发人员「${target}」`;
  if (log.action === 'delete') return `${actor} 删除了开发人员 ${target}`;

  return null;
}

function buildAttachmentSummary(log) {
  const actor = getActor(log);
  const target = getBody(log).fileName || getBody(log).originalName || log.resourceId || '未记录附件';
  const requirementId = getBody(log).requirementId;
  const suffix = requirementId ? `，关联需求 ${requirementId}` : '';

  if (log.action === 'upload_attachment') return `${actor} 上传了正式附件「${target}」${suffix}`;
  if (log.action === 'upload_comment_attachment') return `${actor} 上传了评论附件「${target}」${suffix}`;
  if (log.action === 'upload_attachment_version') return `${actor} 为附件 ${target} 上传了新版本${suffix}`;
  if (log.action === 'promote_comment_attachment') return `${actor} 将评论附件 ${target} 转为正式附件${suffix}`;
  if (log.action === 'delete_attachment') return `${actor} 删除了附件 ${target}${suffix}`;

  return null;
}

function buildAuthSummary(log) {
  const actor = getActor(log);
  const reason = getBody(log).reason || log.details?.reason;

  if (log.action !== 'login') return null;
  if (log.status === 'failed') {
    const reasonLabel = reason === 'empty_credentials'
      ? '账号或密码为空'
      : reason === 'invalid_credentials'
        ? '账号或密码错误'
        : '登录失败';
    return `${actor} 登录系统失败，原因：${reasonLabel}`;
  }

  return `${actor} 登录系统成功`;
}

function buildSummary(log = {}) {
  const specificSummary = {
    requirement: buildRequirementSummary,
    developer: buildDeveloperSummary,
    attachment: buildAttachmentSummary,
    auth: buildAuthSummary
  }[log.resource]?.(log);

  if (specificSummary) return specificSummary;

  const actor = getActor(log);
  const resourceLabel = getResourceLabel(log.resource);
  const target = log.resourceId ? `${resourceLabel} ${log.resourceId}` : resourceLabel;
  return `${actor} 对 ${target} 执行 ${getActionLabel(log.action)}`;
}

function enrichAuditLog(log = {}) {
  return {
    ...log,
    actionLabel: getActionLabel(log.action),
    resourceLabel: getResourceLabel(log.resource),
    resultLabel: RESULT_LABELS[log.status] || log.status || '未知',
    summary: buildSummary(log),
    raw: {
      action: log.action || null,
      resource: log.resource || null,
      resourceId: log.resourceId || null
    }
  };
}

module.exports = {
  enrichAuditLog,
  getActionLabel,
  getResourceLabel
};
