<template>
  <div class="showcase-settings">
    <div class="header">
      <h1>
        <PhotoIcon class="header-icon" />
        公開展示頁
      </h1>
      <p class="subtitle">
        提供一個對外公開的頁面顯示活動圖片，可以限制來源 IP，也可以隨時關閉。
      </p>
    </div>

    <LoadingSpinner
      v-if="loading"
      size="large"
      message="載入中..."
    />

    <template v-else>
      <section class="card">
        <div class="card-header">
          <h2>展示圖片</h2>
          <span
            class="badge"
            :class="{ 'badge-active': imageSource === 'custom' }"
          >{{ imageSource === 'custom' ? '自訂圖片' : '內建預設' }}</span>
        </div>

        <div class="image-preview">
          <img
            :src="imageUrl"
            alt="目前展示圖片預覽"
          >
        </div>

        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="file-input"
          @change="handleFileChange"
        >

        <p class="hint">
          支援 PNG / JPEG / WebP，單檔 10MB 以內；上傳後立刻生效，「還原預設」可回到內建圖片。
        </p>

        <div class="actions">
          <BaseButton
            variant="primary"
            size="sm"
            :loading="uploading"
            :disabled="!selectedFile"
            @click="handleUpload"
          >
            上傳圖片
          </BaseButton>
          <BaseButton
            variant="outline-secondary"
            size="sm"
            :disabled="imageSource !== 'custom' || uploading"
            @click="handleResetImage"
          >
            還原預設
          </BaseButton>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <h2>顯示開關</h2>
          <span
            class="badge"
            :class="{ 'badge-active': form.is_enabled }"
          >{{ form.is_enabled ? '已開啟' : '已關閉' }}</span>
        </div>

        <label class="switch-row">
          <input
            v-model="form.is_enabled"
            type="checkbox"
            class="switch-input"
          >
          <span
            class="switch"
            aria-hidden="true"
          />
          <span class="switch-text">
            <strong>允許訪客瀏覽展示頁</strong>
            <span class="hint">
              關閉後 <code>{{ publicPath }}</code> 會回傳 404，圖片也無法單獨取得。
            </span>
          </span>
        </label>
      </section>

      <section class="card">
        <div class="card-header">
          <h2>來源 IP 白名單</h2>
          <span
            class="badge"
            :class="{ 'badge-active': !hasAllowlist }"
          >{{ hasAllowlist ? '已限制' : '不限來源' }}</span>
        </div>

        <p class="description">
          每行一個 IP 或 CIDR，例如 <code>203.0.113.10</code> 或 <code>10.0.0.0/8</code>。
          留空表示不限制來源；不支援萬用字元。
        </p>

        <div class="ip-toolbar">
          <span class="hint">
            目前偵測到的來源 IP：<code>{{ detectedIp || '未知' }}</code>
          </span>
          <BaseButton
            variant="outline-secondary"
            size="sm"
            :disabled="!detectedIp || detectedIp === '0.0.0.0'"
            @click="addDetectedIp"
          >
            加入白名單
          </BaseButton>
        </div>

        <textarea
          v-model="form.allowed_ips"
          class="ip-input"
          rows="7"
          spellcheck="false"
          placeholder="203.0.113.10&#10;10.0.0.0/8"
        />

        <p class="hint">
          後端依 <code>X-Forwarded-For</code> 判斷真實訪客 IP。若經過 NPM／Cloudflare，
          請確認它們有轉發此標頭，否則所有請求都會被視為代理的 IP。
        </p>
      </section>

      <section class="card">
        <h2>公開網址</h2>

        <div class="url-row">
          <code class="url-value">{{ publicUrl }}</code>
          <BaseButton
            variant="primary"
            size="sm"
            :icon="copied ? CheckIcon : ClipboardDocumentIcon"
            @click="copyUrl"
          >
            {{ copied ? '已複製' : '複製' }}
          </BaseButton>
          <BaseButton
            variant="outline-secondary"
            size="sm"
            @click="openPage"
          >
            開啟
          </BaseButton>
        </div>

        <p class="description">
          NPM 只要把 <code>{{ publicPath }}</code> 與 <code>{{ imagePath }}</code>
          代理到本專案的 <code>APP_PORT</code>（或整個網域代理）即可，路徑需保留。
        </p>

        <p class="hint">
          上傳的圖片存在伺服器的 <code>writable/uploads/showcase/</code>，
          未上傳時顯示專案內建的 <code>backend/resources/showcase/261023_v1.png</code>；
          頁面與圖片共用同一組開關與 IP 白名單。
        </p>
      </section>

      <div class="actions">
        <BaseButton
          variant="primary"
          :loading="saving"
          :disabled="!dirty"
          @click="handleSave"
        >
          儲存設定
        </BaseButton>
        <BaseButton
          variant="ghost"
          :disabled="!dirty || saving"
          @click="handleReset"
        >
          還原
        </BaseButton>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  PhotoIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'
import { publicPageService } from '@/services/api'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/BaseButton.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const copied = ref(false)
const detectedIp = ref('')
const publicPath = ref('/showcase')
const imagePath = ref('/showcase/image')
const imageUrl = ref('/showcase/image')
const imageSource = ref('default')
const selectedFile = ref(null)
const fileInput = ref(null)

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const form = reactive({
  is_enabled: false,
  allowed_ips: ''
})

const saved = ref({
  is_enabled: false,
  allowed_ips: ''
})

const publicUrl = computed(() => `${window.location.origin}${publicPath.value}`)
const hasAllowlist = computed(() => form.allowed_ips.trim() !== '')
const dirty = computed(
  () => form.is_enabled !== saved.value.is_enabled || form.allowed_ips !== saved.value.allowed_ips
)

function errorMessage(error, fallback) {
  return error.response?.data?.messages?.error || error.response?.data?.message || fallback
}

function applySettings(data) {
  form.is_enabled = Boolean(data.is_enabled)
  form.allowed_ips = data.allowed_ips || ''
  saved.value = {
    is_enabled: form.is_enabled,
    allowed_ips: form.allowed_ips
  }
  detectedIp.value = data.detected_ip || ''
  publicPath.value = data.public_path || '/showcase'
  imagePath.value = data.image_path || '/showcase/image'
  imageUrl.value = data.image_url || imagePath.value
  imageSource.value = data.image_source || 'default'
}

async function fetchSettings() {
  try {
    const response = await publicPageService.getSettings()
    applySettings(response.data.data)
  } catch (error) {
    console.error('Failed to load showcase settings:', error)
    toast.error(errorMessage(error, '無法載入公開展示頁設定'))
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    const response = await publicPageService.updateSettings({
      is_enabled: form.is_enabled,
      allowed_ips: form.allowed_ips
    })
    applySettings(response.data.data)
    toast.success('公開展示頁設定已儲存')
  } catch (error) {
    console.error('Failed to save showcase settings:', error)
    toast.error(errorMessage(error, '儲存失敗'))
  } finally {
    saving.value = false
  }
}

function handleReset() {
  form.is_enabled = saved.value.is_enabled
  form.allowed_ips = saved.value.allowed_ips
}

function handleFileChange(event) {
  const file = event.target.files?.[0] || null

  if (file && file.size > MAX_IMAGE_BYTES) {
    toast.error('圖片不可超過 10 MB')
    event.target.value = ''
    selectedFile.value = null
    return
  }

  selectedFile.value = file
}

async function handleUpload() {
  if (!selectedFile.value) return

  uploading.value = true
  try {
    const response = await publicPageService.uploadImage(selectedFile.value)
    applySettings(response.data.data)
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    toast.success('展示圖片已更新')
  } catch (error) {
    console.error('Failed to upload showcase image:', error)
    toast.error(errorMessage(error, '圖片上傳失敗'))
  } finally {
    uploading.value = false
  }
}

async function handleResetImage() {
  uploading.value = true
  try {
    const response = await publicPageService.resetImage()
    applySettings(response.data.data)
    toast.success('已還原為預設圖片')
  } catch (error) {
    console.error('Failed to reset showcase image:', error)
    toast.error(errorMessage(error, '還原預設圖片失敗'))
  } finally {
    uploading.value = false
  }
}

function addDetectedIp() {
  const ip = detectedIp.value.trim()
  if (!ip || ip === '0.0.0.0') return

  const entries = form.allowed_ips.split(/[\s,]+/).filter(Boolean)

  if (entries.includes(ip)) {
    toast.info('目前 IP 已在白名單中')
    return
  }

  form.allowed_ips = [...entries, ip].join('\n')
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    copied.value = true
    toast.success('網址已複製')
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    toast.error('複製失敗，請手動選取複製')
  }
}

function openPage() {
  window.open(publicUrl.value, '_blank', 'noopener')
}

onMounted(fetchSettings)
</script>

<style scoped>
.showcase-settings {
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

.hint {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.switch-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
}

.switch-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.switch {
  position: relative;
  flex-shrink: 0;
  width: 52px;
  height: 30px;
  margin-top: 2px;
  border-radius: var(--radius-full);
  background: var(--cream-400);
  transition: background-color 0.2s ease;
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(38, 28, 18, 0.25);
  transition: transform 0.2s ease;
}

.switch-input:checked + .switch {
  background: var(--color-brand-primary);
}

.switch-input:checked + .switch::after {
  transform: translateX(22px);
}

.switch-input:focus-visible + .switch {
  outline: 2px solid var(--color-brand-primary-dark);
  outline-offset: 2px;
}

.switch-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.switch-text strong {
  color: var(--text-primary);
  font-weight: 600;
}

.ip-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.ip-input {
  width: 100%;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--cream-50);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--font-size-sm);
  line-height: 1.6;
  resize: vertical;
}

.ip-input:focus {
  outline: none;
  border-color: var(--amber-400);
}

.image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: #ffffff;
}

.image-preview img {
  display: block;
  max-width: 100%;
  max-height: 320px;
  width: auto;
  height: auto;
}

.file-input {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.file-input::file-selector-button {
  margin-right: var(--space-3);
  padding: 8px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--cream-100);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
}

.url-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.url-value {
  flex: 1;
  min-width: 220px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--cream-200);
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--cream-200);
  font-size: 0.9em;
}
</style>
