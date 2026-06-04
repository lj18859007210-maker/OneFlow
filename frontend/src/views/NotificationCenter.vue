<template>
  <div class="notification-center">
    <div class="page-header">
      <h1>通知中心</h1>
      <div class="header-actions">
        <select v-model="filterType" class="filter-select">
          <option value="">全部类型</option>
          <option value="approval_request">审批请求</option>
          <option value="approval_result">审批结果</option>
          <option value="status_change">状态变更</option>
          <option value="new_comment">新评论</option>
          <option value="assign_dev">任务分配</option>
        </select>
        <select v-model="filterRead" class="filter-select">
          <option value="">全部状态</option>
          <option value="unread">未读</option>
          <option value="read">已读</option>
        </select>
        <button class="btn-mark-all" @click="handleMarkAllRead" :disabled="unreadCount === 0">
          全部已读
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="notifications.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <p>暂无通知</p>
    </div>

    <div v-else class="notification-list">
      <div
        v-for="notif in notifications"
        :key="notif.id"
        class="notification-card"
        :class="{ unread: !notif.isRead }"
      >
        <div class="card-header">
          <div class="card-type">
            <span class="type-badge" :class="`type-${notif.type}`">
              {{ getTypeLabel(notif.type) }}
            </span>
          </div>
          <div class="card-actions">
            <button v-if="!notif.isRead" class="btn-read" @click="handleMarkRead(notif.id)">
              标记已读
            </button>
            <button class="btn-delete" @click="handleDelete(notif.id)">
              删除
            </button>
          </div>
        </div>

        <div class="card-body" @click="handleNotificationClick(notif)">
          <h3 class="card-title">{{ notif.title }}</h3>
          <p class="card-content">{{ notif.content }}</p>
          <div class="card-footer">
            <span class="card-time">{{ formatTime(notif.createdAt) }}</span>
            <span v-if="notif.isRead" class="read-status">已读</span>
            <span v-else class="read-status unread">未读</span>
          </div>
        </div>
      </div>
    </div>

    <Pagination
      v-if="total > pageSize"
      :total="total"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      @change="handlePageChange"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { notificationApi } from '../api'
import { useRouter } from 'vue-router'
import Pagination from '../components/Pagination.vue'

const router = useRouter()

const notifications = ref([])
const loading = ref(true)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const unreadCount = ref(0)
const filterType = ref('')
const filterRead = ref('')

const hasAuthToken = () => !!localStorage.getItem('token')

const loadNotifications = async () => {
  if (!hasAuthToken()) {
    notifications.value = []
    total.value = 0
    loading.value = false
    return
  }

  try {
    loading.value = true
    const filters = {
      page: currentPage.value,
      pageSize: pageSize.value,
      type: filterType.value || undefined
    }
    
    if (filterRead.value === 'unread') {
      filters.isRead = false
    } else if (filterRead.value === 'read') {
      filters.isRead = true
    }
    
    const res = await notificationApi.getList(filters)
    notifications.value = res.data.data
    total.value = res.data.total
  } catch (error) {
    console.error('加载通知失败:', error)
  } finally {
    loading.value = false
  }
}

const loadUnreadCount = async () => {
  if (!hasAuthToken()) {
    unreadCount.value = 0
    return
  }

  try {
    const res = await notificationApi.getUnreadCount()
    unreadCount.value = Number(res.data?.data?.count ?? 0)
  } catch (error) {
    console.error('获取未读数量失败:', error)
  }
}

const handleMarkRead = async (id) => {
  try {
    await notificationApi.markAsRead(id)
    const notif = notifications.value.find(n => n.id === id)
    if (notif) notif.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch (error) {
    console.error('标记已读失败:', error)
  }
}

const handleMarkAllRead = async () => {
  try {
    await notificationApi.markAllAsRead()
    notifications.value.forEach(n => n.isRead = true)
    unreadCount.value = 0
  } catch (error) {
    console.error('标记全部已读失败:', error)
  }
}

const handleDelete = async (id) => {
  try {
    await notificationApi.remove(id)
    notifications.value = notifications.value.filter(n => n.id !== id)
    total.value--
  } catch (error) {
    console.error('删除通知失败:', error)
  }
}

const handleNotificationClick = (notif) => {
  if (!notif.isRead) {
    handleMarkRead(notif.id)
  }
  if (notif.resourceId && notif.resourceType === 'requirement') {
    router.push(`/detail/${notif.resourceId}`)
  }
}

const handlePageChange = (page, size) => {
  pageSize.value = size
  loadNotifications()
}

const getTypeLabel = (type) => {
  const map = {
    approval_request: '审批请求',
    approval_result: '审批结果',
    status_change: '状态变更',
    new_comment: '新评论',
    assign_dev: '任务分配',
    system: '系统通知'
  }
  return map[type] || type
}

const formatTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

watch([filterType, filterRead], () => {
  currentPage.value = 1
  loadNotifications()
})

onMounted(() => {
  if (hasAuthToken()) {
    loadNotifications()
    loadUnreadCount()
  } else {
    loading.value = false
  }
})
</script>

<style scoped>
.notification-center {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--tech-text-primary);
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
  cursor: pointer;
}

.btn-mark-all {
  padding: 8px 16px;
  font-size: 14px;
  color: var(--tech-blue);
  background: transparent;
  border: 1px solid var(--tech-blue);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-mark-all:hover:not(:disabled) {
  background: var(--tech-blue);
  color: #fff;
}

.btn-mark-all:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--tech-text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--tech-border);
  border-top-color: var(--tech-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notification-card {
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.notification-card:hover {
  box-shadow: var(--tech-shadow);
  border-color: var(--tech-blue-light);
}

.notification-card.unread {
  border-left: 3px solid var(--tech-blue);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid var(--tech-border);
}

.type-badge {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--tech-blue);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn-read,
.btn-delete {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-read {
  color: var(--tech-blue);
  background: transparent;
  border: 1px solid var(--tech-blue);
}

.btn-read:hover {
  background: var(--tech-blue);
  color: #fff;
}

.btn-delete {
  color: #ef4444;
  background: transparent;
  border: 1px solid #ef4444;
}

.btn-delete:hover {
  background: #ef4444;
  color: #fff;
}

.card-body {
  padding: 16px;
  cursor: pointer;
}

.card-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--tech-text-primary);
}

.card-content {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--tech-text-secondary);
  line-height: 1.6;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-time {
  font-size: 12px;
  color: var(--tech-text-secondary);
  opacity: 0.6;
}

.read-status {
  font-size: 12px;
  color: var(--tech-text-secondary);
}

.read-status.unread {
  color: var(--tech-blue);
  font-weight: 500;
}
</style>
