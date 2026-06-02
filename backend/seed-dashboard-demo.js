const db = require('./db/oracle');

const PREFIX = 'demo-dashboard-';
const platforms = ['CRM 系统', 'BOSS 系统', '大数据分析平台', '掌上移动 APP', '网管支撑平台', 'OA 办公系统'];
const developers = ['张伟', '王磊', '李娜', '陈强', '赵敏', '刘洋'];
const submitters = ['市场部', '客服中心', '网络部', '政企中心', '数据运营部', '综合办公室'];
const capabilities = ['流程优化', '数据分析', '客户服务', '系统集成', '移动应用', '自动化'];
const priorities = ['高', '中', '低'];
const statuses = ['待审批', '待评审', '待开发', '开发中', '测试中', '已发布'];
const developerProfiles = [
  { username: 'zhangwei', name: '张伟', email: 'zhangwei@cmcc.cn', department: '前端开发部', skills: ['Vue', 'React', 'TypeScript'], maxLoad: 8, currentLoad: 6 },
  { username: 'wanglei', name: '王磊', email: 'wanglei@cmcc.cn', department: '全栈开发部', skills: ['Vue', 'Node.js', 'Oracle'], maxLoad: 8, currentLoad: 7 },
  { username: 'demo_lina', name: '李娜', email: 'demo-lina@cmcc.cn', department: '数据应用部', skills: ['Python', 'BI', 'ETL'], maxLoad: 7, currentLoad: 5 },
  { username: 'demo_chenqiang', name: '陈强', email: 'demo-chenqiang@cmcc.cn', department: '后端开发部', skills: ['Java', 'Node.js', 'API'], maxLoad: 9, currentLoad: 8 },
  { username: 'demo_zhaomin', name: '赵敏', email: 'demo-zhaomin@cmcc.cn', department: '移动研发部', skills: ['Android', 'iOS', 'Flutter'], maxLoad: 6, currentLoad: 3 },
  { username: 'demo_liuyang', name: '刘洋', email: 'demo-liuyang@cmcc.cn', department: '测试交付部', skills: ['Selenium', 'Jest', 'Cypress'], maxLoad: 8, currentLoad: 4 }
];
const DEMO_PASSWORD_HASH = '$2b$10$ELL0GToHW7bSQG6fAT9ct.orlvFrK94Prve.wIHcTpHzvOS1ZT74e';

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function makeDate(monthIndex, day, hour = 9) {
  return new Date(Date.UTC(2026, monthIndex, day, hour, 0, 0));
}

function pick(list, index) {
  return list[index % list.length];
}

function buildRows() {
  const rows = [];
  let index = 0;

  for (let month = 0; month < 6; month += 1) {
    const count = 8 + month * 2;
    for (let i = 0; i < count; i += 1) {
      index += 1;
      const createdAt = makeDate(month, 2 + (i % 22), 8 + (i % 8));
      const status = pick(statuses, i + month);
      const isReleased = status === '已发布';
      const expectedDate = addDays(createdAt, 12 + (i % 18));
      const releaseLag = 8 + month + (i % 12);
      const updatedAt = isReleased ? addDays(createdAt, releaseLag) : addDays(createdAt, 3 + (i % 10));
      const actualDate = isReleased ? updatedAt : null;
      const approvalLagHours = 6 + ((i + month) % 5) * 8 + month * 2;
      const devStartLagDays = 2 + ((i + month) % 4);
      const releaseLagDays = devStartLagDays + 5 + ((i + month) % 10);

      rows.push({
        id: `${PREFIX}${String(index).padStart(3, '0')}`,
        title: `演示需求 ${String(index).padStart(3, '0')} - ${pick(platforms, i + month)} ${pick(capabilities, i)}`,
        description: `用于数据图表分析的演示需求，覆盖不同月份、平台、状态、评分和开发周期。`,
        submitter: pick(submitters, i + month),
        developer: pick(developers, i * 2 + month),
        platform: pick(platforms, i + month),
        capability: pick(capabilities, i + month),
        expectedDate,
        actualDate,
        avgDevTime: `${releaseLagDays}天`,
        avgMonthlyCalls: 200 + month * 60 + i * 9,
        senderEmail: `demo${index}@cmcc.cn`,
        ccEmails: JSON.stringify([`owner${index % 5}@cmcc.cn`]),
        priority: pick(priorities, i + month),
        score: isReleased || i % 3 !== 0 ? 55 + ((index * 7) % 43) : 0,
        status,
        isDraft: 0,
        steps: JSON.stringify([{ title: '需求受理', done: true }, { title: '方案评估', done: status !== '待审批' }]),
        noteImages: JSON.stringify([]),
        approvalStatus: status === '待审批' ? 'pending' : 'approved',
        approvalComment: status === '待审批' ? null : '演示数据：审批通过',
        createdAt,
        updatedAt,
        approvalAt: new Date(createdAt.getTime() + approvalLagHours * 60 * 60 * 1000),
        devStartAt: addDays(createdAt, devStartLagDays),
        releaseAt: isReleased ? addDays(createdAt, releaseLagDays) : null
      });
    }
  }

  return rows;
}

async function cleanup(connection) {
  try {
    await connection.execute(`DELETE FROM audit_logs WHERE resourceId LIKE :prefix`, { prefix: `${PREFIX}%` });
  } catch (error) {
    if (!String(error.message || '').includes('ORA-00942')) throw error;
  }
  await connection.execute(`DELETE FROM requirements WHERE id LIKE :prefix`, { prefix: `${PREFIX}%` });
}

async function ensureDeveloperProfile(connection, profile, index) {
  const existing = await connection.execute(
    `SELECT id
     FROM users
     WHERE username = :username
        OR email = :email
        OR (name = :name AND (role = 'developer' OR role = 'role-developer'))`,
    { username: profile.username, email: profile.email, name: profile.name }
  );

  let userId = existing.rows?.[0]?.[0];
  if (userId) {
    await connection.execute(
      `UPDATE users
       SET role = 'developer',
           status = 1,
           updatedAt = CURRENT_TIMESTAMP
       WHERE id = :userId`,
      { userId }
    );
  } else {
    userId = `${PREFIX}user-${String(index + 1).padStart(2, '0')}`;
    await connection.execute(
      `INSERT INTO users (id, username, password, name, email, role, status, createdAt, updatedAt)
       VALUES (:id, :username, :password, :name, :email, 'developer', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      {
        id: userId,
        username: profile.username,
        password: DEMO_PASSWORD_HASH,
        name: profile.name,
        email: profile.email
      }
    );
  }

  await connection.execute(
    `MERGE INTO developers d
     USING (SELECT :userId AS userId FROM dual) src
     ON (d.userId = src.userId)
     WHEN MATCHED THEN UPDATE SET
       d.name = :name,
       d.email = :email,
       d.department = :department,
       d.skills = :skills,
       d.maxLoad = :maxLoad,
       d.currentLoad = :currentLoad,
       d.status = 1,
       d.updatedAt = CURRENT_TIMESTAMP
     WHEN NOT MATCHED THEN INSERT
       (id, userId, name, email, department, skills, maxLoad, currentLoad, status, createdAt, updatedAt)
       VALUES
       (:profileId, :userId, :name, :email, :department, :skills, :maxLoad, :currentLoad, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    {
      profileId: `${PREFIX}dev-${String(index + 1).padStart(2, '0')}`,
      userId,
      name: profile.name,
      email: profile.email,
      department: profile.department,
      skills: JSON.stringify(profile.skills),
      maxLoad: profile.maxLoad,
      currentLoad: profile.currentLoad
    }
  );
}

async function seedDeveloperProfiles(connection) {
  for (let i = 0; i < developerProfiles.length; i += 1) {
    await ensureDeveloperProfile(connection, developerProfiles[i], i);
  }
}

async function insertRequirement(connection, row) {
  const binds = {
    id: row.id,
    title: row.title,
    description: row.description,
    submitter: row.submitter,
    developer: row.developer,
    platform: row.platform,
    capability: row.capability,
    expectedDate: row.expectedDate,
    actualDate: row.actualDate,
    avgDevTime: row.avgDevTime,
    avgMonthlyCalls: row.avgMonthlyCalls,
    senderEmail: row.senderEmail,
    ccEmails: row.ccEmails,
    priority: row.priority,
    score: row.score,
    status: row.status,
    isDraft: row.isDraft,
    steps: row.steps,
    noteImages: row.noteImages,
    approvalStatus: row.approvalStatus,
    approvalComment: row.approvalComment,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };

  await connection.execute(
    `INSERT INTO requirements (
      id, title, description, submitter, developer, platform, capability,
      expectedDate, actualDate, avgDevTime, avgMonthlyCalls, senderEmail, ccEmails,
      priority, score, status, isDraft, steps, noteImages, approvalStatus, approvalComment,
      createdAt, updatedAt
    ) VALUES (
      :id, :title, :description, :submitter, :developer, :platform, :capability,
      :expectedDate, :actualDate, :avgDevTime, :avgMonthlyCalls, :senderEmail, :ccEmails,
      :priority, :score, :status, :isDraft, :steps, :noteImages, :approvalStatus, :approvalComment,
      :createdAt, :updatedAt
    )`,
    binds
  );
}

async function insertAuditLog(connection, row, suffix, action, body, createdAt) {
  await connection.execute(
    `INSERT INTO audit_logs (
      id, userId, userName, userRole, action, "resource", resourceId, details,
      ipAddress, userAgent, status, createdAt
    ) VALUES (
      :id, :userId, :userName, :userRole, :action, :res, :resourceId, :details,
      :ipAddress, :userAgent, :status, :createdAt
    )`,
    {
      id: `${row.id}-${suffix}`,
      userId: 'demo-user',
      userName: '演示管理员',
      userRole: 'admin',
      action,
      res: 'requirement',
      resourceId: row.id,
      details: JSON.stringify({ body }),
      ipAddress: '127.0.0.1',
      userAgent: 'seed-dashboard-demo',
      status: 'success',
      createdAt
    }
  );
}

async function seed() {
  let connection;
  try {
    await db.initialize();
    connection = await db.getConnection();
    const rows = buildRows();

    await cleanup(connection);
    await seedDeveloperProfiles(connection);

    for (const row of rows) {
      await insertRequirement(connection, row);
      if (row.approvalStatus === 'approved') {
        await insertAuditLog(connection, row, 'approve', 'approve', { approved: true }, row.approvalAt);
        await insertAuditLog(connection, row, 'dev-start', 'update_status', { status: '开发中' }, row.devStartAt);
      }
      if (row.releaseAt) {
        await insertAuditLog(connection, row, 'release', 'update_status', { status: '已发布' }, row.releaseAt);
      }
    }

    await connection.commit();
    console.log(`已生成 ${rows.length} 条 dashboard 演示需求数据`);
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    console.error('生成 dashboard 演示数据失败:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.close();
    await db.close();
  }
}

seed();
