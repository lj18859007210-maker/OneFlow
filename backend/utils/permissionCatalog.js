const PERMISSIONS = [
  { id: 'perm-001', code: 'requirement:view', name: '查看需求', module: 'requirement', description: '查看需求列表、我的需求和需求详情' },
  { id: 'perm-002', code: 'requirement:create', name: '创建需求', module: 'requirement', description: '提交新需求和保存需求草稿' },
  { id: 'perm-003', code: 'requirement:update', name: '更新需求', module: 'requirement', description: '编辑需求、草稿和需求状态' },
  { id: 'perm-004', code: 'requirement:delete', name: '删除需求', module: 'requirement', description: '删除需求和草稿' },
  { id: 'perm-005', code: 'requirement:approve', name: '审批需求', module: 'requirement', description: '进入审批中心并审批需求' },
  { id: 'perm-006', code: 'requirement:score', name: '评分需求', module: 'requirement', description: '对需求进行评分' },
  { id: 'perm-007', code: 'developer:view', name: '查看开发人员', module: 'developer', description: '查看开发人员列表和负载统计' },
  { id: 'perm-008', code: 'developer:create', name: '创建开发档案', module: 'developer', description: '为开发人员账号创建扩展档案' },
  { id: 'perm-009', code: 'developer:update', name: '更新开发档案', module: 'developer', description: '更新开发人员部门、技能和负载信息' },
  { id: 'perm-010', code: 'developer:delete', name: '移出开发人员', module: 'developer', description: '将账号从开发人员中移出' },
  { id: 'perm-011', code: 'audit:view', name: '查看审计日志', module: 'audit', description: '查看系统审计日志' },
  { id: 'perm-012', code: 'permission:manage', name: '权限管理', module: 'permission', description: '查看和分配角色权限' },
  { id: 'perm-013', code: 'project:timeline:view', name: '查看项目进度', module: 'project', description: '查看项目进度甘特图' },
  { id: 'perm-014', code: 'notification:view', name: '查看通知', module: 'notification', description: '查看、已读和删除个人通知' },
  { id: 'perm-015', code: 'user:role:manage', name: '用户角色管理', module: 'user', description: '查看用户列表并调整用户角色' }
];

const ROLE_DEFAULT_PERMISSION_CODES = {
  admin: PERMISSIONS.map(permission => permission.code),
  user: [
    'requirement:view',
    'requirement:create',
    'notification:view'
  ],
  developer: [
    'requirement:view',
    'requirement:update',
    'requirement:score',
    'project:timeline:view',
    'developer:view',
    'notification:view'
  ]
};

function sqlValue(value) {
  return String(value).replace(/'/g, "''");
}

function buildPermissionInsertSql(permission) {
  return `INSERT INTO permissions (id, code, name, module, description) VALUES ('${sqlValue(permission.id)}', '${sqlValue(permission.code)}', '${sqlValue(permission.name)}', '${sqlValue(permission.module)}', '${sqlValue(permission.description)}')`;
}

function getPermissionByCode(code) {
  return PERMISSIONS.find(permission => permission.code === code) || null;
}

module.exports = {
  PERMISSIONS,
  ROLE_DEFAULT_PERMISSION_CODES,
  buildPermissionInsertSql,
  getPermissionByCode
};
