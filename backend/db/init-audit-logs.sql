-- 创建审计日志表
CREATE TABLE audit_logs (
  id VARCHAR2(36) PRIMARY KEY,
  userId VARCHAR2(36),
  userName NVARCHAR2(100),
  userRole NVARCHAR2(20),
  action NVARCHAR2(100) NOT NULL,
  resource NVARCHAR2(100),
  resourceId VARCHAR2(36),
  details NCLOB,
  ipAddress VARCHAR2(45),
  userAgent NVARCHAR2(500),
  status NVARCHAR2(20) DEFAULT 'success',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_createdAt ON audit_logs(createdAt);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
