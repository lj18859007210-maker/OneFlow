<template>
  <div class="my-requirements">
    <div class="tech-table-wrap">
      <div class="tech-table-header">
        <div class="tech-table-title">我的需求</div>
        <div class="tech-table-actions">
          <select v-model="filterStatus" class="tech-filter-select">
            <option value="">全部状态</option>
            <option v-for="s in statusList" :key="s" :value="s">{{ s }}</option>
          </select>
          <button v-if="canCreateRequirement" @click="showModal = true" class="tech-btn tech-btn-primary tech-btn-sm">+ 提交新需求</button>
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
          <tr v-for="req in filteredRequirements" :key="req.isDraft ? 'draft-' + req.id : req.id" :class="{ 'tech-draft-row': req.isDraft }">
            <td><span class="tech-link" @click="goToDetailOrDraft(req.id, req.isDraft)">{{ req.title }}<span v-if="req.isDraft" class="tech-draft-badge">草稿</span></span></td>
            <td>{{ req.submitter }}</td>
            <td>{{ req.developer || '-' }}</td>
            <td><span class="tech-tag" :class="getPriorityClass(req.priority)">{{ req.priority || '-' }}</span></td>
            <td><span v-if="req.isDraft" class="tech-tag tech-tag-draft">草稿</span><span v-else class="tech-tag" :class="getStatusClass(req.status)">{{ req.status }}</span></td>
            <td>{{ formatRequirementScore(req) }}</td>
            <td>{{ formatDate(req.createdAt) }}</td>
            <td>
              <template v-if="req.isDraft">
                <span v-if="canUpdateRequirement" class="tech-link" @click="editDraft(req.id)">编辑</span>
                <span v-if="canDeleteRequirement" class="tech-link tech-link-danger" @click="deleteItem(req.id, req.isDraft)">删除</span>
              </template>
              <template v-else>
                <span class="tech-link" @click="viewDetail(req.id)">查看</span>
                <span v-if="canDeleteRequirement" class="tech-link tech-link-danger" @click="deleteItem(req.id, req.isDraft)">删除</span>
              </template>
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
          <h2 class="tech-modal-title">提交新需求</h2>
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

    <div v-if="showEditModal" class="tech-modal-overlay">
      <div class="tech-modal" @click.stop>
        <div class="tech-modal-header">
          <h2 class="tech-modal-title">编辑草稿</h2>
          <div class="header-actions">
            <button class="tech-btn tech-btn-warning tech-btn-sm" @click="saveEditDraft" :disabled="savingDraft">
              {{ savingDraft ? "保存中..." : "保存草稿" }}
            </button>
            <button class="tech-modal-close" @click="closeEditModal">×</button>
          </div>
        </div>
        <div class="tech-modal-body">
          <RequirementForm ref="editRequirementFormRef" :draft-data="editingDraft" @close="closeEditModal" @submit-success="handleEditSuccess" />
        </div>
      </div>
    </div>



    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="tech-modal-overlay">
      <div class="tech-modal tech-modal-small" @click.stop>
        <div class="tech-modal-header">
          <h2 class="tech-modal-title">确认删除</h2>
          <button class="tech-modal-close" @click="closeDeleteConfirm">×</button>
        </div>
        <div class="tech-modal-body">
          <p class="tech-confirm-text">确定要删除该需求吗？此操作不可撤销。</p>
          <div class="tech-confirm-actions">
            <button class="tech-btn tech-btn-cancel" @click="closeDeleteConfirm">取消</button>
            <button class="tech-btn tech-btn-danger" @click="confirmDelete">确认删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { requirementApi } from '../api'
import RequirementForm from '../components/RequirementForm.vue'
import Pagination from '../components/Pagination.vue'
import { showToast as showAppToast } from '../utils/toastService.js'
import { hasPermission } from '../utils/access'

const router = useRouter()
const route = useRoute()
const currentUser = inject('currentUser')
const requirements = ref([])
const drafts = ref([])
const filterStatus = ref('')
const loading = ref(true)
const showModal = ref(false)
const showEditModal = ref(false)
const editingDraft = ref(null)
const requirementFormRef = ref(null)
const editRequirementFormRef = ref(null)
const savingDraft = ref(false)
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const statusList = ['待审批', '待评审', '待开发', '开发中', '测试中', '已发布', '草稿']
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const canCreateRequirement = computed(() => hasPermission(currentUser?.value, 'requirement:create'))
const canUpdateRequirement = computed(() => hasPermission(currentUser?.value, 'requirement:update'))
const canDeleteRequirement = computed(() => hasPermission(currentUser?.value, 'requirement:delete'))

const allItems = computed(() => {
  const draftItems = drafts.value.map(d => ({ ...d, isDraft: true }))
  const requirementItems = requirements.value.map(r => ({ ...r, isDraft: false }))
  return [...draftItems, ...requirementItems]
})

const filteredRequirements = computed(() => {
  if (!filterStatus.value) return allItems.value
  if (filterStatus.value === '草稿') return allItems.value.filter(r => r.isDraft)
  return allItems.value.filter(r => !r.isDraft && r.status === filterStatus.value)
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

const formatRequirementScore = (req) => {
  if (req.isDraft || req.status !== '已发布') return '-'
  const score = Number(req.score)
  return score > 0 ? `${score}分` : '-'
}

const goToDetailOrDraft = (id, isDraft) => {
  if (isDraft) {
    editDraft(id)
  } else {
    viewDetail(id)
  }
}

const viewDetail = (id) => {
  router.push(`/detail/${id}`)
}

const editDraft = async (id) => {
  try {
    const res = await requirementApi.getById(id)
    if (res.data.success && res.data.data) {
      editingDraft.value = res.data.data
      showEditModal.value = true
    }
  } catch (error) {
    console.error('获取草稿失败:', error)
    showToast('加载草稿失败')
  }
}



const deleteItem = (id, isDraft) => {
  deleteTarget.value = { id, isDraft }
  showDeleteConfirm.value = true
}

const closeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  const { id, isDraft } = deleteTarget.value
  try {
    await requirementApi.remove(id)
    await loadRequirements()
    closeDeleteConfirm()
  } catch (error) {
    console.error('删除失败:', error)
    showAppToast('删除失败: ' + (error.response?.data?.message || error.message), { type: 'error', title: '删除失败' })
    closeDeleteConfirm()
  }
}

const closeModal = () => {
  showModal.value = false
}

const closeEditModal = () => {
  showEditModal.value = false
  editingDraft.value = null
}

const saveEditDraft = async () => {
  if (!editRequirementFormRef.value) return
  savingDraft.value = true
  try {
    await editRequirementFormRef.value.saveDraft()
  } finally {
    savingDraft.value = false
  }
}

const handleEditSuccess = () => {
  closeEditModal()
  currentPage.value = 1
  loadRequirements()
}

const saveDraft = async () => {
  console.log('requirementFormRef.value:', requirementFormRef.value)
  if (!requirementFormRef.value) {
    console.warn('RequirementForm ref not found')
    return
  }
  console.log('requirementFormRef.value.saveDraft:', requirementFormRef.value.saveDraft)
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
    const submitter = currentUser?.value?.name || '管理员'
    const [reqRes, draftRes] = await Promise.all([
      requirementApi.getBySubmitter(submitter, page, pageSize.value),
      requirementApi.getDrafts(submitter)
    ])
    requirements.value = reqRes.data.data || []
    drafts.value = draftRes.data.data || []
    total.value = (reqRes.data.total || 0) + (drafts.value.length || 0)
  } catch (error) {
    console.error('获取我的需求列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page, size) => {
  pageSize.value = size
  loadRequirements(page)
}

const showToast = (message) => {
  const toast = document.createElement('div')
  toast.className = 'tech-toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2200)
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
  if (route.query.openDialog === 'true') {
    if (canCreateRequirement.value) {
      showModal.value = true
    } else {
      showAppToast('当前账号没有提交需求权限', { type: 'error', title: '无权限' })
    }
  }
})
</script>

<style scoped>
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

.tech-draft-row {
  background: rgba(255, 255, 255, 0.02);
}

.tech-draft-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.tech-draft-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 12px;
  background: var(--tech-primary);
  color: #fff;
  border-radius: 12px;
  opacity: 0.8;
}

.tech-tag-draft {
  background: rgba(100, 100, 100, 0.3);
  color: #aaa;
}

.tech-link {
  cursor: pointer;
  margin-right: 12px;
}

.tech-link-danger {
  color: #f44;
}

.tech-link-danger:hover {
  color: #f66;
  text-decoration: underline;
}

.tech-modal-small {
  max-width: 480px;
}

.tech-confirm-text {
  font-size: 15px;
  color: var(--tech-text-primary);
  margin: 0 0 24px 0;
  line-height: 1.6;
}

.tech-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.tech-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tech-btn-cancel {
  background: var(--tech-border);
  color: var(--tech-text-primary);
}

.tech-btn-cancel:hover {
  background: #555;
}

.tech-btn-danger {
  background: #f44;
  color: #fff;
}

.tech-btn-danger:hover {
  background: #f66;
}
</style>
