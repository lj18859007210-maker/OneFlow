const assert = require('assert');
const requirementModel = require('./models/requirement');
const requirementController = require('./controllers/requirementController');

async function run() {
  assert.strictEqual(typeof requirementController.getDashboard, 'function');
  assert.strictEqual(typeof requirementModel.getDashboardMetrics, 'function');

  const originalGetDashboardMetrics = requirementModel.getDashboardMetrics;
  const dashboard = {
    throughput: [{ label: '2026-06', createdCount: 3, releasedCount: 2 }],
    approvalCycle: { averageHours: 18.5, sampleCount: 2, trend: [] },
    developmentCycle: { averageDays: 4.2, sampleCount: 2, trend: [] },
    overdue: { count: 1, total: 8, rate: 12.5 },
    platformRanking: [],
    developerHeatmap: []
  };

  requirementModel.getDashboardMetrics = async () => dashboard;

  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  try {
    await requirementController.getDashboard({ query: {} }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, { success: true, data: dashboard });
  } finally {
    requirementModel.getDashboardMetrics = originalGetDashboardMetrics;
  }

  console.log('requirement dashboard controller tests passed');
}

run();
