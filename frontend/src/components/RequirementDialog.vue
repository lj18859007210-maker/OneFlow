<template>
  <div class="tech-modal-overlay">
    <div class="tech-modal" @click.stop>
      <div class="tech-modal-header">
        <h2 class="tech-modal-title">{{ title }}</h2>
        <button class="tech-modal-close" @click="close">×</button>
      </div>
      <div class="tech-modal-body">
        <!-- 查看模式 -->
        <div v-if="mode === 'view'" class="view-mode">
          <div class="tech-detail-card">
            <div class="tech-detail-title">基本信息</div>
            <div class="view-info-grid">
              <div class="view-info-item">
                <label>需求标题</label>
                <span>{{ data.title }}</span>
              </div>
              <div class="view-info-item">
                <label>提交人</label>
                <span>{{ data.submitter }}</span>
              </div>
              <div class="view-info-item">
                <label>开发人员</label>
                <span>{{ data.developer || '-' }}</span>
              </div>
              <div class="view-info-item">
                <label>对应平台</label>
                <span>{{ data.platform || '-' }}</span>
              </div>
              <div class="view-info-item">
                <label>能力</label>
                <span>{{ data.capability || '-' }}</span>
              </div>
              <div class="view-info-item">
                <label>期望日期</label>
                <span>{{ data.expectedDate ? formatDate(data.expectedDate) : '未设置' }}</span>
              </div>
              <div class="view-info-item">
                <label>实际时限</label>
                <span>{{ data.actualDate ? formatDate(data.actualDate) : '审批同意后设置' }}</span>
              </div>
              <div class="view-info-item">
                <label>开发前平均用时/次</label>
                <span>{{ data.avgDevTime || '-' }}</span>
              </div>
              <div class="view-info-item">
                <label>平均每月调用量/次</label>
                <span>{{ data.avgMonthlyCalls || '-' }}</span>
              </div>
              <div class="view-info-item">
                <label>发送人邮箱</label>
                <span>{{ data.senderEmail || '-' }}</span>
              </div>
              <div class="view-info-item">
                <label>抄送邮箱</label>
                <span>{{ Array.isArray(data.ccEmails) ? data.ccEmails.join(', ') : (data.ccEmails || '-') }}</span>
              </div>
              <div class="view-info-item full-width">
                <label>优先级</label>
                <span><span class="tech-tag" :class="getPriorityClass(data.priority)">{{ data.priority || '-' }}</span></span>
              </div>
              <div class="view-info-item full-width">
                <label>状态</label>
                <span><span class="tech-tag" :class="getStatusClass(data.status)">{{ data.status }}</span></span>
              </div>
            </div>
          </div>
          <div class="tech-detail-card" v-if="data.description">
            <div class="tech-detail-title">需求描述</div>
            <div class="view-description">{{ data.description }}</div>
          </div>
          <div class="tech-detail-card" v-if="data.noteImages && data.noteImages.length">
            <div class="tech-detail-title">备注图片</div>
            <div class="view-images">
              <img v-for="(img, idx) in data.noteImages" :key="idx" :src="img.url" :alt="img.name" />
            </div>
          </div>
        </div>

        <!-- 编辑模式 -->
        <div v-else-if="mode === 'edit'" class="edit-mode">
          <div class="tech-detail-card">
            <div class="tech-detail-title">基本信息</div>
            <form class="tech-form">
              <div class="tech-form-row">
                <div class="tech-form-group">
                  <label class="tech-form-label">需求标题<span class="required">*</span></label>
                  <input v-model="editForm.title" class="tech-input" placeholder="请输入需求标题" required />
                </div>
                <div class="tech-form-group">
                  <label class="tech-form-label">提交人</label>
                  <input :value="data.submitter" class="tech-input" disabled />
                </div>
              </div>
              <div class="tech-form-row">
                <div class="tech-form-group">
                  <label class="tech-form-label">选择开发人员<span class="required">*</span></label>
                  <select v-model="editForm.developer" class="tech-select" required>
                    <option value="">请选择开发人员</option>
                    <option v-for="d in developers" :key="d.id" :value="d.name">{{ d.name }} · {{ d.department }}</option>
                  </select>
                </div>
                <div class="tech-form-group">
                  <label class="tech-form-label">对应平台</label>
                  <select v-model="editForm.platform" class="tech-select">
                    <option value="">请选择平台</option>
                    <option value="CRM 系统">CRM 系统</option>
                    <option value="BOSS 系统">BOSS 系统</option>
                    <option value="OA 办公系统">OA 办公系统</option>
                    <option value="网管支撑平台">网管支撑平台</option>
                    <option value="大数据分析平台">大数据分析平台</option>
                    <option value="掌上移动 APP">掌上移动 APP</option>
                  </select>
                </div>
              </div>
              <div class="tech-form-row">
                <div class="tech-form-group">
                  <label class="tech-form-label">能力</label>
                  <select v-model="editForm.capability" class="tech-select">
                    <option value="">请选择</option>
                    <option value="内部支撑">内部支撑</option>
                    <option value="一线支撑">一线支撑</option>
                    <option value="集团迎检">集团迎检</option>
                  </select>
                </div>
                <div class="tech-form-group">
                  <label class="tech-form-label">期望日期</label>
                  <input v-model="editForm.expectedDate" type="date" class="tech-input" />
                </div>
              </div>
              <div class="tech-form-row">
                <div class="tech-form-group">
                  <label class="tech-form-label">开发前平均用时/次</label>
                  <input v-model="editForm.avgDevTime" class="tech-input" placeholder="例：3 天" />
                </div>
                <div class="tech-form-group">
                  <label class="tech-form-label">平均每月调用量/次</label>
                  <input v-model="editForm.avgMonthlyCalls" class="tech-input" type="number" placeholder="例：500" />
                </div>
              </div>
              <div class="tech-form-row">
                <div class="tech-form-group">
                  <label class="tech-form-label">发送人邮箱</label>
                  <input v-model="editForm.senderEmail" class="tech-input" placeholder="例：zhangsan@cmcc.cn" />
                </div>
                <div class="tech-form-group">
                  <label class="tech-form-label">抄送邮箱 (逗号分隔)</label>
                  <input v-model="editForm.ccEmails" class="tech-input" placeholder="例：manager@cmcc.cn, team@cmcc.cn" />
                </div>
              </div>
            </form>
          </div>

          <!-- AI 引导步骤 -->
          <div class="tech-detail-card" style="margin-top: 10px">
            <div class="tech-detail-title">
              AI 需求引导（{{ completedSteps }}/{{ steps.length }} 步完成）
              <button class="reset-btn" @click="resetAll">重置所有内容</button>
            </div>
            <div class="gate-progress">
              <div v-for="(s, i) in steps" :key="i" class="gate-step-bar" :class="{ active: s.state === 'active', done: s.state === 'done' }">
                <div class="gate-step-fill"></div>
              </div>
            </div>
            <div class="gate-cards">
              <div v-for="(s, i) in steps" :key="i" class="gate-card" :class="[s.state, { open: openStep === i }]">
                <div class="gate-card-head" @click="toggleStep(i)">
                  <span class="gate-card-num">{{ s.state === "done" ? "✓" : i + 1 }}</span>
                  <span class="gate-card-label">{{ s.label }}</span>
                  <span v-if="s.state === 'locked'" class="gate-card-lock">🔒</span>
                  <button v-if="s.state !== 'locked' && s.answer.trim()" class="gate-skip-btn" :class="{ disabled: gateLoading || s.state === 'done' }" :disabled="gateLoading || s.state === 'done'" @click.stop="skipStep(i)" title="跳过 AI 检查，直接下一步">跳过 AI →</button>
                </div>
                <div v-if="s.state === 'done' && openStep !== i" class="gate-card-done" @click="toggleStep(i)">
                  <div class="gate-card-done-inner">
                    <p>{{ s.answer }}</p>
                    <div v-if="s.images && s.images.length" class="gate-card-done-imgs">
                      <img v-for="(img, idx) in s.images" :key="idx" :src="img.url" :alt="img.name" />
                    </div>
                  </div>
                  <span class="gate-card-edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    修改
                  </span>
                </div>
                <div v-if="openStep === i && s.state !== 'locked'" class="gate-card-body">
                  <textarea v-model="s.answer" class="tech-textarea" :placeholder="s.placeholder" rows="3" @keydown.enter.ctrl="checkStep(i)"></textarea>
                  <div v-if="s.type === 'note'" class="note-images">
                    <div v-for="(img, idx) in s.images" :key="idx" class="note-img">
                      <img :src="img.url" :alt="img.name" />
                      <button class="note-img-del" @click="removeImage(i, idx)">×</button>
                    </div>
                    <label class="note-img-upload" v-if="s.images.length < 5">
                      <input type="file" accept="image/*" multiple hidden @change="uploadImages(i, $event)" />
                      <span>+</span>
                    </label>
                  </div>
                  <div v-if="s.nudge" class="gate-nudge">
                    <div class="gate-nudge-ai">AI</div>
                    <div class="gate-nudge-text">{{ s.nudge }}</div>
                  </div>
                  <div class="gate-card-actions">
                    <span class="gate-hint">Ctrl+Enter 提交</span>
                    <button v-if="s.type !== 'note'" class="tech-btn tech-btn-primary tech-btn-sm gate-next-btn" @click="checkStep(i)" :disabled="gateLoading || !s.answer.trim()">
                      <span v-if="gateLoading" class="gate-spinner"></span>
                      {{ gateLoading ? "AI 思考中..." : "下一步 →" }}
                    </button>
                    <button v-else class="tech-btn tech-btn-primary tech-btn-sm gate-next-btn" @click="completeNote(i)">完成 ✓</button>
                  </div>
                </div>
                <div v-if="s.state === 'active' && openStep !== i" class="gate-card-pending" @click="toggleStep(i)">
                  <p>点击填写 →</p>
                </div>
                <div v-if="s.state === 'locked'" class="gate-card-locked">
                  <p>请先完成上一关</p>
                </div>
              </div>
            </div>
            <div v-if="completedSteps === steps.length" class="gate-final">
              <div class="tech-form-group">
                <label class="tech-form-label">需求描述预览（AI 正在结构化整理...）</label>
                <textarea v-model="editForm.description" class="tech-textarea" readonly rows="10"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="tech-btn" @click="close">取消</button>
            <button class="tech-btn tech-btn-primary" @click="saveEdit" :disabled="saving">
              {{ saving ? "保存中..." : "保存修改" }}
            </button>
            <button v-if="completedSteps === steps.length" class="tech-btn tech-btn-success" @click="submitRequirement" :disabled="saving">
              {{ saving ? "提交中..." : "提交需求" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { requirementApi, developerApi } from '../api'

const props = defineProps({
  mode: { type: String, default: 'view' },
  data: { type: Object, required: true },
  title: { type: String, default: '需求详情' }
})

const emit = defineEmits(['close', 'success'])

const developers = ref([])
const gateLoading = ref(false)
const saving = ref(false)
const openStep = ref(-1)

const editForm = ref({
  title: '',
  developer: '',
  platform: '',
  capability: '',
  expectedDate: '',
  avgDevTime: '',
  avgMonthlyCalls: '',
  senderEmail: '',
  ccEmails: '',
  description: ''
})

const steps = ref([])
const defaultSteps = [
  { label: "这个需求要解决什么问题？", placeholder: "请具体描述业务痛点，比如「客户投诉工单分派慢，客服需要手动从 3 个系统里查数据，每次耗时 5 分钟」", answer: "", nudge: "", state: "active" },
  { label: "目标用户是谁？使用场景是什么？", placeholder: "哪些部门、角色在什么情况下会使用？比如「一线客服在处理投诉时需要、分公司运营每月做报表时需要」", answer: "", nudge: "", state: "locked" },
  { label: "期望实现哪些核心功能？", placeholder: "列出 1-3 个核心功能点，具体到操作层面，比如「支持按投诉类型自动分派给对应部门，超时 1 小时自动升级至主管」", answer: "", nudge: "", state: "locked" },
  { label: "目前的替代方案是什么？", placeholder: "现在没有这个功能时，你们是怎么凑合解决的？比如「只能先把数据导出 Excel 手工算，每天浪费 2 小时」或者「目前没有替代方案，只能等」", answer: "", nudge: "", state: "locked" },
  { label: "备注", placeholder: "如有补充说明、参考截图请在此填写", answer: "", nudge: "", state: "locked", type: "note", images: [] }
]

const completedSteps = computed(() => steps.value.filter(s => s.state === 'done').length)

function initEditForm() {
  const d = props.data
  editForm.value = {
    title: d.title || '',
    developer: d.developer || '',
    platform: d.platform || '',
    capability: d.capability || '',
    expectedDate: d.expectedDate || '',
    avgDevTime: d.avgDevTime || '',
    avgMonthlyCalls: d.avgMonthlyCalls || '',
    senderEmail: d.senderEmail || '',
    ccEmails: Array.isArray(d.ccEmails) ? d.ccEmails.join(', ') : (d.ccEmails || ''),
    description: d.description || ''
  }
  if (d.steps && d.steps.length) {
    steps.value = d.steps.map(s => ({
      label: s.label,
      placeholder: defaultSteps.find(ds => ds.label === s.label)?.placeholder || '',
      answer: s.answer || '',
      nudge: s.nudge || '',
      state: s.state || 'locked',
      images: s.images || [],
      type: s.type
    }))
  } else {
    steps.value = JSON.parse(JSON.stringify(defaultSteps))
    steps.value[0].state = 'active'
  }
  const firstActive = steps.value.findIndex(s => s.state === 'active')
  openStep.value = firstActive !== -1 ? firstActive : -1
}

function toggleStep(i) {
  if (steps.value[i].state === 'locked') return
  openStep.value = openStep.value === i ? -1 : i
}

function skipStep(i) {
  const step = steps.value[i]
  if (!step.answer.trim()) return
  step.state = 'done'
  step.nudge = ''
  openStep.value = -1
  if (i + 1 < steps.value.length && steps.value[i + 1].state === 'locked') {
    steps.value[i + 1].state = 'active'
    openStep.value = i + 1
  }
  if (completedSteps.value >= steps.value.length) finalSummary()
}

function resetAll() {
  if (!confirm('确定要重置所有内容吗？')) return
  editForm.value.description = ''
  steps.value = JSON.parse(JSON.stringify(defaultSteps))
  steps.value[0].state = 'active'
  openStep.value = 0
  showToast('已重置所有内容')
}

async function completeNote(i) {
  const step = steps.value[i]
  step.state = 'done'
  step.nudge = ''
  openStep.value = -1
  if (i + 1 < steps.value.length && steps.value[i + 1].state === 'locked') {
    steps.value[i + 1].state = 'active'
    openStep.value = i + 1
  }
  if (completedSteps.value >= steps.value.length) await finalSummary()
}

async function checkStep(i) {
  const step = steps.value[i]
  if (!step.answer.trim()) return
  if (step.state === 'done') {
    step.state = 'done'
    step.nudge = ''
    openStep.value = -1
    if (i + 1 < steps.value.length && steps.value[i + 1].state === 'locked') {
      steps.value[i + 1].state = 'active'
      openStep.value = i + 1
    }
    if (completedSteps.value >= steps.value.length) await finalSummary()
    return
  }
  gateLoading.value = true
  step.nudge = ''
  try {
    const qualityCheckPrompt = `你是一个耐心、专业的产品经理。用户正在填写需求表单的第${i + 1}个环节「${step.label}」，ta 的回答如下：

"${step.answer}"

请判断这个回答的质量：
- 如果回答太简短（少于 15 个字）、太情绪化（如"太卡了""不好看""很难用"）、没有具体场景或细节 → 返回 JSON: {"pass":false,"nudge":"你给出的启发式追问，要结合用户上下文，语气友好"}
- 如果回答够具体、包含实质内容（场景/痛点/数据） → 返回 JSON: {"pass":true,"nudge":""}

只返回 JSON，不要其他内容。`
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: qualityCheckPrompt })
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message)
    const result = JSON.parse(json.data)
    if (result.pass) {
      step.state = 'done'
      step.nudge = ''
      openStep.value = -1
      if (i + 1 < steps.value.length && steps.value[i + 1].state === 'locked') {
        steps.value[i + 1].state = 'active'
        openStep.value = i + 1
      }
      if (completedSteps.value >= steps.value.length) await finalSummary()
    } else {
      step.nudge = result.nudge
    }
  } catch (e) {
    step.state = 'done'
    step.nudge = ''
    openStep.value = -1
    if (i + 1 < steps.value.length && steps.value[i + 1].state === 'locked') {
      steps.value[i + 1].state = 'active'
      openStep.value = i + 1
    }
    if (completedSteps.value >= steps.value.length) await finalSummary()
  } finally {
    gateLoading.value = false
  }
}

async function uploadImages(si, e) {
  const files = e.target.files
  if (!files.length) return
  const step = steps.value[si]
  const formData = new FormData()
  for (const f of files) formData.append('files', f)
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const json = await res.json()
    if (!json.success) throw new Error(json.message)
    json.data.forEach((url, idx) => {
      step.images.push({ name: files[idx].name, url: url })
    })
  } catch (err) {
    showToast('图片上传失败：' + err.message)
  }
  e.target.value = ''
}

function removeImage(si, idx) {
  steps.value[si].images.splice(idx, 1)
}

async function finalSummary() {
  try {
    const qa = steps.value.map((s, i) => `Q${i + 1}: ${s.label}\nA: ${s.answer}`).join('\n\n')
    const prompt = `你是中国移动需求分析专家。请将以下需求问答整理成一份标准需求文档，格式如下：

【需求背景】
提取业务痛点

【目标人群】
明确用户角色和场景

【核心诉求】
列出具体功能需求

【当前现状】
（如果用户提到了现状）总结当前问题和期望

需求问答：
${qa}

请直接输出需求文档，不要多余说明。`
    const noteStep = steps.value.find(s => s.type === 'note')
    const noteText = noteStep && noteStep.answer ? `\n\n【补充备注】\n${noteStep.answer}` : ''
    const imgInfo = noteStep && noteStep.images && noteStep.images.length ? `\n\n【附带图片】\n${noteStep.images.map(img => img.url).join('\n')}` : ''
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt + noteText + imgInfo })
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message)
    editForm.value.description = json.data
  } catch (e) {
    editForm.value.description = steps.value.map(s => s.answer).join('\n\n')
  }
}

async function saveEdit() {
  if (!editForm.value.title || !editForm.value.developer) {
    showToast('请填写需求标题和选择开发人员')
    return
  }
  saving.value = true
  try {
    const cc = editForm.value.ccEmails
      ? editForm.value.ccEmails.split(',').map(e => e.trim()).filter(e => e)
      : []
    const noteStep = steps.value.find(s => s.type === 'note')
    const noteImages = (noteStep && noteStep.images) || []
    await requirementApi.update(props.data.id, {
      ...editForm.value,
      ccEmails: cc,
      steps: steps.value.map(s => ({
        label: s.label,
        answer: s.answer,
        state: s.state,
        nudge: s.nudge,
        images: s.images || [],
        type: s.type
      })),
      noteImages
    })
    showToast('保存成功')
    emit('success')
  } catch (e) {
    showToast('保存失败：' + (e.response?.data?.message || e.message))
  } finally {
    saving.value = false
  }
}

async function submitRequirement() {
  if (!editForm.value.title || !editForm.value.developer) {
    showToast('请填写需求标题和选择开发人员')
    return
  }
  saving.value = true
  try {
    const cc = editForm.value.ccEmails
      ? editForm.value.ccEmails.split(',').map(e => e.trim()).filter(e => e)
      : []
    const noteStep = steps.value.find(s => s.type === 'note')
    const noteImages = (noteStep && noteStep.images) || []
    await requirementApi.update(props.data.id, {
      ...editForm.value,
      status: '待审批',
      ccEmails: cc,
      steps: steps.value.map(s => ({
        label: s.label,
        answer: s.answer,
        state: s.state,
        nudge: s.nudge,
        images: s.images || [],
        type: s.type
      })),
      noteImages
    })
    showToast('需求已提交')
    emit('success')
  } catch (e) {
    showToast('提交失败：' + (e.response?.data?.message || e.message))
  } finally {
    saving.value = false
  }
}

function close() {
  emit('close')
}

function showToast(msg) {
  const t = document.createElement('div')
  t.className = 'tech-toast'
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2200)
}

function getPriorityClass(priority) {
  const map = { '高': 'tech-tag-high', '中': 'tech-tag-medium', '低': 'tech-tag-low' }
  return map[priority] || ''
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

function getStatusClass(status) {
  const map = {
    '待审批': 'tech-tag-pending',
    '待评审': 'tech-tag-pending',
    '待开发': 'tech-tag-dev',
    '开发中': 'tech-tag-dev',
    '测试中': 'tech-tag-testing',
    '已发布': 'tech-tag-released'
  }
  return map[status] || ''
}

watch(() => props.data, () => {
  if (props.mode === 'edit') initEditForm()
}, { immediate: true })

onMounted(async () => {
  try {
    const r = await developerApi.getAll()
    developers.value = r.data.data
  } catch (e) {}
})
</script>

<style scoped>
.tech-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
}

.tech-modal {
  background: var(--tech-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.tech-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--tech-border);
  position: sticky;
  top: 0;
  background: var(--tech-bg);
  z-index: 1;
}

.tech-modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--tech-text-primary);
}

.tech-modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--tech-text-secondary);
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.tech-modal-close:hover {
  background: var(--tech-border);
  color: var(--tech-text-primary);
}

.tech-modal-body {
  padding: 24px;
}

.tech-detail-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--tech-border);
  border-radius: 12px;
  padding: 20px;
}

.tech-detail-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--tech-text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.view-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.view-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.view-info-item.full-width {
  grid-column: 1 / -1;
}

.view-info-item label {
  font-size: 12px;
  color: var(--tech-text-secondary);
}

.view-info-item span {
  font-size: 14px;
  color: var(--tech-text-primary);
}

.view-description {
  font-size: 14px;
  line-height: 1.6;
  color: var(--tech-text-primary);
  white-space: pre-wrap;
}

.view-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.view-images img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--tech-border);
}

.reset-btn {
  padding: 6px 14px;
  font-size: 13px;
  color: #ef5350;
  background: transparent;
  border: 1px solid #ef5350;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.reset-btn:hover {
  background: #ef5350;
  color: #fff;
}

/* AI 引导样式 */
.gate-progress {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
}

.gate-step-bar {
  flex: 1;
  height: 4px;
  background: var(--tech-border);
  border-radius: 2px;
  overflow: hidden;
}

.gate-step-bar.active {
  background: var(--tech-blue);
}

.gate-step-bar.done {
  background: var(--tech-success);
}

.gate-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.gate-card {
  border: 2px solid var(--tech-border);
  border-radius: 14px;
  padding: 18px;
  transition: all 0.3s;
}

.gate-card.active {
  border-color: var(--tech-blue);
  box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.1);
}

.gate-card.done {
  border-color: var(--tech-success);
  background: rgba(76, 175, 80, 0.03);
  cursor: pointer;
}

.gate-card.locked {
  opacity: 0.5;
}

.gate-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  position: relative;
  cursor: pointer;
  user-select: none;
}

.gate-card.locked .gate-card-head {
  cursor: not-allowed;
}

.gate-card-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--tech-border);
  color: var(--tech-text-secondary);
}

.gate-card.active .gate-card-num {
  background: var(--tech-blue);
  color: #fff;
}

.gate-card-label {
  flex: 1;
}

.gate-skip-btn {
  margin-left: auto;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--tech-blue);
  background: transparent;
  border: 1px solid var(--tech-blue);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.gate-skip-btn:hover:not(:disabled) {
  background: var(--tech-blue);
  color: #fff;
}

.gate-skip-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.gate-card-done {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px 0;
}

.gate-card-done-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gate-card-done-inner p {
  font-size: 14px;
  color: var(--tech-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.gate-card-done-imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.gate-card-done-imgs img {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  object-fit: cover;
}

.gate-card-edit {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--tech-blue);
  flex-shrink: 0;
}

.gate-card-body {
  margin-top: 12px;
}

.gate-card-pending {
  padding: 8px 0;
  cursor: pointer;
  color: var(--tech-blue);
  font-size: 14px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.gate-card-pending:hover {
  opacity: 1;
}

.gate-card-pending p {
  margin: 0;
}

.gate-card-locked {
  padding: 8px 0;
  color: var(--tech-text-secondary);
  font-size: 14px;
}

.gate-card-locked p {
  margin: 0;
}

.note-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.note-img {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
}

.note-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.note-img-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background: rgba(239, 83, 80, 0.9);
  color: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  line-height: 18px;
  text-align: center;
}

.note-img-upload {
  width: 80px;
  height: 80px;
  border: 2px dashed var(--tech-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  color: var(--tech-text-secondary);
  transition: all 0.2s;
}

.note-img-upload:hover {
  border-color: var(--tech-blue);
  color: var(--tech-blue);
}

.gate-nudge {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 152, 0, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(255, 152, 0, 0.2);
}

.gate-nudge-ai {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.gate-nudge-text {
  flex: 1;
  font-size: 13px;
  color: var(--tech-text-primary);
  line-height: 1.5;
}

.gate-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  gap: 20px;
}

.gate-hint {
  font-size: 12px;
  color: var(--tech-text-secondary);
  white-space: nowrap;
}

.gate-next-btn {
  display: flex;
  align-items: center;
}

.gate-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.gate-final {
  margin-top: 20px;
}

.tech-btn-success {
  background: var(--tech-success, #4caf50);
  color: #fff;
}

.tech-btn-success:hover {
  background: #43a047;
}
</style>
