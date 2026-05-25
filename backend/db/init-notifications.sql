-- 创建通知表
CREATE TABLE notifications (
  id VARCHAR2(36) PRIMARY KEY,
  userId VARCHAR2(36) NOT NULL,
  userName NVARCHAR2(100),
  type NVARCHAR2(50) NOT NULL,
  title NVARCHAR2(200) NOT NULL,
  content NCLOB,
  resourceId VARCHAR2(36),
  resourceType NVARCHAR2(50),
  isRead NUMBER DEFAULT 0,
  readAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_notifications_userId ON notifications(userId);
CREATE INDEX idx_notifications_isRead ON notifications(isRead);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_createdAt ON notifications(createdAt);
