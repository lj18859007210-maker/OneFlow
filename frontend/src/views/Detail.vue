<template>
  <div v-if="requirement" class="detail-page detail-ops-page">
    <header class="ops-topbar">
      <div class="ops-title-wrap">
        <button type="button" class="ops-icon-btn" title="返回列表" @click="goBack">‹</button>
        <div><div class="ops-breadcrumb">需求列表 / 需求详情</div><h1 class="ops-title">{{ requirement.title }}</h1></div>
      </div>
      <div class="ops-actions">
        <button type="button" class="ops-btn ops-btn-primary" @click="goBack">返回</button>
      </div>
    </header>

    <section class="ops-summary-strip">
      <div class="ops-summary-item" :class="getPriorityClass(requirement.priority)"><span>优先级</span><strong>{{ requirement.priority || '未设置' }}</strong></div>
      <div class="ops-summary-item"><span>计划日期</span><strong>{{ requirement.expectedDate ? formatDate(requirement.expectedDate) : '未设置' }}</strong></div>
      <div class="ops-summary-item"><span>平均开发时长</span><strong>{{ requirement.avgDevTime || '-' }}</strong></div>
      <div class="ops-summary-item"><span>月调用量</span><strong>{{ requirement.avgMonthlyCalls || '-' }}</strong></div>
      <div class="ops-summary-item"><span>开发人员</span><strong>{{ requirement.developer || '-' }}</strong></div>
      <div class="ops-summary-item" :class="getStatusClass(effectiveStatus)"><span>状态</span><strong>{{ effectiveStatus || '-' }}</strong></div>
    </section>

    <main class="ops-workbench">
      <aside class="ops-left-rail">
        <section class="ops-panel">
          <div class="ops-panel-head"><h2>流转状态</h2></div>
          <div class="ops-flow-list">
            <div v-for="(step, index) in displayStatusOrder" :key="step" class="ops-flow-item" :class="{ current: step === effectiveStatus, completed: isStepCompleted(step, effectiveStatus) }">
              <span class="ops-flow-dot">{{ isStepCompleted(step, effectiveStatus) ? '✓' : index + 1 }}</span>
              <div><strong>{{ step }}</strong><small>{{ getStatusHint(step) }}</small></div>
            </div>
          </div>
        </section>
        <section class="ops-panel">
          <div class="ops-panel-head"><h2>核心信息</h2></div>
          <dl class="ops-kv-list">
            <div><dt>需求编号</dt><dd>{{ requirement.requirementNo || requirement.code || requirement.id || '-' }}</dd></div>
            <div><dt>提交人</dt><dd>{{ requirement.submitter || '-' }}</dd></div>
            <div><dt>开发人员</dt><dd>{{ requirement.developer || '-' }}</dd></div>
            <div><dt>优先级</dt><dd>{{ requirement.priority || '-' }}</dd></div>
            <div><dt>期望日期</dt><dd>{{ requirement.expectedDate ? formatDate(requirement.expectedDate) : '-' }}</dd></div>
            <div><dt>实际日期</dt><dd>{{ requirement.actualDate ? formatDate(requirement.actualDate) : '审批通过后设置' }}</dd></div>
            <div><dt>平台</dt><dd>{{ requirement.platform || '-' }}</dd></div>
            <div><dt>能力</dt><dd>{{ requirement.capability || '-' }}</dd></div>
            <div><dt>创建时间</dt><dd>{{ formatDateTime(requirement.createdAt) }}</dd></div>
          </dl>
        </section>
      </aside>

      <section class="ops-main-stack">
        <section class="ops-panel demand-panel">
          <div class="ops-tabs"><span class="active">概览</span></div>
          <div class="ops-description-grid">
            <article class="ops-description-block main"><h2>背景与目标</h2><p>{{ requirement.description || '暂无描述' }}</p></article>
            <article class="ops-description-block"><h2>需求内容</h2><ol><li>支持需求背景、描述、附件与状态集中查看。</li><li>支持流程状态实时同步与操作记录沉淀。</li><li>提供评论附件上传、预览、下载与归档能力。</li><li>变更后实时生效，保留完整沟通链路。</li></ol></article>
            <article class="ops-description-block"><h2>验收标准</h2><ul><li>功能测试通过率 100%</li><li>关键字段与附件可追溯</li><li>状态变更同步时间 ≤ 30s</li></ul></article>
          </div>
        </section>

        <AttachmentCenter :key="attachmentCenterKey" :requirement-id="requirement.id" :current-user="currentUser" class="ops-panel ops-attachment-panel" />

        <section class="ops-panel ops-history-table">
          <div class="ops-panel-head"><h2>历史信息</h2><span>{{ comments.length }} 条</span></div>
          <div class="ops-table-wrap"><table><thead><tr><th>时间</th><th>类型</th><th>操作人</th><th>内容</th></tr></thead><tbody>
            <tr v-if="comments.length === 0"><td colspan="4" class="ops-empty-cell">还没有历史记录</td></tr>
            <tr v-for="comment in comments" :key="comment.id"><td>{{ formatDateTime(comment.createdAt) }}</td><td>评论</td><td>{{ comment.userName }}</td><td>
              <template v-for="(line, lineIndex) in getCommentLines(comment.content)" :key="comment.id + '-' + lineIndex"><span v-if="line.trim()">{{ line }}</span><br v-if="lineIndex < getCommentLines(comment.content).length - 1" /></template>
              <div v-if="comment.attachments && comment.attachments.length" class="ops-row-files"><button v-for="attachment in comment.attachments" :key="attachment.id || attachment.url + '-' + attachment.name" type="button" @click="openCommentAttachment(attachment)">{{ getAttachmentDisplayName(attachment) }}</button></div>
            </td></tr>
          </tbody></table></div>
        </section>
      </section>

      <aside class="ops-right-rail">
        <section class="ops-panel action-panel">
          <div class="ops-panel-head"><h2>快捷操作</h2></div>
          <div v-if="!isSubmitter && nextStatuses.length > 0" class="ops-status-editor"><label>更新状态</label><select v-model="newStatus" class="detail-select"><option value="">选择下一状态</option><option v-for="step in nextStatuses" :key="step" :value="step">{{ step }}</option></select><button type="button" class="detail-primary-btn" :disabled="!newStatus" @click="updateStatus">提交状态</button></div>
          <div v-else class="ops-muted-box">当前暂无可执行状态操作</div>
          <button type="button" class="ops-action-row" @click="triggerAttachmentUpload">添加评论附件</button>
        </section>
        <section class="ops-panel"><div class="ops-panel-head"><h2>信息面板</h2></div><dl class="ops-kv-list tight"><div><dt>平台</dt><dd>{{ requirement.platform || '-' }}</dd></div><div><dt>能力</dt><dd>{{ requirement.capability || '-' }}</dd></div><div><dt>实时限额</dt><dd>{{ requirement.realTimeLimit || '审批通过后设置' }}</dd></div><div><dt>创建时间</dt><dd>{{ formatDateTime(requirement.createdAt) }}</dd></div></dl></section>
        <section class="ops-panel comment-panel">
          <div class="ops-panel-head"><h2>留言区</h2></div>
          <textarea ref="chatInputRef" v-model="chatMessage" class="detail-composer-input" placeholder="请输入留言..." @keydown.ctrl.enter="sendMessage" @paste="handlePaste" />
          <div v-if="pendingCommentAttachments.length > 0" class="detail-pending-grid"><div v-for="(attachment, index) in pendingCommentAttachments" :key="attachment.id || index" class="detail-pending-item"><img v-if="attachment.localPreviewUrl && attachment.mimeType?.startsWith('image/')" :src="attachment.localPreviewUrl" alt="待发送附件" /><div v-else class="detail-pending-file">{{ getAttachmentDisplayName(attachment) }}</div><button type="button" class="detail-pending-remove" @click="removePendingAttachment(index)">×</button></div></div>
          <div class="ops-comment-tools"><button type="button" class="ops-icon-btn small" title="添加附件" :disabled="!canUploadCommentAttachments || commentUploading" @click="triggerAttachmentUpload">+</button><button type="button" class="detail-primary-btn send-btn" :disabled="(!chatMessage.trim() && pendingCommentAttachments.length === 0) || sendingComment" @click="sendMessage">{{ sendingComment ? '发送中' : '发送' }}</button></div>
          <input ref="fileInputRef" type="file" multiple class="detail-hidden-input" @change="handleFileSelect" />
        </section>
      </aside>
    </main>

    <div v-if="previewImageVisible" class="detail-preview-overlay" @wheel.prevent="handleImageZoom"><div class="detail-preview-controls"><button type="button" class="detail-preview-btn" title="放大" @click="zoomIn">+</button><button type="button" class="detail-preview-btn" title="缩小" @click="zoomOut">-</button><button type="button" class="detail-preview-btn" title="重置" @click="resetZoom">{{ Math.round(imageZoomLevel * 100) }}%</button><button type="button" class="detail-preview-close" title="关闭" @click="closeImagePreview">×</button></div><div class="detail-preview-shell" @click.stop><img :src="previewImageUrl" alt="图片预览" class="detail-preview-image" :style="{ transform: 'scale(' + imageZoomLevel + ')' }" /></div></div>
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

function getAttachmentDisplayName(attachment) {
  return normalizeFileName(attachment?.originalName || attachment?.name || '附件')
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
      link.download = getAttachmentDisplayName(attachment) || 'attachment'
      document.body.appendChild(link)
      link.click()
      link.remove()
      return
    }

    const blob = await fetchAttachmentBlob(attachment, 'download')
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = getAttachmentDisplayName(attachment) || 'attachment'
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
.detail-ops-page{--ops-blue:#1268d8;--ops-line:#d7e2ee;--ops-soft:#e8eef5;--ops-ink:#182f4b;--ops-muted:#6d7f93;--ops-green:#21a45b;--ops-red:#e64b55;min-height:calc(100vh - var(--header-height));padding:10px;color:var(--ops-ink);background:linear-gradient(180deg,rgba(231,241,252,.72),rgba(247,250,254,.96)),repeating-linear-gradient(0deg,transparent 0 23px,rgba(18,104,216,.035) 23px 24px);font-size:13px;line-height:1.45}.ops-topbar,.ops-summary-strip,.ops-panel{border:1px solid var(--ops-line);border-radius:6px;background:rgba(255,255,255,.96);box-shadow:0 8px 22px rgba(21,74,128,.08)}.ops-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px;padding:10px 12px}.ops-title-wrap,.ops-actions,.ops-comment-tools{display:flex;align-items:center;gap:8px}.ops-title-wrap{min-width:0}.ops-breadcrumb{color:var(--ops-muted);font-size:12px}.ops-title{margin:2px 0 0;color:#122943;font-size:18px;font-weight:800;letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ops-btn,.ops-icon-btn,.ops-action-row,.detail-primary-btn,.detail-secondary-btn,.detail-link-btn,.detail-preview-btn,.detail-preview-close{cursor:pointer;transition:border-color .16s ease,background .16s ease,color .16s ease}.ops-btn,.ops-icon-btn,.detail-primary-btn,.detail-secondary-btn{height:28px;border-radius:4px;font-size:12px;font-weight:700}.ops-btn{padding:0 10px;border:1px solid #cfddec}.ops-btn-ghost{background:#fff;color:#315575}.ops-btn-primary,.detail-primary-btn{border:1px solid var(--ops-blue);background:var(--ops-blue);color:#fff}.ops-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;border:1px solid #c8d8ea;background:#f7fbff;color:var(--ops-blue);font-size:20px;line-height:1}.ops-icon-btn.small{width:26px;height:26px;font-size:16px}.ops-summary-strip{display:grid;grid-template-columns:.8fr repeat(4,1fr) .9fr;gap:6px;margin-top:8px;padding:8px;background:linear-gradient(180deg,#145c9e,#0e477e)}.ops-summary-item{min-width:0;padding:8px 10px;border:1px solid rgba(255,255,255,.34);border-radius:5px;background:rgba(255,255,255,.95);color:#24425e}.ops-summary-item span{display:block;color:#75869a;font-size:11px}.ops-summary-item strong{display:block;margin-top:2px;color:#132f4c;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ops-workbench{display:grid;grid-template-columns:260px minmax(520px,1fr) 300px;gap:8px;align-items:start;margin-top:8px}.ops-left-rail,.ops-main-stack,.ops-right-rail{display:grid;gap:8px}.ops-panel{overflow:hidden}.ops-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:34px;padding:8px 10px;border-bottom:1px solid var(--ops-soft);background:linear-gradient(180deg,#fbfdff,#f3f7fc)}.ops-panel-head h2,.ops-description-block h2{margin:0;color:#143251;font-size:13px;font-weight:800}.ops-panel-head span{color:var(--ops-muted);font-size:12px}.ops-flow-list{padding:8px 10px 10px}.ops-flow-item{position:relative;display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;padding:4px 0 8px}.ops-flow-item:not(:last-child)::after{content:'';position:absolute;left:11px;top:28px;bottom:-4px;width:1px;background:#ccd9e8}.ops-flow-dot{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#b8c5d4;color:#fff;font-size:11px;font-weight:800}.ops-flow-item.completed .ops-flow-dot{background:var(--ops-green)}.ops-flow-item.current .ops-flow-dot{background:var(--ops-blue);box-shadow:0 0 0 3px rgba(18,104,216,.16)}.ops-flow-item strong,.ops-kv-list dd{display:block;color:#1f3d5b;font-weight:700}.ops-flow-item small{display:block;margin-top:1px;color:var(--ops-muted);font-size:11px;line-height:1.35}.ops-kv-list{display:grid;padding:6px 10px 10px}.ops-kv-list div{display:grid;grid-template-columns:82px minmax(0,1fr);gap:8px;padding:6px 0;border-bottom:1px solid #edf2f7}.ops-kv-list.tight div{grid-template-columns:72px minmax(0,1fr)}.ops-kv-list div:last-child{border-bottom:0}.ops-kv-list dt{color:var(--ops-muted);font-size:12px}.ops-kv-list dd{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;font-size:12px}.ops-tabs{display:flex;gap:4px;padding:8px 10px 0;border-bottom:1px solid var(--ops-soft)}.ops-tabs button{height:28px;padding:0 10px;border:0;border-bottom:2px solid transparent;background:transparent;color:#59718c;font-size:12px;font-weight:700;cursor:pointer}.ops-tabs button.active{color:var(--ops-blue);border-bottom-color:var(--ops-blue)}.ops-description-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(220px,.85fr);gap:8px;padding:10px}.ops-description-block{min-height:120px;padding:10px;border:1px solid var(--ops-soft);border-radius:5px;background:#fff}.ops-description-block.main{grid-row:span 2}.ops-description-block p{margin:8px 0 0;color:#334f6c;white-space:pre-wrap}.ops-description-block ol,.ops-description-block ul{margin:8px 0 0 16px;color:#334f6c}.ops-description-block li+li{margin-top:4px}.ops-attachment-panel{min-height:260px}.ops-attachment-panel :deep(*){border-radius:5px!important}.ops-attachment-panel :deep(.attachment-center),.ops-attachment-panel :deep(.attachment-panel),.ops-attachment-panel :deep(.attachment-card){box-shadow:none!important}.ops-table-wrap{max-height:260px;overflow:auto}.ops-table-wrap table{width:100%;border-collapse:collapse}.ops-table-wrap th,.ops-table-wrap td{padding:7px 9px;border-bottom:1px solid #edf2f7;text-align:left;vertical-align:top;font-size:12px}.ops-table-wrap th{position:sticky;top:0;z-index:1;background:#f6f9fd;color:#61758c;font-weight:800}.ops-table-wrap td{color:#2f4a67}.ops-empty-cell{text-align:center!important;color:var(--ops-muted)!important}.ops-row-files{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.ops-row-files button{border:1px solid #cfe0f3;border-radius:4px;background:#f6fbff;color:var(--ops-blue);font-size:11px;cursor:pointer}.ops-status-editor{display:grid;gap:7px;padding:10px}.ops-status-editor label{color:#5f738a;font-size:12px;font-weight:700}.detail-select,.detail-composer-input{width:100%;border:1px solid #cfddec;border-radius:4px;background:#fff;color:#1c3958;font-size:12px}.detail-select{height:30px;padding:0 8px}.detail-composer-input{min-height:122px;padding:8px;resize:vertical}.detail-select:focus,.detail-composer-input:focus{outline:none;border-color:var(--ops-blue);box-shadow:0 0 0 2px rgba(18,104,216,.12)}.detail-primary-btn{min-height:30px;padding:0 12px}.detail-primary-btn:disabled,.ops-icon-btn:disabled{cursor:not-allowed;opacity:.55}.ops-muted-box{margin:10px;padding:9px;border:1px dashed #cfddec;border-radius:5px;background:#f8fbff;color:var(--ops-muted);font-size:12px}.ops-action-row{display:block;width:calc(100% - 20px);height:31px;margin:0 10px 8px;border:1px solid #cfe0f3;border-radius:4px;background:#f8fbff;color:#20517f;text-align:left;padding:0 10px;font-size:12px;font-weight:700}.comment-panel{padding-bottom:10px}.comment-panel .detail-composer-input,.comment-panel .detail-pending-grid,.comment-panel .ops-comment-tools{margin:10px 10px 0;width:calc(100% - 20px)}.ops-comment-tools{justify-content:space-between}.send-btn{min-width:68px}.detail-pending-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px}.detail-pending-item{position:relative;min-height:66px;overflow:hidden;border:1px solid #dce8f5;border-radius:4px;background:#fff}.detail-pending-item img{display:block;width:100%;height:66px;object-fit:cover}.detail-pending-file{display:flex;align-items:center;justify-content:center;min-height:66px;padding:6px;text-align:center;color:#173552;font-size:11px;word-break:break-word}.detail-pending-remove{position:absolute;top:4px;right:4px;width:18px;height:18px;border:0;border-radius:50%;background:rgba(15,42,68,.74);color:#fff;cursor:pointer}.detail-hidden-input{display:none}.detail-preview-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);z-index:9999}.detail-preview-shell{max-width:90vw;max-height:90vh;display:flex;align-items:center;justify-content:center}.detail-preview-image{max-width:100%;max-height:88vh;object-fit:contain;border-radius:6px;transition:transform .2s ease}.detail-preview-controls{position:fixed;top:20px;right:20px;display:flex;gap:8px}.detail-preview-btn,.detail-preview-close{min-width:34px;height:34px;border:0;border-radius:4px;background:rgba(255,255,255,.18);color:#fff}.detail-preview-close{border-radius:50%;font-size:20px}.tone-pending{color:#b26b00}.tone-dev{color:var(--ops-blue)}.tone-testing{color:#007b74}.tone-released{color:var(--ops-green)}.tone-high{color:var(--ops-red)}.tone-medium{color:#b26b00}.tone-low,.tone-neutral{color:#59718c}@media (max-width:1320px){.ops-workbench{grid-template-columns:240px minmax(480px,1fr)}.ops-right-rail{grid-column:1/-1;grid-template-columns:repeat(3,minmax(0,1fr))}}@media (max-width:980px){.ops-summary-strip,.ops-workbench,.ops-right-rail,.ops-description-grid{grid-template-columns:1fr}.ops-topbar{align-items:flex-start;flex-direction:column}.ops-title{white-space:normal}}
.detail-ops-page {
  display: grid;
  gap: 8px;
}

.ops-topbar,
.ops-summary-strip,
.ops-workbench {
  width: 100%;
}

.ops-summary-strip {
  grid-template-columns: 260px repeat(4, minmax(0, 1fr)) 300px;
  gap: 8px;
  margin-top: 0;
}

.ops-workbench {
  grid-template-columns: 260px minmax(0, 1fr) 300px;
  gap: 8px;
  margin-top: 0;
}

.ops-left-rail,
.ops-main-stack,
.ops-right-rail {
  align-content: start;
  grid-template-rows: 260px 320px 260px;
}

.ops-left-rail .ops-panel:first-child,
.ops-main-stack .ops-panel:first-child,
.ops-right-rail .ops-panel:first-child {
  grid-row: 1;
  min-height: 0;
}

.ops-left-rail .ops-panel:nth-child(2) {
  grid-row: 2 / 4;
  min-height: 0;
}

.ops-main-stack .ops-attachment-panel,
.ops-right-rail .ops-panel:nth-child(2) {
  grid-row: 2;
  min-height: 0;
}

.ops-main-stack .ops-history-table,
.ops-right-rail .comment-panel {
  grid-row: 3;
  min-height: 0;
}

.ops-panel {
  display: flex;
  flex-direction: column;
}

.ops-flow-list,
.ops-description-grid,
.ops-kv-list,
.ops-table-wrap,
.comment-panel .detail-composer-input {
  min-height: 0;
}

.ops-flow-list,
.ops-table-wrap {
  overflow: auto;
}

.ops-description-grid {
  flex: 1;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  height: calc(100% - 37px);
}

.ops-description-block {
  min-height: 0;
  overflow: auto;
}

.ops-kv-list {
  overflow: hidden auto;
}

.ops-row-files {
  display: inline-flex;
  margin-top: 0;
  margin-left: 8px;
  vertical-align: baseline;
}

.ops-row-files button {
  max-width: 180px;
  height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ops-attachment-panel :deep(.attachment-card) {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  padding: 10px;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.ops-topbar {
  min-height: 52px;
}

.ops-actions {
  margin-left: auto;
}

.ops-tabs {
  align-items: flex-end;
  min-height: 37px;
}

.ops-tabs span {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-bottom: 2px solid transparent;
  color: #59718c;
  font-size: 12px;
  font-weight: 700;
}

.ops-tabs span.active {
  border-bottom-color: var(--ops-blue);
  color: var(--ops-blue);
}
</style>
