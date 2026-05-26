<template>
  <div class="workflow-page">
    <header class="page-header">
      <div>
        <h1>流程配置</h1>
        <p class="page-subtitle">先整理状态，再配置每一步如何推进。整个页面只围绕“状态”和“流转”两件事。</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" @click="loadAll" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新数据' }}
        </button>
      </div>
    </header>

    <section v-if="enabledStatuses.length" class="surface preview-surface">
      <div class="section-header preview-header">
        <div>
          <h2>当前流程预览</h2>
          <p>这里显示的是当前已启用并已保存的状态顺序。你新增“结束”并保存后，会直接出现在这里。</p>
        </div>
      </div>

      <div class="flow-preview">
        <div class="flow-line"></div>
        <div class="flow-step" v-for="(status, index) in enabledStatuses" :key="status.value">
          <div class="flow-dot">{{ index + 1 }}</div>
          <div class="flow-name">{{ status.label }}</div>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="section-header">
        <div>
          <h2>第一步：配置状态</h2>
          <p>状态是流程里的节点，比如“待审批”“开发中”“已发布”。</p>
        </div>
        <div class="section-actions">
          <button class="ghost-btn" @click="fillDefaultStatuses" :disabled="saving">一键生成标准状态</button>
          <button class="primary-btn" @click="addStatus">新增状态</button>
          <button class="primary-btn" @click="saveStatuses" :disabled="saving || loading">保存状态</button>
        </div>
      </div>

      <div v-if="!statuses.length" class="empty-state">
        <div class="empty-title">还没有状态</div>
        <div class="empty-text">先点“一键生成标准状态”，或者手动新增第一个状态。</div>
      </div>

      <div v-else class="status-grid">
        <article v-for="(item, index) in statuses" :key="item.id || item.localKey" class="status-card">
          <div class="status-card-head">
            <div class="status-index">状态 {{ index + 1 }}</div>
            <button class="text-btn danger" @click="removeStatus(index)">移除</button>
          </div>

          <label class="field">
            <span class="field-label">状态代码</span>
            <input v-model.trim="item.statusCode" class="field-input" placeholder="例如：待审批" />
          </label>

          <label class="field">
            <span class="field-label">显示名称</span>
            <input v-model.trim="item.statusName" class="field-input" placeholder="页面展示给业务人员看的名称" />
          </label>

          <div class="status-meta">
            <label class="field field-small">
              <span class="field-label">排序</span>
              <input v-model.number="item.sortOrder" class="field-input" type="number" min="1" />
            </label>
            <label class="switch-field">
              <input v-model="item.isTerminal" type="checkbox" />
              <span>终态</span>
            </label>
            <label class="switch-field">
              <input v-model="item.enabled" type="checkbox" />
              <span>启用</span>
            </label>
          </div>

          <div class="status-card-foot">
            <span v-if="item.enabled && item.statusCode">
              {{ getStatusUsageText(item.statusCode) }}
            </span>
            <span v-else>
              当前未启用，下面的流转里不会出现它
            </span>
          </div>
        </article>
      </div>
    </section>

    <section class="surface">
      <div class="section-header">
        <div>
          <h2>第二步：配置流转</h2>
          <p>定义需求从哪个状态流到哪个状态，谁能推进，是否需要审批。</p>
        </div>
        <div class="section-actions">
          <button class="primary-btn" @click="addTransition" :disabled="enabledStatuses.length < 2">新增流转</button>
        </div>
      </div>

      <div v-if="enabledStatuses.length" class="status-overview">
        <div class="status-overview-title">这些状态已经生效，新增流转时会出现在下拉框里：</div>
        <div class="status-overview-list">
          <span v-for="status in enabledStatuses" :key="status.value" class="status-overview-chip">
            {{ status.label }}
          </span>
        </div>
      </div>

      <div v-if="enabledStatuses.length < 2" class="empty-state">
        <div class="empty-title">还不能配置流转</div>
        <div class="empty-text">至少先保存两个启用状态，下面的流转规则才有意义。</div>
      </div>

      <div v-else-if="!transitions.length" class="empty-state">
        <div class="empty-title">还没有流转规则</div>
        <div class="empty-text">点击“新增流转”，开始定义流程怎么往下走。</div>
      </div>

      <div v-else class="transition-list">
        <article v-for="item in transitions" :key="item.id || item.localKey" class="transition-card">
          <div class="transition-card-head">
            <div>
              <div class="transition-title">{{ getStatusLabel(item.fromStatus) || '未选择状态' }} → {{ getStatusLabel(item.toStatus) || '未选择状态' }}</div>
              <div class="transition-desc">定义这一小步怎么推进。</div>
            </div>
            <button class="text-btn danger" @click="removeTransition(item)">移除</button>
          </div>

          <div class="transition-row">
            <label class="field">
              <span class="field-label">当前状态</span>
              <select v-model="item.fromStatus" class="field-input">
                <option value="">请选择当前状态</option>
                <option v-for="status in enabledStatuses" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">下一状态</span>
              <select v-model="item.toStatus" class="field-input">
                <option value="">请选择下一状态</option>
                <option v-for="status in enabledStatuses" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="field">
            <span class="field-label">谁可以执行这一步</span>
            <div class="role-list">
              <label v-for="role in roleOptions" :key="role.value" class="choice-chip" :class="{ active: item.allowedRoles.includes(role.value) }">
                <input
                  type="checkbox"
                  :checked="item.allowedRoles.includes(role.value)"
                  @change="toggleRole(item, role.value, $event.target.checked)"
                />
                <span>{{ role.label }}</span>
              </label>
            </div>
            <div class="field-help">例如：如果勾选“开发人员”，就表示开发人员可以把需求推进到下一状态。</div>
          </div>

          <div class="transition-options">
            <label class="switch-field">
              <input v-model="item.requireApproval" type="checkbox" />
              <span>这一步需要审批</span>
            </label>
            <label class="switch-field">
              <input v-model="item.notifyEnabled" type="checkbox" />
              <span>状态变化后发送通知</span>
            </label>
            <label class="switch-field">
              <input v-model="item.enabled" type="checkbox" />
              <span>启用这条规则</span>
            </label>
          </div>

          <label v-if="item.requireApproval" class="field">
            <span class="field-label">审批结果</span>
            <select v-model="item.approvalOutcome" class="field-input">
              <option v-for="option in approvalOutcomeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <div v-else class="approval-note">这一步不需要审批，审批结果自动按“不区分审批结果”处理。</div>

          <div class="transition-actions">
            <button class="primary-btn" @click="saveTransition(item)" :disabled="saving">
              {{ item.id ? '保存这条流转' : '创建这条流转' }}
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { workflowApi } from '../api'
import { showToast } from '../utils/toastService'

const loading = ref(false)
const saving = ref(false)
const statuses = ref([])
const transitions = ref([])

const roleOptions = [
  { value: 'admin', label: '管理员' },
  { value: 'developer', label: '开发人员' },
  { value: 'user', label: '需求提交人' }
]

const approvalOutcomeOptions = [
  { value: 'none', label: '不区分审批结果' },
  { value: 'approved', label: '审批通过后才生效' },
  { value: 'rejected', label: '审批拒绝后才生效' }
]

const defaultStatuses = [
  { statusCode: '待审批', statusName: '待审批', sortOrder: 10, isTerminal: false, enabled: true },
  { statusCode: '待评审', statusName: '待评审', sortOrder: 20, isTerminal: false, enabled: true },
  { statusCode: '待开发', statusName: '待开发', sortOrder: 30, isTerminal: false, enabled: true },
  { statusCode: '开发中', statusName: '开发中', sortOrder: 40, isTerminal: false, enabled: true },
  { statusCode: '测试中', statusName: '测试中', sortOrder: 50, isTerminal: false, enabled: true },
  { statusCode: '已发布', statusName: '已发布', sortOrder: 60, isTerminal: true, enabled: true }
]

const enabledStatuses = computed(() =>
  statuses.value
    .filter(item => item.enabled !== false && item.statusCode)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map(item => ({
      value: item.statusCode,
      label: item.statusName || item.statusCode
    }))
)

function createLocalKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function normalizeStatus(item) {
  return {
    ...item,
    localKey: item.localKey || createLocalKey('status'),
    isTerminal: !!item.isTerminal,
    enabled: item.enabled !== false
  }
}

function normalizeTransition(item) {
  return {
    ...item,
    localKey: item.localKey || createLocalKey('transition'),
    allowedRoles: Array.isArray(item.allowedRoles) ? [...item.allowedRoles] : [],
    requireApproval: !!item.requireApproval,
    notifyEnabled: item.notifyEnabled !== false,
    enabled: item.enabled !== false,
    approvalOutcome: item.requireApproval ? (item.approvalOutcome || 'approved') : 'none'
  }
}

function getStatusLabel(code) {
  const matched = statuses.value.find(item => item.statusCode === code)
  return matched ? (matched.statusName || matched.statusCode) : code
}

function getStatusUsageText(code) {
  const count = transitions.value.filter(item =>
    item.enabled !== false && (item.fromStatus === code || item.toStatus === code)
  ).length

  if (count === 0) {
    return '已保存后会出现在下方流转配置的状态下拉框中，目前还没有接入任何流转'
  }
  return `当前已被 ${count} 条流转使用`
}

async function loadAll() {
  loading.value = true
  try {
    const [statusRes, transitionRes] = await Promise.all([
      workflowApi.getStatuses(),
      workflowApi.getTransitions()
    ])
    statuses.value = (statusRes.data.data || []).map(normalizeStatus)
    transitions.value = (transitionRes.data.data || []).map(normalizeTransition)
  } catch (error) {
    showToast(error.response?.data?.message || error.message, { type: 'error', title: '加载失败' })
  } finally {
    loading.value = false
  }
}

function fillDefaultStatuses() {
  statuses.value = defaultStatuses.map(item => normalizeStatus(item))
}

function addStatus() {
  const nextOrder = statuses.value.length
    ? Math.max(...statuses.value.map(item => Number(item.sortOrder || 0))) + 10
    : 10

  statuses.value.push(normalizeStatus({
    id: '',
    statusCode: '',
    statusName: '',
    sortOrder: nextOrder,
    isTerminal: false,
    enabled: true
  }))
}

function removeStatus(index) {
  const removed = statuses.value[index]
  statuses.value.splice(index, 1)
  if (!removed?.statusCode) return
  transitions.value = transitions.value.filter(item => item.fromStatus !== removed.statusCode && item.toStatus !== removed.statusCode)
}

function addTransition() {
  const first = enabledStatuses.value[0]?.value || ''
  const second = enabledStatuses.value[1]?.value || first
  transitions.value.unshift(normalizeTransition({
    id: '',
    fromStatus: first,
    toStatus: second,
    allowedRoles: ['admin'],
    requireApproval: false,
    notifyEnabled: true,
    enabled: true,
    approvalOutcome: 'none'
  }))
}

function removeTransition(item) {
  if (!item.id) {
    transitions.value = transitions.value.filter(current => current.localKey !== item.localKey)
    return
  }
  item.enabled = false
}

function toggleRole(item, role, checked) {
  if (checked) {
    if (!item.allowedRoles.includes(role)) item.allowedRoles.push(role)
    return
  }
  item.allowedRoles = item.allowedRoles.filter(value => value !== role)
}

function validateStatuses() {
  if (!statuses.value.length) return '请先新增状态'

  const seen = new Set()
  for (const item of statuses.value) {
    if (!item.statusCode) return '每个状态都要填写状态代码'
    if (!item.statusName) return '每个状态都要填写显示名称'
    if (seen.has(item.statusCode)) return `状态代码重复：${item.statusCode}`
    seen.add(item.statusCode)
  }

  const enabledCount = statuses.value.filter(item => item.enabled).length
  if (enabledCount < 2) return '至少保留两个启用状态，流程才可以流转'
  return null
}

function validateTransitions() {
  const validStatusCodes = new Set(statuses.value.filter(item => item.enabled).map(item => item.statusCode))
  const seen = new Set()

  for (const item of transitions.value) {
    if (!item.enabled) continue
    if (!item.fromStatus || !item.toStatus) return '每条流转都要选择当前状态和下一状态'
    if (!validStatusCodes.has(item.fromStatus) || !validStatusCodes.has(item.toStatus)) {
      return '流转里引用了未启用或不存在的状态，请先检查状态配置'
    }
    if (!item.allowedRoles.length) return '每条流转至少要选择一个执行人'

    const approvalOutcome = item.requireApproval ? (item.approvalOutcome || 'approved') : 'none'
    const key = `${item.fromStatus}|${item.toStatus}|${approvalOutcome}`
    if (seen.has(key)) return `存在重复流转：${getStatusLabel(item.fromStatus)} → ${getStatusLabel(item.toStatus)}`
    seen.add(key)
  }
  return null
}

async function saveStatuses() {
  const statusError = validateStatuses()
  if (statusError) {
    showToast(statusError, { type: 'warning', title: '状态校验失败' })
    return
  }

  const transitionError = validateTransitions()
  if (transitionError) {
    showToast(transitionError, { type: 'warning', title: '流转校验失败' })
    return
  }

  saving.value = true
  try {
    await workflowApi.updateStatuses(
      statuses.value.map(item => ({
        statusCode: item.statusCode,
        statusName: item.statusName,
        sortOrder: Number(item.sortOrder || 0),
        isTerminal: !!item.isTerminal,
        enabled: !!item.enabled
      }))
    )
    await workflowApi.reload()
    showToast('状态保存成功', { type: 'success' })
    await loadAll()
  } catch (error) {
    showToast(error.response?.data?.message || error.message, { type: 'error', title: '保存失败' })
  } finally {
    saving.value = false
  }
}

async function saveTransition(item) {
  const statusError = validateStatuses()
  if (statusError) {
    showToast(statusError, { type: 'warning', title: '请先处理状态配置' })
    return
  }

  const transitionError = validateTransitions()
  if (transitionError) {
    showToast(transitionError, { type: 'warning', title: '流转校验失败' })
    return
  }

  saving.value = true
  try {
    const payload = {
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      allowedRoles: item.allowedRoles,
      requireApproval: !!item.requireApproval,
      notifyEnabled: !!item.notifyEnabled,
      enabled: !!item.enabled,
      approvalOutcome: item.requireApproval ? (item.approvalOutcome || 'approved') : 'none'
    }

    if (item.id) {
      await workflowApi.updateTransition(item.id, payload)
    } else {
      await workflowApi.createTransition(payload)
    }

    await workflowApi.reload()
    showToast('流转保存成功', { type: 'success' })
    await loadAll()
  } catch (error) {
    showToast(error.response?.data?.message || error.message, { type: 'error', title: '保存失败' })
  } finally {
    saving.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.workflow-page {
  display: grid;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 40px;
  line-height: 1;
  color: var(--tech-text);
}

.page-subtitle {
  margin-top: 10px;
  max-width: 720px;
  color: var(--tech-text-secondary);
  font-size: 14px;
}

.page-actions,
.section-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.surface {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--tech-border);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 14px 34px rgba(74, 144, 226, 0.08);
}

.preview-surface {
  padding-bottom: 30px;
}

.preview-header {
  margin-bottom: 26px;
}

.flow-preview {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  align-items: start;
}

.flow-line {
  position: absolute;
  top: 18px;
  left: 36px;
  right: 36px;
  height: 3px;
  background: linear-gradient(90deg, rgba(74, 144, 226, 0.18), rgba(74, 144, 226, 0.42));
  border-radius: 999px;
}

.flow-step {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 10px;
}

.flow-dot {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #fff;
  border: 2px solid rgba(74, 144, 226, 0.32);
  color: var(--tech-blue-dark);
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(74, 144, 226, 0.14);
}

.flow-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--tech-text);
  text-align: center;
  line-height: 1.4;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.section-header h2 {
  margin: 0;
  font-size: 24px;
  color: var(--tech-text);
}

.section-header p {
  margin-top: 8px;
  font-size: 13px;
  color: var(--tech-text-secondary);
}

.primary-btn,
.ghost-btn,
.text-btn {
  appearance: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-btn,
.ghost-btn {
  padding: 10px 16px;
}

.primary-btn {
  border: 1px solid transparent;
  background: var(--tech-gradient);
  color: #fff;
  box-shadow: 0 8px 20px rgba(74, 144, 226, 0.2);
}

.ghost-btn {
  border: 1px solid var(--tech-border);
  background: #fff;
  color: var(--tech-text);
}

.text-btn {
  border: none;
  background: transparent;
  color: var(--tech-text-secondary);
  padding: 0;
}

.text-btn.danger {
  color: var(--tech-danger);
}

.primary-btn:hover,
.ghost-btn:hover,
.text-btn:hover {
  transform: translateY(-1px);
}

.primary-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.empty-state {
  border: 1px dashed var(--tech-border);
  border-radius: 16px;
  padding: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(240, 246, 255, 0.9));
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--tech-text);
}

.empty-text {
  margin-top: 8px;
  font-size: 13px;
  color: var(--tech-text-secondary);
}

.status-overview {
  margin-bottom: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(74, 144, 226, 0.14);
  border-radius: 16px;
  background: rgba(74, 144, 226, 0.06);
}

.status-overview-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--tech-text-secondary);
}

.status-overview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.status-overview-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--tech-border);
  color: var(--tech-blue-dark);
  font-size: 13px;
  font-weight: 700;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.status-card,
.transition-card {
  border: 1px solid var(--tech-border);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 246, 255, 0.78));
  padding: 18px;
}

.status-card-head,
.transition-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.status-index {
  font-size: 13px;
  font-weight: 700;
  color: var(--tech-blue);
}

.status-card-foot {
  margin-top: 4px;
  font-size: 12px;
  color: var(--tech-text-secondary);
  line-height: 1.6;
}

.field {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.field-small {
  margin-bottom: 0;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--tech-text);
}

.field-input {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--tech-border);
  background: #fff;
  color: var(--tech-text);
  font-size: 14px;
}

.field-input:focus {
  outline: none;
  border-color: var(--tech-blue);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.12);
}

.field-help,
.approval-note,
.transition-desc {
  font-size: 12px;
  color: var(--tech-text-secondary);
}

.status-meta,
.transition-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.switch-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  color: var(--tech-text);
  font-size: 13px;
  font-weight: 600;
}

.transition-list {
  display: grid;
  gap: 16px;
}

.transition-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--tech-text);
}

.transition-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.role-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.choice-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--tech-border);
  border-radius: 999px;
  background: #fff;
  color: var(--tech-text);
  cursor: pointer;
}

.choice-chip.active {
  border-color: rgba(74, 144, 226, 0.5);
  background: rgba(74, 144, 226, 0.08);
  color: var(--tech-blue-dark);
}

.choice-chip input {
  margin: 0;
}

.transition-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .page-header,
  .section-header,
  .transition-row {
    grid-template-columns: 1fr;
    display: grid;
  }

  .page-actions,
  .section-actions,
  .transition-actions {
    justify-content: flex-start;
  }

  .page-header h1 {
    font-size: 32px;
  }
}
</style>
