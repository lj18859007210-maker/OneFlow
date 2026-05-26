<template>
  <section v-if="canView" class="attachment-card">
    <div class="attachment-card-head">
      <div>
        <h2>附件中心</h2>
        <p>统一归档需求附件、设计文档、测试报告与验收截图，支持预览、下载和版本追踪。</p>
      </div>
      <div class="attachment-head-stats">
        <div class="attachment-stat">
          <span>正式附件</span>
          <strong>{{ formalCount }}</strong>
        </div>
        <div class="attachment-stat">
          <span>评论归档</span>
          <strong>{{ commentLinkCount }}</strong>
        </div>
      </div>
    </div>

    <div class="attachment-toolbar">
      <div class="attachment-filters">
        <button
          v-for="item in categoryOptions"
          :key="item.value"
          type="button"
          class="attachment-filter-chip"
          :class="{ active: activeCategory === item.value }"
          @click="activeCategory = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <form v-if="canUpload" class="attachment-upload-dock" @submit.prevent="submitUpload">
        <select v-model="uploadForm.category" class="attachment-select">
          <option value="">选择分类</option>
          <option v-for="item in uploadableCategoryOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <input
          v-model="uploadForm.remark"
          class="attachment-input"
          placeholder="版本备注（可选）"
        />
        <button type="button" class="attachment-file-btn" @click="triggerUploadFile">
          {{ uploadForm.file ? uploadForm.file.name : '选择文件' }}
        </button>
        <button
          type="submit"
          class="attachment-primary-btn"
          :disabled="uploading || !uploadForm.file || !uploadForm.category"
        >
          {{ uploading ? '上传中...' : '上传附件' }}
        </button>
        <input ref="uploadFileRef" type="file" class="attachment-hidden-input" @change="handleUploadFileChange" />
      </form>
    </div>

    <div v-if="loading" class="attachment-state">附件加载中...</div>
    <div v-else-if="filteredAttachments.length === 0" class="attachment-state">
      这里还没有正式附件，可以直接上传，或把评论区中的临时文件转入归档。
    </div>
    <div v-else class="attachment-workspace">
      <div class="attachment-list">
        <button
          v-for="attachment in filteredAttachments"
          :key="attachment.id"
          type="button"
          class="attachment-item"
          :class="{ active: selectedAttachment?.id === attachment.id }"
          @click="selectAttachment(attachment)"
        >
          <div class="attachment-item-top">
            <span class="attachment-type">{{ categoryLabelMap[attachment.category] || attachment.category }}</span>
            <span class="attachment-source" :class="attachment.sourceType">
              {{ sourceTypeLabelMap[attachment.sourceType] || attachment.sourceType }}
            </span>
          </div>
          <div class="attachment-name">{{ attachment.originalName }}</div>
          <div class="attachment-meta">
            <span>{{ attachment.summary.versionNo ? `v${attachment.summary.versionNo}` : '评论归档' }}</span>
            <span>{{ attachment.summary.previewable ? '可预览' : '仅下载' }}</span>
            <span>{{ formatDateTime(attachment.updatedAt || attachment.createdAt) }}</span>
          </div>
        </button>
      </div>

      <div v-if="selectedAttachment" class="attachment-detail">
        <div class="attachment-detail-head">
          <div>
            <div class="attachment-detail-title">{{ selectedAttachment.originalName }}</div>
            <div class="attachment-meta">
              <span>{{ categoryLabelMap[selectedAttachment.category] || selectedAttachment.category }}</span>
              <span v-if="selectedAttachment.summary.versionNo">当前版本 v{{ selectedAttachment.summary.versionNo }}</span>
              <span v-else>来自评论附件</span>
              <span>{{ selectedAttachment.currentVersion?.mimeType || '待归档元数据' }}</span>
            </div>
          </div>

          <div class="attachment-actions">
            <button
              v-if="selectedAttachment.actions.canPreview && selectedAttachment.currentVersion"
              type="button"
              class="attachment-ghost-btn"
              @click="previewAttachment(selectedAttachment)"
            >
              预览
            </button>
            <button
              v-if="selectedAttachment.actions.canDownload && selectedAttachment.currentVersion"
              type="button"
              class="attachment-ghost-btn"
              @click="downloadAttachment(selectedAttachment)"
            >
              下载
            </button>
            <button
              v-if="selectedAttachment.actions.canManageVersions"
              type="button"
              class="attachment-ghost-btn"
              @click="triggerVersionUpload(selectedAttachment)"
            >
              上传新版本
            </button>
            <button
              v-if="selectedAttachment.actions.canDelete"
              type="button"
              class="attachment-danger-btn"
              @click="removeAttachment(selectedAttachment)"
            >
              删除
            </button>
          </div>
        </div>

        <input ref="versionFileRef" type="file" class="attachment-hidden-input" @change="handleVersionFileChange" />

        <div class="attachment-preview-shell">
          <img
            v-if="previewState.type === 'image' && previewState.url"
            :src="previewState.url"
            class="attachment-preview-image"
            alt="附件预览"
          />
          <iframe
            v-else-if="previewState.type === 'pdf' && previewState.url"
            :src="previewState.url"
            class="attachment-preview-pdf"
            title="PDF 预览"
          />
          <div v-else class="attachment-preview-empty">
            <strong>预览区域</strong>
            <span>图片与 PDF 支持在线预览，其他格式保留下载链路。</span>
          </div>
        </div>

        <div class="attachment-versions">
          <div class="attachment-section-head">
            <span>版本历史</span>
            <span class="attachment-version-count">{{ selectedAttachment.versions.length }} 条</span>
          </div>

          <div v-if="selectedAttachment.versions.length === 0" class="attachment-version-empty">
            暂无正式版本历史
          </div>

          <div v-else class="attachment-version-list">
            <div v-for="version in selectedAttachment.versions" :key="version.id" class="attachment-version-item">
              <div class="attachment-version-main">
                <strong>v{{ version.versionNo }}</strong>
                <span>{{ version.remark || '无版本备注' }}</span>
              </div>
              <span class="attachment-version-time">{{ formatDateTime(version.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { attachmentApi } from '../api'
import { hasPermission } from '../utils/access'

const props = defineProps({
  requirementId: { type: String, required: true },
  currentUser: { type: Object, default: () => ({ permissions: [] }) }
})

const loading = ref(false)
const uploading = ref(false)
const attachments = ref([])
const activeCategory = ref('all')
const selectedAttachment = ref(null)
const uploadForm = ref({ category: '', remark: '', file: null })
const uploadFileRef = ref(null)
const versionFileRef = ref(null)
const versionTargetAttachmentId = ref('')
const previewState = ref({ url: '', type: '' })

const categoryOptions = [
  { value: 'all', label: '全部' },
  { value: 'requirement', label: '需求附件' },
  { value: 'design', label: '设计文档' },
  { value: 'test-report', label: '测试报告' },
  { value: 'acceptance', label: '验收截图' }
]

const categoryLabelMap = {
  requirement: '需求附件',
  design: '设计文档',
  'test-report': '测试报告',
  acceptance: '验收截图'
}

const sourceTypeLabelMap = {
  formal: '正式附件',
  'comment-link': '评论归档'
}

const uploadableCategoryOptions = categoryOptions.filter(item => item.value !== 'all')

const canView = computed(() => hasPermission(props.currentUser, 'attachment:view'))
const canUpload = computed(() => hasPermission(props.currentUser, 'attachment:upload'))
const filteredAttachments = computed(() => {
  if (activeCategory.value === 'all') return attachments.value
  return attachments.value.filter(item => item.category === activeCategory.value)
})
const formalCount = computed(() => attachments.value.filter(item => item.sourceType === 'formal').length)
const commentLinkCount = computed(() => attachments.value.filter(item => item.sourceType === 'comment-link').length)

function cleanupPreviewUrl() {
  if (previewState.value.url) {
    URL.revokeObjectURL(previewState.value.url)
  }
  previewState.value = { url: '', type: '' }
}

function selectAttachment(attachment) {
  selectedAttachment.value = attachment
  cleanupPreviewUrl()
}

async function loadAttachments() {
  if (!props.requirementId || !canView.value) {
    attachments.value = []
    selectedAttachment.value = null
    return
  }

  loading.value = true
  try {
    const res = await attachmentApi.getByRequirement(props.requirementId)
    attachments.value = Array.isArray(res.data.data) ? res.data.data : []
    if (!selectedAttachment.value || !attachments.value.find(item => item.id === selectedAttachment.value.id)) {
      selectedAttachment.value = attachments.value[0] || null
    } else {
      selectedAttachment.value = attachments.value.find(item => item.id === selectedAttachment.value.id) || null
    }
  } finally {
    loading.value = false
  }
}

function triggerUploadFile() {
  uploadFileRef.value?.click()
}

function handleUploadFileChange(event) {
  uploadForm.value.file = event.target.files?.[0] || null
}

async function submitUpload() {
  if (!uploadForm.value.file || !uploadForm.value.category) return
  const formData = new FormData()
  formData.append('file', uploadForm.value.file)
  formData.append('category', uploadForm.value.category)
  if (uploadForm.value.remark) formData.append('remark', uploadForm.value.remark)

  uploading.value = true
  try {
    await attachmentApi.uploadFormal(props.requirementId, formData)
    uploadForm.value = { category: '', remark: '', file: null }
    if (uploadFileRef.value) uploadFileRef.value.value = ''
    await loadAttachments()
  } finally {
    uploading.value = false
  }
}

function triggerVersionUpload(attachment) {
  versionTargetAttachmentId.value = attachment.id
  versionFileRef.value?.click()
}

async function handleVersionFileChange(event) {
  const file = event.target.files?.[0]
  if (!file || !versionTargetAttachmentId.value) return
  const remark = window.prompt('请输入版本备注（可选）', '') || ''
  const formData = new FormData()
  formData.append('file', file)
  formData.append('remark', remark)
  await attachmentApi.addVersion(versionTargetAttachmentId.value, formData)
  versionTargetAttachmentId.value = ''
  event.target.value = ''
  await loadAttachments()
}

async function previewAttachment(attachment) {
  if (!attachment.currentVersion) return
  cleanupPreviewUrl()
  const kind = attachment.currentVersion.fileKind
  const id = attachment.currentVersion.fileId
  const res = await attachmentApi.fetchFileBlob(kind, id, 'inline')
  const objectUrl = URL.createObjectURL(res.data)
  const mimeType = attachment.currentVersion.mimeType || ''
  previewState.value = {
    url: objectUrl,
    type: mimeType === 'application/pdf' ? 'pdf' : 'image'
  }
}

async function downloadAttachment(attachment) {
  if (!attachment.currentVersion) return
  const kind = attachment.currentVersion.fileKind
  const id = attachment.currentVersion.fileId
  const res = await attachmentApi.fetchFileBlob(kind, id, 'download')
  const objectUrl = URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = attachment.originalName || 'attachment'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

async function removeAttachment(attachment) {
  if (!window.confirm(`确认删除附件“${attachment.originalName}”吗？`)) return
  await attachmentApi.remove(attachment.id)
  await loadAttachments()
}

function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

watch(() => props.requirementId, loadAttachments, { immediate: true })
watch(filteredAttachments, items => {
  if (items.length === 0) {
    selectedAttachment.value = null
    cleanupPreviewUrl()
    return
  }

  const active = items.find(item => item.id === selectedAttachment.value?.id)
  if (!active) {
    selectedAttachment.value = items[0]
    cleanupPreviewUrl()
  }
})

onMounted(loadAttachments)
onBeforeUnmount(cleanupPreviewUrl)
</script>

<style scoped>
.attachment-card {
  background: #ffffff;
  border: 1px solid #bcd3eb;
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(74, 144, 226, 0.12);
  padding: 20px 22px 22px;
  position: relative;
}

.attachment-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 22px;
  right: 22px;
  height: 3px;
  background: linear-gradient(90deg, #4f9ef0, #95caf7);
  border-radius: 0 0 999px 999px;
}

.attachment-card-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.attachment-card-head h2 {
  margin: 0;
  font-size: 22px;
  color: #133d67;
}

.attachment-card-head p {
  margin: 8px 0 0;
  color: #436684;
  line-height: 1.7;
}

.attachment-head-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.attachment-stat {
  min-width: 110px;
  padding: 12px 14px;
  border-radius: 16px;
  background: linear-gradient(180deg, #f3f8fe, #eaf3fd);
  border: 1px solid #cadef3;
}

.attachment-stat span,
.attachment-meta,
.attachment-version-time,
.attachment-version-main span,
.attachment-version-count {
  color: #597796;
  font-size: 12px;
}

.attachment-stat strong {
  display: block;
  margin-top: 8px;
  color: #173552;
  font-size: 24px;
}

.attachment-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.attachment-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.attachment-filter-chip {
  padding: 8px 12px;
  border: 1px solid #c9dbef;
  border-radius: 999px;
  background: #f2f8ff;
  color: #416789;
  cursor: pointer;
}

.attachment-filter-chip.active {
  background: linear-gradient(180deg, #d7e9fb, #c6ddf7);
  border-color: #78a9dd;
  color: #184f90;
  font-weight: 700;
}

.attachment-upload-dock {
  display: grid;
  grid-template-columns: 150px minmax(180px, 1fr) minmax(180px, 1fr) 118px;
  gap: 10px;
  width: min(100%, 760px);
}

.attachment-select,
.attachment-input,
.attachment-file-btn,
.attachment-primary-btn,
.attachment-ghost-btn,
.attachment-danger-btn {
  min-height: 42px;
  border-radius: 14px;
  font-size: 13px;
}

.attachment-select,
.attachment-input,
.attachment-file-btn {
  border: 1px solid #c6d9ee;
  background: #ffffff;
  color: #173552;
  padding: 0 14px;
}

.attachment-select:focus,
.attachment-input:focus {
  outline: none;
  border-color: #69b4ff;
  box-shadow: 0 0 0 4px rgba(105, 180, 255, 0.14);
}

.attachment-file-btn {
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  font-weight: 600;
}

.attachment-primary-btn,
.attachment-ghost-btn,
.attachment-danger-btn {
  border: none;
  cursor: pointer;
}

.attachment-primary-btn {
  background: linear-gradient(135deg, #73b7ff, #3e84db);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 12px 28px rgba(62, 132, 219, 0.26);
}

.attachment-primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.attachment-ghost-btn {
  padding: 0 14px;
  background: #eef5fd;
  color: #2e6ab3;
  border: 1px solid rgba(74, 144, 226, 0.16);
}

.attachment-danger-btn {
  padding: 0 14px;
  background: #ffefef;
  color: #ce5555;
  border: 1px solid rgba(212, 82, 82, 0.16);
}

.attachment-hidden-input {
  display: none;
}

.attachment-state {
  margin-top: 16px;
  padding: 20px;
  border-radius: 18px;
  background: linear-gradient(180deg, #eef5fd, #e6f0fb);
  border: 1px solid #cddff2;
  color: #47698a;
  font-weight: 500;
}

.attachment-workspace {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.2fr);
  gap: 16px;
  margin-top: 16px;
}

.attachment-list,
.attachment-detail {
  min-width: 0;
  border: 1px solid #d7e5f5;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fbff, #f1f7fd);
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.attachment-item {
  width: 100%;
  padding: 14px;
  border: 1px solid #d9e6f5;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #f6faff);
  text-align: left;
  cursor: pointer;
}

.attachment-item.active {
  border-color: #7eadde;
  background: linear-gradient(180deg, #eaf3ff, #e1eefc);
  box-shadow: inset 0 0 0 1px rgba(74, 144, 226, 0.14);
}

.attachment-item-top,
.attachment-meta,
.attachment-detail-head,
.attachment-section-head,
.attachment-version-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.attachment-type,
.attachment-source {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
}

.attachment-type {
  background: #e4effc;
  color: #295b92;
}

.attachment-source.formal {
  background: #ddeeff;
  color: #215b9c;
}

.attachment-source.comment-link {
  background: #e5f6ea;
  color: #2e7a4d;
}

.attachment-name,
.attachment-detail-title {
  margin-top: 10px;
  color: #173552;
  font-size: 16px;
  font-weight: 600;
  word-break: break-word;
}

.attachment-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.attachment-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.attachment-preview-shell {
  min-height: 260px;
  border: 1px dashed #bfd6ee;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #f7fbff);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attachment-preview-image {
  max-width: 100%;
  max-height: 360px;
  object-fit: contain;
}

.attachment-preview-pdf {
  width: 100%;
  min-height: 360px;
  border: none;
}

.attachment-preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px;
  text-align: center;
  color: #708aa4;
}

.attachment-preview-empty strong,
.attachment-version-main strong {
  color: #173552;
}

.attachment-version-empty {
  color: #708aa4;
}

.attachment-version-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.attachment-version-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #f6fbff);
  border: 1px solid #d8e6f5;
}

.attachment-version-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (max-width: 1200px) {
  .attachment-workspace,
  .attachment-upload-dock {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .attachment-card-head {
    flex-direction: column;
  }
}
</style>
