<template>
  <div class="permission-management">
    <div class="page-header">
      <h1>权限管理</h1>
    </div>
    <div class="session-debug">
      <div class="session-debug-header">
        <h2>当前登录账号（实时）</h2>
        <button class="btn-refresh" @click="refreshSessionDebug" :disabled="debugLoading">
          {{ debugLoading ? '刷新中...' : '刷新 /auth/me' }}
        </button>
      </div>
      <div class="session-debug-grid">
        <div><strong>用户名：</strong>{{ sessionDebug.username || '-' }}</div>
        <div><strong>姓名：</strong>{{ sessionDebug.name || '-' }}</div>
        <div><strong>角色：</strong>{{ sessionDebug.role || '-' }}</div>
        <div><strong>权限数：</strong>{{ sessionDebug.permissions.length }}</div>
      </div>
      <div class="session-debug-permissions">
        <span v-for="code in sessionDebug.permissions" :key="code" class="perm-chip">{{ code }}</span>
        <span v-if="sessionDebug.permissions.length === 0" class="empty-perms">无权限</span>
      </div>
    </div>

    <div class="roles-grid">
      <div v-for="role in roles" :key="role.id" class="role-card" :class="{ active: selectedRole === role.id }" @click="selectRole(role.id)">
        <div class="role-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="role-name">{{ role.name }}</div>
        <div class="role-desc">{{ role.description }}</div>
      </div>
    </div>

    <div v-if="selectedRole" class="permissions-panel">
      <div class="panel-header">
        <h2>{{ selectedRoleName }} - 权限配置</h2>
        <button class="btn-save" @click="savePermissions" :disabled="saving">
          {{ saving ? '保存中...' : '保存权限' }}
        </button>
      </div>

      <div v-for="module in modules" :key="module" class="module-section">
        <h3 class="module-title">{{ getModuleLabel(module) }}</h3>
        <div class="permissions-grid">
          <label v-for="perm in getPermissionsByModule(module)" :key="perm.id" class="permission-item">
            <input type="checkbox" :value="perm.id" v-model="selectedPermissions" />
            <div class="perm-info">
              <div class="perm-name">{{ perm.name }}</div>
              <div class="perm-code">{{ perm.code }}</div>
            </div>
          </label>
        </div>
      </div>
    </div>

    <div class="all-permissions">
      <h2>所有权限列表</h2>
      <table class="tech-table">
        <thead>
          <tr>
            <th>模块</th>
            <th>权限名称</th>
            <th>权限代码</th>
            <th>描述</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="perm in allPermissions" :key="perm.id">
            <td><span class="module-badge">{{ perm.module }}</span></td>
            <td>{{ perm.name }}</td>
            <td><code>{{ perm.code }}</code></td>
            <td>{{ perm.description || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { permissionApi, authApi } from '../api'
import { refreshCurrentUser } from '../utils/session'
import { getPermissionSaveSuccessMessage } from '../utils/permissionMessages'
import { showToast } from '../utils/toastService'

const roles = ref([
  { id: 'role-admin', name: '管理员', description: '拥有系统所有权限' },
  { id: 'role-user', name: '普通用户', description: '基础需求操作权限' },
  { id: 'role-developer', name: '开发人员', description: '开发和测试相关权限' }
])

const allPermissions = ref([])
const modules = ref([])
const selectedRole = ref(null)
const selectedPermissions = ref([])
const saving = ref(false)
const debugLoading = ref(false)
const sessionDebug = ref({
  username: '',
  name: '',
  role: '',
  permissions: []
})

const selectedRoleName = computed(() => {
  const role = roles.value.find(r => r.id === selectedRole.value)
  return role?.name || ''
})

const selectRole = async (roleId) => {
  selectedRole.value = roleId
  try {
    const res = await permissionApi.getByRole(roleId)
    selectedPermissions.value = res.data.data.map(p => p.id)
  } catch (error) {
    console.error('获取角色权限失败:', error)
  }
}

const getPermissionsByModule = (module) => {
  return allPermissions.value.filter(p => p.module === module)
}

const getModuleLabel = (module) => {
  const map = {
    requirement: '需求管理',
    project: '项目进度',
    developer: '开发人员管理',
    notification: '通知中心',
    audit: '审计日志',
    permission: '权限管理',
    user: '用户管理'
  }
  return map[module] || module
}

const savePermissions = async () => {
  if (!selectedRole.value) return
  
  try {
    saving.value = true
    await permissionApi.assignPermissions(selectedRole.value, selectedPermissions.value)
    await refreshCurrentUser()
    showToast(getPermissionSaveSuccessMessage(), { type: 'success', title: '保存成功' })
  } catch (error) {
    console.error('保存权限失败:', error)
    showToast('保存失败: ' + (error.response?.data?.message || error.message), { type: 'error', duration: 3200, title: '保存失败' })
  } finally {
    saving.value = false
  }
}

const loadData = async () => {
  try {
    const [permRes, moduleRes] = await Promise.all([
      permissionApi.getAll(),
      permissionApi.getModules()
    ])
    
    allPermissions.value = permRes.data.data
    modules.value = moduleRes.data.data
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

const refreshSessionDebug = async () => {
  try {
    debugLoading.value = true
    const res = await authApi.me()
    if (res.data?.success && res.data?.data) {
      sessionDebug.value = {
        username: res.data.data.username || '',
        name: res.data.data.name || '',
        role: res.data.data.role || '',
        permissions: Array.isArray(res.data.data.permissions) ? res.data.data.permissions : []
      }
    }
  } catch (error) {
    console.error('刷新当前登录账号信息失败:', error)
  } finally {
    debugLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.permission-management {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--tech-text-primary);
}

.session-debug {
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.session-debug-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.session-debug-header h2 {
  margin: 0;
  font-size: 16px;
}

.btn-refresh {
  padding: 6px 12px;
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  background: var(--tech-bg);
  color: var(--tech-text-primary);
  cursor: pointer;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.session-debug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
  color: var(--tech-text-secondary);
  font-size: 13px;
}

.session-debug-permissions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.perm-chip {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--tech-blue);
}

.empty-perms {
  font-size: 12px;
  color: var(--tech-text-secondary);
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.role-card {
  background: var(--tech-card);
  border: 2px solid var(--tech-border);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.role-card:hover {
  border-color: var(--tech-blue-light);
}

.role-card.active {
  border-color: var(--tech-blue);
  background: rgba(59, 130, 246, 0.05);
}

.role-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  color: var(--tech-blue);
}

.role-icon svg {
  width: 100%;
  height: 100%;
}

.role-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--tech-text-primary);
  margin-bottom: 4px;
}

.role-desc {
  font-size: 12px;
  color: var(--tech-text-secondary);
}

.permissions-panel {
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--tech-border);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.btn-save {
  padding: 8px 20px;
  font-size: 14px;
  color: #fff;
  background: var(--tech-blue);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: #2563eb;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.module-section {
  margin-bottom: 24px;
}

.module-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--tech-text-primary);
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--tech-border);
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--tech-bg);
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.permission-item:hover {
  border-color: var(--tech-blue-light);
}

.permission-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--tech-blue);
}

.perm-info {
  flex: 1;
}

.perm-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--tech-text-primary);
}

.perm-code {
  font-size: 11px;
  color: var(--tech-text-secondary);
  font-family: monospace;
}

.all-permissions {
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  padding: 20px;
}

.all-permissions h2 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
}

.module-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--tech-blue);
  border-radius: 4px;
}

code {
  padding: 2px 6px;
  font-size: 12px;
  background: var(--tech-bg);
  border-radius: 4px;
  color: var(--tech-text-secondary);
}
</style>
