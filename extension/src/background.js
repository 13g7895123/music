// Chrome 的 service worker 需自行載入共用檔；Firefox 由 manifest 的 background.scripts 先載入
if (typeof importScripts === 'function') {
  importScripts('common.js');
}

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function apiRequest(path, { method = 'GET', body } = {}) {
  const { siteUrl, token } = await getSettings();
  if (!normalizeSiteUrl(siteUrl) || !token) {
    throw new ApiError('尚未設定網站網址或 Token', 0);
  }

  let response;
  try {
    response = await fetch(apiUrl(siteUrl, path), {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError('無法連線到伺服器，請確認網站網址', 0);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.messages?.error ||
      (response.status === 401 ? 'Token 無效，請重新設定' : `伺服器錯誤 (${response.status})`);
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

const handlers = {
  async getStatus() {
    const { siteUrl, token } = await getSettings();
    if (!normalizeSiteUrl(siteUrl) || !token) {
      return { configured: false };
    }
    const payload = await apiRequest('/extension/me');
    return { configured: true, siteUrl: normalizeSiteUrl(siteUrl), me: payload.data };
  },

  async testConnection({ siteUrl, token }) {
    const response = await fetch(apiUrl(siteUrl, '/extension/me'), {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(payload?.message || `連線失敗 (${response.status})`, response.status);
    }
    return payload.data;
  },

  async checkVideo({ videoId }) {
    const payload = await apiRequest(`/extension/videos/check?video_id=${encodeURIComponent(videoId)}`);
    return payload.data;
  },

  async addVideo({ video }) {
    const payload = await apiRequest('/extension/videos', { method: 'POST', body: video });
    return payload.data;
  },

  async openOptions() {
    await ext.runtime.openOptionsPage();
    return true;
  },
};

ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) {
    sendResponse({ ok: false, error: `未知的訊息類型: ${message?.type}` });
    return false;
  }

  handler(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) =>
      sendResponse({
        ok: false,
        error: err.message || String(err),
        status: err.status ?? 0,
        payload: err.payload ?? null,
      })
    );
  return true;
});

ext.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    ext.runtime.openOptionsPage();
  }
});
