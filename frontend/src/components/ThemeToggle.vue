<template>
  <button
    class="theme-toggle"
    @click="toggle"
    :title="isV2 ? '切換到舊版介面' : '切換到新版介面 (深色)'"
    :aria-label="isV2 ? '切換到舊版介面' : '切換到新版介面'"
  >
    <svg v-if="isV2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toggle-svg">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toggle-svg">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
    <span class="toggle-label">{{ isV2 ? '舊版' : '新版' }}</span>
  </button>
</template>

<script setup>
import { inject } from 'vue'

const { isV2, toggle } = inject('theme')
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.theme-toggle:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--border-color-hover);
}

.toggle-svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .toggle-label {
    display: none;
  }

  .theme-toggle {
    padding: 6px 10px;
  }
}
</style>
