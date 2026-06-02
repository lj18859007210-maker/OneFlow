export function createEmptyDashboard() {
  return {
    throughput: [],
    approvalCycle: { averageHours: 0, sampleCount: 0, trend: [] },
    developmentCycle: { averageDays: 0, sampleCount: 0, trend: [] },
    overdue: { count: 0, total: 0, rate: 0 },
    platformRanking: [],
    developerHeatmap: []
  }
}

export function buildChartSummary({ statusStats = {}, dashboard = createEmptyDashboard(), avgScore = 0 } = {}) {
  const numericAvgScore = Number(avgScore) || 0
  const activeStatuses = ['待审批', '待评审', '待开发', '开发中', '测试中']
  const inProgress = activeStatuses.reduce((sum, status) => sum + (Number(statusStats[status]) || 0), 0)

  const createdTotal = (dashboard.throughput || []).reduce((sum, item) => sum + (Number(item.createdCount) || 0), 0)
  const releasedTotal = (dashboard.throughput || []).reduce((sum, item) => sum + (Number(item.releasedCount) || 0), 0)

  return {
    inProgress,
    released: Number(statusStats['已发布']) || releasedTotal,
    avgScore: numericAvgScore > 0 ? numericAvgScore.toFixed(1) : '-',
    overdueRate: `${Number(dashboard.overdue?.rate || 0).toFixed(1)}%`,
    throughputDelta: createdTotal - releasedTotal,
    topPlatform: dashboard.platformRanking?.[0]?.platform || '暂无'
  }
}
