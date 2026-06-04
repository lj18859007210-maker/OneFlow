<template>
  <div class="audit-logs">
    <div class="page-header">
      <div>
        <h1>审计日志</h1>
        <p class="page-subtitle">记录关键操作、资源与执行结果，便于追踪权限与变更行为。</p>
      </div>
      <div class="header-actions">
        <select v-model="actionFilter" class="filter-select">
          <option value="">全部操作</option>
          <option v-for="action in actions" :key="action.value" :value="action.value">{{ action.label }}</option>
        </select>
        <button class="btn-primary" @click="loadLogs(1)" :disabled="loading">刷新</button>
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

    <div v-else-if="logs.length === 0" class="tech-empty">
      <div class="tech-empty-text">暂无审计日志</div>
    </div>

    <div v-else class="table-container">
      <table class="tech-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>角色</th>
            <th>操作内容</th>
            <th>原始信息</th>
            <th>状态</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ log.userName || '-' }}</td>
            <td>{{ log.userRole || '-' }}</td>
            <td>
              <div class="audit-summary">{{ log.summary || log.actionLabel || log.action }}</div>
              <div class="resource-meta">{{ log.actionLabel || log.action || '-' }}</div>
            </td>
            <td>
              <div>{{ log.resourceLabel || log.resource || '-' }}</div>
              <div class="resource-meta" v-if="log.raw?.resourceId || log.resourceId">
                {{ log.raw?.resourceId || log.resourceId }}
              </div>
            </td>
            <td>
              <span class="tech-tag" :class="log.status === 'success' ? 'tech-tag-released' : 'tech-tag-rejected'">
                {{ log.resultLabel || log.status }}
              </span>
            </td>
            <td>{{ formatDateTime(log.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Pagination
      v-if="total > 0"
      :total="total"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      @change="handlePageChange"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { auditLogApi } from '../api'
import Pagination from '../components/Pagination.vue'

const logs = ref([])
const actions = ref([])
const loading = ref(true)
const actionFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

async function loadActions() {
  try {
    const res = await auditLogApi.getActions()
    actions.value = normalizeActions(res.data.data)
  } catch (error) {
    console.error('加载审计操作类型失败:', error)
  }
}

async function loadLogs(page = currentPage.value) {
  try {
    loading.value = true
    currentPage.value = page
    const res = await auditLogApi.getList({
      page,
      pageSize: pageSize.value,
      action: actionFilter.value || undefined
    })
    logs.value = res.data.data || []
    total.value = res.data.total || 0
  } catch (error) {
    console.error('加载审计日志失败:', error)
  } finally {
    loading.value = false
  }
}

function handlePageChange(page, size) {
  pageSize.value = size
  loadLogs(page)
}

watch(actionFilter, () => {
  loadLogs(1)
})

onMounted(async () => {
  await Promise.all([loadActions(), loadLogs(1)])
})

function normalizeActions(items) {
  if (!Array.isArray(items)) return []
  return items.map(item => {
    if (item && typeof item === 'object') return item
    return { value: item, label: item }
  })
}
</script>

<style scoped>
.audit-logs {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--tech-text-primary);
}

.page-subtitle {
  margin: 8px 0 0;
  color: var(--tech-text-secondary);
  font-size: 13px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-select {
  padding: 8px 12px;
  font-size: 14px;
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  color: var(--tech-text-primary);
}

.btn-primary {
  padding: 8px 16px;
  font-size: 14px;
  color: #fff;
  background: var(--tech-blue);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table-container {
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  overflow: hidden;
}

.resource-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--tech-text-secondary);
}

.audit-summary {
  font-weight: 600;
  color: var(--tech-text-primary);
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
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
}
</style>
