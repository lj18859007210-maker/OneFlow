<template>
  <div class="approval">
    <div class="tech-tabs" style="margin-bottom:20px">
      <button v-for="tab in tabs" :key="tab.value" class="tech-tab" :class="{ active: activeTab === tab.value }" @click="switchTab(tab.value)">{{ tab.label }}</button>
    </div>

    <div class="approval-search">
      <input
        v-model.trim="searchKeyword"
        type="search"
        class="tech-input approval-search-input"
        placeholder="提交人 / 项目名称"
        @input="scheduleSearch"
        @keyup.enter="applySearch"
      />
      <button class="tech-btn tech-btn-primary tech-btn-sm" @click="applySearch">搜索</button>
      <button v-if="searchKeyword" class="tech-btn tech-btn-outline tech-btn-sm" @click="clearSearch">清空</button>
    </div>

    <div class="approval-list-region">
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

      <div v-else-if="sortedRequirements.length === 0" class="tech-empty">
        <div class="tech-empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            <path d="M9 14l2 2 4-4"/>
          </svg>
        </div>
        <div class="tech-empty-text">暂无{{ activeTab === 'pending' ? '待审批' : '' }}需求</div>
      </div>

      <div v-else class="tech-approval-cards">
        <div v-for="req in sortedRequirements" :key="req.id" class="tech-approval-card">
          <div class="tech-approval-status">
            <span class="tech-approval-title">{{ displayValue(req.title) }}</span>
            <span class="tech-tag" :class="getApprovalClass(req.approvalStatus)">{{ getApprovalText(req.approvalStatus) }}</span>
          </div>
          <div style="font-size:13px;color:var(--tech-text-secondary);margin-bottom:12px">
            提交人: {{ displayValue(req.submitter) }} · 开发人员: {{ displayValue(req.developer) }} · 优先级:
            <span class="tech-tag" :class="getPriorityClass(req.priority)">{{ displayValue(req.priority) }}</span>
          </div>
          <div style="font-size:14px;color:var(--tech-text-secondary);line-height:1.6;margin-bottom:12px">{{ displayValue(req.description) }}</div>
          <div v-if="req.approvalComment && req.approvalStatus !== 'pending'" style="font-size:13px;background:rgba(74,144,226,0.06);padding:8px 12px;border-radius:6px;color:var(--tech-text-secondary)">
            审批意见: {{ req.approvalComment }}
          </div>

          <div v-if="req.approvalStatus === 'pending' && canApprove" class="tech-approval-actions">
            <div style="flex:1;margin-right:0">
              <div class="tech-form-group" style="margin-bottom:8px">
                <textarea v-model="comments[req.id]" class="tech-textarea" style="min-height:60px" placeholder="请输入审批意见"></textarea>
              </div>
              <div style="display:flex;gap:12px">
                <button @click="showDeadlineDialog(req.id)" class="tech-btn tech-btn-success tech-btn-sm">同意</button>
                <button @click="showRejectDialog(req.id)" class="tech-btn tech-btn-danger tech-btn-sm">拒绝</button>
                <span class="tech-link" @click="$router.push(`/detail/${req.id}`)" style="padding:6px 0;font-size:12px">查看详情</span>
              </div>
            </div>
          </div>

          <div v-else-if="req.approvalStatus === 'pending'" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--tech-border);font-size:13px;color:var(--tech-text-secondary)">
            当前账号没有审批权限，仅可查看列表。
          </div>

          <div v-else style="margin-top:12px;padding-top:12px;border-top:1px solid var(--tech-border);display:flex;justify-content:space-between">
            <span class="tech-link" @click="$router.push(`/detail/${req.id}`)" style="font-size:12px">查看详情</span>
            <span class="tech-tag" :class="getStatusClass(req.status)">{{ req.status }}</span>
          </div>
        </div>
      </div>
    </div>

    <Pagination
      v-if="total > 0"
      :total="total"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      @change="handlePageChange"
    />
  </div>

  <div v-if="deadlineDialogVisible" class="tech-dialog-overlay" @click.self="closeDeadlineDialog">
    <div class="tech-dialog">
      <div class="tech-dialog-header">
        <span class="tech-dialog-title">设置实际时限</span>
        <button class="tech-dialog-close" @click="closeDeadlineDialog">×</button>
      </div>
      <div class="tech-dialog-body">
        <div class="tech-deadline-dialog-row">
          <span class="tech-deadline-dialog-label">期望时限</span>
          <span class="tech-deadline-dialog-value">{{ currentRequirement?.expectedDate ? formatDate(currentRequirement.expectedDate) : '未设置' }}</span>
        </div>
        <div class="tech-deadline-dialog-row">
          <span class="tech-deadline-dialog-label">实际时限 <span class="required">*</span></span>
          <input 
            v-model="selectedActualDate" 
            type="date" 
            class="tech-deadline-dialog-input"
          />
        </div>
      </div>
      <div class="tech-dialog-footer">
        <button @click="closeDeadlineDialog" class="tech-btn tech-btn-outline tech-btn-sm">取消</button>
        <button @click="confirmApprove" class="tech-btn tech-btn-success tech-btn-sm" :disabled="!selectedActualDate">确认同意</button>
      </div>
    </div>
  </div>

  <div v-if="rejectDialogVisible" class="tech-dialog-overlay" @click.self="closeRejectDialog">
    <div class="tech-dialog">
      <div class="tech-dialog-header">
        <span class="tech-dialog-title">确认拒绝</span>
        <button class="tech-dialog-close" @click="closeRejectDialog">×</button>
      </div>
      <div class="tech-dialog-body">
        <div class="tech-reject-message">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF5350" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p>确定要拒绝该需求吗？此操作不可撤销。</p>
        </div>
      </div>
      <div class="tech-dialog-footer">
        <button @click="closeRejectDialog" class="tech-btn tech-btn-outline tech-btn-sm">取消</button>
        <button @click="confirmReject" class="tech-btn tech-btn-danger tech-btn-sm">确认拒绝</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { requirementApi, emailApi } from '../api'
import { hasPermission } from '../utils/access'
import Pagination from '../components/Pagination.vue'

const requirements = ref([])
const route = useRoute()
const currentUser = inject('currentUser', ref({ name: '未登录', role: 'user', permissions: [] }))
const activeTab = ref('pending')
const comments = ref({})
const loading = ref(true)
const searchKeyword = ref('')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const deadlineDialogVisible = ref(false)
const currentRequirement = ref(null)
const selectedActualDate = ref('')
const pendingApproveId = ref(null)
const rejectDialogVisible = ref(false)
const pendingRejectId = ref(null)
let searchTimer = null
let latestRequestId = 0

const tabs = [
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '全部', value: 'all' }
]

const canApprove = computed(() => hasPermission(currentUser.value, 'requirement:approve'))

const sortedRequirements = computed(() => {
  const selectedId = String(route.query.id || '')
  if (!selectedId) return requirements.value

  return [...requirements.value].sort((a, b) => {
    if (String(a.id) === selectedId) return -1
    if (String(b.id) === selectedId) return 1
    return 0
  })
})

const displayValue = (value, fallback = '-') => {
  if (value === undefined || value === null) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

const normalizeRequirement = (req = {}) => ({
  ...req,
  title: req.title || '',
  description: req.description || '',
  submitter: req.submitter || '',
  developer: req.developer || '',
  priority: req.priority || '低',
  approvalStatus: req.approvalStatus || 'pending',
  status: req.status || ''
})

const switchTab = (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  currentPage.value = 1
  loadRequirements(1)
}

const scheduleSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    applySearch()
  }, 300)
}

const applySearch = () => {
  currentPage.value = 1
  loadRequirements(1)
}

const clearSearch = () => {
  searchKeyword.value = ''
  applySearch()
}

const handlePageChange = (page, size) => {
  pageSize.value = size
  loadRequirements(page)
}

const getApprovalClass = (status) => {
  const map = { 'approved': 'tech-tag-released', 'rejected': 'tech-tag-rejected', 'pending': 'tech-tag-pending' }
  return map[status] || 'tech-tag-pending'
}

const getApprovalText = (status) => {
  const map = { 'approved': '已通过', 'rejected': '已拒绝', 'pending': '待审批' }
  return map[status] || '待审批'
}

const getPriorityClass = (priority) => {
  const map = { '高': 'tech-tag-high', '中': 'tech-tag-medium', '低': 'tech-tag-low' }
  return map[priority] || ''
}

const getStatusClass = (status) => {
  const map = {
    '待审批': 'tech-tag-pending', '待评审': 'tech-tag-pending', '待开发': 'tech-tag-dev', '开发中': 'tech-tag-dev',
    '测试中': 'tech-tag-testing', '已发布': 'tech-tag-released'
  }
  return map[status] || ''
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

const showDeadlineDialog = (id) => {
  const req = requirements.value.find(r => r.id === id)
  currentRequirement.value = req
  selectedActualDate.value = ''
  pendingApproveId.value = id
  deadlineDialogVisible.value = true
}

const closeDeadlineDialog = () => {
  deadlineDialogVisible.value = false
  currentRequirement.value = null
  selectedActualDate.value = ''
  pendingApproveId.value = null
}

const confirmApprove = async () => {
  if (!selectedActualDate.value) {
    showToast('请选择实际时限')
    return
  }
  const id = pendingApproveId.value
  await handleApprove(id, true)
}

const showRejectDialog = (id) => {
  pendingRejectId.value = id
  rejectDialogVisible.value = true
}

const closeRejectDialog = () => {
  rejectDialogVisible.value = false
  pendingRejectId.value = null
}

const confirmReject = async () => {
  const id = pendingRejectId.value
  closeRejectDialog()
  await handleApprove(id, false)
}

const handleApprove = async (id, approved) => {
  try {
    const comment = comments.value[id] || (approved ? '同意开发' : '需要修改')
    const actualDate = approved ? selectedActualDate.value : null
    
    const res = await requirementApi.approve(id, approved, comment, actualDate)

    emailApi.send({
      to: 'submitter@cmcc.cn',
      cc: res.data.data.ccEmails || [],
      subject: `需求审批${approved ? '通过' : '拒绝'}: ${res.data.data.title}`,
      body: `您的需求 "${res.data.data.title}" 已${approved ? '通过审批' : '被拒绝'}。\n审批意见: ${comment}`
    }).catch(() => {})

    showToast(approved ? '审批通过，邮件发送中' : '审批拒绝，邮件发送中')
    closeDeadlineDialog()
    await loadRequirements()
  } catch (error) {
    showToast('操作失败')
  }
}

const showToast = (message) => {
  const toast = document.createElement('div')
  toast.className = 'tech-toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2200)
}

const loadRequirements = async (page = currentPage.value) => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  const requestId = ++latestRequestId
  try {
    loading.value = true
    currentPage.value = page
    const filters = {
      approvalStatus: activeTab.value === 'all' ? '' : activeTab.value,
      keyword: searchKeyword.value || ''
    }
    const res = await requirementApi.getApprovalList(page, pageSize.value, filters)
    if (requestId !== latestRequestId) return
    requirements.value = (res.data.data || []).map(normalizeRequirement)
    total.value = res.data.total || 0
  } catch (error) {
    console.error('获取需求列表失败:', error)
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

onMounted(loadRequirements)
</script>

<style scoped>
.approval-search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.approval-search-input {
  max-width: 360px;
}

.approval-list-region {
  margin-bottom: 14px;
}

.approval :deep(.tech-approval-card) {
  min-height: 260px;
  box-sizing: border-box;
}

.approval :deep(.tech-pagination) {
  padding: 14px 24px;
  border-top: 1px solid var(--tech-border);
  background: rgba(232, 243, 255, 0.45);
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

@media (max-width: 640px) {
  .approval-search {
    align-items: stretch;
    flex-direction: column;
  }

  .approval-search-input {
    max-width: none;
  }

  .approval-list-region {
    margin-bottom: 12px;
  }

  .approval :deep(.tech-approval-card) {
    min-height: auto;
  }

  .approval :deep(.tech-pagination) {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
  }
}
</style>
