const db = require('./db/oracle');
const fs = require('fs');

const sqlStatements = [
  `CREATE TABLE requirements (
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
    postDevAvgTime NVARCHAR2(50),
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
    publishedAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX idx_requirements_submitter ON requirements(submitter)`,
  `CREATE INDEX idx_requirements_isDraft ON requirements(isDraft)`,
  `CREATE INDEX idx_requirements_status ON requirements(status)`,
  `CREATE INDEX idx_requirements_createdAt ON requirements(createdAt)`,
  `CREATE OR REPLACE TRIGGER trg_requirements_update
   BEFORE UPDATE ON requirements
   FOR EACH ROW
   BEGIN
     :NEW.updatedAt := CURRENT_TIMESTAMP;
   END;`
];

async function run() {
  try {
    await db.initialize();
    const conn = await db.getConnection();
    
    for (let i = 0; i < sqlStatements.length; i++) {
      try {
        await conn.execute(sqlStatements[i]);
        console.log(`[${i + 1}/${sqlStatements.length}] 执行成功`);
      } catch (err) {
        console.log(`[${i + 1}/${sqlStatements.length}] 执行语句: ${err.message}`);
      }
    }
    
    await conn.commit();
    await conn.close();
    await db.close();
    console.log('数据库初始化完成');
  } catch (err) {
    console.error('错误:', err.message);
  }
}

run();
