<template>
  <div class="modal-overlay" @click="handleCancel">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="warning-icon">⚠️</div>
        <h2>{{ title }}</h2>
      </div>

      <div class="modal-body">
        <p class="message">{{ message }}</p>
        
        <div v-if="details" class="details">
          <p v-for="detail in details" :key="detail" class="detail-item">
            {{ detail }}
          </p>
        </div>
      </div>

      <div class="modal-actions">
        <button
          type="button"
          @click="handleCancel"
          class="btn-cancel"
          :disabled="isProcessing"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          @click="handleConfirm"
          class="btn-confirm"
          :disabled="isProcessing"
          :class="{ danger: isDangerous }"
        >
          <span v-if="isProcessing" class="loading-spinner"></span>
          {{ isProcessing ? processingText : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title: string
  message: string
  details?: string[]
  confirmText?: string
  cancelText?: string
  processingText?: string
  isDangerous?: boolean
}

interface Emits {
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: '確認',
  cancelText: '取消',
  processingText: '處理中...',
  isDangerous: true
})

const emit = defineEmits<Emits>()

const isProcessing = ref(false)

const handleConfirm = async () => {
  isProcessing.value = true
  try {
    emit('confirm')
  } finally {
    // Don't set isProcessing back to false here
    // Let the parent component handle closing the modal
  }
}

const handleCancel = () => {
  if (isProcessing.value) return
  emit('cancel')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  flex: 1;
}

.modal-body {
  padding: 1rem 1.5rem 1.5rem;
}

.message {
  color: #374151;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.details {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border-left: 3px solid #fbbf24;
}

.detail-item {
  color: #6b7280;
  font-size: 0.75rem;
  margin: 0 0 0.25rem 0;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid #f3f4f6;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-confirm {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.btn-confirm:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-confirm.danger {
  background: #dc2626;
  border-color: #dc2626;
}

.btn-confirm.danger:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
}

.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-header {
    padding: 1rem 1rem 0.75rem;
  }

  .modal-header h2 {
    font-size: 1.125rem;
  }

  .modal-body {
    padding: 0.75rem 1rem 1rem;
  }

  .modal-actions {
    padding: 0.75rem 1rem 1rem;
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-cancel,
  .btn-confirm {
    width: 100%;
  }
}
</style>