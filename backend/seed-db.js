const db = require('./db/oracle');
const { v4: uuidv4 } = require('uuid');

const STATUS = {
  PENDING_APPROVAL: '待审批',
  PENDING_REVIEW: '待评审',
  PENDING_DEV: '待开发',
  IN_DEV: '开发中',
  IN_TEST: '测试中',
  RELEASED: '已发布'
};

const initialData = [];

async function seed() {
  try {
    // 等服务启动后再连接
    await new Promise(resolve => setTimeout(resolve, 2000));
    await db.initialize();
    const conn = await db.getConnection();
    
    for (let i = 0; i < initialData.length; i++) {
      const data = initialData[i];
      const ccEmails = JSON.stringify(data.ccEmails);
      
      try {
        await conn.execute(
          `INSERT INTO requirements (
            id, title, description, submitter, developer,
            priority, score, status, ccEmails,
            approvalStatus, approvalComment,
            createdAt, updatedAt
          ) VALUES (
            :id, :title, :description, :submitter, :developer,
            :priority, :score, :status, :ccEmails,
            :approvalStatus, :approvalComment,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )`,
          {
            id: data.id,
            title: data.title,
            description: data.description,
            submitter: data.submitter,
            developer: data.developer,
            priority: data.priority,
            score: data.score,
            status: data.status,
            ccEmails: ccEmails,
            approvalStatus: data.approvalStatus,
            approvalComment: data.approvalComment
          }
        );
        console.log(`[${i + 1}/${initialData.length}] 插入成功：${data.title}`);
      } catch (err) {
        console.log(`[${i + 1}/${initialData.length}] 可能已存在：${data.title}`);
      }
    }
    
    await conn.commit();
    await conn.close();
    await db.close();
    console.log('种子数据初始化完成');
  } catch (err) {
    console.error('错误:', err.message);
  }
}

seed();
