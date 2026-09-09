<template>
  <div
    class="skeleton-grid"
    role="status"
    aria-live="polite"
    :aria-label="message"
  >
    <div
      v-for="n in count"
      :key="n"
      class="skeleton-card"
      :style="{ '--i': n - 1 }"
    >
      <div class="sk-header">
        <span class="sk sk-title" />
        <span class="sk sk-dot" />
      </div>
      <span class="sk sk-line" />
      <span class="sk sk-line sk-line-short" />
      <div class="sk-stats">
        <span class="sk sk-chip" />
        <span class="sk sk-chip sk-chip-sm" />
      </div>
      <div class="sk-actions">
        <span class="sk sk-btn" />
        <span class="sk sk-btn" />
      </div>
    </div>
    <span class="sr-only">{{ message }}</span>
  </div>
</template>

<script setup>
defineProps({
  count: {
    type: Number,
    default: 6
  },
  message: {
    type: String,
    default: '載入播放清單中...'
  }
})
</script>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.skeleton-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  /* 逐張淡入，避免整片同時出現的突兀感 */
  animation: skeleton-in 320ms ease-out backwards;
  animation-delay: calc(var(--i) * 60ms);
}

/* 骨架區塊本體：底色 + 掃光 */
.sk {
  display: block;
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-neutral-200);
}

.sk::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.16) 50%,
    transparent 100%
  );
  animation: shimmer 1.4s ease-in-out infinite;
  animation-delay: calc(var(--i) * 60ms);
}

.sk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.sk-title {
  height: 18px;
  width: 60%;
}

.sk-dot {
  height: 20px;
  width: 40px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.sk-line {
  height: 12px;
  width: 100%;
}

.sk-line-short {
  width: 72%;
}

.sk-stats {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.sk-chip {
  height: 14px;
  width: 84px;
}

.sk-chip-sm {
  width: 48px;
}

.sk-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-2);
}

.sk-btn {
  height: 36px;
  flex: 1;
  border-radius: var(--radius-md);
}

/* 螢幕閱讀器專用文字 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

@keyframes skeleton-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 768px) {
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
}

/* 無障礙：減少動畫時只留靜態骨架 */
@media (prefers-reduced-motion: reduce) {
  .skeleton-card {
    animation: none;
  }

  .sk::after {
    animation: none;
    display: none;
  }
}
</style>
