<template>
  <div class="user-role-management">
    <div class="page-header">
      <h1>用户角色管理</h1>
      <p>统一维护账号角色，开发人员列表将实时跟随角色变化。</p>
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
        <tbody>
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
                :disabled="savingMap[user.ID] || roleDrafts[user.ID] === user.ROLE"
                @click="saveRole(user)"
              >
                {{ savingMap[user.ID] ? '保存中...' : '保存角色' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { userApi } from '../api'
import { refreshCurrentUser } from '../utils/session'
import { showToast } from '../utils/toastService'

const users = ref([])
const roleDrafts = ref({})
const savingMap = ref({})

const roleOptions = [
  { value: 'admin', label: '管理员' },
  { value: 'user', label: '普通用户' },
  { value: 'developer', label: '开发人员' }
]

async function loadUsers() {
  try {
    const res = await userApi.getAll()
    users.value = Array.isArray(res.data?.data) ? res.data.data : []
    const drafts = {}
    users.value.forEach((user) => {
      drafts[user.ID] = user.ROLE
    })
    roleDrafts.value = drafts
  } catch (error) {
    console.error('加载用户列表失败:', error)
    showToast(`加载用户列表失败: ${error.response?.data?.message || error.message}`, { type: 'error', title: '加载失败' })
  }
}

async function saveRole(user) {
  const nextRole = roleDrafts.value[user.ID]
  if (!nextRole || nextRole === user.ROLE) return

  try {
    savingMap.value = { ...savingMap.value, [user.ID]: true }
    await userApi.updateRole(user.ID, nextRole)
    user.ROLE = nextRole
    await refreshCurrentUser()
    showToast(`已更新 ${user.NAME} 的角色`, { type: 'success', title: '更新成功' })
  } catch (error) {
    console.error('更新用户角色失败:', error)
    showToast(`更新用户角色失败: ${error.response?.data?.message || error.message}`, { type: 'error', title: '更新失败' })
    roleDrafts.value[user.ID] = user.ROLE
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

.table-container {
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  overflow: hidden;
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
</style>
