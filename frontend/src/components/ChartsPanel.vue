<template>
  <section class="charts-panel" :class="{ 'charts-panel-active': expanded }">
    <button class="charts-panel-header" type="button" @click="toggleExpand">
      <div class="charts-panel-header-main">
        <div class="charts-panel-title">
          <span class="charts-panel-icon-wrap">
            <svg class="charts-panel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 20V10"/>
              <path d="M12 20V4"/>
              <path d="M6 20v-6"/>
            </svg>
          </span>
          <span class="charts-panel-title-text">数据图表分析</span>
          <span class="charts-panel-badge">LIVE</span>
        </div>
        <div class="charts-panel-subtitle">趋势、风险、评分、平台与人员负载综合洞察</div>
      </div>

      <div class="charts-panel-summary">
        <div class="charts-mini-stat" v-for="item in miniStats" :key="item.label">
          <span class="charts-mini-dot" :style="{ background: item.color }"></span>
          <span class="charts-mini-label">{{ item.label }}</span>
          <strong class="charts-mini-value">{{ item.value }}</strong>
        </div>
      </div>

      <span class="charts-panel-toggle" aria-hidden="true">
        <svg
          class="charts-panel-arrow"
          :class="{ 'charts-panel-arrow-expanded': expanded }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </span>
    </button>

    <div class="charts-panel-body" :class="{ 'charts-panel-body-expanded': expanded }">
      <div class="charts-panel-content">
        <div class="charts-kpi-grid">
          <div class="charts-kpi-card" v-for="item in kpiCards" :key="item.label">
            <div class="charts-kpi-label">{{ item.label }}</div>
            <div class="charts-kpi-value">{{ item.value }}</div>
            <div class="charts-kpi-hint">{{ item.hint }}</div>
          </div>
        </div>

        <div class="charts-grid">
          <article class="charts-card charts-card-full">
            <div class="charts-card-header">
              <div>
                <h3>需求流转趋势</h3>
                <p>新建与已发布对比</p>
              </div>
              <span class="charts-card-tag">Flow</span>
            </div>
            <div ref="throughputChartRef" class="charts-chart charts-chart-lg"></div>
          </article>

          <article class="charts-card">
            <div class="charts-card-header">
              <div>
                <h3>状态分布</h3>
                <p>当前流程结构</p>
              </div>
              <span class="charts-card-tag">State</span>
            </div>
            <div ref="statusChartRef" class="charts-chart"></div>
          </article>

          <article class="charts-card">
            <div class="charts-card-header">
              <div>
                <h3>优先级风险</h3>
                <p>高优先级积压识别</p>
              </div>
              <span class="charts-card-tag">Risk</span>
            </div>
            <div ref="priorityChartRef" class="charts-chart"></div>
          </article>

          <article class="charts-card charts-card-score">
            <div class="charts-card-header">
              <div>
                <h3>评分质量</h3>
                <p>平均评分与分段数量</p>
              </div>
              <span class="charts-card-tag">Score</span>
            </div>
            <div class="charts-score-layout">
              <div ref="gaugeChartRef" class="charts-chart charts-chart-gauge"></div>
              <div ref="scoreLineRef" class="charts-chart charts-chart-line"></div>
            </div>
          </article>

          <article class="charts-card">
            <div class="charts-card-header">
              <div>
                <h3>平台需求排行</h3>
                <p>总量与发布量对比</p>
              </div>
              <span class="charts-card-tag">Platform</span>
            </div>
            <div ref="platformChartRef" class="charts-chart"></div>
          </article>

          <article class="charts-card charts-card-wide">
            <div class="charts-card-header">
              <div>
                <h3>人员负载热力</h3>
                <p>当前开发人员负载占比</p>
              </div>
              <span class="charts-card-tag">Load</span>
            </div>
            <div ref="heatmapChartRef" class="charts-chart"></div>
          </article>
        </div>

        <div class="charts-insight-row">
          <div class="charts-insight-item">
            <span>审批平均耗时</span>
            <strong>{{ formatHours(dashboard.approvalCycle.averageHours) }}</strong>
          </div>
          <div class="charts-insight-item">
            <span>开发平均耗时</span>
            <strong>{{ formatDays(dashboard.developmentCycle.averageDays) }}</strong>
          </div>
          <div class="charts-insight-item charts-insight-warning">
            <span>逾期风险</span>
            <strong>{{ Number(dashboard.overdue.rate || 0).toFixed(1) }}%</strong>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import * as echarts from 'echarts/core'
import { PieChart, BarChart, GaugeChart, LineChart, HeatmapChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  VisualMapComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { buildChartSummary, createEmptyDashboard } from '../utils/dashboardAnalytics'

echarts.use([
  PieChart,
  BarChart,
  GaugeChart,
  LineChart,
  HeatmapChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  VisualMapComponent,
  CanvasRenderer
])

const props = defineProps({
  statusStats: { type: Object, default: () => ({}) },
  priorityStats: { type: Object, default: () => ({}) },
  scoreStats: { type: Object, default: () => ({}) },
  avgScore: { type: [String, Number], default: '0' },
  dashboard: { type: Object, default: () => createEmptyDashboard() }
})

const expanded = ref(false)
const throughputChartRef = ref(null)
const statusChartRef = ref(null)
const priorityChartRef = ref(null)
const gaugeChartRef = ref(null)
const scoreLineRef = ref(null)
const platformChartRef = ref(null)
const heatmapChartRef = ref(null)

let throughputChart = null
let statusChart = null
let priorityChart = null
let gaugeChart = null
let scoreLineChart = null
let platformChart = null
let heatmapChart = null

const statusColors = {
  '待审批': '#f59e0b',
  '待评审': '#facc15',
  '待开发': '#4aa3ff',
  '开发中': '#14b8d6',
  '测试中': '#8b5cf6',
  '已发布': '#22c55e'
}

const priorityColors = {
  '高': '#ef5350',
  '中': '#f59e0b',
  '低': '#22c55e'
}

const chartMotion = {
  animation: true,
  animationDuration: 900,
  animationDurationUpdate: 650,
  animationEasing: 'cubicOut',
  animationEasingUpdate: 'cubicOut'
}

const summary = computed(() => buildChartSummary({
  statusStats: props.statusStats,
  dashboard: props.dashboard,
  avgScore: props.avgScore
}))

const miniStats = computed(() => [
  { label: '进行中', value: summary.value.inProgress, color: '#14b8d6' },
  { label: '已发布', value: summary.value.released, color: '#22c55e' },
  { label: '逾期率', value: summary.value.overdueRate, color: '#ef5350' },
  { label: 'TOP平台', value: summary.value.topPlatform, color: '#4aa3ff' }
])

const kpiCards = computed(() => [
  { label: '需求吞吐差', value: formatDelta(summary.value.throughputDelta), hint: '新建 - 已发布' },
  { label: '平均评分', value: summary.value.avgScore, hint: '已评分需求均值' },
  { label: '审批样本', value: props.dashboard.approvalCycle.sampleCount || 0, hint: '已审批需求' },
  { label: '开发样本', value: props.dashboard.developmentCycle.sampleCount || 0, hint: '已发布需求' }
])

function toggleExpand() {
  expanded.value = !expanded.value
  if (expanded.value) {
    nextTick(() => {
      initCharts()
      updateCharts()
      resizeCharts()
    })
  }
}

function formatDelta(value) {
  const number = Number(value) || 0
  return number > 0 ? `+${number}` : String(number)
}

function formatHours(value) {
  return `${Number(value || 0).toFixed(1)} h`
}

function formatDays(value) {
  return `${Number(value || 0).toFixed(1)} d`
}

function makeTooltip() {
  return {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#cfe3f5',
    borderWidth: 1,
    textStyle: { color: '#17304e', fontSize: 13 },
    extraCssText: 'border-radius: 10px; box-shadow: 0 10px 28px rgba(20, 98, 151, 0.14);'
  }
}

function initCharts() {
  if (throughputChartRef.value && !throughputChart) throughputChart = echarts.init(throughputChartRef.value)
  if (statusChartRef.value && !statusChart) statusChart = echarts.init(statusChartRef.value)
  if (priorityChartRef.value && !priorityChart) priorityChart = echarts.init(priorityChartRef.value)
  if (gaugeChartRef.value && !gaugeChart) gaugeChart = echarts.init(gaugeChartRef.value)
  if (scoreLineRef.value && !scoreLineChart) scoreLineChart = echarts.init(scoreLineRef.value)
  if (platformChartRef.value && !platformChart) platformChart = echarts.init(platformChartRef.value)
  if (heatmapChartRef.value && !heatmapChart) heatmapChart = echarts.init(heatmapChartRef.value)
}

function updateThroughputChart() {
  if (!throughputChart) return
  const data = props.dashboard.throughput || []
  throughputChart.setOption({
    ...chartMotion,
    color: ['#14b8d6', '#22c55e'],
    tooltip: { ...makeTooltip(), trigger: 'axis' },
    legend: { top: 2, right: 4, textStyle: { color: '#60758e' }, itemWidth: 12, itemHeight: 8 },
    grid: { top: 46, left: 42, right: 18, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.label),
      axisLine: { lineStyle: { color: '#dbe8f5' } },
      axisTick: { show: false },
      axisLabel: { color: '#60758e' }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#60758e' },
      splitLine: { lineStyle: { color: 'rgba(174, 205, 231, 0.55)', type: 'dashed' } }
    },
    series: [
      {
        name: '新建',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(20, 184, 214, 0.14)' },
        data: data.map((item) => Number(item.createdCount) || 0)
      },
      {
        name: '已发布',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(34, 197, 94, 0.12)' },
        data: data.map((item) => Number(item.releasedCount) || 0)
      }
    ]
  })
}

function updateStatusChart() {
  if (!statusChart) return
  const statusData = Object.entries(statusColors)
    .map(([name, color]) => ({
      name,
      value: Number(props.statusStats[name]) || 0,
      itemStyle: {
        color,
        shadowColor: `${color}44`,
        shadowBlur: 10
      }
    }))
    .filter((item) => item.value > 0)

  statusChart.setOption({
    ...chartMotion,
    tooltip: { ...makeTooltip(), trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: {
      orient: 'vertical',
      right: 4,
      top: 'middle',
      textStyle: { color: '#60758e', fontSize: 12 },
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle'
    },
    series: [{
      type: 'pie',
      radius: ['46%', '72%'],
      center: ['37%', '53%'],
      data: statusData,
      label: { show: false },
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 8 },
      emphasis: { scaleSize: 8 }
    }]
  })
}

function updatePriorityChart() {
  if (!priorityChart) return
  const names = ['高', '中', '低']
  const values = names.map((name) => Number(props.priorityStats[name]) || 0)

  priorityChart.setOption({
    ...chartMotion,
    tooltip: { ...makeTooltip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 18, left: 36, right: 18, bottom: 30 },
    xAxis: {
      type: 'category',
      data: names,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dbe8f5' } },
      axisLabel: { color: '#60758e', fontWeight: 600 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#60758e' },
      splitLine: { lineStyle: { color: 'rgba(174, 205, 231, 0.55)', type: 'dashed' } }
    },
    series: [{
      type: 'bar',
      barWidth: 34,
      data: values.map((value, index) => ({
        value,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: priorityColors[names[index]] },
            { offset: 1, color: `${priorityColors[names[index]]}33` }
          ]),
          borderRadius: [9, 9, 0, 0],
          shadowColor: `${priorityColors[names[index]]}33`,
          shadowBlur: 10
        }
      }))
    }]
  })
}

function updateScoreCharts() {
  const avg = Number(props.avgScore) || 0
  if (gaugeChart) {
    gaugeChart.setOption({
      ...chartMotion,
      series: [{
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: '92%',
        center: ['50%', '56%'],
        progress: {
          show: true,
          width: 12,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#ef5350' },
              { offset: 0.55, color: '#f59e0b' },
              { offset: 1, color: '#22c55e' }
            ])
          }
        },
        pointer: { width: 4, length: '52%', itemStyle: { color: '#14b8d6' } },
        axisLine: { lineStyle: { width: 12, color: [[1, '#e8f0f7']] } },
        axisTick: { show: false },
        splitLine: { distance: -16, length: 8, lineStyle: { color: '#b7cde2', width: 1 } },
        axisLabel: { distance: -6, color: '#60758e', fontSize: 10 },
        anchor: { show: true, size: 10, itemStyle: { color: '#fff', borderColor: '#14b8d6', borderWidth: 2 } },
        detail: {
          valueAnimation: true,
          fontSize: 26,
          fontWeight: 800,
          color: '#10243d',
          offsetCenter: [0, '70%'],
          formatter: (value) => `${value.toFixed(1)}分`
        },
        data: [{ value: avg }]
      }]
    })
  }

  if (scoreLineChart) {
    const segments = ['0-60', '61-80', '81-100']
    const values = segments.map((key) => Number(props.scoreStats[key]) || 0)
    scoreLineChart.setOption({
      ...chartMotion,
      tooltip: { ...makeTooltip(), trigger: 'axis' },
      grid: { top: 18, left: 36, right: 14, bottom: 28 },
      xAxis: {
        type: 'category',
        data: segments,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#dbe8f5' } },
        axisLabel: { color: '#60758e' }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#60758e' },
        splitLine: { lineStyle: { color: 'rgba(174, 205, 231, 0.55)', type: 'dashed' } }
      },
      series: [{
        type: 'line',
        smooth: true,
        symbolSize: 9,
        data: values,
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#ef5350' },
            { offset: 0.5, color: '#f59e0b' },
            { offset: 1, color: '#22c55e' }
          ])
        },
        areaStyle: { color: 'rgba(20, 184, 214, 0.10)' },
        itemStyle: { color: '#fff', borderColor: '#14b8d6', borderWidth: 2 }
      }]
    })
  }
}

function updatePlatformChart() {
  if (!platformChart) return
  const data = (props.dashboard.platformRanking || []).slice(0, 6).reverse()
  platformChart.setOption({
    ...chartMotion,
    tooltip: { ...makeTooltip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 2, right: 4, textStyle: { color: '#60758e' }, itemWidth: 12, itemHeight: 8 },
    grid: { top: 40, left: 78, right: 18, bottom: 20 },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#60758e' },
      splitLine: { lineStyle: { color: 'rgba(174, 205, 231, 0.5)', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: data.map((item) => item.platform),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#60758e', width: 70, overflow: 'truncate' }
    },
    series: [
      {
        name: '总量',
        type: 'bar',
        barWidth: 13,
        data: data.map((item) => Number(item.total) || 0),
        itemStyle: { color: '#14b8d6', borderRadius: [0, 8, 8, 0] }
      },
      {
        name: '已发布',
        type: 'bar',
        barWidth: 13,
        data: data.map((item) => Number(item.released) || 0),
        itemStyle: { color: '#22c55e', borderRadius: [0, 8, 8, 0] }
      }
    ]
  })
}

function updateHeatmapChart() {
  if (!heatmapChart) return
  const data = props.dashboard.developerHeatmap || []
  heatmapChart.setOption({
    ...chartMotion,
    tooltip: {
      ...makeTooltip(),
      formatter: (params) => {
        const item = data[params.data?.[0]] || {}
        return `${item.name || '-'}<br/>部门：${item.department || '-'}<br/>负载：${item.currentLoad || 0}/${item.maxLoad || 0}<br/>占比：${item.loadPercent || 0}%`
      }
    },
    grid: { top: 44, left: 18, right: 18, bottom: 38 },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: '#60758e',
        fontSize: 12,
        interval: 0,
        margin: 14,
        rotate: data.length > 6 ? 28 : 0,
        hideOverlap: false
      }
    },
    yAxis: {
      type: 'category',
      data: ['负载'],
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#60758e' }
    },
    visualMap: {
      show: false,
      min: 0,
      max: 100,
      orient: 'horizontal',
      right: 4,
      top: 0,
      itemWidth: 118,
      itemHeight: 8,
      calculable: false,
      text: ['高负载', '低负载'],
      textGap: 8,
      textStyle: { color: '#60758e' },
      inRange: { color: ['#dff7ff', '#14b8d6', '#f59e0b', '#ef5350'] }
    },
    series: [{
      type: 'heatmap',
      data: data.map((item, index) => [index, 0, Number(item.loadPercent) || 0]),
      label: { show: true, color: '#10243d', formatter: (params) => `${params.data?.[2] || 0}%` },
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 }
    }]
  })
}

function updateCharts() {
  updateThroughputChart()
  updateStatusChart()
  updatePriorityChart()
  updateScoreCharts()
  updatePlatformChart()
  updateHeatmapChart()
}

function resizeCharts() {
  if (!expanded.value) return
  ;[throughputChart, statusChart, priorityChart, gaugeChart, scoreLineChart, platformChart, heatmapChart]
    .filter(Boolean)
    .forEach((instance) => instance.resize())
}

function disposeCharts() {
  ;[throughputChart, statusChart, priorityChart, gaugeChart, scoreLineChart, platformChart, heatmapChart]
    .filter(Boolean)
    .forEach((instance) => instance.dispose())
  throughputChart = null
  statusChart = null
  priorityChart = null
  gaugeChart = null
  scoreLineChart = null
  platformChart = null
  heatmapChart = null
}

watch(
  [() => props.statusStats, () => props.priorityStats, () => props.scoreStats, () => props.avgScore, () => props.dashboard],
  () => {
    if (expanded.value) {
      nextTick(() => {
        initCharts()
        updateCharts()
        resizeCharts()
      })
    }
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    initCharts()
    updateCharts()
    resizeCharts()
  })
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})
</script>

<style scoped>
.charts-panel {
  position: relative;
  margin-bottom: 24px;
  overflow: hidden;
  border: 1px solid rgba(153, 198, 232, 0.8);
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 252, 255, 0.94)),
    radial-gradient(circle at top right, rgba(20, 184, 214, 0.16), transparent 32%);
  box-shadow: 0 14px 40px rgba(40, 106, 159, 0.12);
  transition: border-color 0.28s ease, box-shadow 0.28s ease;
}

.charts-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #14b8d6, #4aa3ff, #22c55e, #14b8d6);
  background-size: 220% 100%;
  animation: chartPulseLine 4s linear infinite;
  opacity: 0.85;
}

.charts-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(74, 163, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 163, 255, 0.06) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.8), transparent 72%);
}

.charts-panel-active {
  border-color: rgba(20, 184, 214, 0.6);
  box-shadow: 0 18px 54px rgba(40, 106, 159, 0.16);
}

@keyframes chartPulseLine {
  from { background-position: 0 0; }
  to { background-position: 220% 0; }
}

.charts-panel-header {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto 42px;
  gap: 18px;
  align-items: center;
  width: 100%;
  padding: 22px 24px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.charts-panel-header-main {
  min-width: 0;
}

.charts-panel-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.charts-panel-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border: 1px solid rgba(20, 184, 214, 0.28);
  border-radius: 13px;
  background: linear-gradient(135deg, rgba(231, 250, 255, 0.95), rgba(255, 255, 255, 0.86));
  color: #14b8d6;
  box-shadow: 0 8px 22px rgba(20, 184, 214, 0.16);
}

.charts-panel-icon-svg {
  width: 21px;
  height: 21px;
}

.charts-panel-title-text {
  font-size: 22px;
  font-weight: 800;
  color: #10243d;
}

.charts-panel-badge,
.charts-card-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 10px;
  border: 1px solid rgba(34, 197, 94, 0.28);
  border-radius: 999px;
  background: rgba(236, 253, 245, 0.9);
  color: #099268;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.charts-panel-subtitle {
  margin-top: 6px;
  color: #60758e;
  font-size: 13px;
}

.charts-panel-summary {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.charts-mini-stat {
  display: grid;
  grid-template-columns: 8px auto auto;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 7px 11px;
  border: 1px solid rgba(207, 227, 245, 0.9);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.charts-mini-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  box-shadow: 0 0 12px currentColor;
}

.charts-mini-label {
  color: #60758e;
  font-size: 12px;
}

.charts-mini-value {
  max-width: 92px;
  overflow: hidden;
  color: #10243d;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.charts-panel-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(207, 227, 245, 0.9);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  color: #4aa3ff;
}

.charts-panel-arrow {
  width: 19px;
  height: 19px;
  transition: transform 0.28s ease;
}

.charts-panel-arrow-expanded {
  transform: rotate(180deg);
}

.charts-panel-body {
  position: relative;
  z-index: 1;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-8px);
  transition: max-height 0.46s ease, opacity 0.28s ease, transform 0.34s ease;
}

.charts-panel-body-expanded {
  max-height: 1360px;
  opacity: 1;
  transform: translateY(0);
}

.charts-panel-content {
  padding: 0 24px 24px;
}

.charts-panel-body-expanded .charts-kpi-card,
.charts-panel-body-expanded .charts-card,
.charts-panel-body-expanded .charts-insight-item {
  animation: chartReveal 0.58s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.charts-panel-body-expanded .charts-kpi-card:nth-child(1) { animation-delay: 0.02s; }
.charts-panel-body-expanded .charts-kpi-card:nth-child(2) { animation-delay: 0.05s; }
.charts-panel-body-expanded .charts-kpi-card:nth-child(3) { animation-delay: 0.08s; }
.charts-panel-body-expanded .charts-kpi-card:nth-child(4) { animation-delay: 0.11s; }
.charts-panel-body-expanded .charts-card:nth-child(1) { animation-delay: 0.10s; }
.charts-panel-body-expanded .charts-card:nth-child(2) { animation-delay: 0.14s; }
.charts-panel-body-expanded .charts-card:nth-child(3) { animation-delay: 0.18s; }
.charts-panel-body-expanded .charts-card:nth-child(4) { animation-delay: 0.22s; }
.charts-panel-body-expanded .charts-card:nth-child(5) { animation-delay: 0.26s; }
.charts-panel-body-expanded .charts-card:nth-child(6) { animation-delay: 0.30s; }
.charts-panel-body-expanded .charts-insight-item:nth-child(1) { animation-delay: 0.34s; }
.charts-panel-body-expanded .charts-insight-item:nth-child(2) { animation-delay: 0.38s; }
.charts-panel-body-expanded .charts-insight-item:nth-child(3) { animation-delay: 0.42s; }

@keyframes chartReveal {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.985);
    filter: saturate(0.82);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: saturate(1);
  }
}

.charts-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.charts-kpi-card {
  min-height: 88px;
  padding: 15px 16px;
  border: 1px solid rgba(207, 227, 245, 0.86);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.charts-kpi-label {
  color: #60758e;
  font-size: 13px;
}

.charts-kpi-value {
  margin-top: 4px;
  color: #10243d;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
}

.charts-kpi-hint {
  margin-top: 5px;
  color: #8aa1b8;
  font-size: 12px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 14px;
}

.charts-card {
  grid-column: span 4;
  min-height: 260px;
  padding: 16px;
  border: 1px solid rgba(207, 227, 245, 0.86);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 8px 24px rgba(40, 106, 159, 0.07);
}

.charts-card-wide {
  grid-column: span 8;
}

.charts-card-full {
  grid-column: 1 / -1;
}

.charts-card-score {
  grid-column: span 4;
}

.charts-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  margin-bottom: 8px;
}

.charts-card-header h3 {
  margin: 0;
  color: #10243d;
  font-size: 16px;
  font-weight: 800;
}

.charts-card-header p {
  margin: 3px 0 0;
  color: #60758e;
  font-size: 12px;
}

.charts-card-tag {
  height: 22px;
  border-color: rgba(20, 184, 214, 0.25);
  background: rgba(231, 250, 255, 0.9);
  color: #1387c7;
}

.charts-chart {
  width: 100%;
  height: 188px;
}

.charts-chart-lg {
  height: 198px;
}

.charts-card-full .charts-chart {
  height: 214px;
}

.charts-score-layout {
  display: grid;
  grid-template-columns: 42% 58%;
  min-height: 188px;
}

.charts-chart-gauge,
.charts-chart-line {
  height: 188px;
}

.charts-insight-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.charts-insight-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 13px 16px;
  border: 1px solid rgba(207, 227, 245, 0.86);
  border-radius: 14px;
  background: rgba(247, 251, 255, 0.84);
}

.charts-insight-item span {
  color: #60758e;
  font-size: 13px;
}

.charts-insight-item strong {
  color: #10243d;
  font-size: 20px;
}

.charts-insight-warning strong {
  color: #ef5350;
}

@media (max-width: 1180px) {
  .charts-panel-header {
    grid-template-columns: 1fr 42px;
  }

  .charts-panel-summary {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .charts-card,
  .charts-card-wide,
  .charts-card-score {
    grid-column: span 6;
  }
}

@media (max-width: 760px) {
  .charts-panel-header,
  .charts-panel-content {
    padding-left: 16px;
    padding-right: 16px;
  }

  .charts-kpi-grid,
  .charts-insight-row {
    grid-template-columns: 1fr;
  }

  .charts-card,
  .charts-card-wide,
  .charts-card-score {
    grid-column: 1 / -1;
  }

  .charts-score-layout {
    grid-template-columns: 1fr;
  }

  .charts-panel-body-expanded {
    max-height: 2300px;
  }
}
</style>
