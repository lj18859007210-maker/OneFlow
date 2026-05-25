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
