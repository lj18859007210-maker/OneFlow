<template>
  <div class="user-role-management">
    <div class="page-header">
      <h1>用户角色管理</h1>
      <p>统一维护账号角色，开发人员列表将实时跟随角色变化。</p>
    </div>

    <div class="role-toolbar">
      <select v-model="selectedRole" class="filter-select" @change="applyFilters">
        <option value="">全部角色</option>
        <option v-for="role in roleOptions" :key="role.value" :value="role.value">
          {{ role.label }}
        </option>
      </select>
      <input
        v-model.trim="searchKeyword"
        type="search"
        class="search-input"
        placeholder="查询姓名、账号、邮箱"
        @input="scheduleSearch"
        @keyup.enter="applyFilters"
      />
      <button class="btn-search" @click="applyFilters">查询</button>
      <button v-if="searchKeyword || selectedRole" class="btn-clear" @click="clearFilters">清空</button>
    </div>

    <div class="table-container">
      <table class="tech-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>账号</th>
            <th>邮箱</th>
            <th>当前角色</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody v-if="!loading && users.length > 0">
          <tr v-for="user in users" :key="user.ID">
            <td>{{ user.NAME }}</td>
            <td>{{ user.USERNAME }}</td>
            <td>{{ user.EMAIL || '-' }}</td>
            <td>
              <select v-model="roleDrafts[user.ID]" class="role-select">
                <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ role.label }}
                </option>
              </select>
            </td>
            <td>
              <span class="tech-tag" :class="Number(user.STATUS) === 1 ? 'tech-tag-released' : 'tech-tag-rejected'">
                {{ Number(user.STATUS) === 1 ? '启用' : '停用' }}
              </span>
            </td>
            <td>
              <button
                class="btn-save"
                :disabled="savingMap[user.ID] || roleDrafts[user.ID] === getRoleName(user.ROLE)"
                @click="saveRole(user)"
              >
                {{ savingMap[user.ID] ? '保存中...' : '保存角色' }}
              </button>
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td colspan="6" class="table-state">
              {{ loading ? '加载中...' : '暂无匹配用户' }}
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
import { ref, onMounted } from 'vue'
import { userApi } from '../api'
import { refreshCurrentUser } from '../utils/session'
import { showToast } from '../utils/toastService'
import Pagination from '../components/Pagination.vue'

const users = ref([])
const roleDrafts = ref({})
const savingMap = ref({})
const selectedRole = ref('')
const searchKeyword = ref('')
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
let searchTimer = null
let latestRequestId = 0

const roleOptions = [
  { value: 'admin', label: '管理员' },
  { value: 'user', label: '普通人员' },
  { value: 'developer', label: '开发人员' }
]

const roleAliasMap = {
  'role-admin': 'admin',
  'role-user': 'user',
  'role-developer': 'developer'
}

function getRoleName(role) {
  if (!role) return ''
  return roleAliasMap[role] || role
}

function syncRoleDrafts(list) {
  const drafts = {}
  list.forEach((user) => {
    drafts[user.ID] = getRoleName(user.ROLE)
  })
  roleDrafts.value = drafts
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    applyFilters()
  }, 300)
}

function applyFilters() {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  currentPage.value = 1
  loadUsers(1)
}

function clearFilters() {
  selectedRole.value = ''
  searchKeyword.value = ''
  applyFilters()
}

function handlePageChange(page, size) {
  pageSize.value = size
  loadUsers(page)
}

async function loadUsers(page = currentPage.value) {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  const requestId = ++latestRequestId
  try {
    loading.value = true
    currentPage.value = page
    const res = await userApi.getAll({
      page,
      pageSize: pageSize.value,
      role: selectedRole.value,
      keyword: searchKeyword.value
    })
    if (requestId !== latestRequestId) return
    users.value = Array.isArray(res.data?.data) ? res.data.data : []
    total.value = res.data.total || 0
    syncRoleDrafts(users.value)

    if (users.value.length === 0 && total.value > 0 && page > 1) {
      await loadUsers(page - 1)
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    showToast(`加载用户列表失败: ${error.response?.data?.message || error.message}`, { type: 'error', title: '加载失败' })
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function saveRole(user) {
  const nextRole = roleDrafts.value[user.ID]
  if (!nextRole || nextRole === getRoleName(user.ROLE)) return

  try {
    savingMap.value = { ...savingMap.value, [user.ID]: true }
    await userApi.updateRole(user.ID, nextRole)
    user.ROLE = nextRole
    await refreshCurrentUser()
    showToast(`已更新 ${user.NAME} 的角色`, { type: 'success', title: '更新成功' })
    await loadUsers()
  } catch (error) {
    console.error('更新用户角色失败:', error)
    showToast(`更新用户角色失败: ${error.response?.data?.message || error.message}`, { type: 'error', title: '更新失败' })
    roleDrafts.value[user.ID] = getRoleName(user.ROLE)
  } finally {
    savingMap.value = { ...savingMap.value, [user.ID]: false }
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.user-role-management {
  padding: 24px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: var(--tech-text-secondary);
  font-size: 13px;
}

.role-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-select,
.search-input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  background: var(--tech-card);
  color: var(--tech-text-primary);
  font-size: 14px;
}

.search-input {
  min-width: 260px;
}

.btn-search,
.btn-clear {
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-search {
  border: none;
  background: var(--tech-blue);
  color: #fff;
}

.btn-clear {
  border: 1px solid var(--tech-border);
  background: var(--tech-card);
  color: var(--tech-text-primary);
}

.table-container {
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  overflow: hidden;
}

.table-state {
  padding: 44px 12px;
  text-align: center;
  color: var(--tech-text-secondary);
}

.role-select {
  min-width: 130px;
  padding: 6px 10px;
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  background: var(--tech-bg);
  color: var(--tech-text-primary);
}

.btn-save {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: var(--tech-blue);
  color: #fff;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-role-management :deep(.tech-pagination) {
  padding: 14px 24px;
}

@media (max-width: 640px) {
  .role-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-select,
  .search-input,
  .btn-search,
  .btn-clear {
    width: 100%;
  }

  .search-input {
    min-width: 0;
  }
}
</style>
