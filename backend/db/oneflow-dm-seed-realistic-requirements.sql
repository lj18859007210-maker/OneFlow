-- OneFlow DM realistic requirement seed data.
-- Execute this script in DM8. It is idempotent for rows prefixed with realistic-demand-.

DELETE FROM ONEFLOW.audit_logs
WHERE resourceId LIKE 'realistic-demand-%'
   OR userId LIKE 'realistic-demand-%';

DELETE FROM ONEFLOW.requirements
WHERE id LIKE 'realistic-demand-%';

INSERT INTO ONEFLOW.requirements (
  id, title, description, submitter, submitterId, developer, developerIds,
  platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime,
  avgMonthlyCalls, senderEmail, ccEmails, priority, score, status, isDraft,
  steps, noteImages, approvalStatus, approvalComment, publishedAt, createdAt, updatedAt
) VALUES (
  'realistic-demand-001',
  'CRM 客户经理回访任务自动派单',
  '客户经理每天需要手工筛选到期回访客户，平均耗时较长且容易漏单。本需求希望在 CRM 中按客户等级、到期时间和历史接触记录自动生成回访任务，并同步到待办中心。上线后目标是减少人工筛选时间，提高重点客户回访及时率。',
  '刘佳',
  'realistic-user-001',
  '张伟',
  'realistic-dev-001',
  '默认平台 / CRM 系统',
  '一线支撑',
  TO_DATE('2026-05-20', 'YYYY-MM-DD'),
  TO_DATE('2026-05-20', 'YYYY-MM-DD'),
  '1.2',
  '0.4',
  420,
  'liujia@example.com',
  '["crm-owner@example.com","service-ops@example.com"]',
  '高',
  100,
  '已发布',
  0,
  '[{"title":"需求提交","done":true},{"title":"审批通过","done":true},{"title":"方案评审","done":true},{"title":"开发启动","done":true},{"title":"测试验证","done":true},{"title":"发布上线","done":true}]',
  '[]',
  'approved',
  '同意开发。该需求影响一线回访效率，请按 5 月版本窗口推进。',
  TO_TIMESTAMP('2026-05-19 18:12:00', 'YYYY-MM-DD HH24:MI:SS'),
  TO_TIMESTAMP('2026-05-06 09:18:00', 'YYYY-MM-DD HH24:MI:SS'),
  TO_TIMESTAMP('2026-05-19 18:12:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.requirements (
  id, title, description, submitter, submitterId, developer, developerIds,
  platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime,
  avgMonthlyCalls, senderEmail, ccEmails, priority, score, status, isDraft,
  steps, noteImages, approvalStatus, approvalComment, publishedAt, createdAt, updatedAt
) VALUES (
  'realistic-demand-002',
  'BOSS 欠费预警短信模板差异化配置',
  '当前欠费预警短信模板统一，无法区分政企客户、校园客户和普通个人客户。需要在 BOSS 中支持按客户类型、欠费金额区间和账期自动匹配短信模板，并保留发送记录。运营侧希望减少人工导表和二次核对成本。',
  '周敏',
  'realistic-user-002',
  '王磊',
  'realistic-dev-002',
  '默认平台 / BOSS 系统',
  '内部支撑',
  TO_DATE('2026-05-28', 'YYYY-MM-DD'),
  TO_DATE('2026-05-28', 'YYYY-MM-DD'),
  '2.5',
  '1.7',
  260,
  'zhoumin@example.com',
  '["billing-owner@example.com"]',
  '中',
  86,
  '已发布',
  0,
  '[{"title":"需求提交","done":true},{"title":"审批通过","done":true},{"title":"方案评审","done":true},{"title":"开发启动","done":true},{"title":"测试验证","done":true},{"title":"发布上线","done":true}]',
  '[]',
  'approved',
  '同意，模板配置需保留操作日志，发布前请完成账期样本回归。',
  TO_TIMESTAMP('2026-05-28 20:05:00', 'YYYY-MM-DD HH24:MI:SS'),
  TO_TIMESTAMP('2026-05-13 10:05:00', 'YYYY-MM-DD HH24:MI:SS'),
  TO_TIMESTAMP('2026-05-28 20:05:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.requirements (
  id, title, description, submitter, submitterId, developer, developerIds,
  platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime,
  avgMonthlyCalls, senderEmail, ccEmails, priority, score, status, isDraft,
  steps, noteImages, approvalStatus, approvalComment, publishedAt, createdAt, updatedAt
) VALUES (
  'realistic-demand-003',
  '集团迎检经营日报指标口径固化',
  '集团迎检期间经营日报需要每天人工核对多个指标口径，历史版本无法追溯。本需求将新增指标口径版本管理、日报自动校验和异常差异提示。数据来源包括 BOSS 汇总表、CRM 客户标签表和经营分析宽表。',
  '黄磊',
  'realistic-user-003',
  '王磊',
  'realistic-dev-002',
  '默认平台 / 大数据分析平台',
  '集团迎检',
  TO_DATE('2026-06-03', 'YYYY-MM-DD'),
  TO_DATE('2026-06-03', 'YYYY-MM-DD'),
  '3.0',
  '2.6',
  88,
  'huanglei@example.com',
  '["data-governance@example.com","inspection@example.com"]',
  '低',
  53.7,
  '已发布',
  0,
  '[{"title":"需求提交","done":true},{"title":"审批通过","done":true},{"title":"方案评审","done":true},{"title":"开发启动","done":true},{"title":"测试验证","done":true},{"title":"发布上线","done":true}]',
  '[]',
  'approved',
  '同意纳入迎检专项，指标口径需经数据治理组确认。',
  TO_TIMESTAMP('2026-06-04 09:30:00', 'YYYY-MM-DD HH24:MI:SS'),
  TO_TIMESTAMP('2026-05-21 14:35:00', 'YYYY-MM-DD HH24:MI:SS'),
  TO_TIMESTAMP('2026-06-04 09:30:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.requirements (
  id, title, description, submitter, submitterId, developer, developerIds,
  platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime,
  avgMonthlyCalls, senderEmail, ccEmails, priority, score, status, isDraft,
  steps, noteImages, approvalStatus, approvalComment, publishedAt, createdAt, updatedAt
) VALUES (
  'realistic-demand-004',
  '掌上移动 APP 装维工单离线回填',
  '部分乡镇装维现场网络不稳定，工单处理结果无法实时提交，导致后台 SLA 统计滞后。需要支持离线填写、图片暂存、网络恢复后自动回填，并在冲突时提示人工确认。试点范围为 6 个县区装维班组。',
  '刘佳',
  'realistic-user-001',
  '陈强',
  'realistic-dev-003',
  '默认平台 / 掌上移动 APP',
  '一线支撑',
  TO_DATE('2026-06-14', 'YYYY-MM-DD'),
  TO_DATE('2026-06-14', 'YYYY-MM-DD'),
  '1.8',
  '0.9',
  315,
  'liujia@example.com',
  '["mobile-app@example.com","field-service@example.com"]',
  '高',
  0,
  '测试中',
  0,
  '[{"title":"需求提交","done":true},{"title":"审批通过","done":true},{"title":"方案评审","done":true},{"title":"开发启动","done":true},{"title":"测试验证","done":true},{"title":"发布上线","done":false}]',
  '[]',
  'approved',
  '同意，需重点验证弱网和重复提交场景。',
  NULL,
  TO_TIMESTAMP('2026-05-29 11:08:00', 'YYYY-MM-DD HH24:MI:SS'),
  TO_TIMESTAMP('2026-06-08 17:40:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.requirements (
  id, title, description, submitter, submitterId, developer, developerIds,
  platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime,
  avgMonthlyCalls, senderEmail, ccEmails, priority, score, status, isDraft,
  steps, noteImages, approvalStatus, approvalComment, publishedAt, createdAt, updatedAt
) VALUES (
  'realistic-demand-005',
  'OA 合同审批节点超时提醒',
  '合同审批流在财务复核和法务复核节点经常停留超过 2 天，业务侧只能人工催办。需要根据合同金额和节点类型配置提醒阈值，自动发送站内信和邮件提醒。同时要求在合同详情中展示每个节点的停留时长。',
  '周敏',
  'realistic-user-002',
  '张伟',
  'realistic-dev-001',
  '默认平台 / OA 办公系统',
  '内部支撑',
  TO_DATE('2026-06-18', 'YYYY-MM-DD'),
  TO_DATE('2026-06-18', 'YYYY-MM-DD'),
  '1.5',
  '0.6',
  150,
  'zhoumin@example.com',
  '["oa-owner@example.com"]',
  '中',
  0,
  '开发中',
  0,
  '[{"title":"需求提交","done":true},{"title":"审批通过","done":true},{"title":"方案评审","done":true},{"title":"开发启动","done":true},{"title":"测试验证","done":false},{"title":"发布上线","done":false}]',
  '[]',
  'approved',
  '同意，提醒规则请先按合同金额三档实现，后续再扩展。',
  NULL,
  TO_TIMESTAMP('2026-06-02 08:56:00', 'YYYY-MM-DD HH24:MI:SS'),
  TO_TIMESTAMP('2026-06-06 19:05:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.requirements (
  id, title, description, submitter, submitterId, developer, developerIds,
  platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime,
  avgMonthlyCalls, senderEmail, ccEmails, priority, score, status, isDraft,
  steps, noteImages, approvalStatus, approvalComment, publishedAt, createdAt, updatedAt
) VALUES (
  'realistic-demand-006',
  '网管支撑平台基站告警相似事件归并',
  '同一基站短时间内会产生多条相似告警，值班人员需要逐条判断，影响故障定位效率。希望按基站、告警类型和时间窗口自动归并相似事件，并保留原始告警清单。归并结果需支持在网管支撑平台按地市和区县筛选。',
  '黄磊',
  'realistic-user-003',
  '王磊, 张伟',
  'realistic-dev-002,realistic-dev-001',
  '默认平台 / 网管支撑平台',
  '一线支撑',
  TO_DATE('2026-06-24', 'YYYY-MM-DD'),
  TO_DATE('2026-06-24', 'YYYY-MM-DD'),
  '2.8',
  '1.1',
  510,
  'huanglei@example.com',
  '["network-noc@example.com"]',
  '高',
  0,
  '待开发',
  0,
  '[{"title":"需求提交","done":true},{"title":"审批通过","done":true},{"title":"方案评审","done":true},{"title":"开发启动","done":false},{"title":"测试验证","done":false},{"title":"发布上线","done":false}]',
  '[]',
  'approved',
  '同意，归并规则需支持灰度开关，先覆盖核心网告警。',
  NULL,
  TO_TIMESTAMP('2026-06-05 16:22:00', 'YYYY-MM-DD HH24:MI:SS'),
  TO_TIMESTAMP('2026-06-07 10:32:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.requirements (
  id, title, description, submitter, submitterId, developer, developerIds,
  platform, capability, expectedDate, actualDate, avgDevTime, postDevAvgTime,
  avgMonthlyCalls, senderEmail, ccEmails, priority, score, status, isDraft,
  steps, noteImages, approvalStatus, approvalComment, publishedAt, createdAt, updatedAt
) VALUES (
  'realistic-demand-007',
  '大数据分析平台渠道活动复盘看板',
  '市场活动复盘目前依赖多个 Excel 汇总，指标口径和更新节奏不一致。需要建设渠道活动复盘看板，展示活动曝光、转化、办理量和留存趋势。审批通过后计划先接入 5 月和 6 月两期活动数据。',
  '刘佳',
  'realistic-user-001',
  '王磊',
  'realistic-dev-002',
  '默认平台 / 大数据分析平台',
  '内部支撑',
  TO_DATE('2026-06-27', 'YYYY-MM-DD'),
  NULL,
  '2.2',
  '1.0',
  190,
  'liujia@example.com',
  '["market-ops@example.com","bi-owner@example.com"]',
  '中',
  0,
  '待审批',
  0,
  '[{"title":"需求提交","done":true},{"title":"审批通过","done":false},{"title":"方案评审","done":false},{"title":"开发启动","done":false},{"title":"测试验证","done":false},{"title":"发布上线","done":false}]',
  '[]',
  'pending',
  NULL,
  NULL,
  TO_TIMESTAMP('2026-06-09 09:25:00', 'YYYY-MM-DD HH24:MI:SS'),
  TO_TIMESTAMP('2026-06-09 09:25:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-001-approve', 'realistic-admin-001', '李娜', 'admin',
  'approve', 'requirement', 'realistic-demand-001',
  '{"body":{"approved":true,"comment":"同意开发。该需求影响一线回访效率，请按 5 月版本窗口推进。","actualDate":"2026-05-20"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-05-06 16:42:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-001-testing', 'realistic-dev-001', '张伟', 'developer',
  'update_status', 'requirement', 'realistic-demand-001',
  '{"body":{"fromStatus":"开发中","status":"测试中"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-05-16 14:20:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-001-release', 'realistic-dev-001', '张伟', 'developer',
  'update_status', 'requirement', 'realistic-demand-001',
  '{"body":{"fromStatus":"测试中","status":"已发布"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-05-19 18:12:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-002-approve', 'realistic-admin-001', '李娜', 'admin',
  'approve', 'requirement', 'realistic-demand-002',
  '{"body":{"approved":true,"comment":"同意，模板配置需保留操作日志，发布前请完成账期样本回归。","actualDate":"2026-05-28"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-05-14 11:26:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-002-testing', 'realistic-dev-002', '王磊', 'developer',
  'update_status', 'requirement', 'realistic-demand-002',
  '{"body":{"fromStatus":"开发中","status":"测试中"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-05-25 16:45:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-002-release', 'realistic-dev-002', '王磊', 'developer',
  'update_status', 'requirement', 'realistic-demand-002',
  '{"body":{"fromStatus":"测试中","status":"已发布"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-05-28 20:05:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-003-approve', 'realistic-admin-001', '李娜', 'admin',
  'approve', 'requirement', 'realistic-demand-003',
  '{"body":{"approved":true,"comment":"同意纳入迎检专项，指标口径需经数据治理组确认。","actualDate":"2026-06-03"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-05-23 09:12:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-003-testing', 'realistic-dev-002', '王磊', 'developer',
  'update_status', 'requirement', 'realistic-demand-003',
  '{"body":{"fromStatus":"开发中","status":"测试中"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-06-02 15:35:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-003-release', 'realistic-dev-002', '王磊', 'developer',
  'update_status', 'requirement', 'realistic-demand-003',
  '{"body":{"fromStatus":"测试中","status":"已发布"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-06-04 09:30:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-004-approve', 'realistic-admin-001', '李娜', 'admin',
  'approve', 'requirement', 'realistic-demand-004',
  '{"body":{"approved":true,"comment":"同意，需重点验证弱网和重复提交场景。","actualDate":"2026-06-14"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-05-30 10:18:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-004-testing', 'realistic-dev-003', '陈强', 'developer',
  'update_status', 'requirement', 'realistic-demand-004',
  '{"body":{"fromStatus":"开发中","status":"测试中"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-06-08 17:40:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-005-approve', 'realistic-admin-001', '李娜', 'admin',
  'approve', 'requirement', 'realistic-demand-005',
  '{"body":{"approved":true,"comment":"同意，提醒规则请先按合同金额三档实现，后续再扩展。","actualDate":"2026-06-18"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-06-02 15:08:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-005-devstart', 'realistic-dev-001', '张伟', 'developer',
  'update_status', 'requirement', 'realistic-demand-005',
  '{"body":{"fromStatus":"待开发","status":"开发中"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-06-06 09:15:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO ONEFLOW.audit_logs (
  id, userId, userName, userRole, action, "resource", resourceId, details,
  ipAddress, userAgent, status, createdAt
) VALUES (
  'realistic-demand-006-approve', 'realistic-admin-001', '李娜', 'admin',
  'approve', 'requirement', 'realistic-demand-006',
  '{"body":{"approved":true,"comment":"同意，归并规则需支持灰度开关，先覆盖核心网告警。","actualDate":"2026-06-24"}}',
  '10.46.18.25', 'dm-seed-sql', 'success',
  TO_TIMESTAMP('2026-06-07 10:32:00', 'YYYY-MM-DD HH24:MI:SS')
);

COMMIT;
