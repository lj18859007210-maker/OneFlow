const FLOW_KEY_REQUIREMENT = 'requirement';

const REQUIREMENT_STATUS = {
  PENDING_APPROVAL: '待审批',
  PENDING_REVIEW: '待评审',
  PENDING_DEV: '待开发',
  IN_DEV: '开发中',
  IN_TEST: '测试中',
  RELEASED: '已发布'
};

const DEFAULT_STATUSES = [
  { statusCode: REQUIREMENT_STATUS.PENDING_APPROVAL, statusName: REQUIREMENT_STATUS.PENDING_APPROVAL, sortOrder: 10, isTerminal: 0, enabled: 1 },
  { statusCode: REQUIREMENT_STATUS.PENDING_REVIEW, statusName: REQUIREMENT_STATUS.PENDING_REVIEW, sortOrder: 20, isTerminal: 0, enabled: 1 },
  { statusCode: REQUIREMENT_STATUS.PENDING_DEV, statusName: REQUIREMENT_STATUS.PENDING_DEV, sortOrder: 30, isTerminal: 0, enabled: 1 },
  { statusCode: REQUIREMENT_STATUS.IN_DEV, statusName: REQUIREMENT_STATUS.IN_DEV, sortOrder: 40, isTerminal: 0, enabled: 1 },
  { statusCode: REQUIREMENT_STATUS.IN_TEST, statusName: REQUIREMENT_STATUS.IN_TEST, sortOrder: 50, isTerminal: 0, enabled: 1 },
  { statusCode: REQUIREMENT_STATUS.RELEASED, statusName: REQUIREMENT_STATUS.RELEASED, sortOrder: 60, isTerminal: 1, enabled: 1 }
];

const DEFAULT_TRANSITIONS = [
  {
    fromStatus: REQUIREMENT_STATUS.PENDING_APPROVAL,
    toStatus: REQUIREMENT_STATUS.PENDING_REVIEW,
    allowedRoles: ['admin'],
    requireApproval: 1,
    notifyEnabled: 1,
    enabled: 1,
    approvalOutcome: 'approved'
  },
  {
    fromStatus: REQUIREMENT_STATUS.PENDING_APPROVAL,
    toStatus: REQUIREMENT_STATUS.PENDING_APPROVAL,
    allowedRoles: ['admin'],
    requireApproval: 1,
    notifyEnabled: 1,
    enabled: 1,
    approvalOutcome: 'rejected'
  },
  {
    fromStatus: REQUIREMENT_STATUS.PENDING_REVIEW,
    toStatus: REQUIREMENT_STATUS.PENDING_DEV,
    allowedRoles: ['admin', 'developer'],
    requireApproval: 0,
    notifyEnabled: 1,
    enabled: 1,
    approvalOutcome: 'none'
  },
  {
    fromStatus: REQUIREMENT_STATUS.PENDING_DEV,
    toStatus: REQUIREMENT_STATUS.IN_DEV,
    allowedRoles: ['admin', 'developer'],
    requireApproval: 0,
    notifyEnabled: 1,
    enabled: 1,
    approvalOutcome: 'none'
  },
  {
    fromStatus: REQUIREMENT_STATUS.IN_DEV,
    toStatus: REQUIREMENT_STATUS.IN_TEST,
    allowedRoles: ['admin', 'developer'],
    requireApproval: 0,
    notifyEnabled: 1,
    enabled: 1,
    approvalOutcome: 'none'
  },
  {
    fromStatus: REQUIREMENT_STATUS.IN_TEST,
    toStatus: REQUIREMENT_STATUS.RELEASED,
    allowedRoles: ['admin', 'developer'],
    requireApproval: 0,
    notifyEnabled: 1,
    enabled: 1,
    approvalOutcome: 'none'
  }
];

module.exports = {
  FLOW_KEY_REQUIREMENT,
  REQUIREMENT_STATUS,
  DEFAULT_STATUSES,
  DEFAULT_TRANSITIONS
};
