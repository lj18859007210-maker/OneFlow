<template>
  <div class="platform-picker" ref="pickerRef">
    <button
      class="platform-trigger"
      type="button"
      :disabled="disabled"
      @click="open = !open"
    >
      <span :class="{ placeholder: !modelValue }">{{ modelValue || placeholder }}</span>
      <svg class="chevron" :class="{ open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <div v-if="open" class="platform-menu">
      <div v-for="group in normalizedOptions" :key="group.name" class="platform-group">
        <div class="group-line">
          <button class="group-select" type="button" @click="selectValue(getPlatformOptionValue(group.name))">
            {{ group.name }}
          </button>
          <button
            class="group-toggle"
            type="button"
            :disabled="group.children.length === 0"
            @click="toggleGroup(group.name)"
          >
            <svg :class="{ open: isExpanded(group.name) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 6l6 6-6 6" />
            </svg>
            <span>{{ isExpanded(group.name) ? '收起' : '展开' }}</span>
          </button>
        </div>

        <div v-if="group.children.length && isExpanded(group.name)" class="child-list">
          <button
            v-for="child in group.children"
            :key="`${group.name}-${child}`"
            class="child-option"
            type="button"
            @click="selectValue(getPlatformOptionValue(group.name, child))"
          >
            {{ child }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { DEFAULT_PLATFORMS, getPlatformOptionValue, normalizePlatforms } from '../utils/platformOptions'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => DEFAULT_PLATFORMS },
  placeholder: { type: String, default: '请选择平台' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])
const pickerRef = ref(null)
const open = ref(false)
const expandedGroups = ref(new Set())
const normalizedOptions = computed(() => normalizePlatforms(props.options))

function isExpanded(groupName) {
  return expandedGroups.value.has(groupName)
}

function toggleGroup(groupName) {
  const next = new Set(expandedGroups.value)
  if (next.has(groupName)) {
    next.delete(groupName)
  } else {
    next.add(groupName)
  }
  expandedGroups.value = next
}

function selectValue(value) {
  emit('update:modelValue', value)
  open.value = false
}

function handleClickOutside(event) {
  if (!pickerRef.value?.contains(event.target)) {
    open.value = false
  }
}

watch(normalizedOptions, groups => {
  expandedGroups.value = new Set()
}, { immediate: true })

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.platform-picker {
  position: relative;
  width: 100%;
}

.platform-trigger {
  width: 100%;
  min-height: 45px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border: 2px solid var(--tech-border);
  border-radius: 10px;
  background: var(--tech-card);
  color: var(--tech-text);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
}

.platform-trigger:focus {
  outline: none;
  border-color: var(--tech-blue);
  box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.15);
}

.placeholder {
  color: var(--tech-text-secondary);
}

.chevron,
.group-toggle svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  transition: transform 0.18s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.platform-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 90;
  max-height: 300px;
  overflow: auto;
  border: 1px solid var(--tech-border);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 14px 36px rgba(30, 58, 95, 0.16);
  padding: 8px;
}

.platform-group + .platform-group {
  margin-top: 6px;
}

.group-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 74px;
  gap: 6px;
  align-items: center;
}

.group-select,
.child-option,
.group-toggle {
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--tech-text);
  cursor: pointer;
}

.group-select,
.child-option {
  min-height: 36px;
  padding: 8px 10px;
  text-align: left;
  font-size: 14px;
}

.group-select {
  font-weight: 800;
}

.group-select:hover,
.child-option:hover,
.group-toggle:hover:not(:disabled) {
  background: rgba(74, 144, 226, 0.08);
  color: var(--tech-blue-dark);
}

.group-toggle {
  height: 34px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 800;
}

.group-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.28;
}

.group-toggle svg.open {
  transform: rotate(90deg);
}

.child-list {
  display: grid;
  gap: 2px;
  margin: 4px 0 2px 14px;
  padding-left: 10px;
  border-left: 2px solid rgba(74, 144, 226, 0.16);
}

.child-option {
  color: var(--tech-text-secondary);
}
</style>
