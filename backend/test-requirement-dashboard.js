const assert = require('assert');
const requirementModel = require('./models/requirement');

function findPoint(points, label) {
  return points.find((item) => item.label === label);
}

function run() {
  assert.strictEqual(typeof requirementModel.buildDashboardMetrics, 'function');

  const requirements = [
    {
      id: 'req-1',
      title: '需求一',
      developer: '张三',
      platform: 'OneFlow',
      status: '已发布',
      expectedDate: new Date('2026-05-18T00:00:00.000Z'),
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-20T00:00:00.000Z')
    },
    {
      id: 'req-2',
      title: '需求二',
      developer: '李四',
      platform: 'OneFlow',
      status: '开发中',
      expectedDate: new Date('2026-05-10T00:00:00.000Z'),
      createdAt: new Date('2026-05-03T00:00:00.000Z'),
      updatedAt: new Date('2026-05-21T00:00:00.000Z')
    },
    {
      id: 'req-3',
      title: '需求三',
      developer: '张三',
      platform: '移动端',
      status: '已发布',
      expectedDate: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-08T00:00:00.000Z')
    }
  ];

  const auditLogs = [
    {
      resourceId: 'req-1',
      action: 'approve',
      createdAt: new Date('2026-05-02T12:00:00.000Z'),
      details: { body: { approved: true } }
    },
    {
      resourceId: 'req-1',
      action: 'update_status',
      createdAt: new Date('2026-05-03T09:00:00.000Z'),
      details: { body: { status: '待开发' } }
    },
    {
      resourceId: 'req-1',
      action: 'update_status',
      createdAt: new Date('2026-05-08T18:00:00.000Z'),
      details: { body: { status: '已发布' } }
    },
    {
      resourceId: 'req-3',
      action: 'approve',
      createdAt: new Date('2026-06-02T00:00:00.000Z'),
      details: { body: { approved: true } }
    },
    {
      resourceId: 'req-3',
      action: 'update_status',
      createdAt: new Date('2026-06-04T00:00:00.000Z'),
      details: { body: { status: '开发中' } }
    },
    {
      resourceId: 'req-3',
      action: 'update_status',
      createdAt: new Date('2026-06-08T00:00:00.000Z'),
      details: { body: { status: '已发布' } }
    }
  ];

  const developerHeatmap = [
    { id: 'dev-1', name: '张三', department: '平台研发', maxLoad: 10, currentLoad: 7, loadPercent: 70 },
    { id: 'dev-2', name: '李四', department: '平台研发', maxLoad: 8, currentLoad: 8, loadPercent: 100 }
  ];

  const dashboard = requirementModel.buildDashboardMetrics({
    requirements,
    auditLogs,
    developerLoadStats: developerHeatmap,
    today: new Date('2026-05-26T00:00:00.000Z')
  });

  assert.strictEqual(dashboard.overdue.count, 1);
  assert.strictEqual(dashboard.overdue.total, 3);
  assert.strictEqual(dashboard.overdue.rate, 33.3);

  assert.strictEqual(dashboard.approvalCycle.sampleCount, 2);
  assert.strictEqual(dashboard.approvalCycle.averageHours, 30);

  assert.strictEqual(dashboard.developmentCycle.sampleCount, 2);
  assert.strictEqual(dashboard.developmentCycle.averageDays, 4.7);

  assert.deepStrictEqual(findPoint(dashboard.throughput, '2026-05'), {
    label: '2026-05',
    createdCount: 2,
    releasedCount: 1
  });
  assert.deepStrictEqual(findPoint(dashboard.throughput, '2026-06'), {
    label: '2026-06',
    createdCount: 1,
    releasedCount: 1
  });

  assert.deepStrictEqual(dashboard.platformRanking[0], {
    platform: 'OneFlow',
    total: 2,
    released: 1,
    releaseRate: 50
  });

  assert.strictEqual(dashboard.developerHeatmap.length, 2);
  assert.strictEqual(dashboard.developerHeatmap[0].name, '李四');
  assert.strictEqual(dashboard.developerHeatmap[0].loadLevel, 'high');

  console.log('requirement dashboard tests passed');
}

run();
