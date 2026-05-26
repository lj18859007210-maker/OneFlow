<template>
  <div v-if="requirement" class="detail-page">
    <div class="detail-page-back">
      <button type="button" class="detail-back-btn" @click="goBack">返回列表</button>
    </div>

    <section class="detail-header-card">
      <div class="detail-header-main">
        <div class="detail-header-top">
          <h1 class="detail-title">{{ requirement.title }}</h1>
          <div class="detail-badges">
            <span class="detail-badge" :class="getPriorityClass(requirement.priority)">{{ requirement.priority || '未设置优先级' }}</span>
            <span class="detail-badge" :class="getStatusClass(effectiveStatus)">{{ effectiveStatus }}</span>
          </div>
        </div>
        <p class="detail-subtitle">以统一工作台视角承接需求背景、状态推进、历史沟通与附件归档，减少页面内的跳跃和打断。</p>
        <div class="detail-header-meta">
          <div class="detail-meta-chip">
            <span>提交人</span>
            <strong>{{ requirement.submitter || '-' }}</strong>
          </div>
          <div class="detail-meta-chip">
            <span>开发负责人</span>
            <strong>{{ requirement.developer || '-' }}</strong>
          </div>
          <div class="detail-meta-chip">
            <span>计划日期</span>
            <strong>{{ requirement.expectedDate ? formatDate(requirement.expectedDate) : '未设置' }}</strong>
          </div>
          <div class="detail-meta-chip">
            <span>历史记录</span>
            <strong>{{ comments.length }} 条</strong>
          </div>
        </div>
      </div>

      <div class="detail-header-actions">
        <div v-if="!isSubmitter && nextStatuses.length > 0" class="detail-status-box">
          <span class="detail-status-label">状态更新</span>
          <div class="detail-status-controls">
            <select v-model="newStatus" class="detail-select">
              <option value="">选择下一状态</option>
              <option v-for="step in nextStatuses" :key="step" :value="step">{{ step }}</option>
            </select>
            <button type="button" class="detail-primary-btn" :disabled="!newStatus" @click="updateStatus">更新</button>
          </div>
        </div>
      </div>
    </section>

    <section class="detail-layout">
      <section class="detail-card detail-card-info">
        <div class="detail-card-head">
          <h2>基本信息</h2>
        </div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <span>提交人</span>
            <strong>{{ requirement.submitter || '-' }}</strong>
          </div>
          <div class="detail-info-item">
            <span>开发负责人</span>
            <strong>{{ requirement.developer || '-' }}</strong>
          </div>
          <div class="detail-info-item">
            <span>平台</span>
            <strong>{{ requirement.platform || '-' }}</strong>
          </div>
          <div class="detail-info-item">
            <span>能力</span>
            <strong>{{ requirement.capability || '-' }}</strong>
          </div>
          <div class="detail-info-item">
            <span>计划日期</span>
            <strong>{{ requirement.expectedDate ? formatDate(requirement.expectedDate) : '未设置' }}</strong>
          </div>
          <div class="detail-info-item">
            <span>实际时限</span>
            <strong>{{ requirement.actualDate ? formatDate(requirement.actualDate) : '审批通过后设置' }}</strong>
          </div>
          <div class="detail-info-item">
            <span>月均调用量</span>
            <strong>{{ requirement.avgMonthlyCalls || '-' }}</strong>
          </div>
          <div class="detail-info-item">
            <span>平均开发时长</span>
            <strong>{{ requirement.avgDevTime || '-' }}</strong>
          </div>
          <div class="detail-info-item">
            <span>创建时间</span>
            <strong>{{ formatDateTime(requirement.createdAt) }}</strong>
          </div>
        </div>
      </section>

      <section class="detail-card detail-card-status">
        <div class="detail-card-head">
          <h2>状态流转</h2>
        </div>
        <div class="detail-status-list">
          <div
            v-for="(step, index) in displayStatusOrder"
            :key="step"
            class="detail-status-item"
            :class="{
              current: step === effectiveStatus,
              completed: isStepCompleted(step, effectiveStatus)
            }"
          >
            <div class="detail-status-index">{{ isStepCompleted(step, effectiveStatus) ? '✓' : index + 1 }}</div>
            <div class="detail-status-copy">
              <strong>{{ step }}</strong>
              <span>{{ getStatusHint(step) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="detail-card detail-card-description">
        <div class="detail-card-head">
          <h2>需求描述</h2>
        </div>
        <div class="detail-description">
          {{ requirement.description || '暂无描述' }}
        </div>
      </section>

      <section class="detail-card history-card detail-card-history">
        <div class="detail-card-head">
          <h2>历史信息</h2>
          <span class="detail-count">{{ comments.length }} 条</span>
        </div>

        <div class="detail-history-feed">
          <div v-if="comments.length === 0" class="detail-empty">还没有历史记录</div>

          <article
            v-for="comment in comments"
            :key="comment.id"
            class="detail-history-item"
          >
            <div class="detail-history-meta">
              <strong>{{ comment.userName }}</strong>
              <span>{{ formatDateTime(comment.createdAt) }}</span>
            </div>

            <div class="detail-history-body">
              <template v-for="(line, lineIndex) in getCommentLines(comment.content)" :key="`${comment.id}-${lineIndex}`">
                <span v-if="line.trim()">{{ line }}</span>
                <br v-if="lineIndex < getCommentLines(comment.content).length - 1" />
              </template>
            </div>

            <div v-if="comment.attachments && comment.attachments.length" class="detail-comment-files">
              <div
                v-for="attachment in comment.attachments"
                :key="attachment.id || `${attachment.url}-${attachment.name}`"
                class="detail-comment-file"
              >
                <button type="button" class="detail-comment-file-main" @click="openCommentAttachment(attachment)">
                  <img
                    v-if="isImageAttachment(attachment)"
                    :src="attachment.url || attachment.previewUrl"
                    alt="评论附件"
                    class="detail-comment-image"
                  />
                  <span v-else class="detail-comment-file-name">{{ attachment.originalName || attachment.name }}</span>
                </button>

                <div class="detail-comment-actions">
                  <button
                    v-if="canPreviewAttachments && isPreviewableAttachment(attachment)"
                    type="button"
                    class="detail-link-btn"
                    @click="previewCommentAttachment(attachment)"
                  >
                    预览
                  </button>
                  <button
                    v-if="canDownloadAttachments"
                    type="button"
                    class="detail-link-btn"
                    @click="downloadCommentAttachment(attachment)"
                  >
                    下载
                  </button>
                  <button
                    v-if="canPromoteAttachments && attachment.id"
                    type="button"
                    class="detail-link-btn"
                    @click="promoteCommentAttachment(attachment)"
                  >
                    加入正式附件
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div class="detail-composer">
          <div class="detail-composer-head">
            <div>
              <strong>沟通输入区</strong>
              <span>支持文字、图片和普通文件，评论附件可后续归档。</span>
            </div>
            <button
              type="button"
              class="detail-secondary-btn"
              :disabled="!canUploadCommentAttachments || commentUploading"
              @click="triggerAttachmentUpload"
            >
              {{ commentUploading ? '上传中...' : '添加附件' }}
            </button>
          </div>

          <textarea
            ref="chatInputRef"
            v-model="chatMessage"
            class="detail-composer-input"
            placeholder="记录讨论结论、补充上下文，或直接发送附件说明"
            @keydown.ctrl.enter="sendMessage"
            @paste="handlePaste"
          />

          <div v-if="pendingCommentAttachments.length > 0" class="detail-pending-grid">
            <div
              v-for="(attachment, index) in pendingCommentAttachments"
              :key="attachment.id || index"
              class="detail-pending-item"
            >
              <img
                v-if="attachment.localPreviewUrl && attachment.mimeType?.startsWith('image/')"
                :src="attachment.localPreviewUrl"
                alt="待发送附件"
              />
              <div v-else class="detail-pending-file">{{ attachment.originalName || attachment.name }}</div>
              <button type="button" class="detail-pending-remove" @click="removePendingAttachment(index)">×</button>
            </div>
          </div>

          <div class="detail-composer-actions">
            <span>按 `Ctrl + Enter` 可快速发送</span>
            <button
              type="button"
              class="detail-primary-btn"
              :disabled="(!chatMessage.trim() && pendingCommentAttachments.length === 0) || sendingComment"
              @click="sendMessage"
            >
              {{ sendingComment ? '发送中...' : '发送留言' }}
            </button>
          </div>

          <input
            ref="fileInputRef"
            type="file"
            multiple
            class="detail-hidden-input"
            @change="handleFileSelect"
          />
        </div>
      </section>

      <AttachmentCenter
        :key="attachmentCenterKey"
        :requirement-id="requirement.id"
        :current-user="currentUser"
        class="detail-card-attachment"
      />
    </section>

    <div v-if="previewImageVisible" class="detail-preview-overlay" @wheel.prevent="handleImageZoom">
      <div class="detail-preview-controls">
        <button type="button" class="detail-preview-btn" title="放大" @click="zoomIn">+</button>
        <button type="button" class="detail-preview-btn" title="缩小" @click="zoomOut">-</button>
        <button type="button" class="detail-preview-btn" title="重置" @click="resetZoom">{{ Math.round(imageZoomLevel * 100) }}%</button>
        <button type="button" class="detail-preview-close" title="关闭" @click="closeImagePreview">×</button>
      </div>
      <div class="detail-preview-shell" @click.stop>
        <img
          :src="previewImageUrl"
          alt="图片预览"
          class="detail-preview-image"
          :style="{ transform: `scale(${imageZoomLevel})` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AttachmentCenter from '../components/AttachmentCenter.vue'
import { attachmentApi, commentApi, requirementApi, workflowApi } from '../api'
import { hasPermission } from '../utils/access'

const route = useRoute()
const router = useRouter()
const currentUser = inject('currentUser', ref({ name: '未登录', role: 'user', permissions: [] }))
const requirement = ref(null)
const newStatus = ref('')
const comments = ref([])
const chatMessage = ref('')
const pendingCommentAttachments = ref([])
const chatInputRef = ref(null)
const fileInputRef = ref(null)
const previewImageVisible = ref(false)
const previewImageUrl = ref('')
const imageZoomLevel = ref(1)
const workflowStatuses = ref([])
const workflowTransitions = ref([])
const sendingComment = ref(false)
const commentUploading = ref(false)
const attachmentCenterKey = ref(0)

const isSubmitter = computed(() => {
  if (!requirement.value || !currentUser.value) return false
  return requirement.value.submitter === currentUser.value.name
})

const canPreviewAttachments = computed(() => hasPermission(currentUser.value, 'attachment:preview'))
const canDownloadAttachments = computed(() => hasPermission(currentUser.value, 'attachment:download'))
const canPromoteAttachments = computed(() => hasPermission(currentUser.value, 'attachment:promote'))
const canUploadCommentAttachments = computed(() => hasPermission(currentUser.value, 'attachment:upload'))

const effectiveStatus = computed(() => {
  if (!requirement.value) return ''
  if (requirement.value.approvalStatus !== 'approved') {
    return '待审批'
  }
  return requirement.value.status
})

const displayStatusOrder = computed(() => {
  const ordered = workflowStatuses.value.map(item => item.statusCode)
  if (!effectiveStatus.value) return ordered
  return ordered.includes(effectiveStatus.value) ? ordered : [...ordered, effectiveStatus.value]
})

const nextStatuses = computed(() => {
  if (!requirement.value) return []
  if (requirement.value.approvalStatus !== 'approved') return []
  return workflowTransitions.value
    .filter(item =>
      item.enabled !== false &&
      item.fromStatus === requirement.value.status &&
      (item.approvalOutcome || 'none') === 'none'
    )
    .map(item => item.toStatus)
})

function isStepCompleted(step, currentStatus) {
  return displayStatusOrder.value.indexOf(step) < displayStatusOrder.value.indexOf(currentStatus)
}

function getStatusClass(status) {
  const map = {
    待审批: 'tone-pending',
    待评审: 'tone-pending',
    待开发: 'tone-dev',
    开发中: 'tone-dev',
    测试中: 'tone-testing',
    已发布: 'tone-released'
  }
  return map[status] || 'tone-neutral'
}

function getPriorityClass(priority) {
  const map = {
    高: 'tone-high',
    中: 'tone-medium',
    低: 'tone-low'
  }
  return map[priority] || 'tone-neutral'
}

function getStatusHint(status) {
  const map = {
    待审批: '等待审批人确认资源与优先级',
    待评审: '确认方案、边界与执行节奏',
    待开发: '需求已明确，等待投入开发',
    开发中: '功能开发推进中',
    测试中: '进入验证与回归阶段',
    已发布: '已完成上线与交付'
  }
  return map[status] || '沿既定流程继续推进'
}

function formatDate(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function getCommentLines(content) {
  const cleaned = String(content || '').replace(/^(审批意见|评审结果|开发人员|用户)[:：]\s?/, '')
  return cleaned.split('\n').filter(line => line.trim())
}

function isImageAttachment(attachment) {
  return String(attachment.mimeType || '').startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(attachment.url || attachment.previewUrl || '')
}

function isPreviewableAttachment(attachment) {
  const mimeType = String(attachment.mimeType || '')
  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

function previewImage(url) {
  previewImageUrl.value = url
  previewImageVisible.value = true
  imageZoomLevel.value = 1
}

function closeImagePreview() {
  previewImageVisible.value = false
  previewImageUrl.value = ''
  imageZoomLevel.value = 1
}

function zoomIn() {
  imageZoomLevel.value = Math.min(imageZoomLevel.value + 0.2, 3)
}

function zoomOut() {
  imageZoomLevel.value = Math.max(imageZoomLevel.value - 0.2, 0.2)
}

function resetZoom() {
  imageZoomLevel.value = 1
}

function handleImageZoom(event) {
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  imageZoomLevel.value = Math.max(0.2, Math.min(3, imageZoomLevel.value + delta))
}

function cleanupPendingObjectUrls() {
  pendingCommentAttachments.value.forEach(item => {
    if (item.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl)
  })
}

function goBack() {
  router.back()
}

async function loadWorkflow() {
  const [statusRes, transitionRes] = await Promise.all([
    workflowApi.getStatuses(),
    workflowApi.getTransitions()
  ])

  workflowStatuses.value = (statusRes.data.data || [])
    .filter(item => item.enabled)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))

  workflowTransitions.value = (transitionRes.data.data || []).filter(item => item.enabled)
}

async function loadRequirement() {
  const res = await requirementApi.getById(route.params.id)
  requirement.value = res.data.data
}

async function updateStatus() {
  try {
    await requirementApi.updateStatus(requirement.value.id, newStatus.value)
    requirement.value.status = newStatus.value
    newStatus.value = ''
    showToast('状态更新成功')
    await loadComments()
  } catch (error) {
    showToast(error.response?.data?.message || '状态更新失败')
  }
}

async function loadComments() {
  try {
    const res = await commentApi.getList(requirement.value.id)
    comments.value = res.data.data || []
  } catch (error) {
    console.error('获取评论列表失败:', error)
  }
}

async function sendMessage() {
  if (!chatMessage.value.trim() && pendingCommentAttachments.value.length === 0) {
    showToast('请输入留言内容')
    return
  }

  sendingComment.value = true
  try {
    await commentApi.create({
      requirementId: requirement.value.id,
      type: 'user_message',
      content: chatMessage.value.trim(),
      attachmentIds: pendingCommentAttachments.value.map(item => item.id).filter(Boolean)
    })
    chatMessage.value = ''
    cleanupPendingObjectUrls()
    pendingCommentAttachments.value = []
    showToast('留言成功')
    await loadComments()
  } catch (error) {
    showToast(error.response?.data?.message || '留言失败')
  } finally {
    sendingComment.value = false
  }
}

function triggerAttachmentUpload() {
  fileInputRef.value?.click()
}

async function uploadCommentFiles(files) {
  if (!files?.length || !requirement.value) return
  const formData = new FormData()
  formData.append('requirementId', requirement.value.id)
  Array.from(files).forEach(file => formData.append('files', file))

  commentUploading.value = true
  try {
    const res = await attachmentApi.uploadCommentFiles(formData)
    const uploaded = Array.isArray(res.data.data) ? res.data.data : []
    const mapped = uploaded.map((item, index) => ({
      ...item,
      localPreviewUrl: files[index] && files[index].type.startsWith('image/')
        ? URL.createObjectURL(files[index])
        : ''
    }))
    pendingCommentAttachments.value.push(...mapped)
  } catch (error) {
    showToast(error.response?.data?.message || '评论附件上传失败')
  } finally {
    commentUploading.value = false
  }
}

async function handleFileSelect(event) {
  const files = event.target.files
  if (!files?.length) return
  await uploadCommentFiles(files)
  event.target.value = ''
}

async function handlePaste(event) {
  const items = event.clipboardData?.items
  if (!items) return

  const files = []
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }

  if (files.length > 0) {
    await uploadCommentFiles(files)
  }
}

function removePendingAttachment(index) {
  const [removed] = pendingCommentAttachments.value.splice(index, 1)
  if (removed?.localPreviewUrl) URL.revokeObjectURL(removed.localPreviewUrl)
}

async function fetchAttachmentBlob(attachment, mode = 'download') {
  const kind = attachment.fileKind || 'comment'
  const id = attachment.fileId || attachment.id
  const res = await attachmentApi.fetchFileBlob(kind, id, mode)
  return res.data
}

async function previewCommentAttachment(attachment) {
  try {
    if (attachment.url) {
      if (String(attachment.mimeType || '') === 'application/pdf') {
        window.open(attachment.url, '_blank', 'noopener')
        return
      }
      if (isImageAttachment(attachment)) {
        previewImage(attachment.url)
        return
      }
    }

    if (String(attachment.mimeType || '') === 'application/pdf') {
      const blob = await fetchAttachmentBlob(attachment, 'inline')
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      return
    }

    if (isImageAttachment(attachment)) {
      if (attachment.url) {
        previewImage(attachment.url)
        return
      }
      const blob = await fetchAttachmentBlob(attachment, 'inline')
      const objectUrl = URL.createObjectURL(blob)
      previewImage(objectUrl)
      return
    }

    await downloadCommentAttachment(attachment)
  } catch (error) {
    showToast(error.response?.data?.message || '附件预览失败')
  }
}

async function downloadCommentAttachment(attachment) {
  try {
    if (attachment.url) {
      const link = document.createElement('a')
      link.href = attachment.url
      link.download = attachment.originalName || attachment.name || 'attachment'
      document.body.appendChild(link)
      link.click()
      link.remove()
      return
    }

    const blob = await fetchAttachmentBlob(attachment, 'download')
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = attachment.originalName || attachment.name || 'attachment'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
  } catch (error) {
    showToast(error.response?.data?.message || '附件下载失败')
  }
}

async function openCommentAttachment(attachment) {
  if (canPreviewAttachments.value && isPreviewableAttachment(attachment)) {
    await previewCommentAttachment(attachment)
    return
  }
  if (canDownloadAttachments.value) {
    await downloadCommentAttachment(attachment)
  }
}

async function promoteCommentAttachment(attachment) {
  const category = window.prompt('请输入归档分类：requirement / design / test-report / acceptance', 'requirement')
  if (!category) return
  try {
    await attachmentApi.promoteCommentAttachment(attachment.id, {
      requirementId: requirement.value.id,
      category
    })
    attachmentCenterKey.value += 1
    showToast('已加入正式附件中心')
  } catch (error) {
    showToast(error.response?.data?.message || '归档失败')
  }
}

function showToast(message) {
  const toast = document.createElement('div')
  toast.className = 'tech-toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2200)
}

onMounted(async () => {
  try {
    await loadWorkflow()
    await loadRequirement()
    await loadComments()
  } catch (error) {
    console.error('获取详情失败:', error)
  }
})

onBeforeUnmount(() => {
  cleanupPendingObjectUrls()
})
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
}

.detail-page::before {
  content: '';
  position: fixed;
  inset: 64px 0 0 var(--sidebar-width);
  background:
    radial-gradient(circle at top left, rgba(74, 144, 226, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(234, 242, 252, 0.65), rgba(240, 246, 255, 0));
  pointer-events: none;
  z-index: 0;
}

.detail-page > * {
  position: relative;
  z-index: 1;
}

.detail-page-back {
  display: flex;
}

.detail-back-btn,
.detail-primary-btn,
.detail-secondary-btn,
.detail-link-btn,
.detail-preview-btn,
.detail-preview-close {
  cursor: pointer;
  transition: all 0.2s ease;
}

.detail-back-btn {
  border: 1px solid rgba(74, 144, 226, 0.18);
  border-radius: 999px;
  padding: 8px 14px;
  background: #fff;
  color: #2e5c8a;
  font-weight: 600;
}

.detail-header-card {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 20px;
  align-items: start;
  padding: 24px 28px;
  background: linear-gradient(135deg, #102a45 0%, #173a5b 55%, #204a74 100%);
  border: 1px solid rgba(110, 162, 215, 0.18);
  border-radius: 24px;
  box-shadow: 0 26px 60px rgba(16, 42, 69, 0.26);
}

.detail-header-top {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}

.detail-title {
  margin: 0;
  font-size: 32px;
  line-height: 1.15;
  color: #f3f8fd;
}

.detail-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-badge {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.tone-pending {
  background: rgba(255, 205, 124, 0.16);
  color: #ffd28e;
}

.tone-dev {
  background: rgba(130, 188, 255, 0.16);
  color: #cfe3ff;
}

.tone-testing {
  background: rgba(104, 223, 210, 0.16);
  color: #c7fbf6;
}

.tone-released {
  background: rgba(131, 223, 156, 0.16);
  color: #d3fddb;
}

.tone-high {
  background: rgba(255, 124, 124, 0.16);
  color: #ffd4d4;
}

.tone-medium {
  background: rgba(135, 187, 255, 0.18);
  color: #d7e8ff;
}

.tone-low,
.tone-neutral {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(241, 246, 253, 0.84);
}

.detail-subtitle {
  margin: 10px 0 0;
  color: rgba(223, 235, 248, 0.8);
  line-height: 1.8;
}

.detail-header-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.detail-meta-chip {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(171, 204, 238, 0.12);
  backdrop-filter: blur(10px);
}

.detail-meta-chip span {
  display: block;
  font-size: 12px;
  color: rgba(205, 222, 239, 0.72);
}

.detail-meta-chip strong {
  display: block;
  margin-top: 8px;
  color: #ffffff;
  font-size: 16px;
}

.detail-status-box {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(171, 204, 238, 0.12);
  backdrop-filter: blur(10px);
}

.detail-status-label {
  display: block;
  margin-bottom: 10px;
  font-size: 12px;
  color: rgba(214, 229, 244, 0.74);
}

.detail-status-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  gap: 10px;
}

.detail-select,
.detail-composer-input {
  width: 100%;
  border: 1px solid #d2e1f2;
  border-radius: 14px;
  background: #fff;
  color: #163452;
  font-size: 14px;
}

.detail-select {
  min-height: 44px;
  padding: 0 14px;
}

.detail-composer-input {
  min-height: 128px;
  padding: 14px;
  resize: vertical;
}

.detail-select:focus,
.detail-composer-input:focus {
  outline: none;
  border-color: #69b4ff;
  box-shadow: 0 0 0 4px rgba(105, 180, 255, 0.14);
}

.detail-primary-btn,
.detail-secondary-btn {
  min-height: 44px;
  border-radius: 14px;
  border: none;
  font-weight: 700;
}

.detail-primary-btn {
  padding: 0 16px;
  color: #fff;
  background: linear-gradient(135deg, #73b7ff, #3e84db);
  box-shadow: 0 12px 28px rgba(62, 132, 219, 0.32);
}

.detail-primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.detail-secondary-btn {
  padding: 0 14px;
  color: #356595;
  background: #eef5fd;
  border: 1px solid rgba(74, 144, 226, 0.16);
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.detail-card,
.detail-card-attachment {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #d4e4f5;
  border-radius: 24px;
  box-shadow: 0 16px 36px rgba(74, 144, 226, 0.08);
  position: relative;
  overflow: hidden;
}

.detail-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 22px;
  right: 22px;
  height: 3px;
  background: linear-gradient(90deg, #5aa6f6, #9fd4ff);
  border-radius: 0 0 999px 999px;
}

.detail-card-attachment {
  grid-column: 1 / -1;
}

.detail-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px 0;
}

.detail-card-head h2 {
  margin: 0;
  font-size: 20px;
  color: #173552;
}

.detail-count {
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef5fd;
  color: #527496;
  font-size: 12px;
}

.detail-card-info,
.detail-card-status,
.detail-card-description,
.detail-card-history {
  align-self: stretch;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 20px 22px 22px;
}

.detail-info-item {
  padding: 12px 14px;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdff, #f2f7fd);
  border: 1px solid #ddeaf7;
}

.detail-info-item span,
.detail-status-copy span,
.detail-composer-head span,
.detail-composer-actions span {
  display: block;
  font-size: 12px;
  color: #6e88a3;
}

.detail-info-item strong,
.detail-status-copy strong,
.detail-history-meta strong,
.detail-composer-head strong {
  display: block;
  margin-top: 6px;
  color: #163452;
}

.detail-description {
  padding: 18px 22px 24px;
  color: #204363;
  line-height: 1.85;
  white-space: pre-wrap;
}

.detail-status-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 22px 22px;
}

.detail-status-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid #dce9f6;
  background: linear-gradient(180deg, #fcfeff, #f5f9fd);
}

.detail-status-item.current {
  border-color: #94c0ef;
  background: linear-gradient(180deg, #eff6ff, #e4f0fd);
}

.detail-status-item.completed {
  border-color: #b9dcc3;
  background: linear-gradient(180deg, #eef9f1, #e7f5eb);
}

.detail-status-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #193c5f;
  color: #fff;
  font-weight: 700;
}

.detail-status-item.completed .detail-status-index {
  background: #2d8b55;
}

.history-card {
  display: flex;
  flex-direction: column;
}

.detail-history-feed {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 22px 0;
  max-height: 560px;
  overflow: auto;
}

.detail-empty {
  padding: 24px;
  border-radius: 18px;
  background: #f8fbff;
  color: #7990a8;
  text-align: center;
}

.detail-history-item {
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, #fcfeff, #f3f8fd);
  border: 1px solid #dce9f6;
}

.detail-history-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.detail-history-meta span {
  font-size: 12px;
  color: #7690aa;
}

.detail-history-body {
  margin-top: 10px;
  color: #234262;
  line-height: 1.75;
}

.detail-comment-files {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.detail-comment-file {
  border: 1px solid #e1ebf7;
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
}

.detail-comment-file-main {
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.detail-comment-image {
  display: block;
  width: 100%;
  max-height: 180px;
  object-fit: cover;
}

.detail-comment-file-name {
  display: block;
  padding: 14px;
  color: #173552;
  word-break: break-word;
}

.detail-comment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0 14px 14px;
}

.detail-link-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: #2e6ab3;
  font-size: 13px;
  font-weight: 600;
}

.detail-composer {
  margin-top: 18px;
  padding: 18px 22px 22px;
  border-top: 1px solid #e6eef8;
  background: linear-gradient(180deg, #fbfdff, #f4f8fd);
}

.detail-composer-head,
.detail-composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.detail-pending-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.detail-pending-item {
  position: relative;
  min-height: 88px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid #e1ebf7;
  background: #fff;
}

.detail-pending-item img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 88px;
  object-fit: cover;
}

.detail-pending-file {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88px;
  padding: 10px;
  text-align: center;
  color: #173552;
  font-size: 12px;
  word-break: break-word;
}

.detail-pending-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(15, 42, 68, 0.72);
  color: #fff;
  cursor: pointer;
}

.detail-composer-actions {
  margin-top: 14px;
}

.detail-hidden-input {
  display: none;
}

.detail-preview-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.82);
  z-index: 9999;
}

.detail-preview-shell {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-preview-image {
  max-width: 100%;
  max-height: 88vh;
  object-fit: contain;
  border-radius: 10px;
  transition: transform 0.2s ease;
}

.detail-preview-controls {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
}

.detail-preview-btn,
.detail-preview-close {
  min-width: 38px;
  height: 38px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.detail-preview-close {
  border-radius: 50%;
  font-size: 24px;
}

@media (max-width: 1280px) {
  .detail-layout,
  .detail-header-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .detail-header-meta,
  .detail-info-grid {
    grid-template-columns: 1fr 1fr;
  }

  .detail-header-top,
  .detail-composer-head,
  .detail-composer-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .detail-header-meta,
  .detail-info-grid {
    grid-template-columns: 1fr;
  }

  .detail-status-controls {
    grid-template-columns: 1fr;
  }

  .detail-header-card,
  .detail-card-head,
  .detail-info-grid,
  .detail-description,
  .detail-status-list,
  .detail-history-feed,
  .detail-composer {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
