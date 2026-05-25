# OneFlow 项目增强任务计划

## 任务概述
为 OneFlow 需求管理平台增加以下 7 个模块：
1. 站内通知/消息中心
2. 后台管理模块
3. 日志与审计系统
4. 配置管理（环境变量）
5. 性能优化
6. 安全加固
7. 开发人员管理（数据库化）

## 技术栈
- 前端：Vue 3 + Vue Router + ECharts + Axios
- 后端：Express + Oracle DB + JWT
- 其他：RSA 加密、Multer 文件上传

## 阶段规划

### 阶段 1：配置管理（基础）
**状态**: completed
**优先级**: 高
**说明**: 作为其他模块的基础，首先抽离配置
- [x] 安装 dotenv
- [x] 创建 .env.example 模板
- [x] 创建 config/index.js 统一管理配置
- [x] 迁移 JWT_SECRET、数据库连接、AI 服务地址等
- [x] 更新 server.js 和相关模块

### 阶段 2：日志与审计系统
**状态**: completed
**优先级**: 高
**说明**: 为后续模块提供日志能力
- [x] 安装 winston
- [x] 创建 utils/logger.js
- [x] 创建请求日志中间件
- [x] 创建审计日志表 (audit_logs)
- [x] 创建审计日志模型和 API
- [x] 集成到关键操作（登录、审批、删除等）

### 阶段 3：站内通知/消息中心
**状态**: completed
**优先级**: 高
**说明**: 实时通知和消息管理
- [x] 创建通知表 (notifications)
- [x] 创建通知模型和 API
- [x] 创建通知中间件（触发通知）
- [x] 前端：消息中心页面
- [x] 前端：通知铃铛组件
- [x] 集成到审批、状态变更等场景

### 阶段 4：安全加固
**状态**: completed
**优先级**: 高
**说明**: 提升系统安全性
- [x] 安装 helmet、express-rate-limit、xss
- [x] 添加 CSRF 防护（通过 helmet）
- [x] 添加请求频率限制
- [x] 添加 XSS 防护中间件
- [x] 前端输入转义
- [x] 密码策略增强
- [x] Token 验证增强

### 阶段 5：性能优化
**状态**: completed
**优先级**: 中
**说明**: 提升系统响应速度
- [x] 数据库查询优化（索引检查、分页优化）
- [x] 添加响应缓存中间件
- [x] 前端：路由懒加载（已内置）
- [x] 前端：组件按需加载
- [x] 前端：请求防抖/节流
- [x] 静态资源缓存策略

### 阶段 6：开发人员管理
**状态**: completed
**优先级**: 中
**说明**: 将硬编码的开发人员数据迁移到数据库
- [x] 创建 developers 表
- [x] 创建开发人员模型
- [x] 更新路由从数据库读取
- [x] 添加 CRUD API
- [x] 前端：开发人员管理页面
- [x] 添加负载统计功能

### 阶段 7：权限管理
**状态**: completed
**优先级**: 中
**说明**: 完善 RBAC 角色权限管理
- [x] 创建权限表 (permissions)
- [x] 创建角色权限关联表 (role_permissions)
- [x] 创建权限模型和 API
- [x] 前端：权限管理页面
- [x] 前端：权限配置界面
- [x] 更新权限校验中间件

## 决策记录
| 决策 | 原因 | 时间 |
|------|------|------|
| 先做配置管理 | 其他模块依赖环境变量 | - |
| 日志系统第二 | 为后续模块提供调试能力 | - |
| 通知系统第三 | 用户高频需求 | - |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| - | - | - |

## 文件清单
### 新增文件
- `backend/.env.example`
- `backend/config/index.js`
- `backend/utils/logger.js`
- `backend/middleware/audit.js`
- `backend/middleware/security.js`
- `backend/middleware/cache.js`
- `backend/models/notification.js`
- `backend/models/developer.js`
- `backend/models/auditLog.js`
- `backend/controllers/notificationController.js`
- `backend/controllers/adminController.js`
- `backend/controllers/developerController.js`
- `backend/routes/notifications.js`
- `backend/routes/admin.js`
- `backend/db/init-notifications.sql`
- `backend/db/init-audit-logs.sql`
- `backend/db/init-developers.sql`
- `frontend/src/views/NotificationCenter.vue`
- `frontend/src/views/AdminPanel.vue`
- `frontend/src/views/UserManagement.vue`
- `frontend/src/views/DeveloperManagement.vue`
- `frontend/src/views/AuditLogs.vue`
- `frontend/src/components/NotificationBell.vue`

### 修改文件
- `backend/server.js`
- `backend/db/oracle.js`
- `backend/models/userModel.js`
- `backend/models/requirement.js`
- `backend/routes/auth.js`
- `backend/routes/requirements.js`
- `backend/routes/developers.js`
- `frontend/src/main.js`
- `frontend/src/api/index.js`
- `frontend/src/App.vue`
