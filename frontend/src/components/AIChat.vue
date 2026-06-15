<template>
  <div class="ai-chat">
    <transition name="ai-chat-fab">
      <div v-if="!open" class="ai-chat-fab"
        :style="{ left: fabPos.x + 'px', top: fabPos.y + 'px', bottom: 'auto', right: 'auto' }"
        @mousedown="fabDragStart"
        @touchstart.prevent="fabTouchStart"
        @click="fabClick"
      >
        <div class="ai-chat-fab-inner">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <span class="ai-chat-fab-label">AI</span>
      </div>
    </transition>

    <transition name="ai-chat-window">
      <div v-if="open" class="ai-chat-window" :style="chatWindowStyle">
        <div class="ai-chat-header">
          <div class="ai-chat-header-left">
            <div class="ai-chat-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div class="ai-chat-header-text">
              <div class="ai-chat-title">OneFlow AI</div>
              <div class="ai-chat-subtitle">智能需求助手</div>
            </div>
            <span class="ai-chat-status-dot"></span>
          </div>
          <button class="ai-chat-close" @click="open = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="ai-chat-messages" ref="messagesRef">
          <div v-if="messages.length === 0" class="ai-chat-welcome">
            <div class="ai-chat-welcome-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div class="ai-chat-welcome-title">你好，有什么可以帮你？</div>
            <div class="ai-chat-welcome-text">基于需求数据智能分析，随时为你服务 👋</div>
            <div class="ai-chat-quick-actions">
              <button v-for="q in quickQuestions" :key="q" class="ai-chat-quick-btn" @click="sendMessage(q)">
                {{ q }}
              </button>
            </div>
          </div>

          <div v-for="(msg, idx) in messages" :key="idx" class="ai-chat-msg" :class="'ai-chat-msg-' + msg.role">
            <div v-if="msg.role === 'assistant'" class="ai-chat-msg-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <div class="ai-chat-msg-bubble">
              <div v-if="msg.loading" class="ai-chat-typing">
                <span></span><span></span><span></span>
              </div>
              <div v-else class="ai-chat-msg-content" v-html="renderMarkdown(msg.content)"></div>
            </div>
          </div>
        </div>

        <div class="ai-chat-input-wrap">
          <div class="ai-chat-quick-bar" v-if="messages.length > 0">
            <button v-for="q in quickQuestions" :key="q" class="ai-chat-quick-sm" @click="sendMessage(q)">{{ q }}</button>
          </div>
          <div class="ai-chat-input-row">
            <input
              v-model="input"
              class="ai-chat-input"
              placeholder="问我任何关于需求的问题..."
              @keydown.enter="handleSend"
              :disabled="loading"
            />
            <button
              class="ai-chat-send"
              @click="handleSend"
              :disabled="!input.trim() || loading"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { aiApi } from '../api'
import { clampFabPosition, getDefaultFabPosition, getViewportRect } from '../utils/aiChatPosition'

const open = ref(false)
const input = ref('')
const loading = ref(false)
const messages = ref([])
const messagesRef = ref(null)

const FAB_SIZE = { width: 60, height: 72 }
const FAB_MARGIN = 28
const initialViewport = typeof window !== 'undefined' ? getViewportRect(window) : { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }
const fabPos = ref(getDefaultFabPosition({
  viewport: initialViewport,
  anchorRect: initialViewport,
  fabSize: FAB_SIZE,
  margin: FAB_MARGIN,
}))
const fabWasMoved = ref(false)
let fabDragState = { dragging: false, moved: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 }

const fabDragStart = (e) => {
  fabDragState = { dragging: true, moved: false, startX: e.clientX, startY: e.clientY, startPosX: fabPos.value.x, startPosY: fabPos.value.y }
}

const fabTouchStart = (e) => {
  const t = e.touches[0]
  fabDragState = { dragging: true, moved: false, startX: t.clientX, startY: t.clientY, startPosX: fabPos.value.x, startPosY: fabPos.value.y }
}

const fabClick = () => {
  if (fabDragState.moved) return
  openChat()
}

if (typeof window !== 'undefined') {
  const onMove = (cx, cy) => {
    if (!fabDragState.dragging) return
    const dx = cx - fabDragState.startX
    const dy = cy - fabDragState.startY
    if (!fabDragState.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      fabDragState.moved = true
      fabWasMoved.value = true
    }
    if (!fabDragState.moved) return
    fabPos.value = clampFabPosition({
      position: {
        x: fabDragState.startPosX + dx,
        y: fabDragState.startPosY + dy,
      },
      viewport: getViewportRect(window),
      anchorRect: getLayoutAnchorRect(),
      fabSize: FAB_SIZE,
      margin: 8,
    })
  }
  const onEnd = () => {
    fabDragState.dragging = false
  }
  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY))
  window.addEventListener('mouseup', onEnd)
  window.addEventListener('touchmove', e => { const t = e.touches[0]; onMove(t.clientX, t.clientY) }, { passive: true })
  window.addEventListener('touchend', onEnd)
}

const getLayoutAnchorRect = () => {
  if (typeof document === 'undefined') return getViewportRect(window)
  return document.querySelector('.tech-main')?.getBoundingClientRect() || getViewportRect(window)
}

const syncFabPosition = ({ reset = false } = {}) => {
  if (typeof window === 'undefined') return
  const viewport = getViewportRect(window)
  const anchorRect = getLayoutAnchorRect()

  if (reset || !fabWasMoved.value) {
    fabPos.value = getDefaultFabPosition({
      viewport,
      anchorRect,
      fabSize: FAB_SIZE,
      margin: FAB_MARGIN,
    })
    return
  }

  fabPos.value = clampFabPosition({
    position: fabPos.value,
    viewport,
    anchorRect,
    fabSize: FAB_SIZE,
    margin: 8,
  })
}

const chatWindowStyle = computed(() => {
  const W = 480, H = 640, gap = 12
  const vw = window.innerWidth, vh = window.innerHeight
  let left, top
  if (fabPos.value.x > vw / 2) {
    left = fabPos.value.x - W + 60
  } else {
    left = fabPos.value.x
  }
  top = fabPos.value.y - H - gap
  if (top < 8) top = fabPos.value.y + 72 + gap
  left = Math.max(8, Math.min(vw - W - 8, left))
  return { left: left + 'px', top: top + 'px' }
})

const quickQuestions = [
  '上周做了哪些事情？',
  '有哪些快逾期了？',
  '本周工作内容',
  '各平台进度如何？'
]

const openChat = () => {
  open.value = true
  if (messages.value.length === 0) {
    messages.value.push({
      role: 'assistant',
      content: '你好！我是 OneFlow AI 助手，可以基于需求数据为你解答问题。试试点击下方快捷问题，或直接输入你的疑问。'
    })
  }
  nextTick(() => scrollToBottom())
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

const sendMessage = async (text) => {
  const question = text || input.value.trim()
  if (!question || loading.value) return

  input.value = ''
  messages.value.push({ role: 'user', content: question })
  const loadingIdx = messages.value.length
  messages.value.push({ role: 'assistant', content: '', loading: true })

  loading.value = true
  scrollToBottom()

  try {
    const res = await aiApi.chat(question)
    if (res.data.success) {
      messages.value[loadingIdx] = { role: 'assistant', content: res.data.data, loading: false }
    } else {
      messages.value[loadingIdx] = { role: 'assistant', content: '抱歉，处理你的问题时出错了：' + (res.data.message || '未知错误'), loading: false }
    }
  } catch (err) {
    const detail = err.response?.data?.message || err.message || ''
    messages.value[loadingIdx] = { role: 'assistant', content: '请求失败：' + (detail || '请检查网络和后端服务'), loading: false }
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const handleSend = () => {
  sendMessage(input.value.trim())
}

const renderMarkdown = (text) => {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<div class="ai-md-heading">$1</div>')
    .replace(/^- (.+)$/gm, '<div class="ai-md-li">• $1</div>')
    .replace(/^\d+\.\s+(.+)$/gm, '<div class="ai-md-li">$1</div>')
    .replace(/\n\n/g, '<div class="ai-md-br"></div>')
    .replace(/\n/g, '<br/>')
  return html
}

onMounted(() => {
  syncFabPosition({ reset: true })
  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => syncFabPosition())
    : null
  const mainEl = document.querySelector('.tech-main')
  if (resizeObserver && mainEl) resizeObserver.observe(mainEl)
  const handleViewportChange = () => syncFabPosition()
  window.addEventListener('resize', handleViewportChange)
  window.visualViewport?.addEventListener('resize', handleViewportChange)
  window.visualViewport?.addEventListener('scroll', handleViewportChange)
  dragCleanup.value = () => {
    resizeObserver?.disconnect()
    window.removeEventListener('resize', handleViewportChange)
    window.visualViewport?.removeEventListener('resize', handleViewportChange)
    window.visualViewport?.removeEventListener('scroll', handleViewportChange)
  }

  const saved = sessionStorage.getItem('ai-chat-messages')
  if (saved) {
    try {
      messages.value = JSON.parse(saved)
    } catch (e) { /* ignore */ }
  }
})

watch(messages, (val) => {
  sessionStorage.setItem('ai-chat-messages', JSON.stringify(val))
}, { deep: true })

const dragCleanup = ref(null)

onBeforeUnmount(() => {
  if (dragCleanup.value) dragCleanup.value()
})
</script>

<style scoped>
.ai-chat {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 999;
  pointer-events: none;
}

/* ===== Floating Button ===== */
.ai-chat-fab {
  position: fixed;
  width: 60px;
  height: 72px;
  pointer-events: auto;
  z-index: 1000;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.ai-chat-fab:active {
  cursor: grabbing;
}

.ai-chat-fab-inner {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6C63FF 0%, #4A90E2 50%, #00BCD4 100%);
  background-size: 200% 200%;
  animation: fabGradient 4s ease infinite;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 6px 24px rgba(108, 99, 255, 0.35),
    0 2px 8px rgba(74, 144, 226, 0.2);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ai-chat-fab:hover .ai-chat-fab-inner {
  transform: scale(1.1);
  box-shadow:
    0 10px 36px rgba(108, 99, 255, 0.45),
    0 4px 12px rgba(74, 144, 226, 0.25);
}

.ai-chat-fab:active .ai-chat-fab-inner {
  transform: scale(0.92);
}

.ai-chat-fab-label {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(108, 99, 255, 0.9);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  letter-spacing: 1px;
  white-space: nowrap;
}

@keyframes fabGradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ===== Chat Window ===== */
.ai-chat-window {
position: fixed;
width: 480px;
height: 640px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 20px 60px rgba(74, 144, 226, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  z-index: 1001;
}

/* ===== Header ===== */
.ai-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  background: linear-gradient(135deg, #6C63FF, #4A90E2, #00BCD4);
  background-size: 200% 200%;
  animation: headerGradient 6s ease infinite;
  color: #fff;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.ai-chat-header::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 60%);
  pointer-events: none;
}

@keyframes headerGradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.ai-chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.ai-chat-avatar {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.ai-chat-header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ai-chat-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.ai-chat-subtitle {
  font-size: 11px;
  opacity: 0.8;
  font-weight: 400;
}

.ai-chat-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ADE80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
  animation: dotPulse 2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.ai-chat-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.ai-chat-close:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: rotate(90deg);
}

/* ===== Messages Area ===== */
.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: transparent;
}

.ai-chat-messages::-webkit-scrollbar {
  width: 6px;
}

.ai-chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.ai-chat-messages::-webkit-scrollbar-thumb {
  background: rgba(108, 99, 255, 0.2);
  border-radius: 3px;
}

.ai-chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(108, 99, 255, 0.35);
}

/* ===== Welcome ===== */
.ai-chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px;
  text-align: center;
}

.ai-chat-welcome-icon {
  width: 64px;
  height: 64px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(108, 99, 255, 0.12), rgba(0, 188, 212, 0.12));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6C63FF;
  margin-bottom: 16px;
}

.ai-chat-welcome-title {
  font-size: 18px;
  font-weight: 700;
  color: #1E3A5F;
  margin-bottom: 6px;
}

.ai-chat-welcome-text {
  font-size: 13px;
  color: #5A7A9F;
  line-height: 1.6;
  margin-bottom: 20px;
}

.ai-chat-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.ai-chat-quick-btn {
  padding: 8px 16px;
  border: 1px solid rgba(108, 99, 255, 0.2);
  border-radius: 20px;
  background: rgba(108, 99, 255, 0.05);
  color: #6C63FF;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  white-space: nowrap;
}

.ai-chat-quick-btn:hover {
  background: rgba(108, 99, 255, 0.12);
  border-color: #6C63FF;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 99, 255, 0.15);
}

/* ===== Messages ===== */
.ai-chat-msg {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.ai-chat-msg-user {
  justify-content: flex-end;
}

.ai-chat-msg-assistant {
  justify-content: flex-start;
}

.ai-chat-msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6C63FF, #4A90E2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(108, 99, 255, 0.25);
}

.ai-chat-msg-bubble {
  max-width: 82%;
  padding: 12px 16px;
  border-radius: 20px;
  font-size: 13.5px;
  line-height: 1.75;
  word-break: break-word;
}

.ai-chat-msg-user .ai-chat-msg-bubble {
  background: linear-gradient(135deg, #6C63FF, #4A90E2);
  color: #fff;
  border-bottom-right-radius: 6px;
  box-shadow: 0 2px 12px rgba(108, 99, 255, 0.25);
}

.ai-chat-msg-assistant .ai-chat-msg-bubble {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  color: #1E3A5F;
  border: 1px solid rgba(108, 99, 255, 0.08);
  border-bottom-left-radius: 6px;
  box-shadow: 0 2px 8px rgba(108, 99, 255, 0.06);
}

/* ===== Typing Indicator ===== */
.ai-chat-typing {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
}

.ai-chat-typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6C63FF, #4A90E2);
  animation: aiTyping 1.4s ease-in-out infinite;
}

.ai-chat-typing span:nth-child(2) { animation-delay: 0.15s; }
.ai-chat-typing span:nth-child(3) { animation-delay: 0.3s; }

@keyframes aiTyping {
  0%, 60%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
  30% { transform: translateY(-8px) scale(1.15); opacity: 1; }
}

.ai-chat-msg-content :deep(.ai-md-heading) {
  font-weight: 700;
  font-size: 14px;
  margin: 10px 0 4px;
  color: #1E3A5F;
}

.ai-chat-msg-content :deep(.ai-md-li) {
  padding-left: 2px;
  margin: 3px 0;
  line-height: 1.6;
}

.ai-chat-msg-content :deep(.ai-md-br) {
  height: 10px;
}

/* ===== Input Area ===== */
.ai-chat-input-wrap {
  flex-shrink: 0;
  padding: 14px 18px 18px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(108, 99, 255, 0.08);
}

.ai-chat-quick-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.ai-chat-quick-bar::-webkit-scrollbar { height: 0; }

.ai-chat-quick-sm {
  padding: 6px 12px;
  border: 1px solid rgba(108, 99, 255, 0.15);
  border-radius: 16px;
  background: rgba(108, 99, 255, 0.04);
  color: #6C63FF;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s;
  flex-shrink: 0;
}

.ai-chat-quick-sm:hover {
  background: rgba(108, 99, 255, 0.1);
  border-color: rgba(108, 99, 255, 0.3);
  transform: translateY(-1px);
}

.ai-chat-input-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.ai-chat-input {
  flex: 1;
  padding: 12px 18px;
  border: 2px solid rgba(108, 99, 255, 0.15);
  border-radius: 22px;
  font-size: 14px;
  color: #1E3A5F;
  background: rgba(255, 255, 255, 0.8);
  outline: none;
  transition: all 0.3s;
  font-family: inherit;
}

.ai-chat-input:focus {
  border-color: #6C63FF;
  box-shadow: 0 0 0 4px rgba(108, 99, 255, 0.1);
  background: #fff;
}

.ai-chat-input::placeholder {
  color: #94a3b8;
}

.ai-chat-send {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #6C63FF, #4A90E2);
  background-size: 200% 200%;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
  box-shadow: 0 3px 12px rgba(108, 99, 255, 0.3);
}

.ai-chat-send:hover:not(:disabled) {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(108, 99, 255, 0.4);
}

.ai-chat-send:active:not(:disabled) {
  transform: scale(0.94);
}

.ai-chat-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

/* ===== Animations ===== */
.ai-chat-fab-enter-active,
.ai-chat-fab-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ai-chat-fab-enter-from,
.ai-chat-fab-leave-to {
  opacity: 0;
  transform: scale(0.3) translateY(20px);
}

.ai-chat-window-enter-active,
.ai-chat-window-leave-active {
  transition: all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ai-chat-window-enter-from,
.ai-chat-window-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
}

/* ===== Responsive ===== */
@media (max-width: 540px) {
  .ai-chat-window {
    width: calc(100vw - 16px);
    height: calc(100vh - 60px);
    bottom: 8px;
    right: 8px;
    border-radius: 22px;
  }

  .ai-chat-welcome {
    padding: 20px 12px;
  }

  .ai-chat-quick-btn {
    padding: 6px 12px;
    font-size: 11px;
  }
}
</style>
