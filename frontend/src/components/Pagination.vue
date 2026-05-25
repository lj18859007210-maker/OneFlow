<template>
  <div class="tech-pagination">
    <div class="tech-pagination-info">
      共 {{ total }} 条，第 {{ currentPage }}/{{ totalPages }} 页
    </div>
    <div class="tech-pagination-controls">
      <select v-model="pageSize" @change="onPageSizeChange" class="tech-page-size-select">
        <option v-for="size in pageSizes" :key="size" :value="size">{{ size }} 条/页</option>
      </select>
      <button class="tech-page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
        &lt;
      </button>
      <template v-for="p in visiblePages" :key="p">
        <button v-if="p !== '...'" class="tech-page-btn" :class="{ 'tech-page-btn-active': p === currentPage }" @click="goToPage(p)">
          {{ p }}
        </button>
        <span v-else class="tech-page-ellipsis">...</span>
      </template>
      <button class="tech-page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
        &gt;
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  total: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  pageSizes: { type: Array, default: () => [10, 20, 25, 50] }
})

const emit = defineEmits(['update:currentPage', 'update:pageSize', 'change'])

const pageSize = ref(props.pageSize)

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / pageSize.value)))

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = props.currentPage
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = []
  pages.push(1)

  if (current > 4) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 3) pages.push('...')

  pages.push(total)
  return pages
})

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value || page === props.currentPage) return
  emit('update:currentPage', page)
  emit('change', page, pageSize.value)
}

const onPageSizeChange = () => {
  emit('update:pageSize', pageSize.value)
  emit('change', 1, pageSize.value)
}

watch(() => props.pageSize, (val) => {
  pageSize.value = val
})
</script>

<style scoped>
.tech-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.03) 0%, rgba(105, 180, 255, 0.02) 100%);
  border-top: 1px solid var(--tech-border);
}

.tech-pagination-info {
  font-size: 14px;
  color: var(--tech-text-secondary);
  font-weight: 500;
}

.tech-pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tech-page-size-select {
  padding: 8px 12px;
  border-radius: 10px;
  border: 2px solid var(--tech-border);
  background: var(--tech-card);
  color: var(--tech-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.25s;
}

.tech-page-size-select:hover {
  border-color: var(--tech-blue-light);
}

.tech-page-size-select:focus {
  border-color: var(--tech-blue);
  box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.15);
}

.tech-page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 2px solid var(--tech-border);
  background: var(--tech-card);
  color: var(--tech-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tech-page-btn:hover:not(:disabled) {
  border-color: var(--tech-blue-light);
  background: rgba(74, 144, 226, 0.08);
  color: var(--tech-blue);
  transform: translateY(-2px);
}

.tech-page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tech-page-btn-active {
  background: var(--tech-gradient);
  border-color: var(--tech-blue);
  color: #fff;
  box-shadow: 0 4px 16px rgba(74, 144, 226, 0.3);
}

.tech-page-btn-active:hover {
  background: var(--tech-gradient);
  border-color: var(--tech-blue);
  box-shadow: 0 6px 24px rgba(74, 144, 226, 0.4);
  transform: translateY(-2px);
}

.tech-page-ellipsis {
  color: var(--tech-text-secondary);
  padding: 0 6px;
  user-select: none;
  font-weight: 600;
}
</style>
