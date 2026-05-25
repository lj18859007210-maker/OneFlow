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

    <ChartsPanel :status-stats="statusStats" :priority-stats="priorityStats" :score-stats="scoreStats" :avg-score="globalAvgScore" />

    <div class="tech-table-wrap">
      <div class="tech-table-header">
        <div class="tech-table-title">需求列表</div>
        <div class="tech-table-actions">
          <select v-model="filterStatus" class="tech-filter-select">
            <option value="">全部状态</option>
            <option v-for="s in statusList" :key="s" :value="s">{{ s }}</option>
          </select>
          <button v-if="canCreateRequirement" @click="goToSubmitRequirement" class="tech-btn tech-btn-primary tech-btn-sm">+ 提交需求</button>
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

      <div v-else-if="filteredRequirements.length === 0" class="tech-empty">
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
            <th>优先级</th>
            <th>状态</th>
            <th>评分</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="req in filteredRequirements" :key="req.id">
            <td><span class="tech-link" @click="canViewDetail(req) && goToDetail(req.id)">{{ req.title }}</span></td>
            <td>{{ req.submitter }}</td>
            <td>{{ req.developer }}</td>
            <td><span class="tech-tag" :class="getPriorityClass(req.priority)">{{ req.priority }}</span></td>
            <td><span class="tech-tag" :class="getStatusClass(req.status)">{{ req.status }}</span></td>
            <td>{{ req.score > 0 ? req.score + '分' : '-' }}</td>
            <td>{{ formatDate(req.createdAt) }}</td>
            <td>
              <span class="tech-link" :class="{ 'tech-link-disabled': !canViewDetail(req) }" @click="canViewDetail(req) && goToDetail(req.id)">查看详情</span>
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

    <div v-if="showModal" class="tech-modal-overlay">
      <div class="tech-modal" @click.stop>
        <div class="tech-modal-header">
          <h2 class="tech-modal-title">提交需求</h2>
          <div class="header-actions">
            <button class="tech-btn tech-btn-warning tech-btn-sm" @click="saveDraft" :disabled="savingDraft">
              {{ savingDraft ? "保存中..." : "保存草稿" }}
            </button>
            <button class="tech-modal-close" @click="closeModal">×</button>
          </div>
        </div>
        <div class="tech-modal-body">
          <RequirementForm ref="requirementFormRef" @close="closeModal" @submit-success="handleSubmitSuccess" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import { requirementApi } from '../api'
import RequirementForm from '../components/RequirementForm.vue'
import Pagination from '../components/Pagination.vue'
import ChartsPanel from '../components/ChartsPanel.vue'
import { hasPermission } from '../utils/access'

const router = useRouter()
const currentUser = inject('currentUser', ref({ name: '未登录', role: 'user' }))
const requirements = ref([])
const filterStatus = ref('')
const loading = ref(true)
const showModal = ref(false)
const requirementFormRef = ref(null)
const savingDraft = ref(false)
const statusList = ['待审批', '待评审', '待开发', '开发中', '测试中', '已发布']
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const statusStats = ref({})
const globalAvgScore = ref('0')
const canCreateRequirement = computed(() => hasPermission(currentUser.value, 'requirement:create'))

const priorityStats = computed(() => {
  const stats = { '高': 0, '中': 0, '低': 0 }
  requirements.value.forEach(r => {
    if (r.priority === '高' || r.priority === '中' || r.priority === '低') {
      stats[r.priority]++
    }
  })
  return stats
})

const scoreStats = computed(() => {
  const stats = { '0-60': 0, '61-80': 0, '81-100': 0 }
  requirements.value.forEach(r => {
    const s = r.score || 0
    if (s <= 0) return
    if (s <= 60) stats['0-60']++
    else if (s <= 80) stats['61-80']++
    else stats['81-100']++
  })
  return stats
})

const totalInProgress = computed(() => {
  const s = statusStats.value
  return (s['待审批'] || 0) + (s['待评审'] || 0) + (s['待开发'] || 0) + (s['开发中'] || 0) + (s['测试中'] || 0)
})

const totalReleased = computed(() => statusStats.value['已发布'] || 0)



const filteredRequirements = computed(() => {
  if (!filterStatus.value) return requirements.value
  return requirements.value.filter(r => r.status === filterStatus.value)
})

const getStatusClass = (status) => {
  const map = {
    '待审批': 'tech-tag-pending',
    '待评审': 'tech-tag-pending',
    '待开发': 'tech-tag-dev',
    '开发中': 'tech-tag-dev',
    '测试中': 'tech-tag-testing',
    '已发布': 'tech-tag-released'
  }
  return map[status] || ''
}

const getPriorityClass = (priority) => {
  const map = { '高': 'tech-tag-high', '中': 'tech-tag-medium', '低': 'tech-tag-low' }
  return map[priority] || ''
}

const formatDate = (date) => new Date(date).toLocaleDateString('zh-CN')

const goToDetail = (id) => router.push(`/detail/${id}`)

const goToSubmitRequirement = () => {
  router.push({ path: '/my-requirements', query: { openDialog: 'true' } })
}

const canViewDetail = (req) => {
  const user = currentUser.value
  if (!user || user.name === '未登录') return false
  if (user.role === 'admin') return true
  return req.submitter === user.name || req.developer === user.name
}

const closeModal = () => {
  showModal.value = false
}

const saveDraft = async () => {
  if (!requirementFormRef.value) {
    console.warn('RequirementForm ref not found')
    return
  }
  if (typeof requirementFormRef.value.saveDraft !== 'function') {
    console.error('saveDraft is not a function on RequirementForm')
    return
  }
  savingDraft.value = true
  try {
    await requirementFormRef.value.saveDraft()
  } finally {
    savingDraft.value = false
  }
}

const handleSubmitSuccess = () => {
  closeModal()
  currentPage.value = 1
  loadRequirements()
}

const loadRequirements = async (page = 1) => {
  try {
    loading.value = true
    currentPage.value = page
    const res = await requirementApi.getAll(page, pageSize.value)
    console.log('=== 后端返回的数据 ===')
    console.log('total:', res.data.total)
    console.log('statusStats:', res.data.statusStats)
    console.log('avgScore:', res.data.avgScore)
    console.log('========================')
    requirements.value = res.data.data
    total.value = res.data.total
    statusStats.value = res.data.statusStats || {}
    const avg = res.data.avgScore || 0
    globalAvgScore.value = typeof avg === 'number' ? avg.toFixed(1) : '0'
  } catch (error) {
    console.error('获取需求列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page, size) => {
  pageSize.value = size
  loadRequirements(page)
}

watch(filterStatus, () => {
  currentPage.value = 1
  loadRequirements(1)
})

watch(pageSize, () => {
  currentPage.value = 1
  loadRequirements(1)
})

onMounted(async () => {
  await loadRequirements(1)
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

.tech-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
}

.tech-modal {
  background: var(--tech-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.tech-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--tech-border);
  position: sticky;
  top: 0;
  background: var(--tech-bg);
  z-index: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tech-btn-warning {
  background: transparent;
  border: 1px solid #ffa726;
  color: #ffa726;
}

.tech-btn-warning:hover:not(:disabled) {
  background: #ffa726;
  color: #fff;
}

.tech-modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--tech-text-primary);
}

.tech-modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--tech-text-secondary);
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.tech-modal-close:hover {
  background: var(--tech-border);
  color: var(--tech-text-primary);
}

.tech-modal-body {
  padding: 24px;
}

.tech-link-disabled {
  color: var(--tech-text-secondary);
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
</style>
