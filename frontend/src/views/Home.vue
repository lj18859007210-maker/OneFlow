<template>
  <div class="home">
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-value">{{ total }}</div>
        <div class="stat-label">总需求数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalInProgress }}</div>
        <div class="stat-label">进行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalReleased }}</div>
        <div class="stat-label">已发布</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ globalAvgScore }}</div>
        <div class="stat-label">平均评分</div>
      </div>
    </div>

    <ChartsPanel
      :status-stats="statusStats"
      :priority-stats="priorityStats"
      :score-stats="scoreStats"
      :avg-score="globalAvgScore"
      :dashboard="dashboardMetrics"
    />

    <div class="tech-table-wrap">
      <div class="tech-table-header home-table-header">
        <div>
          <div class="tech-table-title">需求列表</div>
          <div class="home-filter-summary">已按全量数据筛选并分页展示</div>
        </div>
        <div class="tech-table-actions">
          <button
            v-if="canCreateRequirement"
            @click="goToSubmitRequirement"
            class="tech-btn tech-btn-primary tech-btn-sm"
          >
            + 提交需求
          </button>
        </div>
      </div>

      <div class="home-filter-panel">
        <div class="home-filter-grid">
          <input
            v-model="filterForm.keyword"
            type="search"
            class="tech-input home-keyword-input"
            placeholder="开发人员 / 提交人 / 需求标题 / 状态"
            @keyup.enter="applyFilters"
          />

          <select v-model="filterForm.status" class="tech-filter-select">
            <option value="">全部状态</option>
            <option v-for="status in statusList" :key="status" :value="status">{{ status }}</option>
          </select>

          <select v-model="filterForm.platform" class="tech-filter-select">
            <option value="">全部平台</option>
            <option v-for="platform in platformOptions" :key="platform" :value="platform">{{ platform }}</option>
          </select>

          <select v-model="filterForm.developer" class="tech-filter-select">
            <option value="">全部开发人</option>
            <option v-for="developer in developerOptions" :key="developer" :value="developer">{{ developer }}</option>
          </select>

          <select v-model="filterForm.priority" class="tech-filter-select">
            <option value="">全部优先级</option>
            <option v-for="priority in priorityList" :key="priority" :value="priority">{{ priority }}</option>
          </select>

          <input v-model="filterForm.dateStart" type="date" class="tech-input" />
          <input v-model="filterForm.dateEnd" type="date" class="tech-input" />
          <input v-model="filterForm.minScore" type="number" min="0" max="100" class="tech-input" placeholder="最低评分" />
          <input v-model="filterForm.maxScore" type="number" min="0" max="100" class="tech-input" placeholder="最高评分" />

          <select v-model="filterForm.isOverdue" class="tech-filter-select">
            <option value="">全部逾期状态</option>
            <option value="true">仅逾期</option>
            <option value="false">仅未逾期</option>
          </select>
        </div>

        <div class="home-filter-actions">
          <button class="tech-btn tech-btn-primary tech-btn-sm" @click="applyFilters">查询</button>
          <button class="tech-btn tech-btn-outline tech-btn-sm" @click="resetFilters">重置筛选</button>
        </div>
      </div>

      <div v-if="loading" class="tech-loading">
        <div class="tech-loading-logo">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.9"/>
            <rect x="24" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.6"/>
            <rect x="4" y="24" width="16" height="16" rx="3" fill="currentColor" opacity="0.75"/>
            <rect x="24" y="24" width="16" height="16" rx="3" fill="currentColor" opacity="0.45"/>
          </svg>
        </div>
        <div class="tech-loading-text">加载中...</div>
      </div>

      <div v-else-if="requirements.length === 0" class="tech-empty">
        <div class="tech-empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div class="tech-empty-text">暂无需求数据</div>
      </div>

      <table v-else class="tech-table">
        <thead>
          <tr>
            <th>需求标题</th>
            <th>提交人</th>
            <th>开发人员</th>
            <th>平台</th>
            <th>优先级</th>
            <th>状态</th>
            <th>评分</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="req in requirements" :key="req.id">
            <td><span class="tech-link" @click="canViewDetail(req) && goToDetail(req.id)">{{ req.title }}</span></td>
            <td>{{ req.submitter }}</td>
            <td>{{ req.developer || '-' }}</td>
            <td>{{ req.platform || '-' }}</td>
            <td><span class="tech-tag" :class="getPriorityClass(req.priority)">{{ req.priority || '-' }}</span></td>
            <td><span class="tech-tag" :class="getStatusClass(req.status)">{{ req.status }}</span></td>
            <td>{{ formatRequirementScore(req) }}</td>
            <td>{{ formatDate(req.createdAt) }}</td>
            <td>
              <span
                class="tech-link"
                :class="{ 'tech-link-disabled': !canViewDetail(req) }"
                @click="canViewDetail(req) && goToDetail(req.id)"
              >
                查看详情
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <Pagination
        v-if="total > 0"
        :total="total"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        @change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { developerApi, requirementApi } from '../api'
import Pagination from '../components/Pagination.vue'
import ChartsPanel from '../components/ChartsPanel.vue'
import { hasPermission } from '../utils/access'
import { createEmptyDashboard } from '../utils/dashboardAnalytics'

const router = useRouter()
const currentUser = inject('currentUser', ref({ name: '未登录', role: 'user' }))
const requirements = ref([])
const loading = ref(true)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const statusStats = ref({})
const priorityStats = ref({})
const scoreStats = ref({})
const dashboardMetrics = ref(createEmptyDashboard())
const globalAvgScore = ref('0.0')
const platformOptions = ref([])
const developerOptions = ref([])
const statusList = ['待审批', '待评审', '待开发', '开发中', '测试中', '已发布']
const priorityList = ['高', '中', '低']
const canCreateRequirement = computed(() => hasPermission(currentUser.value, 'requirement:create'))

function createEmptyFilters() {
  return {
    keyword: '',
    status: '',
    platform: '',
    developer: '',
    priority: '',
    dateStart: '',
    dateEnd: '',
    minScore: '',
    maxScore: '',
    isOverdue: ''
  }
}

const filterForm = ref(createEmptyFilters())
const appliedFilters = ref(createEmptyFilters())

const totalInProgress = computed(() => {
  const stats = statusStats.value
  return (stats['待审批'] || 0) + (stats['待评审'] || 0) + (stats['待开发'] || 0) + (stats['开发中'] || 0) + (stats['测试中'] || 0)
})

const totalReleased = computed(() => statusStats.value['已发布'] || 0)

function buildRequestFilters(source) {
  const filters = {}
  Object.entries(source).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      filters[key] = value
    }
  })
  return filters
}

function updateSummaryFromResponse(payload) {
  statusStats.value = payload.statusStats || {}
  priorityStats.value = payload.priorityStats || {}
  scoreStats.value = payload.scoreStats || { '0-60': 0, '61-80': 0, '81-100': 0 }
  const avg = Number(payload.avgScore || 0)
  globalAvgScore.value = avg.toFixed(1)
  platformOptions.value = payload.filterOptions?.platforms || []
}

async function loadDevelopers() {
  const response = await developerApi.getAll()
  const developers = response.data?.data || response.data || []
  developerOptions.value = [...new Set(developers.map(item => item.name).filter(Boolean))]
}

async function loadRequirements(page = currentPage.value) {
  try {
    loading.value = true
    currentPage.value = page
    const filters = buildRequestFilters(appliedFilters.value)
    const [response, dashboardResponse] = await Promise.all([
      requirementApi.getAll(page, pageSize.value, filters),
      requirementApi.getDashboard()
    ])
    const payload = response.data
    requirements.value = payload.data || []
    total.value = payload.total || 0
    updateSummaryFromResponse(payload)
    dashboardMetrics.value = dashboardResponse.data?.data || createEmptyDashboard()
  } catch (error) {
    const message = error.response?.data?.message || '获取需求列表失败'
    window.alert(message)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  appliedFilters.value = { ...filterForm.value }
  currentPage.value = 1
  loadRequirements(1)
}

function resetFilters() {
  const empty = createEmptyFilters()
  filterForm.value = empty
  appliedFilters.value = { ...empty }
  currentPage.value = 1
  loadRequirements(1)
}

function handlePageChange(page, size) {
  pageSize.value = size
  loadRequirements(page)
}

function getStatusClass(status) {
  const map = {
    待审批: 'tech-tag-pending',
    待评审: 'tech-tag-pending',
    待开发: 'tech-tag-dev',
    开发中: 'tech-tag-dev',
    测试中: 'tech-tag-testing',
    已发布: 'tech-tag-released'
  }
  return map[status] || ''
}

function getPriorityClass(priority) {
  const map = {
    高: 'tech-tag-high',
    中: 'tech-tag-medium',
    低: 'tech-tag-low'
  }
  return map[priority] || ''
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

function formatRequirementScore(req) {
  if (req.status !== '已发布') return '-'
  const score = Number(req.score)
  return score > 0 ? `${score}分` : '-'
}

function goToDetail(id) {
  router.push(`/detail/${id}`)
}

function goToSubmitRequirement() {
  router.push({ path: '/my-requirements', query: { openDialog: 'true' } })
}

function canViewDetail(req) {
  const user = currentUser.value
  if (!user || user.name === '未登录') return false
  if (user.role === 'admin') return true
  return req.submitter === user.name || req.developer === user.name
}

onMounted(async () => {
  await Promise.all([loadDevelopers(), loadRequirements(1)])
})
</script>

<style scoped>
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--tech-card);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--tech-border);
  text-align: center;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--tech-gradient);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--tech-shadow-lg);
  border-color: var(--tech-blue-light);
}

.stat-value {
  font-size: 36px;
  font-weight: 800;
  color: var(--tech-blue);
  margin-bottom: 8px;
  letter-spacing: -1px;
}

.stat-label {
  font-size: 14px;
  color: var(--tech-text-secondary);
  font-weight: 500;
}

.home-table-header {
  align-items: flex-start;
}

.home-filter-summary {
  margin-top: 6px;
  color: var(--tech-text-secondary);
  font-size: 13px;
}

.home-filter-panel {
  margin-bottom: 20px;
  padding: 18px;
  border: 1px solid var(--tech-border);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(8, 145, 178, 0.05), rgba(8, 145, 178, 0.01));
}

.home-filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.home-keyword-input {
  grid-column: span 2;
}

.home-filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.tech-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.tech-loading-logo {
  width: 64px;
  height: 64px;
  color: var(--tech-primary);
  animation: pulse 1.5s ease-in-out infinite;
}

.tech-loading-text {
  margin-top: 16px;
  color: var(--tech-text-secondary);
  font-size: 14px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}

.tech-link-disabled {
  color: var(--tech-text-secondary);
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

@media (max-width: 900px) {
  .dashboard-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .dashboard-stats {
    grid-template-columns: 1fr;
  }

  .home-filter-actions {
    justify-content: stretch;
    flex-direction: column;
  }

  .home-keyword-input {
    grid-column: span 1;
  }
}
</style>
