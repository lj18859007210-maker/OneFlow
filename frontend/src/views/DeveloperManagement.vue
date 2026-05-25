<template>
  <div class="developer-management">
    <div class="page-header">
      <h1>开发人员管理</h1>
      <div class="header-actions">
        <select v-model="filterDepartment" class="filter-select">
          <option value="">全部部门</option>
          <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
        </select>
          <button v-if="canCreateDeveloper" class="btn-primary" @click="openDialog()">
            + 添加开发人员
          </button>
      </div>
    </div>

    <div class="stats-grid">
      <div v-for="dev in loadStats" :key="dev.id" class="stat-card">
        <div class="stat-header">
          <span class="stat-name">{{ dev.name }}</span>
          <span class="stat-dept">{{ dev.department }}</span>
        </div>
        <div class="stat-bar">
          <div class="stat-fill" :class="getLoadClass(dev.loadPercent)" :style="{ width: `${dev.loadPercent}%` }"></div>
        </div>
        <div class="stat-info">
          <span>{{ dev.currentLoad }}/{{ dev.maxLoad }}</span>
          <span>{{ dev.loadPercent }}%</span>
        </div>
      </div>
    </div>

    <div class="table-container">
      <table class="tech-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>邮箱</th>
            <th>部门</th>
            <th>技能</th>
            <th>负载</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dev in filteredDevelopers" :key="dev.id">
            <td>{{ dev.name }}</td>
            <td>{{ dev.email || '-' }}</td>
            <td>{{ dev.department || '-' }}</td>
            <td>
              <span v-for="skill in dev.skills" :key="skill" class="skill-tag">{{ skill }}</span>
            </td>
            <td>
              <div class="load-cell">
                <div class="load-bar">
                  <div class="load-fill" :class="getLoadClass(getLoadPercent(dev))" :style="{ width: `${getLoadPercent(dev)}%` }"></div>
                </div>
                <span class="load-text">{{ dev.currentLoad }}/{{ dev.maxLoad }}</span>
              </div>
            </td>
            <td>
              <span class="tech-tag" :class="dev.status === 1 ? 'tech-tag-released' : 'tech-tag-pending'">
                {{ dev.status === 1 ? '在职' : '离职' }}
              </span>
            </td>
            <td>
              <button v-if="canUpdateDeveloper" class="btn-action" @click="openDialog(dev)">编辑</button>
              <button v-if="canDeleteDeveloper" class="btn-action btn-danger" @click="handleDelete(dev.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showDialog" class="modal-overlay" @click="closeDialog">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingId ? '编辑开发人员' : '添加开发人员' }}</h2>
          <button class="modal-close" @click="closeDialog">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <div class="form-group">
              <label>姓名 *</label>
              <input v-model="form.name" type="text" required placeholder="请输入姓名" />
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input v-model="form.email" type="email" placeholder="请输入邮箱" />
            </div>
            <div class="form-group">
              <label>部门</label>
              <input v-model="form.department" type="text" placeholder="请输入部门" />
            </div>
            <div class="form-group">
              <label>技能（逗号分隔）</label>
              <input v-model="skillsInput" type="text" placeholder="Vue, React, Node.js" />
            </div>
            <div class="form-group">
              <label>最大负载</label>
              <input v-model.number="form.maxLoad" type="number" min="1" max="20" />
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model.number="form.status">
                <option :value="1">在职</option>
                <option :value="0">离职</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-cancel" @click="closeDialog">取消</button>
              <button type="submit" class="btn-submit" :disabled="submitting">
                {{ submitting ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { developerApi } from '../api'
import { showToast } from '../utils/toastService'
import { hasPermission } from '../utils/access'

const developers = ref([])
const loadStats = ref([])
const departments = ref([])
const filterDepartment = ref('')
const showDialog = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const skillsInput = ref('')
const currentUser = inject('currentUser', ref({ name: '未登录', role: 'user', permissions: [] }))

const canCreateDeveloper = computed(() => hasPermission(currentUser.value, 'developer:create'))
const canUpdateDeveloper = computed(() => hasPermission(currentUser.value, 'developer:update'))
const canDeleteDeveloper = computed(() => hasPermission(currentUser.value, 'developer:delete'))

const form = ref({
  name: '',
  email: '',
  department: '',
  skills: [],
  maxLoad: 5,
  status: 1
})

const filteredDevelopers = computed(() => {
  if (!filterDepartment.value) return developers.value
  return developers.value.filter(d => d.department === filterDepartment.value)
})

const getLoadPercent = (dev) => {
  if (!dev.maxLoad || dev.maxLoad === 0) return 0
  return Math.round((dev.currentLoad / dev.maxLoad) * 100)
}

const getLoadClass = (percent) => {
  if (percent >= 80) return 'load-high'
  if (percent >= 50) return 'load-medium'
  return 'load-low'
}

const openDialog = (dev = null) => {
  editingId.value = dev?.id || null
  if (dev) {
    form.value = {
      name: dev.name,
      email: dev.email || '',
      department: dev.department || '',
      skills: dev.skills || [],
      maxLoad: dev.maxLoad,
      status: dev.status
    }
    skillsInput.value = (dev.skills || []).join(', ')
  } else {
    form.value = { name: '', email: '', department: '', skills: [], maxLoad: 5, status: 1 }
    skillsInput.value = ''
  }
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  editingId.value = null
}

const handleSubmit = async () => {
  try {
    submitting.value = true
    form.value.skills = skillsInput.value.split(',').map(s => s.trim()).filter(Boolean)
    
    if (editingId.value) {
      await developerApi.update(editingId.value, form.value)
    } else {
      await developerApi.create(form.value)
    }
    
    closeDialog()
    await loadData()
  } catch (error) {
    console.error('保存失败:', error)
    showToast('保存失败: ' + (error.response?.data?.message || error.message), { type: 'error', title: '保存失败' })
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id) => {
  if (!confirm('确定要删除该开发人员吗？')) return
  
  try {
    await developerApi.remove(id)
    await loadData()
  } catch (error) {
    console.error('删除失败:', error)
    showToast('删除失败: ' + (error.response?.data?.message || error.message), { type: 'error', title: '删除失败' })
  }
}

const loadData = async () => {
  try {
    const [devRes, statsRes, deptRes] = await Promise.all([
      developerApi.getAll(),
      developerApi.getLoadStats(),
      developerApi.getDepartments()
    ])
    
    developers.value = devRes.data.data
    loadStats.value = statsRes.data.data
    departments.value = deptRes.data.data
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.developer-management {
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
}

.btn-primary {
  padding: 8px 16px;
  font-size: 14px;
  color: #fff;
  background: var(--tech-blue);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  padding: 16px;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.stat-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--tech-text-primary);
}

.stat-dept {
  font-size: 12px;
  color: var(--tech-text-secondary);
}

.stat-bar {
  height: 8px;
  background: var(--tech-border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.stat-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.stat-fill.load-low { background: #22c55e; }
.stat-fill.load-medium { background: #f59e0b; }
.stat-fill.load-high { background: #ef4444; }

.stat-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--tech-text-secondary);
}

.table-container {
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  overflow: hidden;
}

.skill-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--tech-blue);
  border-radius: 4px;
  margin: 2px;
}

.load-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.load-bar {
  width: 60px;
  height: 6px;
  background: var(--tech-border);
  border-radius: 3px;
  overflow: hidden;
}

.load-fill {
  height: 100%;
  border-radius: 3px;
}

.load-fill.load-low { background: #22c55e; }
.load-fill.load-medium { background: #f59e0b; }
.load-fill.load-high { background: #ef4444; }

.load-text {
  font-size: 12px;
  color: var(--tech-text-secondary);
}

.btn-action {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--tech-blue);
  background: transparent;
  border: 1px solid var(--tech-blue);
  border-radius: 4px;
  cursor: pointer;
  margin-right: 6px;
  transition: all 0.2s;
}

.btn-action:hover {
  background: var(--tech-blue);
  color: #fff;
}

.btn-danger {
  color: #ef4444;
  border-color: #ef4444;
}

.btn-danger:hover {
  background: #ef4444;
  color: #fff;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--tech-card);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--tech-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--tech-text-secondary);
  cursor: pointer;
  border-radius: 6px;
}

.modal-close:hover {
  background: var(--tech-border);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--tech-text-primary);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  background: var(--tech-bg);
  border: 1px solid var(--tech-border);
  border-radius: 6px;
  color: var(--tech-text-primary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  padding: 8px 16px;
  font-size: 14px;
  color: var(--tech-text-secondary);
  background: transparent;
  border: 1px solid var(--tech-border);
  border-radius: 6px;
  cursor: pointer;
}

.btn-submit {
  padding: 8px 20px;
  font-size: 14px;
  color: #fff;
  background: var(--tech-blue);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
