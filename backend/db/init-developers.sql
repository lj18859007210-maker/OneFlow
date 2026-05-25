-- 创建开发人员表
CREATE TABLE developers (
  id VARCHAR2(36) PRIMARY KEY,
  name NVARCHAR2(100) NOT NULL,
  email NVARCHAR2(200),
  department NVARCHAR2(100),
  skills NCLOB,
  maxLoad NUMBER DEFAULT 5,
  currentLoad NUMBER DEFAULT 0,
  status NUMBER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_developers_name ON developers(name);
CREATE INDEX idx_developers_department ON developers(department);
CREATE INDEX idx_developers_status ON developers(status);

-- 创建触发器，自动更新 updatedAt
CREATE OR REPLACE TRIGGER trg_developers_update
BEFORE UPDATE ON developers
FOR EACH ROW
BEGIN
  :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

-- 插入默认开发人员数据
INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status)
VALUES ('dev-001', '张伟', 'zhangwei@cmcc.cn', '前端开发部', '["Vue", "React", "TypeScript"]', 5, 0, 1);

INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status)
VALUES ('dev-002', '李强', 'liqiang@cmcc.cn', '后端开发部', '["Node.js", "Java", "Oracle"]', 5, 0, 1);

INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status)
VALUES ('dev-003', '王磊', 'wanglei@cmcc.cn', '全栈开发部', '["Vue", "Node.js", "Python"]', 5, 0, 1);

INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status)
VALUES ('dev-004', '陈勇', 'chenyong@cmcc.cn', '平台架构部', '["Java", "Microservices", "Docker"]', 5, 0, 1);

INSERT INTO developers (id, name, email, department, skills, maxLoad, currentLoad, status)
VALUES ('dev-005', '刘洋', 'liuyang@cmcc.cn', '质量测试部', '["Selenium", "Jest", "Cypress"]', 5, 0, 1);

COMMIT;
