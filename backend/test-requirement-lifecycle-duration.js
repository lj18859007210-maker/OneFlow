const assert = require('assert');
const requirementModel = require('./models/requirement');

function run() {
  assert.strictEqual(typeof requirementModel.buildRequirementLifecycleTiming, 'function');

  const timing = requirementModel.buildRequirementLifecycleTiming({
    requirement: {
      status: requirementModel.STATUS.RELEASED,
      updatedAt: new Date('2026-06-04T10:00:00.000Z'),
      publishedAt: new Date('2026-06-04T10:00:00.000Z')
    },
    auditLogs: [
      {
        action: 'approve',
        createdAt: new Date('2026-06-01T09:00:00.000Z'),
        details: { body: { approved: true } }
      },
      {
        action: 'update_status',
        createdAt: new Date('2026-06-03T15:00:00.000Z'),
        details: { body: { status: requirementModel.STATUS.IN_TEST } }
      },
      {
        action: 'update_status',
        createdAt: new Date('2026-06-04T10:00:00.000Z'),
        details: { body: { status: requirementModel.STATUS.RELEASED } }
      }
    ]
  });

  assert.strictEqual(timing.preDevelopmentHours, 54);
  assert.strictEqual(timing.postDevelopmentHours, 19);
  assert.strictEqual(timing.approvedAt.toISOString(), '2026-06-01T09:00:00.000Z');
  assert.strictEqual(timing.testingAt.toISOString(), '2026-06-03T15:00:00.000Z');
  assert.strictEqual(timing.releasedAt.toISOString(), '2026-06-04T10:00:00.000Z');

  const inTesting = requirementModel.buildRequirementLifecycleTiming({
    requirement: {
      status: requirementModel.STATUS.IN_TEST,
      updatedAt: new Date('2026-06-03T15:00:00.000Z')
    },
    auditLogs: [
      {
        action: 'approve',
        createdAt: new Date('2026-06-01T09:00:00.000Z'),
        details: { body: { approved: true } }
      },
      {
        action: 'update_status',
        createdAt: new Date('2026-06-03T15:00:00.000Z'),
        details: { body: { status: requirementModel.STATUS.IN_TEST } }
      }
    ]
  });

  assert.strictEqual(inTesting.preDevelopmentHours, 54);
  assert.strictEqual(inTesting.postDevelopmentHours, null);

  console.log('requirement lifecycle duration tests passed');
}

run();
