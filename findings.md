# 研究发现

## 项目结构
- 后端：Express + Oracle DB，使用 oracledb 驱动
- 前端：Vue 3 + Vite，使用 Composition API
- 认证：JWT + RSA 加密密码传输
- 数据库：Oracle，使用原生 SQL 查询

## 现有模块分析
### 认证系统
- JWT_SECRET 硬编码在 auth.js 中
- Token 有效期 7 天，无刷新机制
- RSA 加密密码传输，但密钥对每次重启重新生成

### 数据库
- 使用 oracledb 连接池
- 手动管理连接（getConnection/close）
- LOB 字段需要特殊处理
- 无迁移工具

### 前端状态
- 无状态管理库（Pinia/Vuex）
- 使用 inject/provide 传递 currentUser
- localStorage 存储 token 和用户信息

### 安全现状
- 参数化查询（防 SQL 注入）
- bcrypt 密码哈希
- RSA 加密密码传输
- 缺少：CSRF、rate limiting、helmet、XSS 防护

### 性能现状
- 分页查询使用 ROW_NUMBER()
- 无缓存机制
- 前端无懒加载
- AI 上下文加载可能较慢（全表扫描）

## 技术决策
- 日志库：winston（Node.js 生态标准）
- 配置管理：dotenv + 集中式 config 模块
- 通知存储：数据库表（非 WebSocket，简化实现）
- 缓存：内存缓存（暂不引入 Redis，降低复杂度）
- 前端组件：保持现有风格，使用 Composition API

---

## Spring Boot 迁移接口契约发现

### 当前根因
- 迁移早期按“接口名/基础返回”实现 Spring Boot，未逐项复刻旧 Node 的隐式契约。
- 前端长期依赖旧 Node 的参数名、响应 JSON 结构、权限、排序、统计字段和副作用。
- 因此会出现接口 200 但功能失效，例如 `/requirements` 起初只接收 `keyword`，忽略 `status/platform/developer/priority/dateStart/dateEnd/minScore/maxScore/isOverdue`。

### 已确认前端 API 清单来源
- 前端集中入口：`frontend/src/api/index.js`
- 旧 Node 路由入口：`backend/routes/*.js`
- 新 Spring Controller：`jkstore_new/oneflow-api/src/main/java/com/oneflow/api/**`

### 已修复契约
- `/auth/login`、`/auth/sso`、`/auth/me`：登录、JWT 权限、bcrypt/RSA 兼容。
- 静态资源路径：前端打包相对路径。
- `/requirements/dashboard`：补齐 throughput、cycle trend、overdue.total、platformRanking、developerHeatmap。
- `/requirements`：补齐首页筛选参数。
- `/requirements/approval-list`：旧 Node 对开发者审批范围按开发人姓名做逗号匹配；Spring 原先用 `developerIds = ? OR developer = ?` 精确匹配，导致多开发人需求漏出。已改为逗号包裹匹配，并改用审批列表专用字段集。
- `/requirements/gantt`：前端导出“实际工期(天)”依赖 `approvedAt -> publishedAt`，旧 Node 在甘特接口中通过 audit_logs 计算 `approvedAt`；Spring 原先没有返回 `approvedAt`，导致导出实际工期为空。已补 `approvedAt` 并把开发人筛选改为逗号匹配。

### 已知验证阻塞
- `jkstore_new/oneflow-api/pom.xml` 父 POM `com.oneflow:backend-services:pom:1.0.0-SNAPSHOT` 无法解析，`parent.relativePath` 指错，导致 Maven 在读 POM 阶段失败，业务测试不能运行。
