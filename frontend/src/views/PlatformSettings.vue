<template>
  <div class="platform-settings-page">
    <header class="platform-header">
      <div>
        <div class="eyebrow">PLATFORM OPTIONS</div>
        <h1>平台配置</h1>
        <p>一级平台既是下拉分组，也可以直接选择；二级平台会展示在对应分组下。</p>
      </div>
      <button class="icon-btn" type="button" title="刷新" :disabled="loading" @click="loadPlatforms">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 0 1-15.5 6.2" />
          <path d="M3 12A9 9 0 0 1 18.5 5.8" />
          <path d="M18 2v4h4" />
          <path d="M6 22v-4H2" />
        </svg>
      </button>
    </header>

    <section class="platform-summary">
      <div class="summary-item">
        <span>一级平台</span>
        <strong>{{ platformDrafts.length }}</strong>
      </div>
      <div class="summary-item">
        <span>二级平台</span>
        <strong>{{ childPlatformCount }}</strong>
      </div>
      <div class="summary-item">
        <span>保存状态</span>
        <strong>{{ saving ? '保存中' : '可编辑' }}</strong>
      </div>
    </section>

    <section class="platform-panel">
      <div class="panel-head">
        <div>
          <h2>平台层级</h2>
          <p>一级平台可直接选择；二级平台会按一级平台分组展示。</p>
        </div>
        <div class="panel-actions">
          <button class="secondary-btn" type="button" @click="collapseAll">全部收起</button>
          <button class="secondary-btn" type="button" @click="expandAll">全部展开</button>
          <button class="secondary-btn" type="button" @click="addGroup">新增一级平台</button>
        </div>
      </div>

      <div class="platform-group-list">
        <article v-for="(group, groupIndex) in platformDrafts" :key="groupIndex" class="platform-group-card">
          <div class="group-card-head">
            <button
              class="collapse-btn"
              type="button"
              :title="isExpanded(groupIndex) ? '收起' : '展开'"
              @click="toggleGroup(groupIndex)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="isExpanded(groupIndex) ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'" />
              </svg>
              <span>{{ isExpanded(groupIndex) ? '收起' : '展开' }}</span>
            </button>
            <span class="row-index">{{ groupIndex + 1 }}</span>
            <div class="group-title">
              <strong>{{ group.name || '未命名一级平台' }}</strong>
              <span>{{ group.children.length }} 个二级平台</span>
            </div>
          </div>

          <div v-if="isExpanded(groupIndex)" class="group-body">
            <div class="group-row">
              <label class="field">
                <span class="field-label">一级平台</span>
                <input
                  v-model.trim="group.name"
                  class="platform-input"
                  type="text"
                  placeholder="例如：Jkstore"
                  :disabled="saving"
                />
              </label>
              <button
                class="row-icon-btn"
                type="button"
                title="删除一级平台"
                :disabled="platformDrafts.length <= 1 || saving"
                @click="removeGroup(groupIndex)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            </div>

            <div class="children-head">
              <span>二级平台</span>
              <button class="mini-btn" type="button" :disabled="saving" @click="addChild(groupIndex)">
                新增二级
              </button>
            </div>

            <div class="child-list">
              <div v-for="(child, childIndex) in group.children" :key="childIndex" class="child-row">
                <input
                  v-model.trim="group.children[childIndex]"
                  class="platform-input"
                  type="text"
                  placeholder="例如：A平台"
                  :disabled="saving"
                />
                <button
                  class="row-icon-btn compact"
                  type="button"
                  title="删除二级平台"
                  :disabled="saving"
                  @click="removeChild(groupIndex, childIndex)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div v-if="group.children.length === 0" class="empty-child">
                未配置二级平台时，下拉中仍可直接选择一级平台。
              </div>
            </div>
          </div>
        </article>
      </div>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <div class="save-bar">
        <div>
          <strong>权限控制</strong>
          <span>只有拥有 platform:manage 权限的账号可以进入并保存此配置。</span>
        </div>
        <div class="save-actions">
          <button class="secondary-btn" type="button" :disabled="saving" @click="resetToDefaults">
            恢复默认
          </button>
          <button class="primary-btn" type="button" :disabled="saving || loading" @click="savePlatforms">
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { platformApi } from '../api'
import { DEFAULT_PLATFORMS, normalizePlatforms } from '../utils/platformOptions'
import { showToast } from '../utils/toastService'

const loading = ref(false)
const saving = ref(false)
const platformDrafts = ref(clonePlatforms(DEFAULT_PLATFORMS))
const expandedGroups = ref(new Set())
const errorMessage = ref('')
const childPlatformCount = computed(() => platformDrafts.value.reduce((sum, group) => sum + group.children.length, 0))

function clonePlatforms(platforms) {
  return normalizePlatforms(platforms)
    .map(group => ({
      name: toPlatformText(group.name),
      children: Array.isArray(group.children)
        ? group.children.map(child => toPlatformText(child)).filter(Boolean)
        : []
    }))
    .filter(group => group.name)
}

function toPlatformText(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return String(value.name || value.label || value.value || '').trim()
  }
  return String(value || '').trim()
}

function validatePlatforms() {
  platformDrafts.value = clonePlatforms(platformDrafts.value)
  const normalized = normalizePlatforms(platformDrafts.value)
  if (normalized.length === 0) {
    return { ok: false, message: '至少保留一个一级平台' }
  }

  const filledGroupCount = platformDrafts.value.filter(group => toPlatformText(group.name)).length
  if (normalized.length !== filledGroupCount) {
    return { ok: false, message: '一级平台名称不能为空且不能重复' }
  }

  const hasDuplicateOrBlankChild = platformDrafts.value.some(group => {
    const filledChildren = group.children.filter(child => toPlatformText(child))
    const normalizedGroup = normalized.find(item => item.name === toPlatformText(group.name))
    return normalizedGroup && normalizedGroup.children.length !== filledChildren.length
  })
  if (hasDuplicateOrBlankChild) {
    return { ok: false, message: '二级平台名称不能重复；不需要的空行请删除' }
  }

  return { ok: true, platforms: normalized }
}

function addGroup() {
  platformDrafts.value.push({ name: '', children: [''] })
  const next = new Set(expandedGroups.value)
  next.add(platformDrafts.value.length - 1)
  expandedGroups.value = next
}

function removeGroup(index) {
  if (platformDrafts.value.length <= 1) return
  platformDrafts.value.splice(index, 1)
  expandedGroups.value = new Set()
}

function addChild(groupIndex) {
  platformDrafts.value[groupIndex].children.push('')
}

function removeChild(groupIndex, childIndex) {
  platformDrafts.value[groupIndex].children.splice(childIndex, 1)
}

function resetToDefaults() {
  platformDrafts.value = clonePlatforms(DEFAULT_PLATFORMS)
  expandedGroups.value = new Set()
  errorMessage.value = ''
}

function isExpanded(index) {
  return expandedGroups.value.has(index)
}

function toggleGroup(index) {
  const next = new Set(expandedGroups.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  expandedGroups.value = next
}

function expandAll() {
  expandedGroups.value = new Set(platformDrafts.value.map((_, index) => index))
}

function collapseAll() {
  expandedGroups.value = new Set()
}

async function loadPlatforms() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await platformApi.getAll()
    platformDrafts.value = clonePlatforms(res.data?.data)
    expandedGroups.value = new Set()
  } catch (error) {
    showToast(error.response?.data?.message || error.message, { type: 'error', title: '加载失败' })
  } finally {
    loading.value = false
  }
}

async function savePlatforms() {
  const validation = validatePlatforms()
  if (!validation.ok) {
    errorMessage.value = validation.message
    showToast(validation.message, { type: 'warning', title: '校验失败' })
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const res = await platformApi.updateAll(validation.platforms)
    platformDrafts.value = clonePlatforms(res.data?.data)
    expandedGroups.value = new Set()
    showToast('平台配置已保存', { type: 'success' })
  } catch (error) {
    showToast(error.response?.data?.message || error.message, { type: 'error', title: '保存失败' })
  } finally {
    saving.value = false
  }
}

onMounted(loadPlatforms)
</script>

<style scoped>
.platform-settings-page {
  display: grid;
  gap: 18px;
  color: var(--tech-text);
}

.platform-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
}

.eyebrow {
  margin-bottom: 8px;
  color: #2f8f7b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.platform-header h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.15;
}

.platform-header p {
  margin-top: 8px;
  color: var(--tech-text-secondary);
  font-size: 14px;
}

.icon-btn {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--tech-border);
  border-radius: 10px;
  background: #fff;
  color: var(--tech-blue-dark);
  cursor: pointer;
}

.icon-btn svg,
.row-icon-btn svg {
  width: 18px;
  height: 18px;
}

.platform-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-item,
.platform-panel,
.platform-group-card {
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(38, 84, 128, 0.06);
}

.summary-item {
  min-height: 76px;
  padding: 16px;
}

.summary-item span {
  display: block;
  margin-bottom: 7px;
  color: var(--tech-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.summary-item strong {
  font-size: 22px;
}

.platform-panel {
  padding: 22px;
}

.panel-head,
.save-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.panel-head {
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(212, 228, 247, 0.75);
}

.panel-head h2 {
  margin: 0;
  font-size: 20px;
}

.panel-head p {
  margin-top: 6px;
  color: var(--tech-text-secondary);
  font-size: 13px;
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.platform-group-list {
  display: grid;
  gap: 14px;
}

.platform-group-card {
  padding: 16px;
}

.group-card-head {
  display: grid;
  grid-template-columns: 74px 42px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.group-body {
  margin-top: 14px;
}

.group-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: end;
}

.row-index {
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #f2f7ff;
  color: var(--tech-blue-dark);
  font-weight: 800;
}

.group-title {
  min-width: 0;
}

.group-title strong,
.group-title span {
  display: block;
}

.group-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-title span {
  color: var(--tech-text-secondary);
  font-size: 12px;
}

.field {
  display: grid;
  gap: 8px;
}

.field-label,
.children-head {
  color: var(--tech-text);
  font-size: 13px;
  font-weight: 700;
}

.platform-input {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  color: var(--tech-text);
  font-size: 14px;
}

.platform-input:focus {
  outline: none;
  border-color: #2f8f7b;
  box-shadow: 0 0 0 3px rgba(47, 143, 123, 0.14);
}

.children-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(212, 228, 247, 0.75);
}

.child-list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.child-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 10px;
}

.empty-child {
  padding: 12px;
  border: 1px dashed var(--tech-border);
  border-radius: 8px;
  color: var(--tech-text-secondary);
  font-size: 13px;
}

.row-icon-btn,
.collapse-btn {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(239, 83, 80, 0.24);
  border-radius: 8px;
  background: #fff8f8;
  color: var(--tech-danger);
  cursor: pointer;
}

.collapse-btn {
  width: 74px;
  height: 34px;
  display: inline-flex;
  gap: 4px;
  border-color: var(--tech-border);
  background: #f8fbff;
  color: var(--tech-blue-dark);
  font-size: 12px;
  font-weight: 800;
}

.collapse-btn svg {
  width: 16px;
  height: 16px;
}

.row-icon-btn.compact {
  background: #fff;
}

.form-error {
  margin-top: 12px;
  color: var(--tech-danger);
  font-size: 13px;
}

.save-bar {
  margin-top: 18px;
  padding: 16px 18px;
  border: 1px solid rgba(47, 143, 123, 0.22);
  border-radius: 8px;
  background: #f8fffc;
}

.save-bar strong,
.save-bar span {
  display: block;
}

.save-bar span {
  margin-top: 3px;
  color: var(--tech-text-secondary);
  font-size: 12px;
}

.save-actions {
  display: flex;
  gap: 10px;
}

.primary-btn,
.secondary-btn,
.mini-btn {
  min-height: 42px;
  border-radius: 8px;
  font-weight: 800;
  cursor: pointer;
}

.primary-btn {
  min-width: 116px;
  border: 1px solid transparent;
  background: linear-gradient(135deg, #2f8f7b 0%, #247363 100%);
  color: #fff;
}

.secondary-btn,
.mini-btn {
  border: 1px solid rgba(47, 143, 123, 0.34);
  background: #f7fcfa;
  color: #247363;
  padding: 0 16px;
}

.mini-btn {
  min-height: 34px;
  font-size: 12px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (max-width: 760px) {
  .platform-header,
  .panel-head,
  .save-bar,
  .group-row {
    display: grid;
  }

  .platform-summary {
    grid-template-columns: 1fr;
  }

  .save-actions {
    justify-content: stretch;
  }
}
</style>
