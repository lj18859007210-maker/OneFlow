const notificationModel = require('../models/notification');

const NOTIFICATION_TYPES = {
  APPROVAL_REQUEST: 'approval_request',
  APPROVAL_RESULT: 'approval_result',
  STATUS_CHANGE: 'status_change',
  NEW_COMMENT: 'new_comment',
  ASSIGN_DEV: 'assign_dev',
  SYSTEM: 'system'
};

async function createNotification(data) {
  try {
    return await notificationModel.create(data);
  } catch (error) {
    console.error('创建通知失败:', error.message);
  }
}

async function notifyApprovalRequest(developer, requirement) {
  await createNotification({
    userId: developer.id,
    userName: developer.name,
    type: NOTIFICATION_TYPES.APPROVAL_REQUEST,
    title: `新需求待审批：${requirement.title}`,
    content: `您有一个新的需求需要审批，请及时处理。`,
    resourceId: requirement.id,
    resourceType: 'requirement'
  });
}

async function notifyApprovalResult(submitter, requirement, approved, comment) {
  await createNotification({
    userId: submitter.id,
    userName: submitter.name,
    type: NOTIFICATION_TYPES.APPROVAL_RESULT,
    title: `需求审批${approved ? '通过' : '拒绝'}：${requirement.title}`,
    content: `您的需求"${requirement.title}"已被${approved ? '审批通过' : '审批拒绝'}。${comment ? '审批意见：' + comment : ''}`,
    resourceId: requirement.id,
    resourceType: 'requirement'
  });
}

async function notifyStatusChange(submitter, requirement, newStatus) {
  await createNotification({
    userId: submitter.id,
    userName: submitter.name,
    type: NOTIFICATION_TYPES.STATUS_CHANGE,
    title: `需求状态更新：${requirement.title}`,
    content: `您的需求"${requirement.title}"状态已更新为"${newStatus}"。`,
    resourceId: requirement.id,
    resourceType: 'requirement'
  });
}

async function notifyNewComment(submitter, requirement, comment) {
  await createNotification({
    userId: submitter.id,
    userName: submitter.name,
    type: NOTIFICATION_TYPES.NEW_COMMENT,
    title: `新评论：${requirement.title}`,
    content: `您的需求"${requirement.title}"收到新评论：${comment.content?.substring(0, 50) || '查看评论'}`,
    resourceId: requirement.id,
    resourceType: 'requirement'
  });
}

async function notifyAssignDev(developer, requirement) {
  await createNotification({
    userId: developer.id,
    userName: developer.name,
    type: NOTIFICATION_TYPES.ASSIGN_DEV,
    title: `新需求分配：${requirement.title}`,
    content: `您被分配了一个新需求"${requirement.title}"，请及时处理。`,
    resourceId: requirement.id,
    resourceType: 'requirement'
  });
}

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  notifyApprovalRequest,
  notifyApprovalResult,
  notifyStatusChange,
  notifyNewComment,
  notifyAssignDev
};
