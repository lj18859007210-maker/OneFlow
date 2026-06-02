import assert from 'node:assert'
import { buildChartSummary, createEmptyDashboard } from './dashboardAnalytics.js'

function run() {
  const empty = createEmptyDashboard()
  assert.deepStrictEqual(empty.throughput, [])
  assert.strictEqual(empty.overdue.rate, 0)

  const summary = buildChartSummary({
    statusStats: {
      '待审批': 2,
      '待评审': 1,
      '待开发': 3,
      '开发中': 4,
      '测试中': 5,
      '已发布': 9
    },
    avgScore: '82.46',
    dashboard: {
      ...empty,
      throughput: [
        { label: '2026-05', createdCount: 10, releasedCount: 6 },
        { label: '2026-06', createdCount: 8, releasedCount: 5 }
      ],
      overdue: { count: 2, total: 24, rate: 8.3 },
      platformRanking: [{ platform: 'OneFlow', total: 8, released: 5 }]
    }
  })

  assert.deepStrictEqual(summary, {
    inProgress: 15,
    released: 9,
    avgScore: '82.5',
    overdueRate: '8.3%',
    throughputDelta: 7,
    topPlatform: 'OneFlow'
  })

  console.log('dashboard analytics tests passed')
}

run()
