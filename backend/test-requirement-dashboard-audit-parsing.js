const assert = require('assert');
const requirementModel = require('./models/requirement');

function createControlledLob(payload) {
  const handlers = {};
  return {
    on(event, handler) {
      handlers[event] = handler;
      return this;
    },
    hasHandler(event) {
      return typeof handlers[event] === 'function';
    },
    flush() {
      handlers.data(payload);
      handlers.end();
    }
  };
}

async function run() {
  assert.strictEqual(typeof requirementModel.parseDashboardAuditRows, 'function');

  const lobs = [
    createControlledLob(JSON.stringify({ body: { approved: true } })),
    createControlledLob(JSON.stringify({ body: { status: '开发中' } })),
    createControlledLob(JSON.stringify({ body: { status: '已发布' } }))
  ];

  const parsePromise = requirementModel.parseDashboardAuditRows(lobs.map((lob, index) => ({
    ACTION: index === 0 ? 'approve' : 'update_status',
    RESOURCEID: `req-${index + 1}`,
    DETAILS: lob,
    CREATEDAT: new Date(`2026-06-0${index + 1}T00:00:00.000Z`)
  })));

  await Promise.resolve();

  assert.strictEqual(
    lobs.every((lob) => lob.hasHandler('data') && lob.hasHandler('end')),
    true,
    'dashboard audit parsing should begin reading all detail LOBs before waiting for the first one'
  );

  lobs.forEach((lob) => lob.flush());
  const logs = await parsePromise;

  assert.deepStrictEqual(logs.map((log) => log.resourceId), ['req-1', 'req-2', 'req-3']);
  assert.deepStrictEqual(logs[1].details, { body: { status: '开发中' } });

  const directTextLogs = await requirementModel.parseDashboardAuditRows([{
    ACTION: 'approve',
    RESOURCEID: 'req-text',
    DETAILSTEXT: JSON.stringify({ body: { approved: true } }),
    CREATEDAT: new Date('2026-06-04T00:00:00.000Z')
  }]);

  assert.deepStrictEqual(directTextLogs[0].details, { body: { approved: true } });
  console.log('requirement dashboard audit parsing tests passed');
}

run();
