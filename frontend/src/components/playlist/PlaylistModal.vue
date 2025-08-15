<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditing ? '編輯播放清單' : '建立播放清單' }}</h2>
        <button @click="closeModal" class="close-button">×</button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <div class="form-group">
          <label for="name">播放清單名稱</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="輸入播放清單名稱"
            class="form-input"
            required
            maxlength="100"
          />
          <div class="field-hint">{{ form.name.length }}/100</div>
        </div>

        <div class="form-group">
          <label for="description">描述（選填）</label>
          <textarea
            id="description"
            v-model="form.description"
            placeholder="為你的播放清單寫個簡短描述"
            class="form-textarea"
            rows="3"
            maxlength="500"
          />
          <div class="field-hint">{{ (form.description || '').length }}/500</div>
        </div>

        <div class="form-group">
          <div class="checkbox-group">
            <input
              id="isPublic"
              v-model="form.isPublic"
              type="checkbox"
              class="form-checkbox"
            />
            <label for="isPublic" class="checkbox-label">
              <span class="checkbox-text">公開播放清單</span>
              <span class="checkbox-description">其他用戶可以搜尋和查看此播放清單</span>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button
            type="button"
            @click="closeModal"
            class="btn-cancel"
            :disabled="isSubmitting"
          >
            取消
          </button>
          <button
            type="submit"
            class="btn-submit"
            :disabled="!form.name.trim() || isSubmitting"
          >
            <span v-if="isSubmitting" class="loading-spinner"></span>
            {{ isSubmitting ? '儲存中...' : (isEditing ? '更新' : '建立') }}
          </button>
        </div>
      </form>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { usePlaylistStore } from '@/stores/playlist'

interface PlaylistData {
  name: string
  description: string
  isPublic: boolean
}

interface Props {
  playlist?: any
}

interface Emits {
  (e: 'close'): void
  (e: 'saved', playlist: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const playlistStore = usePlaylistStore()

const isEditing = computed(() => !!props.playlist)
const isSubmitting = ref(false)
const error = ref('')

const form = reactive<PlaylistData>({
  name: '',
  description: '',
  isPublic: false
})

const initializeForm = () => {
  if (props.playlist) {
    form.name = props.playlist.name || ''
    form.description = props.playlist.description || ''
    form.isPublic = props.playlist.isPublic || false
  } else {
    form.name = ''
    form.description = ''
    form.isPublic = false
  }
}

const closeModal = () => {
  emit('close')
}

const handleSubmit = async () => {
  if (!form.name.trim()) return
  
  isSubmitting.value = true
  error.value = ''

  try {
    const submitData = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      isPublic: form.isPublic
    }

    let result
    if (isEditing.value) {
      result = await playlistStore.updatePlaylist(props.playlist.id, submitData)
    } else {
      result = await playlistStore.createPlaylist(submitData)
    }

    emit('saved', result)
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || '操作失敗'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  initializeForm()
})
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: background 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-form {
  padding: 0 1.5rem 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.field-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  text-align: right;
}

.checkbox-group {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.form-checkbox {
  margin-top: 0.125rem;
  flex-shrink: 0;
}

.checkbox-label {
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.checkbox-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.checkbox-description {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-submit {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.btn-submit {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.btn-submit:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-cancel:disabled,
.btn-submit:disabled {
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

.error-message {
  margin: 1rem 1.5rem 1.5rem;
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #dc2626;
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-header {
    padding: 1rem 1rem 0;
    margin-bottom: 1rem;
  }

  .modal-header h2 {
    font-size: 1.25rem;
  }

  .modal-form {
    padding: 0 1rem 1rem;
  }

  .form-actions {
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-cancel,
  .btn-submit {
    width: 100%;
    justify-content: center;
  }
}
</style>