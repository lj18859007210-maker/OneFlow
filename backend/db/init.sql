-- 创建用户表
CREATE TABLE users (
  id VARCHAR2(36) PRIMARY KEY,
  username NVARCHAR2(50) NOT NULL UNIQUE,
  password VARCHAR2(100) NOT NULL,
  name NVARCHAR2(100) NOT NULL,
  email NVARCHAR2(200),
  role NVARCHAR2(20) DEFAULT 'user',
  status NUMBER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);

-- 创建触发器，自动更新 updatedAt
CREATE OR REPLACE TRIGGER trg_users_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

-- 插入默认用户 (密码: admin, bcrypt hash)
INSERT INTO users (id, username, password, name, email, role, status)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin', '$2b$10$ELL0GToHW7bSQG6fAT9ct.orlvFrK94Prve.wIHcTpHzvOS1ZT74e', '管理员', 'admin@cmcc.cn', 'admin', 1);

-- 创建需求表
CREATE TABLE requirements (
  id VARCHAR2(36) PRIMARY KEY,
  title NVARCHAR2(200) NOT NULL,
  description NCLOB,
  submitter NVARCHAR2(100),
  developer NVARCHAR2(100),
  platform NVARCHAR2(100),
  capability NVARCHAR2(50),
  expectedDate DATE,
  actualDate DATE,
  avgDevTime NVARCHAR2(50),
  avgMonthlyCalls NUMBER,
  senderEmail NVARCHAR2(200),
  ccEmails NCLOB,
  priority NVARCHAR2(20) DEFAULT '中',
  score NUMBER DEFAULT 0,
  status NVARCHAR2(50) DEFAULT '待审批',
  isDraft NUMBER DEFAULT 0,
  steps NCLOB,
  noteImages NCLOB,
  approvalStatus NVARCHAR2(20) DEFAULT 'pending',
  approvalComment NCLOB,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_requirements_submitter ON requirements(submitter);
CREATE INDEX idx_requirements_isDraft ON requirements(isDraft);
CREATE INDEX idx_requirements_status ON requirements(status);
CREATE INDEX idx_requirements_createdAt ON requirements(createdAt);

-- 创建触发器，自动更新 updatedAt
CREATE OR REPLACE TRIGGER trg_requirements_update
BEFORE UPDATE ON requirements
FOR EACH ROW
BEGIN
  :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/
