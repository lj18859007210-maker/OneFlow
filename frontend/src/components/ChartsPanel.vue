<template>
  <div class="charts-panel" :class="{ 'charts-panel-active': expanded }">
    <div class="charts-panel-header" @click="toggleExpand">
      <div class="charts-panel-header-inner">
        <div class="charts-panel-title">
          <div class="charts-panel-icon-wrap">
            <svg class="charts-panel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 20V10"/>
              <path d="M12 20V4"/>
              <path d="M6 20v-6"/>
            </svg>
          </div>
          <span class="charts-panel-title-text">数据图表分析</span>
          <span class="charts-panel-badge">LIVE</span>
        </div>
        <div class="charts-panel-summary" v-if="!expanded">
          <div class="charts-mini-stat" v-for="(item, idx) in miniStats" :key="idx">
            <span class="charts-mini-dot" :style="{ background: item.color }"></span>
            <span class="charts-mini-label">{{ item.label }}</span>
            <span class="charts-mini-value">{{ item.value }}</span>
          </div>
        </div>
      </div>
      <div class="charts-panel-toggle">
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
      </div>
    </div>
    <div class="charts-panel-body" :class="{ 'charts-panel-body-expanded': expanded }">
      <div class="charts-panel-content">
        <div class="charts-chart-wrap charts-chart-wrap-pie">
          <div class="charts-chart-label">
            <span class="charts-label-decorator"></span>
            需求状态分布
          </div>
          <div ref="statusChartRef" class="charts-chart"></div>
        </div>
        <div class="charts-chart-wrap">
          <div class="charts-chart-label">
            <span class="charts-label-decorator"></span>
            优先级分布
          </div>
          <div ref="priorityChartRef" class="charts-chart"></div>
        </div>
        <div class="charts-chart-wrap charts-chart-wrap-score">
          <div class="charts-chart-label">
            <span class="charts-label-decorator"></span>
            评分概览
          </div>
          <div class="charts-score-inner">
            <div class="charts-gauge-wrap">
              <div ref="gaugeChartRef" class="charts-chart charts-chart-gauge"></div>
            </div>
            <div class="charts-line-wrap">
              <div ref="scoreLineRef" class="charts-chart charts-chart-line"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import * as echarts from 'echarts/core'
import { PieChart, BarChart, GaugeChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  PieChart,
  BarChart,
  GaugeChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

const props = defineProps({
  statusStats: { type: Object, default: () => ({}) },
  priorityStats: { type: Object, default: () => ({}) },
  scoreStats: { type: Object, default: () => ({}) },
  avgScore: { type: [String, Number], default: '0' }
})

const expanded = ref(false)
const statusChartRef = ref(null)
const priorityChartRef = ref(null)
const gaugeChartRef = ref(null)
const scoreLineRef = ref(null)
let statusChart = null
let priorityChart = null
let gaugeChart = null
let scoreLineChart = null

const toggleExpand = () => {
  expanded.value = !expanded.value
  if (expanded.value) {
    nextTick(() => {
      initCharts()
      updateCharts()
    })
  }
}

const miniStats = computed(() => {
  const s = props.statusStats
  const p = props.priorityStats
  const avg = parseFloat(props.avgScore) || 0
  return [
    { label: '开发中', value: s['开发中'] || 0, color: '#00D4FF' },
    { label: '已发布', value: s['已发布'] || 0, color: '#66BB6A' },
    { label: '平均评分', value: avg > 0 ? avg.toFixed(1) : '-', color: '#FFA726' }
  ]
})

const statusColors = {
  '待审批': '#FFA726',
  '待评审': '#FFCA28',
  '待开发': '#42A5F5',
  '开发中': '#00BCD4',
  '测试中': '#AB47BC',
  '已发布': '#66BB6A'
}

const priorityColors = {
  '高': '#EF5350',
  '中': '#FFA726',
  '低': '#66BB6A'
}

const initCharts = () => {
  if (statusChartRef.value && !statusChart) {
    statusChart = echarts.init(statusChartRef.value)
  }
  if (priorityChartRef.value && !priorityChart) {
    priorityChart = echarts.init(priorityChartRef.value)
  }
  if (gaugeChartRef.value && !gaugeChart) {
    gaugeChart = echarts.init(gaugeChartRef.value)
  }
  if (scoreLineRef.value && !scoreLineChart) {
    scoreLineChart = echarts.init(scoreLineRef.value)
  }
}

const updateCharts = () => {
  if (statusChart) {
    const s = props.statusStats
    const statusData = Object.entries(statusColors).map(([name, color]) => ({
      name,
      value: s[name] || 0,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: color },
          { offset: 1, color: color + 'BB' }
        ]),
        shadowColor: color + '44',
        shadowBlur: 10
      }
    })).filter(d => d.value > 0)

    statusChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: '#fff',
        borderColor: '#D4E4F7',
        borderWidth: 1,
        textStyle: { color: '#1E3A5F', fontSize: 13 },
        extraCssText: 'border-radius: 10px; box-shadow: 0 4px 16px rgba(74,144,226,0.15);'
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#5A7A9F', fontSize: 12 },
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 14,
        icon: 'circle'
      },
      series: [{
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 3
        },
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 8,
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#1E3A5F',
            formatter: '{b}\n{c}项'
          },
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(74, 144, 226, 0.25)'
          }
        },
        data: statusData,
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDuration: 1200
      }]
    })
  }

  if (priorityChart) {
    const p = props.priorityStats
    const priorityNames = ['高', '中', '低']
    const priorityData = priorityNames.map(name => p[name] || 0)

    priorityChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: { color: 'rgba(74, 144, 226, 0.06)' }
        },
        backgroundColor: '#fff',
        borderColor: '#D4E4F7',
        borderWidth: 1,
        textStyle: { color: '#1E3A5F', fontSize: 13 },
        extraCssText: 'border-radius: 10px; box-shadow: 0 4px 16px rgba(74,144,226,0.15);'
      },
      grid: {
        left: '15%',
        right: '8%',
        top: '10%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: priorityNames,
        axisLabel: { color: '#5A7A9F', fontSize: 13, fontWeight: 500 },
        axisLine: { lineStyle: { color: '#D4E4F7' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#5A7A9F', fontSize: 11 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(212, 228, 247, 0.6)', type: 'dashed' } }
      },
      series: [{
        type: 'bar',
        data: priorityData.map((val, idx) => ({
          value: val,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: priorityColors[priorityNames[idx]] },
              { offset: 1, color: priorityColors[priorityNames[idx]] + '44' }
            ]),
            borderRadius: [8, 8, 0, 0],
            shadowColor: priorityColors[priorityNames[idx]] + '33',
            shadowBlur: 10,
            shadowOffsetY: 4
          }
        })),
        barWidth: '36%',
        emphasis: {
          itemStyle: {
            shadowBlur: 16,
            shadowColor: 'rgba(74, 144, 226, 0.2)'
          }
        },
        animationDuration: 1200,
        animationEasing: 'elasticOut'
      }]
    })
  }

  if (gaugeChart) {
    const avg = parseFloat(props.avgScore) || 0
    gaugeChart.setOption({
      series: [{
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        splitNumber: 5,
        radius: '95%',
        center: ['50%', '55%'],
        progress: {
          show: true,
          width: 14,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#EF5350' },
              { offset: 0.6, color: '#FFA726' },
              { offset: 0.8, color: '#42A5F5' },
              { offset: 1, color: '#66BB6A' }
            ])
          }
        },
        pointer: {
          length: '55%',
          width: 5,
          itemStyle: {
            color: '#4A90E2'
          }
        },
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.6, '#EF5350'],
              [0.8, '#FFA726'],
              [1, '#66BB6A']
            ]
          }
        },
        axisTick: {
          distance: -18,
          length: 4,
          lineStyle: { color: '#94a3b8', width: 1 }
        },
        splitLine: {
          distance: -22,
          length: 10,
          lineStyle: { color: '#94a3b8', width: 1.5 }
        },
        axisLabel: {
          distance: -12,
          fontSize: 11,
          color: '#5A7A9F',
          formatter: (val) => val
        },
        anchor: {
          show: true,
          size: 12,
          itemStyle: {
            borderColor: '#4A90E2',
            borderWidth: 2,
            color: '#fff'
          }
        },
        title: {
          show: false
        },
        detail: {
          valueAnimation: true,
          fontSize: 32,
          fontWeight: 800,
          color: '#1E3A5F',
          offsetCenter: [0, '72%'],
          formatter: (val) => val.toFixed(1) + '分'
        },
        data: [{ value: avg }],
        animationDuration: 1500,
        animationEasing: 'elasticOut'
      }]
    })
  }

  if (scoreLineChart) {
    const sc = props.scoreStats
    const segments = ['0-60', '61-80', '81-100']
    const segLabels = ['0-60', '61-80', '81-100']
    const segColors = ['#EF5350', '#FFA726', '#66BB6A']
    const segData = segments.map(k => sc[k] || 0)

    scoreLineChart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#D4E4F7',
        borderWidth: 1,
        textStyle: { color: '#1E3A5F', fontSize: 13 },
        extraCssText: 'border-radius: 10px; box-shadow: 0 4px 16px rgba(74,144,226,0.15);',
        formatter: (params) => {
          const p = params[0]
          return `<div style="font-weight:600;margin-bottom:4px">${p.name}分</div><div>需求数量: <b>${p.value}</b></div>`
        }
      },
      grid: {
        left: '12%',
        right: '8%',
        top: '12%',
        bottom: '18%'
      },
      xAxis: {
        type: 'category',
        data: segLabels,
        axisLabel: { color: '#5A7A9F', fontSize: 11 },
        axisLine: { lineStyle: { color: '#D4E4F7' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#5A7A9F', fontSize: 11 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(212, 228, 247, 0.6)', type: 'dashed' } }
      },
      series: [{
        type: 'line',
        data: segData.map((val, idx) => ({
          value: val,
          itemStyle: { color: segColors[idx], borderColor: segColors[idx], borderWidth: 2 }
        })),
        smooth: true,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#EF5350' },
            { offset: 0.5, color: '#FFA726' },
            { offset: 1, color: '#66BB6A' }
          ])
        },
        itemStyle: {
          color: '#fff',
          borderColor: '#4A90E2',
          borderWidth: 2,
          shadowColor: 'rgba(74, 144, 226, 0.3)',
          shadowBlur: 8
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(74, 144, 226, 0.25)' },
            { offset: 1, color: 'rgba(74, 144, 226, 0.02)' }
          ])
        },
        animationDuration: 1500,
        animationEasing: 'cubicOut'
      }]
    })
  }
}

watch([() => props.statusStats, () => props.priorityStats, () => props.scoreStats, () => props.avgScore], () => {
  if (expanded.value) {
    nextTick(() => {
      updateCharts()
    })
  }
}, { deep: true })

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (statusChart) { statusChart.dispose(); statusChart = null }
  if (priorityChart) { priorityChart.dispose(); priorityChart = null }
  if (gaugeChart) { gaugeChart.dispose(); gaugeChart = null }
  if (scoreLineChart) { scoreLineChart.dispose(); scoreLineChart = null }
})

const handleResize = () => {
  if (expanded.value) {
    statusChart && statusChart.resize()
    priorityChart && priorityChart.resize()
    gaugeChart && gaugeChart.resize()
    scoreLineChart && scoreLineChart.resize()
  }
}
</script>

<style scoped>
.charts-panel {
  background: var(--tech-card);
  border-radius: 20px;
  border: 1px solid var(--tech-border);
  margin-bottom: 24px;
  overflow: hidden;
  position: relative;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.charts-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #69B4FF, #00D4FF, #4A90E2, #69B4FF);
  background-size: 200% 100%;
  animation: gradientSlide 4s linear infinite;
  z-index: 1;
  opacity: 0.7;
}

@keyframes gradientSlide {
  0% { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}

.charts-panel:hover {
  box-shadow: 0 4px 24px rgba(74, 144, 226, 0.12);
}

.charts-panel-active {
  border-color: var(--tech-blue-light);
  box-shadow: 0 8px 32px rgba(74, 144, 226, 0.15);
}

.charts-panel-active::before {
  opacity: 1;
}

.charts-panel-header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  cursor: pointer;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.04) 0%, rgba(0, 212, 255, 0.02) 100%);
  transition: all 0.25s;
  user-select: none;
}

.charts-panel-header:hover {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.08) 0%, rgba(0, 212, 255, 0.04) 100%);
}

.charts-panel-header-inner {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  min-width: 0;
}

.charts-panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.charts-panel-icon-wrap {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--tech-blue-light), var(--tech-cyan));
  border-radius: 10px;
  box-shadow: 0 3px 12px rgba(74, 144, 226, 0.3);
  position: relative;
}

.charts-panel-icon-wrap::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  animation: iconRing 2.5s ease-in-out infinite;
}

@keyframes iconRing {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.03); }
}

.charts-panel-icon-svg {
  width: 18px;
  height: 18px;
  color: #fff;
}

.charts-panel-title-text {
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--tech-text) 0%, var(--tech-blue) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.5px;
}

.charts-panel-badge {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #fff;
  background: linear-gradient(135deg, #00BCD4, #00D4FF);
  padding: 2px 8px;
  border-radius: 4px;
  line-height: 1.4;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.35);
  animation: badgeGlow 2.5s ease-in-out infinite;
}

@keyframes badgeGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(0, 212, 255, 0.25); }
  50% { box-shadow: 0 0 18px rgba(0, 212, 255, 0.5); }
}

.charts-panel-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.charts-mini-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: rgba(74, 144, 226, 0.06);
  border: 1px solid rgba(74, 144, 226, 0.12);
  border-radius: 8px;
  transition: all 0.2s;
}

.charts-mini-stat:hover {
  background: rgba(74, 144, 226, 0.1);
  border-color: rgba(74, 144, 226, 0.2);
}

.charts-mini-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

.charts-mini-label {
  font-size: 12px;
  color: var(--tech-text-secondary);
  font-weight: 500;
}

.charts-mini-value {
  font-size: 14px;
  color: var(--tech-text);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.charts-panel-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(74, 144, 226, 0.2);
  background: rgba(74, 144, 226, 0.06);
  transition: all 0.25s;
  flex-shrink: 0;
}

.charts-panel-header:hover .charts-panel-toggle {
  background: rgba(74, 144, 226, 0.12);
  border-color: rgba(74, 144, 226, 0.3);
}

.charts-panel-arrow {
  width: 18px;
  height: 18px;
  color: var(--tech-blue);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.charts-panel-arrow-expanded {
  transform: rotate(180deg);
}

.charts-panel-body {
  max-height: 0;
  overflow: hidden;
  position: relative;
  z-index: 2;
  transition: max-height 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}

.charts-panel-body-expanded {
  max-height: 800px;
}

.charts-panel-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 20px 28px 28px;
}

.charts-chart-wrap {
  position: relative;
  background: rgba(74, 144, 226, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(74, 144, 226, 0.08);
  padding: 20px;
  transition: all 0.3s;
}

.charts-chart-wrap:hover {
  border-color: rgba(74, 144, 226, 0.18);
  box-shadow: 0 4px 20px rgba(74, 144, 226, 0.08);
}

.charts-chart-wrap-score {
  grid-column: 1 / -1;
}

.charts-score-inner {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 20px;
  align-items: center;
}

.charts-gauge-wrap {
  min-width: 0;
}

.charts-line-wrap {
  min-width: 0;
}

.charts-chart-gauge {
  height: 200px !important;
  min-height: 200px !important;
}

.charts-chart-line {
  height: 200px !important;
  min-height: 200px !important;
}

.charts-chart-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--tech-text);
  margin-bottom: 16px;
}

.charts-label-decorator {
  display: inline-block;
  width: 3px;
  height: 16px;
  background: linear-gradient(180deg, var(--tech-cyan), var(--tech-blue));
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
}

.charts-chart {
  height: 280px;
  min-height: 280px;
}

@media (max-width: 768px) {
  .charts-panel-content {
    grid-template-columns: 1fr;
    padding: 16px 16px 20px;
    gap: 16px;
  }

  .charts-panel-header {
    padding: 14px 16px;
  }

  .charts-panel-summary {
    display: none;
  }

  .charts-score-inner {
    grid-template-columns: 1fr;
  }

  .charts-chart-gauge {
    height: 180px !important;
    min-height: 180px !important;
  }

  .charts-chart-line {
    height: 180px !important;
    min-height: 180px !important;
  }
}
</style>