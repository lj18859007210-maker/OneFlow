<template>
  <div class="tech-timeline-container">
    <!-- 顶部工具栏 -->
    <div class="tech-timeline-toolbar">
      <div class="tech-toolbar-left">
        <h2 class="tech-toolbar-title">项目进度甘特图</h2>
        <div class="tech-toolbar-filters">
          <select v-model="selectedPlatform" class="tech-filter-select">
            <option value="">全部平台</option>
            <option v-for="platform in platforms" :key="platform" :value="platform">{{ platform }}</option>
          </select>
          <select v-model="selectedStatus" class="tech-filter-select">
            <option value="">全部状态</option>
            <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
          </select>
          <select v-model="selectedDeveloper" class="tech-filter-select">
            <option value="">全部开发人员</option>
            <option v-for="dev in developers" :key="dev" :value="dev">{{ dev }}</option>
          </select>
        </div>
      </div>
      <div class="tech-toolbar-right">
        <div class="tech-view-toggle">
          <button 
            :class="['tech-view-btn', { active: viewMode === 'week' }]"
            @click="viewMode = 'week'"
          >周</button>
          <button 
            :class="['tech-view-btn', { active: viewMode === 'month' }]"
            @click="viewMode = 'month'"
          >月</button>
          <button 
            :class="['tech-view-btn', { active: viewMode === 'quarter' }]"
            @click="viewMode = 'quarter'"
          >季</button>
        </div>
        <button class="tech-btn tech-btn-primary tech-btn-sm" @click="goToToday">
          回到今天
        </button>
        <div class="tech-export-actions">
          <button
            class="tech-btn tech-btn-outline tech-btn-sm"
            :disabled="exportDisabled"
            @click="exportGantt('csv')"
          >
            导出 CSV
          </button>
          <button
            class="tech-btn tech-btn-outline tech-btn-sm"
            :disabled="exportDisabled"
            @click="exportGantt('excel')"
          >
            导出 Excel
          </button>
        </div>
      </div>
    </div>

    <!-- 甘特图主体 -->
    <div class="tech-gantt-wrapper">
      <!-- 空状态 -->
      <div v-if="requirements.length === 0 && !loading" class="tech-empty-state">
        <div class="tech-empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div class="tech-empty-text">暂无项目数据</div>
        <div class="tech-empty-hint">请先创建需求或联系管理员</div>
      </div>
      
      <!-- 加载状态 -->
      <div v-else-if="loading" class="tech-empty-state">
        <div class="tech-empty-text">加载中...</div>
      </div>
      
      <!-- 左侧任务列表 -->
      <div v-else class="tech-gantt-sidebar">
        <div class="tech-gantt-sidebar-header">
          <span>工作项</span>
        </div>
        <div class="tech-gantt-sidebar-body">
          <div 
            v-for="group in groupedRequirements" 
            :key="group.platform"
            class="tech-gantt-group"
          >
            <div 
              class="tech-gantt-group-header"
              @click="toggleGroup(group.platform)"
            >
              <span class="tech-gantt-group-icon">{{ expandedGroups[group.platform] ? '▼' : '▶' }}</span>
              <span class="tech-gantt-group-name">{{ group.platform || '未分类' }}</span>
              <span class="tech-gantt-group-count">{{ group.items.length }} 项</span>
              <div class="tech-gantt-group-progress">
                <div 
                  class="tech-gantt-progress-bar"
                  :style="{ width: group.progress + '%' }"
                ></div>
              </div>
              <span class="tech-gantt-group-percent">{{ group.progress }}%</span>
            </div>
            <div 
              v-show="expandedGroups[group.platform]"
              class="tech-gantt-group-items"
            >
              <div 
                v-for="req in group.items" 
                :key="req.id"
                class="tech-gantt-item"
                :class="{ 'tech-gantt-item-disabled': !canViewDetail(req) }"
                @click="canViewDetail(req) && viewRequirement(req)"
              >
                <span class="tech-gantt-item-icon">📋</span>
                <span class="tech-gantt-item-title">{{ req.title }}</span>
                <span :class="['tech-gantt-item-status', `tech-tag-${getStatusClass(req.status)}`]">
                  {{ req.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧时间轴 -->
      <div v-if="requirements.length > 0" class="tech-gantt-chart">
        <!-- 时间刻度 -->
        <div class="tech-gantt-timeline-header">
          <div 
            v-for="(period, index) in timePeriods" 
            :key="index"
            class="tech-gantt-period"
            :style="{ width: periodWidth + 'px' }"
          >
            <span class="tech-gantt-period-label">{{ period.label }}</span>
          </div>
        </div>

        <!-- 任务条容器 -->
        <div class="tech-gantt-chart-body">
          <div 
            v-for="group in groupedRequirements" 
            :key="group.platform"
            class="tech-gantt-group-chart"
          >
            <div 
              v-show="expandedGroups[group.platform]"
              class="tech-gantt-group-items-chart"
            >
              <div 
                v-for="req in group.items" 
                :key="req.id"
                class="tech-gantt-item-chart"
              >
                <div 
                  v-if="getTaskPosition(req)"
                  class="tech-gantt-task-bar"
                  :class="[`tech-task-${getStatusClass(req.status)}`, { 'tech-task-overdue': isOverdue(req), 'tech-task-disabled': !canViewDetail(req) }]"
                  :style="getTaskStyle(req)"
                  :title="`${req.title} - ${getTaskDuration(req)}天`"
                  @click="canViewDetail(req) && viewRequirement(req)"
                >
                  <span class="tech-gantt-task-title">{{ req.title }}</span>
                  <span v-if="getTaskPosition(req).width > 100" class="tech-gantt-task-duration">{{ getTaskDuration(req) }}天</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 今天标记线 -->
          <div 
            class="tech-gantt-today-line"
            :style="{ left: todayPosition + 'px' }"
          >
            <span class="tech-gantt-today-label">今天</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="tech-gantt-legend">
      <div class="tech-legend-item">
        <span class="tech-legend-color tech-legend-pending"></span>
        <span>待审批</span>
      </div>
      <div class="tech-legend-item">
        <span class="tech-legend-color tech-legend-review"></span>
        <span>待评审</span>
      </div>
      <div class="tech-legend-item">
        <span class="tech-legend-color tech-legend-dev"></span>
        <span>开发中</span>
      </div>
      <div class="tech-legend-item">
        <span class="tech-legend-color tech-legend-testing"></span>
        <span>测试中</span>
      </div>
      <div class="tech-legend-item">
        <span class="tech-legend-color tech-legend-released"></span>
        <span>已发布</span>
      </div>
      <div class="tech-legend-item">
        <span class="tech-legend-color tech-legend-overdue"></span>
        <span>已逾期</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, watchEffect, inject } from 'vue'
import { useRouter } from 'vue-router'
import { requirementApi } from '../api'
import { downloadGanttExport } from '../utils/ganttExport'
import { showToast } from '../utils/toastService'

const router = useRouter()
const currentUser = inject('currentUser', ref({ name: '未登录', role: 'user' }))

// 状态数据
const requirements = ref([])
const developers = ref([])
const platforms = ref([])
const selectedPlatform = ref('')
const selectedStatus = ref('')
const selectedDeveloper = ref('')
const viewMode = ref('month')
const expandedGroups = ref({})
const loading = ref(false)
const exporting = ref(false)

// 状态选项
const statusOptions = [
  '待审批',
  '待评审',
  '待开发',
  '开发中',
  '测试中',
  '已发布'
]

// 时间配置
const timePeriods = computed(() => {
  const now = new Date()
  const periods = []
  
  if (viewMode.value === 'week') {
    for (let i = -2; i <= 10; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i * 7)
      periods.push({
        start: new Date(date),
        end: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000),
        label: `${date.getMonth() + 1}月${date.getDate()}日`
      })
    }
  } else if (viewMode.value === 'month') {
    for (let i = -2; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      periods.push({
        start: date,
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
        label: `${date.getFullYear()}年${date.getMonth() + 1}月`
      })
    }
  } else {
    for (let i = -1; i <= 3; i++) {
      const quarter = Math.floor(now.getMonth() / 3) + i
      const year = now.getFullYear() + Math.floor(quarter / 4)
      const q = ((quarter % 4) + 4) % 4 + 1
      const start = new Date(year, (q - 1) * 3, 1)
      periods.push({
        start,
        end: new Date(year, q * 3, 0),
        label: `${year}年Q${q}`
      })
    }
  }
  
  return periods
})

const periodWidth = computed(() => {
  if (viewMode.value === 'week') return 120
  if (viewMode.value === 'month') return 180
  return 300
})

const itemHeight = 52

// 今天位置
const todayPosition = computed(() => {
  const now = new Date()
  const firstPeriod = timePeriods.value[0]
  if (!firstPeriod) return 0
  
  const totalWidth = periodWidth.value * timePeriods.value.length
  const totalDays = (timePeriods.value[timePeriods.value.length - 1].end - firstPeriod.start) / (1000 * 60 * 60 * 24)
  const daysFromStart = (now - firstPeriod.start) / (1000 * 60 * 60 * 24)
  
  return (daysFromStart / totalDays) * totalWidth
})

// 分组数据
const getActiveFilters = () => {
  const filters = {}
  if (selectedPlatform.value) filters.platform = selectedPlatform.value
  if (selectedStatus.value) filters.status = selectedStatus.value
  if (selectedDeveloper.value) filters.developer = selectedDeveloper.value
  return filters
}

const applyActiveFilters = (items) => {
  let filtered = Array.isArray(items) ? items : []

  if (selectedPlatform.value) {
    filtered = filtered.filter(r => r.platform === selectedPlatform.value)
  }
  if (selectedStatus.value) {
    filtered = filtered.filter(r => r.status === selectedStatus.value)
  }
  if (selectedDeveloper.value) {
    filtered = filtered.filter(r => r.developer === selectedDeveloper.value)
  }

  return filtered
}

const buildGanttGroups = (items) => {
  const groups = {}
  items.forEach(req => {
    const platform = req.platform || '未分类'
    if (!groups[platform]) {
      groups[platform] = []
    }
    groups[platform].push(req)
  })
  
  return Object.entries(groups).map(([platform, items]) => {
    const completed = items.filter(r => r.status === '已发布').length
    const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0
    
    return {
      platform,
      items: items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
      progress
    }
  }).sort((a, b) => a.platform.localeCompare(b.platform))
}

const groupedRequirements = computed(() => buildGanttGroups(applyActiveFilters(requirements.value)))

const exportDisabled = computed(() => loading.value || exporting.value || groupedRequirements.value.length === 0)

// 方法
const toggleGroup = (platform) => {
  expandedGroups.value[platform] = !expandedGroups.value[platform]
}

const getStatusClass = (status) => {
  const map = {
    '待审批': 'pending',
    '待评审': 'review',
    '待开发': 'pending',
    '开发中': 'dev',
    '测试中': 'testing',
    '已发布': 'released'
  }
  return map[status] || 'pending'
}

const isOverdue = (req) => {
  const deadline = req.actualDate || req.expectedDate
  if (!deadline) return false
  return new Date(deadline) < new Date() && req.status !== '已发布'
}

const getTaskPosition = (req) => {
  const startDate = req.createdAt ? new Date(req.createdAt) : new Date()
  const endDate = (req.actualDate || req.expectedDate) ? new Date(req.actualDate || req.expectedDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  const firstPeriod = timePeriods.value[0]
  if (!firstPeriod) return null
  
  const totalWidth = periodWidth.value * timePeriods.value.length
  const totalDays = (timePeriods.value[timePeriods.value.length - 1].end - firstPeriod.start) / (1000 * 60 * 60 * 24)
  
  const left = ((startDate - firstPeriod.start) / (1000 * 60 * 60 * 24) / totalDays) * totalWidth
  const width = ((endDate - startDate) / (1000 * 60 * 60 * 24) / totalDays) * totalWidth
  
  return {
    left: Math.max(0, left),
    width: Math.max(120, width)
  }
}

const getTaskStyle = (req) => {
  const pos = getTaskPosition(req)
  if (!pos) return {}
  
  return {
    left: pos.left + 'px',
    width: pos.width + 'px',
    position: 'absolute'
  }
}

const getTaskDuration = (req) => {
  const deadline = req.actualDate || req.expectedDate
  if (!req.createdAt || !deadline) return 0
  const start = new Date(req.createdAt)
  const end = new Date(deadline)
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
}

const goToToday = () => {
  // 滚动到今天的位置
  const chartBody = document.querySelector('.tech-gantt-chart-body')
  if (chartBody) {
    chartBody.scrollLeft = todayPosition.value - chartBody.clientWidth / 2
  }
}

const exportGantt = async (format) => {
  const filters = getActiveFilters()

  try {
    exporting.value = true
    const res = await requirementApi.getGanttData({
      ...filters,
      _exportAt: Date.now()
    })
    const latestRequirements = res.data?.success ? res.data.data || [] : []
    const exportGroups = buildGanttGroups(applyActiveFilters(latestRequirements))

    const result = downloadGanttExport(exportGroups, {
      format,
      viewMode: viewMode.value,
      filters
    })

    if (!result.success) {
      showToast('当前没有可导出的甘特图数据', { type: 'warning', title: '暂无数据' })
      return
    }

    showToast(`已导出 ${result.fileName}`, { type: 'success', title: '导出成功' })
  } catch (error) {
    console.error('导出甘特图失败:', error)
    showToast('导出失败，请稍后重试', { type: 'error', title: '导出失败' })
  } finally {
    exporting.value = false
  }
}

const canViewDetail = (req) => {
  const user = currentUser.value
  if (!user || user.name === '未登录') return false
  if (user.role === 'admin') return true
  return req.submitter === user.name || req.developer === user.name
}

const viewRequirement = (req) => {
  if (!canViewDetail(req)) {
    showToast('您没有权限查看该需求', { type: 'error', title: '无权限' })
    return
  }
  router.push(`/detail/${req.id}`)
}

// 加载数据
const loadData = async () => {
  try {
    loading.value = true
    const filters = getActiveFilters()
    
    const res = await requirementApi.getGanttData(filters)
    
    if (res.data && res.data.success) {
      requirements.value = res.data.data || []
      
      // 提取平台和开发人员
      const platformSet = new Set()
      const developerSet = new Set()
      requirements.value.forEach(req => {
        if (req.platform) platformSet.add(req.platform)
        if (req.developer) developerSet.add(req.developer)
      })
      platforms.value = Array.from(platformSet).sort()
      developers.value = Array.from(developerSet).sort()
    } else {
      console.error('API 返回失败:', res)
    }
  } catch (error) {
    console.error('加载甘特图数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

// 监听筛选条件变化
watch([selectedPlatform, selectedStatus, selectedDeveloper], () => {
  loadData()
})

// 自动展开所有组
watchEffect(() => {
  groupedRequirements.value.forEach(g => {
    if (!(g.platform in expandedGroups.value)) {
      expandedGroups.value[g.platform] = true
    }
  })
})
</script>

<style scoped>
.tech-timeline-container {
  padding: 24px;
  background: var(--tech-bg);
  min-height: calc(100vh - var(--header-height));
}

.tech-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: var(--tech-card);
  border-radius: 12px;
  box-shadow: var(--tech-shadow);
  text-align: center;
}

.tech-empty-icon {
  margin-bottom: 24px;
  color: var(--tech-blue);
}

.tech-empty-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--tech-text);
  margin-bottom: 8px;
}

.tech-empty-hint {
  font-size: 14px;
  color: var(--tech-text-secondary);
}

.tech-timeline-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: var(--tech-card);
  border-radius: 12px;
  box-shadow: var(--tech-shadow);
}

.tech-toolbar-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.tech-toolbar-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--tech-text);
  background: var(--tech-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tech-toolbar-filters {
  display: flex;
  gap: 12px;
}

.tech-toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tech-export-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tech-view-toggle {
  display: flex;
  background: var(--tech-bg);
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
}

.tech-view-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--tech-text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.tech-view-btn.active {
  background: var(--tech-gradient);
  color: white;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
}

.tech-view-btn:hover:not(.active) {
  background: rgba(74, 144, 226, 0.1);
  color: var(--tech-blue);
}

.tech-gantt-wrapper {
  display: flex;
  background: var(--tech-card);
  border-radius: 12px;
  box-shadow: var(--tech-shadow);
  overflow: hidden;
  height: calc(100vh - 280px);
}

.tech-gantt-sidebar {
  width: 320px;
  min-width: 320px;
  border-right: 1px solid var(--tech-border);
  display: flex;
  flex-direction: column;
}

.tech-gantt-sidebar-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(105, 180, 255, 0.05));
  border-bottom: 1px solid var(--tech-border);
  font-weight: 600;
  color: var(--tech-text);
  font-size: 14px;
}

.tech-gantt-sidebar-body {
  flex: 1;
  overflow-y: auto;
}

.tech-gantt-group {
  border-bottom: 1px solid var(--tech-border);
}

.tech-gantt-group-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: var(--tech-bg);
  cursor: pointer;
  gap: 8px;
  transition: background 0.2s;
}

.tech-gantt-group-header:hover {
  background: rgba(74, 144, 226, 0.08);
}

.tech-gantt-group-icon {
  font-size: 10px;
  color: var(--tech-text-secondary);
  width: 16px;
}

.tech-gantt-group-name {
  flex: 1;
  font-weight: 600;
  color: var(--tech-text);
  font-size: 14px;
}

.tech-gantt-group-count {
  font-size: 12px;
  color: var(--tech-text-secondary);
  margin-right: 12px;
}

.tech-gantt-group-progress {
  width: 60px;
  height: 6px;
  background: var(--tech-border);
  border-radius: 3px;
  overflow: hidden;
}

.tech-gantt-progress-bar {
  height: 100%;
  background: var(--tech-gradient);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.tech-gantt-group-percent {
  font-size: 12px;
  font-weight: 600;
  color: var(--tech-blue);
  width: 36px;
  text-align: right;
}

.tech-gantt-group-items {
  background: var(--tech-card);
}

.tech-gantt-item {
  display: flex;
  align-items: center;
  padding: 14px 20px 14px 44px;
  gap: 8px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(212, 228, 247, 0.5);
  height: 52px;
  box-sizing: border-box;
}

.tech-gantt-item:hover {
  background: rgba(74, 144, 226, 0.05);
}

.tech-gantt-item-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.tech-gantt-item-icon {
  font-size: 14px;
}

.tech-gantt-item-title {
  flex: 1;
  font-size: 13px;
  color: var(--tech-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tech-gantt-item-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.tech-gantt-chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  position: relative;
  min-width: 0;
}

.tech-gantt-timeline-header {
  display: flex;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(105, 180, 255, 0.05));
  border-bottom: 1px solid var(--tech-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.tech-gantt-period {
  padding: 12px 0;
  text-align: center;
  border-right: 1px solid var(--tech-border);
  font-size: 13px;
  color: var(--tech-text-secondary);
  font-weight: 500;
}

.tech-gantt-chart-body {
  flex: 1;
  overflow: auto;
  position: relative;
  min-width: max-content;
}

.tech-gantt-timeline-header {
  display: flex;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(105, 180, 255, 0.05));
  border-bottom: 1px solid var(--tech-border);
  position: sticky;
  top: 0;
  z-index: 10;
  min-width: max-content;
}

.tech-gantt-group-chart {
  border-bottom: 1px solid var(--tech-border);
  position: relative;
  width: 100%;
}

.tech-gantt-group-items-chart {
  background: var(--tech-card);
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
  min-width: max-content;
}

.tech-gantt-item-chart {
  position: relative;
  border-bottom: 1px solid rgba(212, 228, 247, 0.3);
  height: 52px;
  display: flex;
  align-items: center;
  padding-left: 0;
  width: 100%;
  min-width: max-content;
}

.tech-gantt-task-bar {
  position: absolute;
  height: 40px;
  top: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  white-space: nowrap;
  min-width: 60px;
  z-index: 1;
}

.tech-gantt-task-bar:hover:not(.tech-task-disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.tech-task-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.tech-task-pending {
  background: linear-gradient(135deg, #FFF8E1, #FFE082);
  color: #F57C00;
}

.tech-task-review {
  background: linear-gradient(135deg, #E8EAF6, #9FA8DA);
  color: #3F51B5;
}

.tech-task-dev {
  background: linear-gradient(135deg, #E3F2FD, #64B5F6);
  color: #1976D2;
}

.tech-task-testing {
  background: linear-gradient(135deg, #F3E5F5, #BA68C8);
  color: #7B1FA2;
}

.tech-task-released {
  background: linear-gradient(135deg, #E8F5E9, #81C784);
  color: #2E7D32;
}

.tech-task-overdue {
  background: linear-gradient(135deg, #FFEBEE, #EF9A9A) !important;
  color: #C62828 !important;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.tech-gantt-task-title {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.tech-gantt-task-duration {
  font-size: 11px;
  opacity: 0.8;
  margin-left: 6px;
  flex-shrink: 0;
  white-space: nowrap;
}

.tech-gantt-today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #FF6B6B;
  z-index: 20;
  pointer-events: none;
  left: 0;
}

.tech-gantt-today-label {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  background: #FF6B6B;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
}

.tech-gantt-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 20px;
  padding: 16px;
  background: var(--tech-card);
  border-radius: 12px;
  box-shadow: var(--tech-shadow);
  flex-wrap: wrap;
}

.tech-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--tech-text-secondary);
}

.tech-legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.tech-legend-pending {
  background: linear-gradient(135deg, #FFF8E1, #FFE082);
}

.tech-legend-review {
  background: linear-gradient(135deg, #E8EAF6, #9FA8DA);
}

.tech-legend-dev {
  background: linear-gradient(135deg, #E3F2FD, #64B5F6);
}

.tech-legend-testing {
  background: linear-gradient(135deg, #F3E5F5, #BA68C8);
}

.tech-legend-released {
  background: linear-gradient(135deg, #E8F5E9, #81C784);
}

.tech-legend-overdue {
  background: linear-gradient(135deg, #FFEBEE, #EF9A9A);
}

/* 滚动条样式 */
.tech-gantt-sidebar-body::-webkit-scrollbar,
.tech-gantt-chart-body::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.tech-gantt-sidebar-body::-webkit-scrollbar-track,
.tech-gantt-chart-body::-webkit-scrollbar-track {
  background: var(--tech-bg);
  border-radius: 4px;
}

.tech-gantt-sidebar-body::-webkit-scrollbar-thumb,
.tech-gantt-chart-body::-webkit-scrollbar-thumb {
  background: var(--tech-border);
  border-radius: 4px;
}

.tech-gantt-sidebar-body::-webkit-scrollbar-thumb:hover,
.tech-gantt-chart-body::-webkit-scrollbar-thumb:hover {
  background: var(--tech-blue-light);
}
</style>
