const db = require('./db/oracle');

async function init() {
  await db.initialize();
  const conn = await db.getConnection();
  
  try {
    await conn.execute(`CREATE TABLE requirements (
      id VARCHAR2(36) PRIMARY KEY,
      title NVARCHAR2(200) NOT NULL,
      description NCLOB,
      submitter NVARCHAR2(100),
      developer NVARCHAR2(100),
      platform NVARCHAR2(100),
      capability NVARCHAR2(50),
      expectedDate DATE,
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
    )`);
    console.log('表创建成功');
  } catch (e) {
    console.log('表可能已存在:', e.message);
  }
  
  const indexes = [
    'CREATE INDEX idx_requirements_submitter ON requirements(submitter)',
    'CREATE INDEX idx_requirements_isDraft ON requirements(isDraft)',
    'CREATE INDEX idx_requirements_status ON requirements(status)',
    'CREATE INDEX idx_requirements_createdAt ON requirements(createdAt)'
  ];
  
  for (let i = 0; i < indexes.length; i++) {
    try {
      await conn.execute(indexes[i]);
      console.log(`索引 ${i+1} 创建成功`);
    } catch (e) {
      console.log(`索引 ${i+1} 可能已存在`);
    }
  }
  
  await conn.commit();
  await conn.close();
  await db.close();
  console.log('Oracle 数据库初始化完成');
}

init().catch(e => console.error('错误:', e.message));
