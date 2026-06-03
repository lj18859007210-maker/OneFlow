const assert = require('assert');

const db = require('./db/oracle');
const developerModel = require('./models/developer');

async function run() {
  assert.strictEqual(
    typeof developerModel.getAssignable,
    'function',
    'developer model should expose getAssignable for requirement assignment'
  );

  const originalGetConnection = db.getConnection;
  const calls = [];

  db.getConnection = async () => ({
    async execute(sql, params) {
      calls.push({ sql, params });
      return {
        rows: [
          {
            USERID: 'user-dev-1',
            PROFILEID: 'profile-dev-1',
            USERNAME: 'zhangsan',
            NAME: '张三',
            EMAIL: 'zhangsan@example.com',
            ROLE: 'developer',
            STATUS: 1,
            CREATEDAT: null,
            UPDATEDAT: null,
            DEPARTMENT: '研发部',
            SKILLS: '["Vue","Node.js"]',
            MAXLOAD: 5,
            CURRENTLOAD: 2
          },
          {
            USERID: 'user-admin-1',
            PROFILEID: null,
            USERNAME: 'admin',
            NAME: '管理员',
            EMAIL: 'admin@example.com',
            ROLE: 'admin',
            STATUS: 1,
            CREATEDAT: null,
            UPDATEDAT: null,
            DEPARTMENT: null,
            SKILLS: null,
            MAXLOAD: 5,
            CURRENTLOAD: 0
          }
        ]
      };
    },
    async close() {}
  });

  try {
    const developers = await developerModel.getAssignable();
    assert.strictEqual(calls.length, 1);
    assert.match(calls[0].sql, /FROM users u/);
    assert.match(calls[0].sql, /LEFT JOIN developers d ON d\.userId = u\.id/);
    assert.match(calls[0].sql, /u\.role IN \('developer', 'role-developer', 'admin', 'role-admin'\)/);
    assert.match(calls[0].sql, /u\.status = :status/);
    assert.deepStrictEqual(calls[0].params, { status: 1 });
    assert.deepStrictEqual(developers, [
      {
        id: 'user-dev-1',
        userId: 'user-dev-1',
        profileId: 'profile-dev-1',
        name: '张三',
        username: 'zhangsan',
        email: 'zhangsan@example.com',
        role: 'developer',
        department: '研发部',
        skills: ['Vue', 'Node.js'],
        maxLoad: 5,
        currentLoad: 2,
        status: 1,
        createdAt: null,
        updatedAt: null
      },
      {
        id: 'user-admin-1',
        userId: 'user-admin-1',
        profileId: null,
        name: '管理员',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        department: '管理员',
        skills: [],
        maxLoad: 5,
        currentLoad: 0,
        status: 1,
        createdAt: null,
        updatedAt: null
      }
    ]);

    calls.length = 0;
    await developerModel.getAll();
    assert.strictEqual(calls.length, 1);
    assert.match(calls[0].sql, /u\.role IN \('developer', 'role-developer'\)/);
    assert.doesNotMatch(calls[0].sql, /'admin'/);
  } finally {
    db.getConnection = originalGetConnection;
  }

  console.log('developer assignable tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
