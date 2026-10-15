<template>
  <div class="extension-settings">
    <div class="header">
      <h1>
        <PuzzlePieceIcon class="header-icon" />
        瀏覽器擴充功能
      </h1>
      <p class="subtitle">
        安裝擴充功能後，在 YouTube 影片頁就能一鍵把影片加到你的影片庫。
      </p>
    </div>

    <LoadingSpinner v-if="loading" size="large" message="載入中..." />

    <template v-else>
      <section class="card">
        <div class="card-header">
          <h2>個人 API Token</h2>
          <span
            class="badge"
            :class="{ 'badge-active': tokens.length > 0 }"
          >{{ tokens.length }} / {{ maxTokens }} 組</span>
        </div>

        <p class="description">
          Token 代表你的登入身分，擴充功能會用它把影片加到你的影片庫。
          每個環境（不同電腦、不同瀏覽器）可以各自產生一組，並寫上說明方便辨認；
          不再使用的 Token 可以隨時撤銷，撤銷後立即失效，不影響其他組。
        </p>

        <form
          class="create-form"
          @submit.prevent="handleCreate"
        >
          <input
            v-model="newDescription"
            type="text"
            class="text-input"
            :maxlength="DESCRIPTION_MAX"
            placeholder="說明，例如：公司電腦 Chrome"
            :disabled="reachedLimit"
          >
          <BaseButton
            type="submit"
            variant="primary"
            :loading="creating"
            :disabled="reachedLimit || !newDescription.trim()"
          >
            產生 Token
          </BaseButton>
        </form>
        <p
          v-if="reachedLimit"
          class="hint"
        >
          已達上限，請先撤銷不用的 Token。
        </p>

        <div
          v-if="freshToken"
          class="token-reveal"
        >
          <p class="token-reveal-title">
            <ExclamationTriangleIcon class="inline-icon" />
            「{{ freshToken.description }}」的 Token：請現在複製，關閉頁面後就不會再顯示完整 Token。
          </p>
          <div class="token-row">
            <code class="token-value">{{ freshToken.token }}</code>
            <BaseButton
              variant="primary"
              size="sm"
              :icon="copied ? CheckIcon : ClipboardDocumentIcon"
              @click="copyToken"
            >
              {{ copied ? '已複製' : '複製' }}
            </BaseButton>
          </div>
        </div>

        <p
          v-if="tokens.length === 0"
          class="empty"
        >
          還沒有任何 Token。
        </p>

        <ul
          v-else
          class="token-list"
        >
          <li
            v-for="item in tokens"
            :key="item.id"
            class="token-item"
          >
            <div class="token-item-main">
              <form
                v-if="editingId === item.id"
                class="edit-form"
                @submit.prevent="handleSaveDescription(item)"
              >
                <input
                  ref="editInput"
                  v-model="editingDescription"
                  type="text"
                  class="text-input"
                  :maxlength="DESCRIPTION_MAX"
                  @keydown.esc="cancelEdit"
                >
                <BaseButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  :loading="savingId === item.id"
                  :disabled="!editingDescription.trim()"
                >
                  儲存
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  size="sm"
                  @click="cancelEdit"
                >
                  取消
                </BaseButton>
              </form>
              <div
                v-else
                class="token-title"
              >
                <span class="token-desc">{{ item.description || '（未命名）' }}</span>
                <button
                  type="button"
                  class="icon-button"
                  title="編輯說明"
                  @click="startEdit(item)"
                >
                  <PencilSquareIcon class="inline-icon" />
                </button>
              </div>

              <dl class="token-meta">
                <div>
                  <dt>Token</dt>
                  <dd><code>{{ item.token_prefix }}…</code></dd>
                </div>
                <div>
                  <dt>產生時間</dt>
                  <dd>{{ formatDate(item.created_at) }}</dd>
                </div>
                <div>
                  <dt>最後使用</dt>
                  <dd>{{ item.last_used_at ? formatDate(item.last_used_at) : '尚未使用' }}</dd>
                </div>
              </dl>
            </div>

            <BaseButton
              variant="outline-secondary"
              size="sm"
              @click="revokeTarget = item"
            >
              撤銷
            </BaseButton>
          </li>
        </ul>
      </section>

      <section class="card">
        <h2>設定步驟</h2>
        <ol class="steps">
          <li>
            安裝擴充功能（Chrome 載入 <code>extension/dist/chrome</code>、Firefox 載入 <code>extension/dist/firefox</code>）。
          </li>
          <li>
            打開擴充功能的設定頁，網站網址填 <code>{{ siteUrl }}</code>。
          </li>
          <li>把為這個環境產生的 Token 貼進去，按「儲存」。</li>
          <li>到任何 YouTube 影片頁，按鈕列會多一顆「加入影片庫」。</li>
        </ol>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="revokeTarget"
          class="modal-overlay"
          @click="revokeTarget = null"
        >
          <div
            class="modal"
            role="dialog"
            @click.stop
          >
            <div class="modal-header">
              <h2>撤銷 Token</h2>
            </div>
            <div class="modal-body">
              <p>
                撤銷「{{ revokeTarget.description }}」（<code>{{ revokeTarget.token_prefix }}…</code>）後，
                使用這組 Token 的擴充功能將無法再加入影片，其他 Token 不受影響。確定要撤銷嗎？
              </p>
            </div>
            <div class="modal-footer">
              <BaseButton
                variant="secondary"
                @click="revokeTarget = null"
              >
                取消
              </BaseButton>
              <BaseButton
                variant="danger"
                :loading="revoking"
                @click="handleRevoke"
              >
                確認撤銷
              </BaseButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import {
  PuzzlePieceIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon
} from '@heroicons/vue/24/outline'
import { extensionService } from '@/services/api'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/BaseButton.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const DESCRIPTION_MAX = 100

const toast = useToast()

const loading = ref(true)
const tokens = ref([])
const maxTokens = ref(20)
const newDescription = ref('')
const creating = ref(false)
const freshToken = ref(null)
const copied = ref(false)
const editingId = ref(null)
const editingDescription = ref('')
const editInput = ref(null)
const savingId = ref(null)
const revokeTarget = ref(null)
const revoking = ref(false)
const siteUrl = window.location.origin

const reachedLimit = computed(() => tokens.value.length >= maxTokens.value)

function errorMessage(error, fallback) {
  return error.response?.data?.messages?.error || error.response?.data?.message || fallback
}

async function fetchTokens() {
  try {
    const response = await extensionService.listTokens()
    tokens.value = response.data.data.tokens
    maxTokens.value = response.data.data.max_tokens
  } catch (error) {
    console.error('Failed to load tokens:', error)
    toast.error('無法載入 Token 列表')
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  const description = newDescription.value.trim()
  if (!description) return

  creating.value = true
  try {
    const response = await extensionService.createToken(description)
    freshToken.value = response.data.data
    copied.value = false
    newDescription.value = ''
    await fetchTokens()
    toast.success('Token 已產生，請立即複製')
  } catch (error) {
    console.error('Failed to create token:', error)
    toast.error(errorMessage(error, '產生 Token 失敗'))
  } finally {
    creating.value = false
  }
}

async function startEdit(item) {
  editingId.value = item.id
  editingDescription.value = item.description
  await nextTick()
  editInput.value?.[0]?.focus()
}

function cancelEdit() {
  editingId.value = null
  editingDescription.value = ''
}

async function handleSaveDescription(item) {
  const description = editingDescription.value.trim()
  if (!description) return

  savingId.value = item.id
  try {
    const response = await extensionService.updateToken(item.id, description)
    item.description = response.data.data.description
    if (freshToken.value?.id === item.id) {
      freshToken.value.description = item.description
    }
    cancelEdit()
    toast.success('說明已更新')
  } catch (error) {
    console.error('Failed to update token:', error)
    toast.error(errorMessage(error, '更新說明失敗'))
  } finally {
    savingId.value = null
  }
}

async function handleRevoke() {
  const target = revokeTarget.value
  revoking.value = true
  try {
    await extensionService.revokeToken(target.id)
    if (freshToken.value?.id === target.id) {
      freshToken.value = null
    }
    revokeTarget.value = null
    await fetchTokens()
    toast.success('Token 已撤銷')
  } catch (error) {
    console.error('Failed to revoke token:', error)
    toast.error(errorMessage(error, '撤銷 Token 失敗'))
  } finally {
    revoking.value = false
  }
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(freshToken.value.token)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    toast.error('複製失敗，請手動選取複製')
  }
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value.replace(' ', 'T')).toLocaleString('zh-TW')
}

onMounted(fetchTokens)
</script>

<style scoped>
.extension-settings {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.header h1 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0 0 var(--space-2) 0;
  font-size: var(--font-size-3xl);
  color: var(--text-primary);
}

.header-icon {
  width: var(--icon-xl);
  height: var(--icon-xl);
  color: var(--color-brand-primary);
}

.subtitle {
  margin: 0;
  color: var(--text-secondary);
}

.card {
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card h2 {
  margin: 0;
  font-size: var(--font-size-xl);
  color: var(--text-primary);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.badge {
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: var(--cream-300);
  color: var(--ink-500);
}

.badge-active {
  background: rgba(63, 158, 107, 0.14);
  color: #2c6f4b;
}

.description {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.token-reveal {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: rgba(224, 141, 90, 0.1);
  border: 1px dashed var(--amber-400);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.token-reveal-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  color: var(--amber-700);
}

.inline-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.token-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.token-value {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--cream-50);
  border: 1px solid var(--line);
  font-size: var(--font-size-sm);
  word-break: break-all;
  user-select: all;
}

.token-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-4);
  margin: 0;
}

.token-meta dt {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.token-meta dd {
  margin: 0;
  font-weight: 600;
}

.create-form,
.edit-form {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}

.text-input {
  flex: 1;
  min-width: 200px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--cream-50);
  color: var(--text-primary);
  font: inherit;
}

.text-input:focus {
  outline: none;
  border-color: var(--amber-400);
}

.hint,
.empty {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.token-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.token-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.token-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.token-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.token-desc {
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-word;
}

.icon-button {
  display: inline-flex;
  padding: 4px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.icon-button:hover {
  background: var(--cream-200);
  color: var(--text-primary);
}

.steps {
  margin: 0;
  padding-left: var(--space-5);
  line-height: 1.8;
  color: var(--text-primary);
}

code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--cream-200);
  font-size: 0.9em;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(61, 51, 43, 0.34);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--surface);
  border-radius: var(--radius-xl);
  max-width: 460px;
  width: 90%;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  box-shadow: var(--shadow-lg);
}

.modal-header h2 {
  margin: 0;
  font-size: var(--font-size-xl);
}

.modal-body p {
  margin: 0;
  line-height: 1.6;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .extension-settings {
    padding: 16px;
  }

  .card {
    padding: var(--space-4);
  }

  .token-item {
    flex-direction: column;
  }
}
</style>
