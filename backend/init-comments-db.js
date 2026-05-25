const db = require('./db/oracle');

const sqlStatements = [
  `CREATE TABLE requirement_comments (
    id VARCHAR2(36) PRIMARY KEY,
    requirementId VARCHAR2(36) NOT NULL,
    userId VARCHAR2(36) NOT NULL,
    userName NVARCHAR2(100) NOT NULL,
    userRole NVARCHAR2(50) NOT NULL,
    type NVARCHAR2(50) NOT NULL,
    content NCLOB NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_requirement FOREIGN KEY (requirementId) REFERENCES requirements(id)
  )`,
  `CREATE INDEX idx_comments_requirementId ON requirement_comments(requirementId)`,
  `CREATE INDEX idx_comments_createdAt ON requirement_comments(createdAt)`
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
    console.log('评论表初始化完成');
  } catch (err) {
    console.error('错误:', err.message);
  }
}

run();
