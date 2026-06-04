const assert = require('assert');
const db = require('./db/oracle');
const userModel = require('./models/userModel');

async function run() {
  const executed = [];
  let committed = false;
  let closed = false;
  const originalGetConnection = db.getConnection;

  db.getConnection = async () => ({
    async execute(sql, params) {
      executed.push({ sql, params });

      if (/SELECT id, name, email FROM users WHERE id = :id/i.test(sql)) {
        return {
          rows: [{
            ID: 'user-1',
            NAME: 'Alice',
            EMAIL: 'old@example.com'
          }]
        };
      }

      if (/SELECT id, username, name, email, role, status, createdAt, updatedAt/i.test(sql)) {
        return {
          rows: [{
            ID: 'user-1',
            USERNAME: 'alice',
            NAME: 'Alice',
            EMAIL: 'new@example.com',
            ROLE: 'user',
            STATUS: 1
          }]
        };
      }

      return { rows: [] };
    },
    async commit() {
      committed = true;
    },
    async close() {
      closed = true;
    }
  });

  try {
    const result = await userModel.updateEmail('user-1', ' new@example.com ');

    assert.strictEqual(result.EMAIL, 'new@example.com');
    assert.strictEqual(committed, true);
    assert.strictEqual(closed, true);
    assert.match(executed[1].sql, /UPDATE users SET email = :email/i);
    assert.strictEqual(executed[1].params.email, 'new@example.com');
    assert.match(executed[2].sql, /UPDATE developers/i);
    assert.strictEqual(executed[2].params.previousEmail, 'old@example.com');

    await assert.rejects(
      () => userModel.updateEmail('user-1', 'not-an-email'),
      /Invalid email/
    );
  } finally {
    db.getConnection = originalGetConnection;
  }

  console.log('user update email tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
