<template>
  <section v-if="canView" class="attachment-card">
    <div class="attachment-card-head">
      <h2>附件中心</h2>
      <span>{{ filteredAttachments.length }} 个附件</span>
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
          <option v-for="item in uploadableCategoryOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
        <input v-model="uploadForm.remark" class="attachment-input" placeholder="版本备注（可选）" />
        <button type="button" class="attachment-file-btn" @click="triggerUploadFile">
          {{ uploadForm.file ? normalizeFileName(uploadForm.file.name) : '选择文件' }}
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
    <div v-else class="attachment-table-wrap">
      <table class="attachment-table">
        <thead>
          <tr>
            <th>文件名</th>
            <th>分类</th>
            <th>版本</th>
            <th>大小</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredAttachments.length === 0">
            <td colspan="6" class="attachment-empty">暂无附件</td>
          </tr>
          <tr v-for="attachment in filteredAttachments" :key="attachment.id">
            <td>
              <button
                v-if="attachment.actions.canDownload && attachment.currentVersion"
                type="button"
                class="attachment-name-btn"
                @click="downloadAttachment(attachment)"
              >
                {{ displayAttachmentName(attachment) }}
              </button>
              <span v-else class="attachment-name-text">{{ displayAttachmentName(attachment) }}</span>
            </td>
            <td>{{ categoryLabelMap[attachment.category] || attachment.category }}</td>
            <td>{{ attachment.summary.versionNo ? `v${attachment.summary.versionNo}` : '评论归档' }}</td>
            <td>{{ formatFileSize(attachment.currentVersion?.fileSize || attachment.linkedCommentAttachment?.fileSize) }}</td>
            <td>{{ formatDateTime(attachment.updatedAt || attachment.createdAt) }}</td>
            <td>
              <div class="attachment-actions">
                <button
                  v-if="attachment.actions.canDownload && attachment.currentVersion"
                  type="button"
                  class="attachment-link-btn"
                  @click="downloadAttachment(attachment)"
                >
                  下载
                </button>
                <button
                  v-if="attachment.actions.canManageVersions"
                  type="button"
                  class="attachment-link-btn"
                  @click="triggerVersionUpload(attachment)"
                >
                  上传新版本
                </button>
                <button
                  v-if="attachment.actions.canDelete"
                  type="button"
                  class="attachment-danger-link"
                  @click="removeAttachment(attachment)"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <input ref="versionFileRef" type="file" class="attachment-hidden-input" @change="handleVersionFileChange" />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
const uploadForm = ref({ category: '', remark: '', file: null })
const uploadFileRef = ref(null)
const versionFileRef = ref(null)
const versionTargetAttachmentId = ref('')

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

const uploadableCategoryOptions = categoryOptions.filter(item => item.value !== 'all')

const canView = computed(() => hasPermission(props.currentUser, 'attachment:view'))
const canUpload = computed(() => hasPermission(props.currentUser, 'attachment:upload'))
const filteredAttachments = computed(() => {
  if (activeCategory.value === 'all') return attachments.value
  return attachments.value.filter(item => item.category === activeCategory.value)
})

async function loadAttachments() {
  if (!props.requirementId || !canView.value) {
    attachments.value = []
    return
  }

  loading.value = true
  try {
    const res = await attachmentApi.getByRequirement(props.requirementId)
    attachments.value = Array.isArray(res.data.data) ? res.data.data : []
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

async function downloadAttachment(attachment) {
  if (!attachment.currentVersion) return
  const kind = attachment.currentVersion.fileKind
  const id = attachment.currentVersion.fileId
  const res = await attachmentApi.fetchFileBlob(kind, id, 'download')
  const objectUrl = URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = displayAttachmentName(attachment) || 'attachment'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

async function removeAttachment(attachment) {
  if (!window.confirm(`确认删除附件“${displayAttachmentName(attachment)}”吗？`)) return
  await attachmentApi.remove(attachment.id)
  await loadAttachments()
}

function displayAttachmentName(attachment) {
  return normalizeFileName(attachment.originalName || attachment.linkedCommentAttachment?.originalName || '附件')
}

function normalizeFileName(name) {
  const raw = String(name || '')
  if (!/[ÃÂâæçèéå]/.test(raw) || typeof TextDecoder === 'undefined') return raw

  try {
    const bytes = Uint8Array.from(raw, char => char.charCodeAt(0) & 0xff)
    const decoded = new TextDecoder('utf-8').decode(bytes)
    if (decoded && !decoded.includes('\uFFFD') && /[\u4e00-\u9fff]/.test(decoded)) return decoded
  } catch (error) {
    return raw
  }

  return raw
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (!value) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
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
onMounted(loadAttachments)
</script>

<style scoped>
.attachment-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #ffffff;
  border: 1px solid #d7e2ee;
  border-radius: 5px;
  overflow: hidden;
}

.attachment-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  padding: 8px 10px;
  border-bottom: 1px solid #e8eef5;
  background: linear-gradient(180deg, #fbfdff, #f3f7fc);
}

.attachment-card-head h2 {
  margin: 0;
  color: #143251;
  font-size: 13px;
  font-weight: 800;
}

.attachment-card-head span {
  color: #6d7f93;
  font-size: 12px;
}

.attachment-toolbar {
  display: grid;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid #edf2f7;
}

.attachment-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.attachment-filter-chip,
.attachment-select,
.attachment-input,
.attachment-file-btn,
.attachment-primary-btn {
  height: 34px;
  border-radius: 4px;
  font-size: 12px;
}

.attachment-filter-chip {
  padding: 0 12px;
  border: 1px solid #c9dbef;
  background: #f2f8ff;
  color: #416789;
  cursor: pointer;
}

.attachment-filter-chip.active {
  background: #d7e9fb;
  border-color: #78a9dd;
  color: #184f90;
  font-weight: 700;
}

.attachment-upload-dock {
  display: grid;
  grid-template-columns: 150px minmax(160px, 1fr) minmax(160px, 1fr) 118px;
  gap: 8px;
}

.attachment-select,
.attachment-input,
.attachment-file-btn {
  min-width: 0;
  border: 1px solid #c6d9ee;
  background: #ffffff;
  color: #173552;
  padding: 0 12px;
}

.attachment-file-btn {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  cursor: pointer;
  font-weight: 700;
}

.attachment-primary-btn {
  border: 1px solid #1268d8;
  background: #8cbdf1;
  color: #fff;
  cursor: pointer;
  font-weight: 800;
}

.attachment-primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.attachment-hidden-input {
  display: none;
}

.attachment-state,
.attachment-empty {
  color: #6d7f93;
  text-align: center;
}

.attachment-state {
  padding: 24px;
}

.attachment-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.attachment-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.attachment-table th,
.attachment-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #edf2f7;
  color: #2f4a67;
  font-size: 12px;
  text-align: left;
  vertical-align: middle;
  line-height: 1.35;
}

.attachment-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f6f9fd;
  color: #61758c;
  font-weight: 800;
  white-space: nowrap;
}

.attachment-table tbody tr:hover {
  background: #f8fbff;
}

.attachment-table th:nth-child(1),
.attachment-table td:nth-child(1) {
  width: 38%;
}

.attachment-table th:nth-child(2),
.attachment-table td:nth-child(2) {
  width: 9%;
  white-space: nowrap;
}

.attachment-table th:nth-child(3),
.attachment-table td:nth-child(3) {
  width: 7%;
  white-space: nowrap;
}

.attachment-table th:nth-child(4),
.attachment-table td:nth-child(4) {
  width: 8%;
  white-space: nowrap;
}

.attachment-table th:nth-child(5),
.attachment-table td:nth-child(5) {
  width: 16%;
  white-space: nowrap;
}

.attachment-table th:nth-child(6),
.attachment-table td:nth-child(6) {
  width: 22%;
}

.attachment-name-btn,
.attachment-name-text,
.attachment-link-btn,
.attachment-danger-link {
  font-size: 12px;
  font-family: inherit;
  line-height: 1.35;
}

.attachment-name-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: #1268d8;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  appearance: none;
  outline: none;
}

.attachment-name-text {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-actions {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  align-items: center;
}

.attachment-link-btn,
.attachment-danger-link {
  height: 24px;
  padding: 0 8px;
  border: 1px solid #cfe0f3;
  border-radius: 4px;
  background: #f8fbff;
  cursor: pointer;
  font-weight: 700;
  white-space: nowrap;
  appearance: none;
  outline: none;
}

.attachment-link-btn {
  color: #1268d8;
}

.attachment-danger-link {
  border-color: #f0cccc;
  background: #fff5f5;
  color: #d9534f;
}

@media (max-width: 900px) {
  .attachment-upload-dock {
    grid-template-columns: 1fr;
  }
}
</style>
