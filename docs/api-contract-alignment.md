# OneFlow API Contract Alignment

## Scope

旧 Node 后端是当前前端的接口契约基准。Spring Boot 迁移需要对齐：

- 路径和 HTTP 方法
- 请求参数和请求体字段
- 响应 JSON 结构和字段名
- 权限、状态码和错误消息
- 排序、统计口径和跨模块副作用

## Current High-Risk Gaps

| Area | Endpoint | Status | Gap |
| --- | --- | --- | --- |
| Auth | `/api/auth/*` | mostly aligned | 已修 RSA/bcrypt/JWT permissions，后续只做回归 |
| Requirement list | `GET /api/requirements` | aligned in progress | 已补筛选参数，仍需完整参数校验 |
| Requirement dashboard | `GET /api/requirements/dashboard` | aligned in progress | 已补旧 Node 聚合字段 |
| Requirement write | `POST/PUT /api/requirements` | high risk | Spring 需对齐开发人对象数组解析、developerIds、草稿/提交状态 |
| Requirement lifecycle | `PUT /api/requirements/{id}/approve/status/score` | high risk | 缺少旧 Node 工作流合法流转、评论、通知/邮件副作用 |
| Comments | `/api/comments/*` | medium risk | Spring 暂不支持无文字仅附件评论，且缺通知/邮件副作用 |
| Upload | `/api/upload` | medium risk | 需确认返回 `url/name` 与旧前端图片预览一致 |
| Attachments | `/api/attachments/*` | medium risk | 路由存在，需核对文件下载/预览响应头 |
| Developers | `/api/developers/*` | mostly aligned | 路由结构一致，需核对字段名和 assignable 范围 |
| Admin APIs | users/permissions/workflows/audit/notifications/platform/email/ai | pending | 路由多已存在，下一轮逐项核响应 |

## Immediate Fix Order

1. 需求新增/编辑开发人字段解析。
2. 需求审批/流转旧 Node 行为对齐。
3. 评论支持附件-only 场景。
4. 附件与上传返回结构核对。
5. 管理端接口逐项核对。
