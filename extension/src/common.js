// 共用工具：popup / options / content / background 都會載入（非 module，走全域）
const ext = globalThis.browser ?? globalThis.chrome;

const SETTINGS_DEFAULTS = { siteUrl: '', token: '' };

function getSettings() {
  return ext.storage.local.get(SETTINGS_DEFAULTS);
}

function saveSettings(settings) {
  return ext.storage.local.set(settings);
}

// 使用者輸入的網站網址 → 乾淨的 origin（去掉尾端斜線與多餘的 /api）
function normalizeSiteUrl(input) {
  let url = String(input || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    const parsed = new URL(url);
    let path = parsed.pathname.replace(/\/+$/, '').replace(/\/api$/i, '');
    return parsed.origin + path;
  } catch {
    return '';
  }
}

function apiUrl(siteUrl, path) {
  return normalizeSiteUrl(siteUrl) + '/api' + path;
}

function extractVideoId(input) {
  const value = String(input || '').trim();
  if (!value) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function cleanYouTubeTitle(title) {
  return String(title || '').replace(/\s*-\s*YouTube\s*$/i, '').trim();
}
