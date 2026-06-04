<template>
  <div class="developer-multi-select" ref="pickerRef">
    <button
      class="developer-trigger"
      :class="{ open, empty: selectedNames.length === 0 }"
      type="button"
      :disabled="disabled"
      @click="toggleOpen"
    >
      <span v-if="selectedNames.length === 0" class="developer-placeholder">
        {{ placeholder }}
      </span>
      <span v-else class="developer-chip-list">
        <span
          v-for="developer in selectedNames"
          :key="getSelectedKey(developer)"
          class="developer-chip"
          :title="getDeveloperLabel(developer)"
        >
          <span class="developer-chip-name">{{ developer.name }}</span>
          <button
            class="developer-chip-remove"
            type="button"
            :aria-label="`移除${developer.name}`"
            @click.stop="removeDeveloper(developer)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      </span>
      <span class="developer-trigger-side">
        <span v-if="selectedNames.length" class="developer-count">
          {{ selectedNames.length }}人
        </span>
        <svg
          class="developer-chevron"
          :class="{ open }"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </button>

    <div v-if="open" class="developer-menu">
      <button
        v-for="developer in normalizedDevelopers"
        :key="developer.key"
        class="developer-option"
        :class="{ selected: isSelected(developer.value) }"
        type="button"
        @click="toggleDeveloper(developer)"
      >
        <span class="developer-option-main">
          <span class="developer-option-name">{{ developer.name }}</span>
          <span class="developer-option-department">
            {{ developer.meta }}
          </span>
        </span>
        <span class="developer-check" aria-hidden="true">
          <svg v-if="isSelected(developer.value)" viewBox="0 0 24 24">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      </button>
      <div v-if="normalizedDevelopers.length === 0" class="developer-empty">
        暂无可选开发人员
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  modelValue: { type: [Array, String], default: () => [] },
  developers: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: "请选择开发人员" },
});

const emit = defineEmits(["update:modelValue"]);

const pickerRef = ref(null);
const open = ref(false);

const selectedNames = computed(() => normalizeNames(props.modelValue));

const normalizedDevelopers = computed(() => {
  const seen = new Set();
  return props.developers
    .map((developer, index) => {
      const name = String(developer?.name || "").trim();
      const userId = String(developer?.userId || developer?.id || "").trim();
      const username = String(developer?.username || "").trim();
      const value = userId || username || name;
      if (!name || !value || seen.has(value)) return null;
      seen.add(value);

      const department = String(developer?.department || "").trim();
      const meta = [
        username ? `账号: ${username}` : "",
        department || "未设置部门",
      ].filter(Boolean).join(" · ");

      return {
        key: value || `${name}-${index}`,
        value,
        userId,
        username,
        name,
        department,
        meta,
      };
    })
    .filter(Boolean);
});

function normalizeNames(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  const seen = new Set();

  return values
    .map((item) => {
      if (item && typeof item === "object") {
        const userId = String(item.userId || item.id || item.value || "").trim();
        const username = String(item.username || "").trim();
        const name = String(item.name || item.label || username || userId || "").trim();
        return name ? { id: userId || username || name, userId, username, name } : null;
      }

      const raw = String(item || "").trim();
      const developer = normalizedDevelopers.value.find((candidate) =>
        [candidate.value, candidate.userId, candidate.username]
          .filter(Boolean)
          .includes(raw),
      );
      if (developer) {
        return {
          id: developer.userId || developer.value,
          userId: developer.userId,
          username: developer.username,
          name: developer.name,
        };
      }
      return raw ? { id: raw, userId: raw, username: "", name: raw } : null;
    })
    .filter((developer) => {
      if (!developer?.name) return false;
      const key = getSelectedValue(developer);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function toggleOpen() {
  if (props.disabled) return;
  open.value = !open.value;
}

function getSelectedValue(developer) {
  return developer?.userId || developer?.id || developer?.username || developer?.name || "";
}

function isSelected(value) {
  return selectedNames.value.some((developer) => getSelectedValue(developer) === value);
}

function toggleDeveloper(developer) {
  const next = isSelected(developer.value)
    ? selectedNames.value.filter((selected) => getSelectedValue(selected) !== developer.value)
    : [
        ...selectedNames.value,
        {
          id: developer.userId || developer.value,
          userId: developer.userId,
          username: developer.username,
          name: developer.name,
        },
      ];
  emit("update:modelValue", next);
}

function removeDeveloper(developer) {
  const value = getSelectedValue(developer);
  emit(
    "update:modelValue",
    selectedNames.value.filter((selected) => getSelectedValue(selected) !== value),
  );
}

function getSelectedKey(developer) {
  return getSelectedValue(developer);
}

function getDeveloperLabel(developer) {
  const value = getSelectedValue(developer);
  const option = normalizedDevelopers.value.find((item) => item.value === value);
  if (option) {
    return [option.name, option.username ? `账号: ${option.username}` : "", option.department]
      .filter(Boolean)
      .join(" - ");
  }
  return developer?.name || "";
}

function handleClickOutside(event) {
  if (!pickerRef.value?.contains(event.target)) {
    open.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.developer-multi-select {
  position: relative;
  width: 100%;
}

.developer-trigger {
  width: 100%;
  min-height: 45px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 2px solid var(--tech-border);
  border-radius: 8px;
  background: var(--tech-card);
  color: var(--tech-text);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.developer-trigger:hover:not(:disabled),
.developer-trigger.open,
.developer-trigger:focus {
  outline: none;
  border-color: var(--tech-blue);
  box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.12);
}

.developer-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.developer-placeholder {
  color: var(--tech-text-secondary);
}

.developer-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.developer-chip {
  max-width: 100%;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 5px 3px 10px;
  border: 1px solid rgba(74, 144, 226, 0.22);
  border-radius: 999px;
  background: rgba(74, 144, 226, 0.1);
  color: var(--tech-blue-dark);
  font-size: 13px;
  font-weight: 700;
}

.developer-chip-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.developer-chip-remove {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--tech-blue-dark);
  cursor: pointer;
}

.developer-chip-remove:hover {
  background: rgba(46, 106, 179, 0.14);
}

.developer-chip-remove svg,
.developer-check svg,
.developer-chevron {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.developer-trigger-side {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--tech-text-secondary);
}

.developer-count {
  white-space: nowrap;
  font-size: 12px;
  font-weight: 800;
  color: var(--tech-blue-dark);
}

.developer-chevron {
  transition: transform 0.18s ease;
}

.developer-chevron.open {
  transform: rotate(180deg);
}

.developer-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 96;
  max-height: 320px;
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 36px rgba(30, 58, 95, 0.16);
}

.developer-option {
  width: 100%;
  min-height: 44px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24px;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--tech-text);
  cursor: pointer;
  text-align: left;
}

.developer-option:hover,
.developer-option.selected {
  background: rgba(74, 144, 226, 0.08);
}

.developer-option.selected {
  color: var(--tech-blue-dark);
}

.developer-option-main {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.developer-option-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 800;
}

.developer-option-department {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--tech-text-secondary);
}

.developer-check {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--tech-border);
  border-radius: 50%;
  color: var(--tech-blue);
  background: #fff;
}

.developer-option.selected .developer-check {
  border-color: rgba(74, 144, 226, 0.35);
  background: rgba(74, 144, 226, 0.12);
}

.developer-empty {
  padding: 18px 10px;
  text-align: center;
  color: var(--tech-text-secondary);
  font-size: 13px;
}
</style>
