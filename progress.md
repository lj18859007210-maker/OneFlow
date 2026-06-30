# 进度日志

## 会话 1 - 2026-05-21
### 目标
完成 7 个模块的增量开发

### 进度
- [x] 阶段 1：配置管理
- [x] 阶段 2：日志与审计
- [x] 阶段 3：站内通知
- [x] 阶段 4：安全加固
- [x] 阶段 5：性能优化
- [x] 阶段 6：开发人员管理
- [x] 阶段 7：权限管理

### 备注
- 用户要求分步骤详细实施
- 每个阶段完成后需要确认再继续

### 阶段 1 完成记录
- 安装 dotenv 包
- 创建 .env.example 和 .env 文件
- 创建 config/index.js 集中管理所有配置
- 更新 oracle.js、server.js、auth.js、ai.js、upload.js 使用配置模块
- 所有硬编码配置已迁移到环境变量

### 阶段 2 完成记录
- 安装 winston 和 winston-daily-rotate-file
- 创建 utils/logger.js 日志工具模块
- 创建 db/init-audit-logs.sql 审计日志表结构
- 创建 models/auditLog.js 审计日志数据模型
- 创建 middleware/audit.js 审计日志中间件
- 创建 middleware/requestLogger.js 请求日志中间件
- 创建 controllers/auditLogController.js 审计日志控制器
- 创建 routes/auditLogs.js 审计日志路由
- 更新 server.js 集成日志和审计路由
- 更新 auth.js 记录登录成功/失败审计日志
- 更新 requirements.js 在 CRUD 操作上添加审计中间件
- 更新前端 api/index.js 添加 auditLogApi

### 阶段 3 完成记录
- 创建 db/init-notifications.sql 通知表结构
- 创建 models/notification.js 通知数据模型
- 创建 controllers/notificationController.js 通知控制器
- 创建 routes/notifications.js 通知路由
- 创建 utils/notificationService.js 通知服务工具
- 更新 server.js 集成通知路由
- 更新 requirementController.js 在审批和状态变更时发送通知
- 更新前端 api/index.js 添加 notificationApi
- 创建 components/NotificationBell.vue 通知铃铛组件
- 创建 views/NotificationCenter.vue 通知中心页面
- 更新 main.js 添加通知中心路由
- 更新 App.vue 集成通知铃铛和侧边栏导航

### 阶段 4 完成记录
- 安装 helmet、express-rate-limit、xss
- 创建 middleware/security.js 安全中间件
  - Helmet 安全头（CSP、HSTS、X-Frame-Options 等）
  - 全局请求频率限制（15 分钟 100 次）
  - 严格限流（登录接口 15 分钟 20 次）
  - XSS 防护（清理请求体和查询参数）
  - 安全头增强（X-Content-Type-Options、Referrer-Policy 等）
  - CORS 配置（生产/开发环境分离）
- 更新 server.js 集成所有安全中间件
- 更新 auth.js 登录接口添加严格限流
- 更新 middleware/auth.js 使用配置模块的 JWT_SECRET
- 创建 frontend/src/utils/security.js 前端输入转义工具
- 更新 .env.example 添加安全配置说明

### 阶段 5 完成记录
- 创建 middleware/cache.js 响应缓存中间件
  - 内存缓存（Map 存储）
  - 可配置缓存时长
  - 自动清理过期缓存
  - 按模式清除缓存
- 更新 server.js 集成缓存中间件
  - 需求列表缓存 30 秒
  - 开发人员列表缓存 5 分钟
  - 评论列表缓存 10 秒
  - 静态资源缓存 1 天
- 更新 requirements.js 在写操作后清除缓存
- 创建 frontend/src/utils/performance.js 性能工具
  - 防抖函数
  - 节流函数
  - 请求缓存
- 更新 vite.config.js 添加构建优化
  - 代码分割（vue/echarts/axios）
  - terser 压缩（移除 console）
  - CSS 代码分割
- 安装 terser 开发依赖

### 阶段 6 完成记录
- 创建 db/init-developers.sql 开发人员表结构
  - 包含技能、负载、状态等字段
  - 插入默认开发人员数据
- 创建 models/developer.js 开发人员数据模型
  - CRUD 操作
  - 负载统计
  - 部门列表
  - 负载更新
- 创建 controllers/developerController.js 控制器
- 更新 routes/developers.js 路由
  - 添加 CRUD 接口
  - 添加负载统计接口
  - 添加部门列表接口
  - 添加审计中间件
- 更新前端 api/index.js 扩展 developerApi
- 创建 views/DeveloperManagement.vue 开发人员管理页面
  - 负载统计卡片
  - 人员列表表格
  - 添加/编辑对话框
  - 部门过滤
  - 技能标签
- 更新 main.js 添加开发人员管理路由
- 更新 App.vue 添加侧边栏导航（仅管理员可见）

### 阶段 7 完成记录
- 创建 db/init-permissions.sql 权限表结构
  - permissions 权限表
  - role_permissions 角色权限关联表
  - 插入 10 个默认权限
  - 为 admin 和 user 角色分配默认权限
- 创建 models/permission.js 权限数据模型
  - 获取所有权限
  - 获取角色权限
  - 检查权限
  - 分配权限
  - 获取模块列表
- 创建 middleware/permission.js 权限校验中间件
  - requirePermission 按权限代码校验
  - requireRole 按角色校验
  - admin 角色自动拥有所有权限
- 创建 controllers/permissionController.js 控制器
- 创建 routes/permissions.js 权限路由
- 更新 server.js 集成权限路由
- 更新前端 api/index.js 添加 permissionApi
- 创建 views/PermissionManagement.vue 权限管理页面
  - 角色卡片选择
  - 按模块分组显示权限
  - 复选框配置权限
  - 保存权限到数据库
  - 所有权限列表表格
- 更新 main.js 添加权限管理路由
- 更新 App.vue 添加权限管理导航（仅管理员可见）

---

## 会话 2 - 2026-06-29
### 目标
对齐旧 Node 后端与新 Spring Boot 后端的接口契约，解决“大量接口不行”的系统性问题。

### 已完成
- [x] 明确根因：Spring Boot 迁移未完整复刻旧 Node 的请求参数和响应契约。
- [x] 已修复 `/requirements/dashboard` 返回结构与统计口径。
- [x] 已修复 `/requirements` 首页筛选参数缺失。
- [x] 在 `task_plan.md` 追加“阶段 8：Node → Spring Boot 接口契约对齐”。
- [x] 在 `findings.md` 记录当前根因、已修复契约、Maven 验证阻塞。

### 当前进行中
- [x] 生成前端调用、旧 Node 路由、新 Spring Controller 三方接口清单。
- [x] 新增 `docs/api-contract-alignment.md` 记录高风险缺口和修复顺序。
- [x] 补齐需求新增/编辑的开发人对象数组解析，写入旧 Node 兼容的 `developer` 与 `developerIds`。
- [x] 补齐需求编辑时常用字段更新：实际日期、用时、能力、邮箱、JSON 数组字段等。
- [x] 补齐审批接口 `actualDate` 写入。
- [x] 修复 `/requirements/approval-list` 多开发人漏数据问题，并收窄为旧审批列表字段集。
- [x] 修复 `/requirements/gantt` 缺少 `approvedAt` 导致导出实际工期为空的问题，并修复甘特开发人多选筛选。
- [ ] 继续补齐需求流转/审批评论、通知、邮件等副作用。

### 验证记录
- `mvnw.cmd -f oneflow-api\pom.xml test -Dtest=RequirementControllerTest` 仍失败于父 POM 解析，不是业务测试失败。
