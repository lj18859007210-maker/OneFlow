<template>
  <div class="detail" v-if="requirement">
    <div class="tech-back-btn" @click="goBack">← 返回列表</div>
    <div class="tech-progress-wrap">
      <div class="tech-progress">
        <div
          v-for="(step, index) in displayStatusOrder"
          :key="step"
          class="tech-progress-step"
          :class="{
            active: step === effectiveStatus,
            completed: isStepCompleted(step, effectiveStatus)
          }"
        >
          <div class="tech-progress-dot">{{ isStepCompleted(step, effectiveStatus) ? '✓' : index + 1 }}</div>
          <span class="tech-progress-label">{{ step }}</span>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:20px;align-items:center" v-if="!isSubmitter && nextStatuses.length > 0">
        <select v-model="newStatus" class="tech-filter-select">
          <option value="">更新状态</option>
          <option v-for="step in nextStatuses" :key="step" :value="step">{{ step }}</option>
        </select>
        <button @click="updateStatus" class="tech-btn tech-btn-primary tech-btn-sm" :disabled="!newStatus">更新</button>
      </div>
    </div>

    <div class="tech-detail-grid">
      <div class="tech-detail-card">
        <div class="tech-detail-title">基本信息</div>
        <div class="tech-info-row">
          <span class="tech-info-label">需求标题</span>
          <span class="tech-info-value">{{ requirement.title }}</span>
        </div>
        <div class="tech-info-row">
          <span class="tech-info-label">提交人</span>
          <span class="tech-info-value">{{ requirement.submitter }}</span>
        </div>
        <div class="tech-info-row">
          <span class="tech-info-label">开发人员</span>
          <span class="tech-info-value">{{ requirement.developer }}</span>
        </div>
        <div class="tech-info-row" v-if="requirement.platform">
          <span class="tech-info-label">对应平台</span>
          <span class="tech-info-value">{{ requirement.platform }}</span>
        </div>
        <div class="tech-info-row" v-if="requirement.capability">
          <span class="tech-info-label">能力</span>
          <span class="tech-info-value">{{ requirement.capability }}</span>
        </div>
        <div class="tech-info-row">
          <span class="tech-info-label">期望日期</span>
          <span class="tech-info-value" v-if="requirement.expectedDate">{{ formatDate(requirement.expectedDate) }}</span>
          <span class="tech-info-value" style="color:var(--tech-text-secondary)" v-else>未设置</span>
        </div>
        <div class="tech-info-row">
          <span class="tech-info-label">实际时限</span>
          <span class="tech-info-value" v-if="requirement.actualDate">{{ formatDate(requirement.actualDate) }}</span>
          <span class="tech-info-value" style="color:var(--tech-text-secondary)" v-else>审批同意后设置</span>
        </div>
        <div class="tech-info-row" v-if="requirement.avgDevTime">
          <span class="tech-info-label">开发前平均用时/次</span>
          <span class="tech-info-value">{{ requirement.avgDevTime }}</span>
        </div>
        <div class="tech-info-row" v-if="requirement.avgMonthlyCalls">
          <span class="tech-info-label">平均每月调用量/次</span>
          <span class="tech-info-value">{{ requirement.avgMonthlyCalls }}</span>
        </div>
        <div class="tech-info-row">
          <span class="tech-info-label">优先级</span>
          <span class="tech-info-value"><span class="tech-tag" :class="getPriorityClass(requirement.priority)">{{ requirement.priority }}</span></span>
        </div>
        <div class="tech-info-row">
          <span class="tech-info-label">当前状态</span>
          <span class="tech-info-value"><span class="tech-tag" :class="getStatusClass(requirement.status)">{{ requirement.status }}</span></span>
        </div>
        <div class="tech-info-row">
          <span class="tech-info-label">创建时间</span>
          <span class="tech-info-value">{{ formatDate(requirement.createdAt) }}</span>
        </div>
      </div>

      <div class="tech-detail-card history-card">
        <div class="tech-detail-title">历史信息</div>
        <div class="tech-history-list">
          <div v-if="comments.length === 0" style="color:var(--tech-text-secondary);font-size:13px;text-align:center;padding:20px 0">
            暂无历史记录
          </div>
          <div 
            v-for="(comment, index) in comments" 
            :key="comment.id" 
            class="tech-history-item"
            :class="{ 'tech-history-right': shouldShowRight(comment, index) }"
          >
            <div class="tech-history-bubble">
              <div class="tech-history-content">
                <template v-for="(line, lineIndex) in getCommentLines(comment.content)" :key="lineIndex">
                  <img 
                    v-if="isImageUrl(line)" 
                    :src="line" 
                    class="tech-history-image"
                    @click="previewImage(line)"
                  />
                  <span v-else-if="line.trim()">{{ line }}</span>
                  <br v-if="lineIndex < getCommentLines(comment.content).length - 1" />
                </template>
              </div>
              <div class="tech-history-meta">
                <span class="tech-history-name">{{ comment.userName }}</span>
                <span class="tech-history-divider">·</span>
                <span class="tech-history-date">{{ formatDateTime(comment.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="tech-chat-box">
          <div class="tech-chat-input-wrapper">
            <button class="tech-chat-add-btn" @click="triggerImageUpload" title="添加图片">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <input 
              ref="chatInputRef"
              v-model="chatMessage" 
              @keyup.enter="sendMessage"
              @paste="handlePaste"
              class="tech-chat-input" 
              placeholder="输入留言..." 
            />
            <button @click="sendMessage" class="tech-btn tech-btn-primary tech-btn-sm tech-chat-send-btn" :disabled="!chatMessage.trim() && pendingImages.length === 0">
              发送
            </button>
          </div>
          <div v-if="pendingImages.length > 0" class="tech-chat-image-preview">
            <div v-for="(img, index) in pendingImages" :key="index" class="tech-chat-image-item">
              <img :src="img.url" alt="预览图片" />
              <button class="tech-chat-image-remove" @click="removeImage(index)">×</button>
            </div>
          </div>
          <input 
            ref="fileInputRef"
            type="file" 
            accept="image/*" 
            multiple 
            style="display: none"
            @change="handleFileSelect"
          />
        </div>

        <div v-if="previewImageVisible" class="tech-image-preview-overlay" @wheel.prevent="handleImageZoom">
          <div class="tech-image-preview-controls">
            <button class="tech-image-preview-zoom-btn" @click="zoomIn" title="放大">+</button>
            <button class="tech-image-preview-zoom-btn" @click="zoomOut" title="缩小">-</button>
            <button class="tech-image-preview-zoom-btn" @click="resetZoom" title="重置">{{ Math.round(imageZoomLevel * 100) }}%</button>
            <button class="tech-image-preview-close" @click="closeImagePreview">×</button>
          </div>
          <div class="tech-image-preview-container" @click.stop>
            <img 
              :src="previewImageUrl" 
              alt="图片预览" 
              class="tech-image-preview-img"
              :style="{ transform: `scale(${imageZoomLevel})` }"
            />
          </div>
        </div>
      </div>

      <div class="tech-detail-card full-width">
        <div class="tech-detail-title">需求描述</div>
        <div style="font-size:14px;color:var(--tech-text-secondary);line-height:1.8">{{ requirement.description }}</div>
      </div>

      <div class="tech-detail-card full-width">
        <div class="tech-detail-title">邮件通知</div>
        <div class="tech-email-form">
          <div class="tech-form-group">
            <label class="tech-form-label">收件人</label>
            <input v-model="emailForm.to" class="tech-input" placeholder="收件人邮箱" />
          </div>
          <div class="tech-form-group">
            <label class="tech-form-label">抄送 (逗号分隔)</label>
            <input v-model="emailForm.cc" class="tech-input" placeholder="抄送邮箱" />
          </div>
          <div class="tech-form-group full-width">
            <label class="tech-form-label">邮件内容</label>
            <textarea v-model="emailForm.body" class="tech-textarea" placeholder="邮件正文内容"></textarea>
          </div>
        </div>
        <div style="margin-top:16px;display:flex;gap:12px">
          <button @click="sendEmail" class="tech-btn tech-btn-primary tech-btn-sm">发送邮件</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { requirementApi, emailApi, commentApi, workflowApi } from '../api'

const route = useRoute()
const router = useRouter()
const currentUser = inject('currentUser', ref({ name: '未登录', role: 'user' }))
const requirement = ref(null)
const newStatus = ref('')
const emailForm = ref({ to: '', cc: '', body: '' })
const comments = ref([])
const chatMessage = ref('')
const pendingImages = ref([])
const chatInputRef = ref(null)
const fileInputRef = ref(null)
const previewImageVisible = ref(false)
const previewImageUrl = ref('')
const imageZoomLevel = ref(1)
const workflowStatuses = ref([])
const workflowTransitions = ref([])

const isSubmitter = computed(() => {
  if (!requirement.value || !currentUser.value) return false
  return requirement.value.submitter === currentUser.value.name
})

const effectiveStatus = computed(() => {
  if (!requirement.value) return ''
  // 如果审批还没通过，强制显示为待审批阶段
  if (requirement.value.approvalStatus !== 'approved') {
    return '待审批'
  }
  return requirement.value.status
})

const displayStatusOrder = computed(() => {
  const ordered = workflowStatuses.value.map(item => item.statusCode)
  if (!effectiveStatus.value) return ordered
  if (ordered.includes(effectiveStatus.value)) return ordered
  return [...ordered, effectiveStatus.value]
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

const isStepCompleted = (step, currentStatus) => {
  return displayStatusOrder.value.indexOf(step) < displayStatusOrder.value.indexOf(currentStatus)
}

const getStatusClass = (status) => {
  const map = {
    '待审批': 'tech-tag-pending', '待评审': 'tech-tag-pending', '待开发': 'tech-tag-dev', '开发中': 'tech-tag-dev',
    '测试中': 'tech-tag-testing', '已发布': 'tech-tag-released'
  }
  return map[status] || ''
}

const getPriorityClass = (priority) => {
  const map = { '高': 'tech-tag-high', '中': 'tech-tag-medium', '低': 'tech-tag-low' }
  return map[priority] || ''
}

const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

const formatDateTime = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}年${month}月${day}日 ${hour}:${minute}`
}

const getCommentTypeLabel = (type) => {
  const map = {
    'approval': '审批意见',
    'review': '评审结果',
    'dev_message': '开发人员',
    'user_message': '用户'
  }
  return map[type] || '其他'
}

const shouldShowRight = (comment) => {
  const firstUser = comments.value[0]?.userName
  return comment.userName !== firstUser
}

const getCommentLines = (content) => {
  const cleaned = content.replace(/^(审批意见|评审结果|开发人员|用户)：/, '')
  return cleaned.split('\n').filter(line => line.trim())
}

const isImageUrl = (text) => {
  return /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(text) || 
         /^data:image\/(png|jpeg|gif|webp|bmp);base64,/.test(text)
}

const previewImage = (url) => {
  previewImageUrl.value = url
  previewImageVisible.value = true
  imageZoomLevel.value = 1
}

const closeImagePreview = () => {
  previewImageVisible.value = false
  previewImageUrl.value = ''
  imageZoomLevel.value = 1
}

const zoomIn = () => {
  imageZoomLevel.value = Math.min(imageZoomLevel.value + 0.2, 3)
}

const zoomOut = () => {
  imageZoomLevel.value = Math.max(imageZoomLevel.value - 0.2, 0.2)
}

const resetZoom = () => {
  imageZoomLevel.value = 1
}

const handleImageZoom = (event) => {
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  imageZoomLevel.value = Math.max(0.2, Math.min(3, imageZoomLevel.value + delta))
}

const goBack = () => {
  router.back()
}

const loadWorkflow = async () => {
  const [statusRes, transitionRes] = await Promise.all([
    workflowApi.getStatuses(),
    workflowApi.getTransitions()
  ])

  workflowStatuses.value = (statusRes.data.data || [])
    .filter(item => item.enabled)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))

  workflowTransitions.value = (transitionRes.data.data || []).filter(item => item.enabled)
}

const updateStatus = async () => {
  try {
    await requirementApi.updateStatus(requirement.value.id, newStatus.value)
    requirement.value.status = newStatus.value
    newStatus.value = ''
    showToast('状态更新成功')
    await loadComments()
  } catch (error) {
    const msg = error.response?.data?.message || '更新失败'
    showToast(msg)
  }
}

const loadComments = async () => {
  try {
    const res = await commentApi.getList(requirement.value.id)
    comments.value = res.data.data
  } catch (error) {
    console.error('获取评论列表失败:', error)
  }
}

const sendMessage = async () => {
  if (!chatMessage.value.trim() && pendingImages.value.length === 0) {
    showToast('请输入留言内容')
    return
  }
  try {
    let content = chatMessage.value
    if (pendingImages.value.length > 0) {
      const imageUrls = pendingImages.value.map(img => img.url).join('\n')
      content = content ? `${content}\n${imageUrls}` : imageUrls
    }
    
    await commentApi.create({
      requirementId: requirement.value.id,
      type: 'user_message',
      content
    })
    chatMessage.value = ''
    pendingImages.value = []
    showToast('留言成功')
    await loadComments()
  } catch (error) {
    showToast('留言失败')
  }
}

const triggerImageUpload = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (event) => {
  const files = event.target.files
  if (!files) return
  
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      pendingImages.value.push({
        file,
        url: e.target.result
      })
    }
    reader.readAsDataURL(file)
  })
  
  event.target.value = ''
}

const handlePaste = (event) => {
  const items = event.clipboardData?.items
  if (!items) return
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (!file) continue
      
      const reader = new FileReader()
      reader.onload = (e) => {
        pendingImages.value.push({
          file,
          url: e.target.result
        })
      }
      reader.readAsDataURL(file)
    }
  }
}

const removeImage = (index) => {
  pendingImages.value.splice(index, 1)
}

const sendEmail = async () => {
  try {
    const cc = emailForm.value.cc ? emailForm.value.cc.split(',').map(e => e.trim()).filter(e => e) : []
    await emailApi.send({
      to: emailForm.value.to,
      cc,
      subject: `需求通知: ${requirement.value.title}`,
      body: emailForm.value.body
    })
    showToast('邮件发送成功（模拟）')
    emailForm.value = { to: '', cc: '', body: '' }
  } catch (error) {
    showToast('邮件发送失败')
  }
}

const showToast = (message) => {
  const toast = document.createElement('div')
  toast.className = 'tech-toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2200)
}

onMounted(async () => {
  try {
    await loadWorkflow()
    const res = await requirementApi.getById(route.params.id)
    requirement.value = res.data.data
    await loadComments()
  } catch (error) {
    console.error('获取需求详情失败:', error)
  }
})
</script>

<style scoped>
.tech-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--tech-blue);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  width: fit-content;
}

.tech-back-btn:hover {
  background: rgba(74, 144, 226, 0.1);
}

.history-card {
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.tech-history-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 0;
  padding: 10px 0;
  max-height: 400px;
  min-height: 200px;
}

.tech-history-item {
  display: flex;
  margin-bottom: 16px;
}

.tech-history-item.tech-history-right {
  justify-content: flex-end;
}

.tech-history-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  background: #f0f2f5;
  position: relative;
}

.tech-history-content {
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  color: #303133;
}

.tech-history-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  cursor: pointer;
  margin: 4px 0;
  display: block;
}

.tech-history-image:hover {
  opacity: 0.9;
}

.tech-history-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.tech-history-name {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
}

.tech-history-divider {
  font-size: 12px;
  color: #c0c4cc;
}

.tech-history-date {
  font-size: 11px;
  color: #909399;
}

.tech-chat-box {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.tech-chat-input-wrapper {
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
}

.tech-chat-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #f5f7fa;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;
}

.tech-chat-add-btn:hover {
  background: #e8eaed;
  color: #4a90e2;
}

.tech-chat-add-btn svg {
  width: 20px;
  height: 20px;
}

.tech-chat-input {
  flex: 1;
  padding: 10px 14px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  color: #303133;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.tech-chat-input:focus {
  border-color: #4a90e2;
  background: #fff;
}

.tech-chat-send-btn {
  flex-shrink: 0;
  padding: 10px 24px;
}

.tech-chat-image-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.tech-chat-image-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

.tech-chat-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tech-chat-image-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
}

.tech-chat-image-remove:hover {
  background: rgba(0, 0, 0, 0.8);
}

.tech-image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
}

.tech-image-preview-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tech-image-preview-img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
}

.tech-image-preview-controls {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  align-items: center;
  z-index: 10000;
}

.tech-image-preview-zoom-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.tech-image-preview-zoom-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.tech-image-preview-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  line-height: 1;
  transition: all 0.2s;
}

.tech-image-preview-close:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
