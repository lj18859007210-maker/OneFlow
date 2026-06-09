const assert = require('assert');
const db = require('./db/oracle');
const requirementModel = require('./models/requirement');

async function run() {
  const executedSql = [];
  const connection = {
    async execute(sql) {
      executedSql.push(sql.replace(/\s+/g, ' ').trim());
      if (/DELETE FROM requirements/i.test(sql)) {
        return { rowsAffected: 1 };
      }
      return { rowsAffected: 0 };
    },
    async commit() {},
    async close() {}
  };

  const originalGetConnection = db.getConnection;
  db.getConnection = async () => connection;

  try {
    const removed = await requirementModel.remove('req-1');
    assert.strictEqual(removed, true);

    const joined = executedSql.join('\n');
    assert.match(joined, /DELETE FROM requirement_comments WHERE requirementId = :id/);
    assert.match(joined, /DELETE FROM requirement_attachment_versions/);
    assert.match(joined, /DELETE FROM requirement_attachments WHERE requirementId = :id/);
    assert.match(joined, /DELETE FROM requirements WHERE id = :id/);
  } finally {
    db.getConnection = originalGetConnection;
  }

  console.log('requirement remove related records tests passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
