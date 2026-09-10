<template>
  <div
    class="theme-toggle-group"
    role="radiogroup"
    aria-label="介面主題"
  >
    <button
      v-for="option in options"
      :key="option.value"
      class="theme-option"
      :class="{ active: theme === option.value }"
      role="radio"
      :aria-checked="theme === option.value"
      :title="option.title"
      :aria-label="option.title"
      @click="setTheme(option.value)"
    >
      <!-- v3 暖陽奶油 -->
      <svg
        v-if="option.value === 'v3'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="toggle-svg"
      >
        <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M18.4 5.6l-1.1 1.1M6.7 17.3l-1.1 1.1" />
        <circle
          cx="12"
          cy="12"
          r="4.2"
        />
      </svg>
      <!-- v2 深色 -->
      <svg
        v-else-if="option.value === 'v2'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="toggle-svg"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <!-- v1 舊版 -->
      <svg
        v-else
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="toggle-svg"
      >
        <rect
          x="3"
          y="4"
          width="18"
          height="14"
          rx="2"
        />
        <path d="M8 21h8M12 18v3" />
      </svg>
      <span class="toggle-label">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { inject, computed, ref } from 'vue'

const injected = inject('theme', null)

// 舊版只提供 { isV2, toggle }，這裡做個保底，元件單獨使用時不會壞掉
const theme = computed(() => {
  if (injected?.theme) return injected.theme.value
  return injected?.isV2?.value ? 'v2' : 'v1'
})

const setTheme = injected?.setTheme ?? injected?.toggle ?? (() => {})

const options = ref([
  { value: 'v3', label: '奶油', title: '暖陽奶油（新版）' },
  { value: 'v2', label: '深色', title: 'OLED 深色' },
  { value: 'v1', label: '經典', title: '經典舊版' }
])
</script>

<style scoped>
.theme-toggle-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.theme-option {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 600;
  font-family: inherit;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.theme-option:hover:not(.active) {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.theme-option.active {
  background: var(--bg-primary);
  color: var(--color-brand-primary);
  box-shadow: var(--shadow-xs);
}

.toggle-svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* 中等寬度：只有選中的那個留文字 */
@media (max-width: 900px) {
  .theme-option:not(.active) .toggle-label {
    display: none;
  }
  .theme-option:not(.active) {
    padding: 5px 8px;
  }
}

/* 窄螢幕：全部只留圖示 */
@media (max-width: 560px) {
  .toggle-label {
    display: none;
  }
  .theme-option,
  .theme-option:not(.active) {
    padding: 5px 8px;
  }
}
</style>
