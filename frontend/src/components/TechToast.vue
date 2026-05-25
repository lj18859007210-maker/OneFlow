<template>
  <Transition name="tech-toast-fade">
    <div
      v-if="visible"
      class="tech-toast-card"
      :class="toastClass"
      role="status"
      aria-live="polite"
    >
      <div class="tech-toast-icon">
        <svg v-if="type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <svg v-else-if="type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6" />
          <path d="M9 9l6 6" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 16h-1v-4h-1m1-4h.01" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      <div class="tech-toast-content">
        <div class="tech-toast-title">{{ title }}</div>
        <div class="tech-toast-message">{{ message }}</div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'success'
  },
  title: {
    type: String,
    default: '提示'
  }
})

const toastClass = computed(() => `tech-toast-${props.type}`)
</script>

<style scoped>
.tech-toast-card {
  position: fixed;
  top: 88px;
  right: 28px;
  min-width: 320px;
  max-width: 420px;
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(74, 144, 226, 0.16);
  box-shadow: 0 18px 48px rgba(30, 58, 95, 0.18);
  backdrop-filter: blur(16px);
  z-index: 1200;
  pointer-events: none;
}

.tech-toast-success {
  border-left: 5px solid var(--tech-success);
}

.tech-toast-error {
  border-left: 5px solid var(--tech-danger);
}

.tech-toast-info {
  border-left: 5px solid var(--tech-blue);
}

.tech-toast-icon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--tech-gradient);
  box-shadow: 0 8px 20px rgba(74, 144, 226, 0.24);
}

.tech-toast-icon svg {
  width: 18px;
  height: 18px;
}

.tech-toast-content {
  min-width: 0;
}

.tech-toast-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--tech-text);
  line-height: 1.2;
}

.tech-toast-message {
  margin-top: 4px;
  font-size: 13px;
  color: var(--tech-text-secondary);
  line-height: 1.5;
  word-break: break-word;
}

.tech-toast-fade-enter-active,
.tech-toast-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.tech-toast-fade-enter-from,
.tech-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) translateX(12px);
}

.tech-toast-fade-enter-to,
.tech-toast-fade-leave-from {
  opacity: 1;
  transform: translateY(0) translateX(0);
}
</style>
