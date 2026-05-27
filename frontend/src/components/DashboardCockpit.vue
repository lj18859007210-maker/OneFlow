<template>
  <section class="cockpit-shell">
    <div class="cockpit-header">
      <div>
        <div class="cockpit-eyebrow">Management Cockpit</div>
        <h2 class="cockpit-title">数据大屏 2.0</h2>
        <p class="cockpit-subtitle">聚焦需求吞吐、流程时效、交付风险和研发负载。</p>
      </div>
      <div class="cockpit-header-stats">
        <div class="cockpit-chip">
          <span>审批样本</span>
          <strong>{{ data.approvalCycle.sampleCount }}</strong>
        </div>
        <div class="cockpit-chip">
          <span>开发样本</span>
          <strong>{{ data.developmentCycle.sampleCount }}</strong>
        </div>
      </div>
    </div>

    <div class="cockpit-grid">
      <article class="cockpit-panel cockpit-panel-wide">
        <div class="cockpit-panel-head">
          <div>
            <div class="cockpit-panel-label">需求吞吐量</div>
            <div class="cockpit-panel-value">{{ totalCreated }} / {{ totalReleased }}</div>
          </div>
          <div class="cockpit-panel-hint">新建 / 已发布</div>
        </div>
        <div ref="throughputChartRef" class="cockpit-chart cockpit-chart-lg"></div>
      </article>

      <article class="cockpit-panel">
        <div class="cockpit-panel-head">
          <div>
            <div class="cockpit-panel-label">平均审批耗时</div>
            <div class="cockpit-panel-value">{{ formatHours(data.approvalCycle.averageHours) }}</div>
          </div>
          <div class="cockpit-panel-hint">创建到审批完成</div>
        </div>
        <div ref="approvalTrendRef" class="cockpit-chart cockpit-chart-sm"></div>
      </article>

      <article class="cockpit-panel">
        <div class="cockpit-panel-head">
          <div>
            <div class="cockpit-panel-label">平均开发耗时</div>
            <div class="cockpit-panel-value">{{ formatDays(data.developmentCycle.averageDays) }}</div>
          </div>
          <div class="cockpit-panel-hint">进入开发到已发布</div>
        </div>
        <div ref="developmentTrendRef" class="cockpit-chart cockpit-chart-sm"></div>
      </article>

      <article class="cockpit-panel">
        <div class="cockpit-panel-head">
          <div>
            <div class="cockpit-panel-label">逾期率</div>
            <div class="cockpit-panel-value">{{ data.overdue.rate.toFixed(1) }}%</div>
          </div>
          <div class="cockpit-panel-hint">{{ data.overdue.count }} / {{ data.overdue.total }}</div>
        </div>
        <div class="overdue-progress">
          <div class="overdue-progress-track">
            <div class="overdue-progress-fill" :style="{ width: `${Math.min(data.overdue.rate, 100)}%` }"></div>
          </div>
          <div class="overdue-footnote">未发布且期望日期已逾期的需求占比</div>
        </div>
      </article>

      <article class="cockpit-panel">
        <div class="cockpit-panel-head">
          <div>
            <div class="cockpit-panel-label">平台排行</div>
            <div class="cockpit-panel-value">{{ topPlatformName }}</div>
          </div>
          <div class="cockpit-panel-hint">按需求总量排序</div>
        </div>
        <div ref="platformChartRef" class="cockpit-chart cockpit-chart-md"></div>
      </article>

      <article class="cockpit-panel cockpit-panel-wide">
        <div class="cockpit-panel-head">
          <div>
            <div class="cockpit-panel-label">开发人员负载热力图</div>
            <div class="cockpit-panel-value">{{ data.developerHeatmap.length }} 人</div>
          </div>
          <div class="cockpit-panel-hint">当前负载百分比</div>
        </div>
        <div ref="heatmapChartRef" class="cockpit-chart cockpit-chart-md"></div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, HeatmapChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  HeatmapChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer
])

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      throughput: [],
      approvalCycle: { averageHours: 0, sampleCount: 0, trend: [] },
      developmentCycle: { averageDays: 0, sampleCount: 0, trend: [] },
      overdue: { count: 0, total: 0, rate: 0 },
      platformRanking: [],
      developerHeatmap: []
    })
  }
})

const throughputChartRef = ref(null)
const approvalTrendRef = ref(null)
const developmentTrendRef = ref(null)
const platformChartRef = ref(null)
const heatmapChartRef = ref(null)

let throughputChart = null
let approvalTrendChart = null
let developmentTrendChart = null
let platformChart = null
let heatmapChart = null

const totalCreated = computed(() => props.data.throughput.reduce((sum, item) => sum + (Number(item.createdCount) || 0), 0))
const totalReleased = computed(() => props.data.throughput.reduce((sum, item) => sum + (Number(item.releasedCount) || 0), 0))
const topPlatformName = computed(() => props.data.platformRanking[0]?.platform || '暂无')

function formatHours(value) {
  return `${Number(value || 0).toFixed(1)} h`
}

function formatDays(value) {
  return `${Number(value || 0).toFixed(1)} d`
}

function initCharts() {
  if (throughputChartRef.value && !throughputChart) throughputChart = echarts.init(throughputChartRef.value)
  if (approvalTrendRef.value && !approvalTrendChart) approvalTrendChart = echarts.init(approvalTrendRef.value)
  if (developmentTrendRef.value && !developmentTrendChart) developmentTrendChart = echarts.init(developmentTrendRef.value)
  if (platformChartRef.value && !platformChart) platformChart = echarts.init(platformChartRef.value)
  if (heatmapChartRef.value && !heatmapChart) heatmapChart = echarts.init(heatmapChartRef.value)
}

function updateThroughputChart() {
  if (!throughputChart) return
  const labels = props.data.throughput.map((item) => item.label)
  const created = props.data.throughput.map((item) => Number(item.createdCount) || 0)
  const released = props.data.throughput.map((item) => Number(item.releasedCount) || 0)

  throughputChart.setOption({
    color: ['#22c55e', '#38bdf8'],
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#7c8aa5' }
    },
    grid: { top: 42, left: 36, right: 18, bottom: 24 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.35)' } },
      axisLabel: { color: '#6b7280' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
      axisLabel: { color: '#6b7280' }
    },
    series: [
      {
        name: '新建',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(56, 189, 248, 0.12)' },
        data: created
      },
      {
        name: '已发布',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(34, 197, 94, 0.12)' },
        data: released
      }
    ]
  })
}

function updateSparkline(chart, points, color) {
  if (!chart) return
  chart.setOption({
    animationDuration: 400,
    grid: { top: 8, left: 2, right: 2, bottom: 6 },
    xAxis: {
      type: 'category',
      data: points.map((item) => item.label),
      show: false
    },
    yAxis: { type: 'value', show: false },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const item = params?.[0]
        if (!item) return ''
        return `${item.axisValue}<br/>${item.value}`
      }
    },
    series: [{
      type: 'line',
      smooth: true,
      data: points.map((item) => item.value),
      showSymbol: false,
      lineStyle: { width: 3, color },
      areaStyle: { color: `${color}22` }
    }]
  })
}

function updatePlatformChart() {
  if (!platformChart) return
  const topPlatforms = props.data.platformRanking.slice(0, 6)
  platformChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 8, left: 72, right: 18, bottom: 8, containLabel: false },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
      axisLabel: { color: '#6b7280' }
    },
    yAxis: {
      type: 'category',
      data: topPlatforms.map((item) => item.platform),
      axisLabel: { color: '#4b5563' },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    series: [
      {
        name: '总量',
        type: 'bar',
        data: topPlatforms.map((item) => item.total),
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: '#60a5fa'
        },
        barWidth: 14
      },
      {
        name: '已发布',
        type: 'bar',
        data: topPlatforms.map((item) => item.released),
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: '#22c55e'
        },
        barWidth: 14
      }
    ]
  })
}

function updateHeatmapChart() {
  if (!heatmapChart) return
  const list = props.data.developerHeatmap
  heatmapChart.setOption({
    tooltip: {
      formatter: (params) => {
        const item = list[params.data?.[0]] || {}
        return `${item.name || ''}<br/>部门：${item.department || '-'}<br/>负载：${item.currentLoad || 0}/${item.maxLoad || 0}<br/>占比：${item.loadPercent || 0}%`
      }
    },
    grid: { top: 10, left: 20, right: 20, bottom: 46 },
    xAxis: {
      type: 'category',
      data: list.map((item) => item.name),
      axisLabel: { color: '#6b7280', interval: 0, rotate: 30 },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    yAxis: {
      type: 'category',
      data: ['当前负载'],
      axisLabel: { color: '#6b7280' },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    visualMap: {
      min: 0,
      max: 100,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      calculable: false,
      textStyle: { color: '#6b7280' },
      inRange: {
        color: ['#dbeafe', '#60a5fa', '#f59e0b', '#ef4444']
      }
    },
    series: [{
      type: 'heatmap',
      data: list.map((item, index) => [index, 0, Number(item.loadPercent) || 0]),
      label: {
        show: true,
        color: '#0f172a',
        formatter: (params) => `${params.data?.[2] || 0}%`
      },
      itemStyle: {
        borderRadius: 10,
        borderColor: 'rgba(255,255,255,0.7)',
        borderWidth: 2
      }
    }]
  })
}

function updateCharts() {
  updateThroughputChart()
  updateSparkline(approvalTrendChart, props.data.approvalCycle.trend || [], '#f97316')
  updateSparkline(developmentTrendChart, props.data.developmentCycle.trend || [], '#8b5cf6')
  updatePlatformChart()
  updateHeatmapChart()
}

function resizeCharts() {
  ;[throughputChart, approvalTrendChart, developmentTrendChart, platformChart, heatmapChart]
    .filter(Boolean)
    .forEach((instance) => instance.resize())
}

function disposeCharts() {
  ;[throughputChart, approvalTrendChart, developmentTrendChart, platformChart, heatmapChart]
    .filter(Boolean)
    .forEach((instance) => instance.dispose())
  throughputChart = null
  approvalTrendChart = null
  developmentTrendChart = null
  platformChart = null
  heatmapChart = null
}

watch(() => props.data, async () => {
  await nextTick()
  initCharts()
  updateCharts()
}, { deep: true, immediate: true })

onMounted(async () => {
  await nextTick()
  initCharts()
  updateCharts()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})
</script>

<style scoped>
.cockpit-shell {
  margin-bottom: 24px;
  padding: 22px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.98));
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.08);
}

.cockpit-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.cockpit-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0ea5e9;
}

.cockpit-title {
  margin: 6px 0 4px;
  font-size: 28px;
  color: #0f172a;
}

.cockpit-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.cockpit-header-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.cockpit-chip {
  min-width: 104px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.cockpit-chip span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.cockpit-chip strong {
  display: block;
  margin-top: 4px;
  font-size: 24px;
  color: #0f172a;
}

.cockpit-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}

.cockpit-panel {
  grid-column: span 4;
  min-height: 236px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(148, 163, 184, 0.14);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.cockpit-panel-wide {
  grid-column: span 8;
}

.cockpit-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.cockpit-panel-label {
  font-size: 13px;
  color: #64748b;
}

.cockpit-panel-value {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.cockpit-panel-hint {
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}

.cockpit-chart {
  width: 100%;
}

.cockpit-chart-lg {
  height: 280px;
}

.cockpit-chart-md {
  height: 180px;
}

.cockpit-chart-sm {
  height: 122px;
}

.overdue-progress {
  display: flex;
  min-height: 140px;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
}

.overdue-progress-track {
  height: 16px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  overflow: hidden;
}

.overdue-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f59e0b, #ef4444);
}

.overdue-footnote {
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .cockpit-panel,
  .cockpit-panel-wide {
    grid-column: span 6;
  }
}

@media (max-width: 760px) {
  .cockpit-shell {
    padding: 16px;
  }

  .cockpit-header {
    flex-direction: column;
  }

  .cockpit-grid {
    grid-template-columns: 1fr;
  }

  .cockpit-panel,
  .cockpit-panel-wide {
    grid-column: auto;
    min-height: 220px;
  }

  .cockpit-title {
    font-size: 24px;
  }
}
</style>
