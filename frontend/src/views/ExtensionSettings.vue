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
            v-if="status.has_token"
            class="badge badge-active"
          >已啟用</span>
          <span
            v-else
            class="badge"
          >尚未產生</span>
        </div>

        <p class="description">
          Token 代表你的登入身分，擴充功能會用它把影片加到你的影片庫。
          每位使用者只有一組，重新產生後舊的會立即失效。
        </p>

        <div
          v-if="freshToken"
          class="token-reveal"
        >
          <p class="token-reveal-title">
            <ExclamationTriangleIcon class="inline-icon" />
            請現在複製，關閉頁面後就不會再顯示完整 Token。
          </p>
          <div class="token-row">
            <code class="token-value">{{ freshToken }}</code>
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

        <dl
          v-else-if="status.has_token"
          class="token-meta"
        >
          <div>
            <dt>Token</dt>
            <dd><code>{{ status.token_prefix }}…</code></dd>
          </div>
          <div>
            <dt>產生時間</dt>
            <dd>{{ formatDate(status.created_at) }}</dd>
          </div>
          <div>
            <dt>最後使用</dt>
            <dd>{{ status.last_used_at ? formatDate(status.last_used_at) : '尚未使用' }}</dd>
          </div>
        </dl>

        <div class="actions">
          <BaseButton
            variant="primary"
            :loading="working"
            @click="handleGenerate"
          >
            {{ status.has_token ? '重新產生 Token' : '產生 Token' }}
          </BaseButton>
          <BaseButton
            v-if="status.has_token"
            variant="outline-secondary"
            :disabled="working"
            @click="showRevokeModal = true"
          >
            撤銷 Token
          </BaseButton>
        </div>
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
          <li>把上面產生的 Token 貼進去，按「儲存」。</li>
          <li>到任何 YouTube 影片頁，按鈕列會多一顆「加入影片庫」。</li>
        </ol>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showRevokeModal"
          class="modal-overlay"
          @click="showRevokeModal = false"
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
              <p>撤銷後，已設定這組 Token 的擴充功能將無法再加入影片。確定要撤銷嗎？</p>
            </div>
            <div class="modal-footer">
              <BaseButton
                variant="secondary"
                @click="showRevokeModal = false"
              >
                取消
              </BaseButton>
              <BaseButton
                variant="danger"
                :loading="working"
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
import { ref, onMounted } from 'vue'
import {
  PuzzlePieceIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import { extensionService } from '@/services/api'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/BaseButton.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const toast = useToast()

const loading = ref(true)
const working = ref(false)
const status = ref({ has_token: false, token_prefix: null, created_at: null, last_used_at: null })
const freshToken = ref('')
const copied = ref(false)
const showRevokeModal = ref(false)
const siteUrl = window.location.origin

async function fetchStatus() {
  try {
    const response = await extensionService.getTokenStatus()
    status.value = response.data.data
  } catch (error) {
    console.error('Failed to load token status:', error)
    toast.error('無法載入 Token 狀態')
  } finally {
    loading.value = false
  }
}

async function handleGenerate() {
  working.value = true
  try {
    const response = await extensionService.generateToken()
    freshToken.value = response.data.data.token
    copied.value = false
    await fetchStatus()
    toast.success('Token 已產生，請立即複製')
  } catch (error) {
    console.error('Failed to generate token:', error)
    toast.error('產生 Token 失敗')
  } finally {
    working.value = false
  }
}

async function handleRevoke() {
  working.value = true
  try {
    await extensionService.revokeToken()
    freshToken.value = ''
    showRevokeModal.value = false
    await fetchStatus()
    toast.success('Token 已撤銷')
  } catch (error) {
    console.error('Failed to revoke token:', error)
    toast.error('撤銷 Token 失敗')
  } finally {
    working.value = false
  }
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(freshToken.value)
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

onMounted(fetchStatus)
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

.actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
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
}
</style>
