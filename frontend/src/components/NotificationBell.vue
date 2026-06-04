<template>
  <div class="notification-bell" @click.stop="toggleDropdown">
    <div class="bell-icon" :class="{ 'has-unread': unreadCount > 0 }">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </div>

    <div v-if="showDropdown" class="notification-dropdown">
      <div class="dropdown-header">
        <h3>通知中心</h3>
        <button class="mark-all-read" @click="handleMarkAllRead" :disabled="unreadCount === 0">
          全部已读
        </button>
      </div>

      <div class="notification-list">
        <div v-if="loading" class="loading-state">加载中...</div>
        <div v-else-if="notifications.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p>暂无通知</p>
        </div>
        <div v-else>
          <div
            v-for="notif in notifications"
            :key="notif.id"
            class="notification-item"
            :class="{ unread: !notif.isRead }"
            @click="handleNotificationClick(notif)"
          >
            <div class="notif-icon" :class="`type-${notif.type}`">
              <svg v-if="notif.type === 'approval_request'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <svg v-else-if="notif.type === 'approval_result'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              </svg>
            </div>
            <div class="notif-content">
              <div class="notif-title">{{ notif.title }}</div>
              <div class="notif-text">{{ notif.content?.substring(0, 60) || '' }}</div>
              <div class="notif-time">{{ formatTime(notif.createdAt) }}</div>
            </div>
            <button class="delete-btn" @click.stop="handleDelete(notif.id)" title="删除">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="total > pageSize" class="load-more">
        <button @click="loadMore" :disabled="loadingMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, inject } from 'vue'
import { notificationApi } from '../api'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentUser = inject('currentUser', ref({}))

const showDropdown = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)

let refreshTimer = null

const hasAuthToken = () => !!localStorage.getItem('token')

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    loadNotifications()
  }
}

const loadNotifications = async (append = false) => {
  try {
    if (!append) {
      loading.value = true
      currentPage.value = 1
    } else {
      loadingMore.value = true
    }
    
    const res = await notificationApi.getList({
      page: currentPage.value,
      pageSize
    })
    
    if (append) {
      notifications.value = [...notifications.value, ...res.data.data]
    } else {
      notifications.value = res.data.data
    }
    total.value = res.data.total
    await loadUnreadCount()
  } catch (error) {
    console.error('加载通知失败:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
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

const handleMarkAllRead = async () => {
  try {
    await notificationApi.markAllAsRead()
    unreadCount.value = 0
    notifications.value.forEach(n => n.isRead = true)
  } catch (error) {
    console.error('标记全部已读失败:', error)
  }
}

const handleNotificationClick = async (notif) => {
  if (!notif.isRead) {
    try {
      await notificationApi.markAsRead(notif.id)
      notif.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }
  
  if (notif.resourceId && notif.resourceType === 'requirement') {
    router.push(`/detail/${notif.resourceId}`)
    showDropdown.value = false
  }
}

const handleDelete = async (id) => {
  try {
    const deletedNotification = notifications.value.find(n => n.id === id)
    await notificationApi.remove(id)
    notifications.value = notifications.value.filter(n => n.id !== id)
    total.value--
    if (deletedNotification && !deletedNotification.isRead) {
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  } catch (error) {
    console.error('删除通知失败:', error)
  }
}

const loadMore = () => {
  currentPage.value++
  loadNotifications(true)
}

const formatTime = (date) => {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return d.toLocaleDateString('zh-CN')
}

const handleClickOutside = (e) => {
  if (!e.target.closest('.notification-bell')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  if (hasAuthToken()) {
    loadUnreadCount()
  }
  document.addEventListener('click', handleClickOutside)
  
  // 每 30 秒刷新未读数量
  refreshTimer = setInterval(loadUnreadCount, 30000)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.notification-bell {
  position: relative;
  display: inline-block;
}

.bell-icon {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--tech-text-secondary);
}

.bell-icon:hover {
  background: var(--tech-border);
  color: var(--tech-blue);
}

.bell-icon.has-unread,
.bell-icon.has-unread:hover {
  color: #ef4444;
}

.bell-icon svg {
  width: 22px;
  height: 22px;
}

.unread-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  color: #fff;
  background: #ef4444;
  border-radius: 9px;
}

.notification-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 380px;
  max-height: 500px;
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  box-shadow: var(--tech-shadow-lg);
  overflow: hidden;
  z-index: 1000;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--tech-border);
}

.dropdown-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--tech-text-primary);
}

.mark-all-read {
  padding: 6px 12px;
  font-size: 13px;
  color: var(--tech-blue);
  background: transparent;
  border: 1px solid var(--tech-blue);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.mark-all-read:hover:not(:disabled) {
  background: var(--tech-blue);
  color: #fff;
}

.mark-all-read:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.notification-list {
  max-height: 380px;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--tech-text-secondary);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.3;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--tech-border);
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.notification-item:hover {
  background: rgba(59, 130, 246, 0.05);
}

.notification-item.unread {
  background: rgba(59, 130, 246, 0.08);
}

.notification-item.unread::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: var(--tech-blue);
  border-radius: 50%;
}

.notif-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(59, 130, 246, 0.1);
  color: var(--tech-blue);
}

.notif-icon svg {
  width: 20px;
  height: 20px;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--tech-text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-text {
  font-size: 12px;
  color: var(--tech-text-secondary);
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-time {
  font-size: 11px;
  color: var(--tech-text-secondary);
  opacity: 0.6;
}

.delete-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--tech-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s;
  flex-shrink: 0;
}

.notification-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.delete-btn svg {
  width: 16px;
  height: 16px;
}

.load-more {
  padding: 12px;
  text-align: center;
  border-top: 1px solid var(--tech-border);
}

.load-more button {
  padding: 8px 20px;
  font-size: 13px;
  color: var(--tech-blue);
  background: transparent;
  border: 1px solid var(--tech-blue);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more button:hover:not(:disabled) {
  background: var(--tech-blue);
  color: #fff;
}

.load-more button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
