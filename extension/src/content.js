// 在 YouTube 影片頁的按鈕列注入「加入影片庫」按鈕
(() => {
  const BUTTON_ID = 'ylp-add-to-library';
  const HOST_SELECTORS = [
    '#actions #top-level-buttons-computed',
    'ytd-watch-metadata #actions-inner #menu',
    'ytd-watch-metadata #actions',
    '#owner',
  ];

  let currentVideoId = null;
  let state = 'idle';
  let button = null;

  async function sendMessage(message) {
    try {
      const response = await ext.runtime.sendMessage(message);
      return response ?? { ok: false, error: '沒有回應' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  function text(selector) {
    return document.querySelector(selector)?.textContent?.trim() || '';
  }

  function parseIsoDuration(iso) {
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
    if (!match) return null;
    return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
  }

  function collectVideoInfo(videoId) {
    const title =
      text('h1.ytd-watch-metadata yt-formatted-string') ||
      document.querySelector('meta[name="title"]')?.content ||
      cleanYouTubeTitle(document.title);

    const channelName =
      text('ytd-watch-metadata #owner ytd-channel-name a') ||
      text('ytd-video-owner-renderer #channel-name a') ||
      document.querySelector('span[itemprop="author"] link[itemprop="name"]')?.content ||
      '';

    const media = document.querySelector('video.html5-main-video');
    const duration =
      (media && Number.isFinite(media.duration) && media.duration > 0)
        ? Math.floor(media.duration)
        : parseIsoDuration(document.querySelector('meta[itemprop="duration"]')?.content);

    return {
      video_id: videoId,
      title,
      channel_name: channelName,
      thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration,
    };
  }

  function setState(next, label) {
    state = next;
    if (!button) return;
    button.dataset.state = next;
    button.disabled = next === 'loading' || next === 'added';
    const labels = {
      idle: '加入影片庫',
      loading: '加入中…',
      added: '已在影片庫',
      unconfigured: '設定擴充功能',
      error: label || '加入失敗',
    };
    button.querySelector('.ylp-label').textContent = labels[next] ?? labels.idle;
    if (next === 'error') {
      button.title = label || '';
      setTimeout(() => {
        if (state === 'error') setState('idle');
      }, 3000);
    } else {
      button.title = '';
    }
  }

  async function refreshState(videoId) {
    const response = await sendMessage({ type: 'checkVideo', videoId });
    if (videoId !== currentVideoId) return;
    if (!response.ok) {
      setState(response.status === 0 ? 'unconfigured' : 'idle');
      return;
    }
    setState(response.data.exists ? 'added' : 'idle');
  }

  async function handleClick() {
    if (state === 'unconfigured') {
      sendMessage({ type: 'openOptions' });
      return;
    }
    if (state !== 'idle' && state !== 'error') return;

    const videoId = currentVideoId;
    setState('loading');
    const response = await sendMessage({ type: 'addVideo', video: collectVideoInfo(videoId) });
    if (videoId !== currentVideoId) return;

    if (response.ok || response.status === 409) {
      setState('added');
    } else if (response.status === 0) {
      setState('unconfigured');
    } else {
      setState('error', response.error);
    }
  }

  function createButton() {
    const el = document.createElement('button');
    el.id = BUTTON_ID;
    el.type = 'button';
    el.className = 'ylp-add-btn';
    el.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>' +
      '<span class="ylp-label">加入影片庫</span>';
    el.addEventListener('click', handleClick);
    return el;
  }

  function mount() {
    const videoId = location.pathname === '/watch' ? extractVideoId(location.href) : null;

    if (!videoId) {
      button?.remove();
      button = null;
      currentVideoId = null;
      return;
    }

    const host = HOST_SELECTORS.map((s) => document.querySelector(s)).find(Boolean);
    if (!host) return;

    if (!button || !button.isConnected) {
      button = createButton();
      host.prepend(button);
    }

    if (videoId !== currentVideoId) {
      currentVideoId = videoId;
      setState('loading');
      refreshState(videoId);
    }
  }

  let scheduled = null;
  function scheduleMount() {
    if (scheduled) return;
    scheduled = setTimeout(() => {
      scheduled = null;
      mount();
    }, 300);
  }

  document.addEventListener('yt-navigate-finish', scheduleMount);
  new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });
  scheduleMount();
})();
