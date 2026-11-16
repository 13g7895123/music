// 【KTV】content script 主程式：
// 注入 hook 拿字幕 → 斷詞／羅馬拼音 → 在播放器上顯示 KTV 字幕；右下角控制面板。
(() => {
  const extApi = globalThis.browser ?? globalThis.chrome;
  const K = globalThis.ylpKtv;
  const SOURCE = 'ylp-captions';
  const TRANSLATE_LANG = 'zh-Hant';
  const LOG = (...args) => console.log('[ylp-ktv]', ...args);

  const DEFAULTS = {
    enabled: false, // 開過一次之後，換影片會自動開啟
    romaji: true,
    zh: true,
    jaMode: 'ruby', // ruby：漢字＋假名｜plain：原文｜kana：全部假名｜off：隱藏
    follow: false, // 跟讀：每句結束自動暫停
    rate: 1,
  };
  let settings = { ...DEFAULTS };

  // ---------- 注入 hook ----------
  const script = document.createElement('script');
  script.src = extApi.runtime.getURL('ktv/hook.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // ---------- 狀態 ----------
  let videoId = null;
  let tracks = null; // null = 尚未讀取
  let sourceUrl = null;
  let ja = [];
  let zh = [];
  let annotatingFor = null; // 送去背景分析中的那份字幕
  let translationRequested = false;
  let status = '';
  const annotations = new Map(); // cue → tokens

  // 播放顯示
  let shownIdx = -1;
  let holdIdx = null; // 跟讀暫停時，固定顯示剛念完的那句
  let pausedFor = -1;
  let seekGuard = null; // { time, until, seeked }
  let lineEls = null; // { idx, sweeps: [{ el, s, e, p }] }

  // ---------- 與 hook 溝通 ----------
  let nextId = 1;
  const pending = new Map();
  function send(action, data = {}) {
    const id = nextId++;
    window.postMessage({ source: SOURCE + '-cmd', action, id, ...data }, location.origin);
    return new Promise((resolve) => {
      pending.set(id, resolve);
      setTimeout(() => pending.delete(id) && resolve(null), 10000);
    });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== SOURCE) return;
    const msg = event.data;
    if (msg.type === 'timedtext') return handleTimedText(msg);
    if (msg.type === 'error') LOG('hook 錯誤', msg.error);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });

  // ---------- 字幕 ----------
  // 換影片時，播放器可能在 yt-navigate-finish 之前就載好字幕 → 先暫存，換好影片再處理
  const early = [];

  function handleTimedText(msg) {
    const { url, body } = msg;
    const params = new URL(url).searchParams;
    if (params.get('v') && params.get('v') !== videoId) {
      early.push(msg);
      if (early.length > 6) early.shift();
      return;
    }
    const lang = params.get('lang') || '';
    const tlang = params.get('tlang') || '';

    let cues;
    try {
      cues = K.parseJson3(body);
    } catch (err) {
      LOG('字幕解析失敗', err, url);
      return;
    }
    LOG(`timedtext lang=${lang} tlang=${tlang || '-'} kind=${params.get('kind') || '-'} → ${cues.length} 句`);
    if (!cues.length) {
      if (lang.startsWith('ja') && !tlang) setStatus('⚠️ YouTube 回傳的字幕是空的（請確認已登入 YouTube）');
      return;
    }

    if (tlang.startsWith('zh')) {
      zh = cues;
    } else if (!tlang && lang.startsWith('ja')) {
      sourceUrl = url;
      ja = cues;
      resetLine();
      setStatus(cueSummary());
      if (settings.enabled) {
        requestAnnotations();
        fetchTranslation();
      }
    }
    renderPanel();
  }

  async function loadTracks() {
    for (let i = 0; i < 10; i++) {
      const res = await send('tracks');
      if (res?.videoId === videoId) {
        tracks = res.tracks;
        LOG('字幕軌', tracks);
        return tracks;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    tracks = [];
    return tracks;
  }

  function cueSummary() {
    return `日文 ${ja.length} 句${ja[0]?.wordTimed ? '（逐字時間）' : '（整句時間，逐字為估計）'}`;
  }

  // 整部影片的句子一次送到背景斷詞（辭典解壓很重，不能在 YouTube 頁面裡做）
  async function requestAnnotations() {
    if (!ja.length || annotatingFor === ja) return;
    const cues = ja;
    annotatingFor = cues;
    setStatus('分析讀音中…（第一次載入辭典約需幾秒）');
    let res;
    try {
      res = await extApi.runtime.sendMessage({ type: 'ktvAnnotate', texts: cues.map((c) => c.text) });
    } catch (err) {
      res = { ok: false, error: err.message };
    }
    if (cues !== ja) return; // 已經換影片
    if (!res?.ok) {
      annotatingFor = null;
      LOG('讀音分析失敗', res?.error);
      setStatus(`⚠️ 讀音分析失敗，只顯示原文（${res?.error ?? '沒有回應'}）`);
      return;
    }
    cues.forEach((cue, i) => annotations.set(cue, res.data[i]));
    resetLine();
    setStatus(cueSummary());
  }

  async function fetchTranslation() {
    if (!sourceUrl || translationRequested) return;
    translationRequested = true;
    const url = new URL(sourceUrl);
    url.searchParams.set('fmt', 'json3');
    url.searchParams.set('tlang', TRANSLATE_LANG);
    const res = await send('fetch', { url: url.href });
    try {
      const cues = K.parseJson3(res?.body);
      if (cues.length) zh = cues;
      LOG(`中文翻譯 ${cues.length} 句`);
    } catch (err) {
      LOG('中文翻譯解析失敗', err);
    }
    renderPanel();
  }

  // ---------- 開始／停止 ----------
  async function start() {
    settings.enabled = true;
    saveSettings();
    document.documentElement.classList.add('ylp-ktv-on');
    applyRate();
    renderPanel();

    if (ja.length) {
      requestAnnotations();
      fetchTranslation();
      return;
    }
    if (tracks === null) await loadTracks();
    if (!tracks.some((t) => t.languageCode.startsWith('ja'))) {
      setStatus('這部影片沒有日文字幕');
      return;
    }
    setStatus('開啟日文字幕中…');
    const res = await send('enable', { lang: 'ja' });
    if (!res?.ok) setStatus(`⚠️ 開啟日文字幕失敗：${res?.error ?? '沒有回應'}`);
  }

  function stop() {
    settings.enabled = false;
    saveSettings();
    if (settings.rate !== 1) send('rate', { rate: 1 }); // 慢速是 KTV 的功能，停止時恢復正常速度
    document.documentElement.classList.remove('ylp-ktv-on');
    overlay?.remove();
    resetLine();
    renderPanel();
  }

  // ---------- 設定 ----------
  async function loadSettings() {
    try {
      const stored = await extApi.storage.local.get({ ktv: DEFAULTS });
      settings = { ...DEFAULTS, ...stored.ktv };
    } catch (err) {
      LOG('讀取設定失敗', err);
    }
  }

  function saveSettings() {
    extApi.storage.local.set({ ktv: settings }).catch?.((err) => LOG('儲存設定失敗', err));
  }

  function video() {
    return document.querySelector('#movie_player video.html5-main-video') || document.querySelector('video.html5-main-video');
  }

  // KTV 速度是 1× 時不主動設定，避免蓋掉使用者在 YouTube 原生選單選的速度；
  // force：使用者剛在面板改了速度（包含改回 1×）
  function applyRate(force = false) {
    if (settings.enabled && (force || settings.rate !== 1)) send('rate', { rate: settings.rate });
  }

  // ---------- KTV 字幕（播放器上方） ----------
  let overlay = null;
  let resizeObserver = null;

  function ensureOverlay() {
    const host = document.getElementById('movie_player');
    if (!host) return null;
    if (overlay?.isConnected && overlay.parentElement === host) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'ylp-ktv';
    overlay.innerHTML = '<div class="ylp-ktv-line"></div><div class="ylp-ktv-zh"></div>';
    host.appendChild(overlay);
    // 字級跟著播放器大小（一般／劇院／全螢幕）
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => {
      overlay.style.fontSize = Math.round(Math.min(56, Math.max(20, host.clientWidth * 0.036))) + 'px';
    });
    resizeObserver.observe(host);
    resetLine();
    return overlay;
  }

  function resetLine() {
    lineEls = null;
    shownIdx = -1;
  }

  function tokensFor(idx) {
    const cue = ja[idx];
    // 讀音還沒分析好：整句當一個詞，只顯示原文
    return annotations.get(cue) ?? [{ surface: cue.text, from: 0, to: [...cue.text].length, kana: null, romaji: '', ruby: [{ text: cue.text, rt: null }], isWord: true }];
  }


  function sweepSpan(cls, text, s, e, sweeps) {
    const el = document.createElement('span');
    el.className = `ylp-sw ${cls}`;
    el.textContent = text;
    sweeps.push({ el, s, e, p: -1 });
    return el;
  }

  function buildLine(idx) {
    const cue = ja[idx];
    const tokens = tokensFor(idx);
    const sweeps = [];
    const line = overlay.querySelector('.ylp-ktv-line');
    line.textContent = '';
    line.dataset.mode = settings.jaMode;

    const range = (from, to) => [K.charRange(cue, from)[0], K.charRange(cue, Math.max(from, to - 1))[1]];

    for (const tk of tokens) {
      const [ts, te] = range(tk.from, tk.to);
      const box = document.createElement('span');
      box.className = tk.isWord ? 'ylp-tok' : 'ylp-tok ylp-sym';

      if (settings.romaji) {
        box.appendChild(tk.romaji ? sweepSpan('ylp-ro', tk.romaji, ts, te, sweeps) : Object.assign(document.createElement('span'), { className: 'ylp-ro', textContent: ' ' }));
      }

      if (settings.jaMode !== 'off') {
        const jaEl = document.createElement('span');
        jaEl.className = 'ylp-ja';
        if (settings.jaMode === 'kana' && tk.kana) {
          // 全部假名：時間平均分到每個假名
          const kana = [...tk.kana];
          kana.forEach((ch, k) => {
            const s = ts + ((te - ts) * k) / kana.length;
            jaEl.appendChild(sweepSpan('', ch, s, ts + ((te - ts) * (k + 1)) / kana.length, sweeps));
          });
        } else {
          let offset = tk.from;
          for (const part of tk.ruby) {
            const chars = [...part.text];
            const holder = part.rt && settings.jaMode === 'ruby' ? document.createElement('ruby') : jaEl;
            chars.forEach((ch, k) => holder.appendChild(sweepSpan('', ch, ...K.charRange(cue, offset + k), sweeps)));
            if (holder !== jaEl) {
              const rt = document.createElement('rt');
              const [rs, re] = range(offset, offset + chars.length);
              rt.appendChild(sweepSpan('', part.rt, rs, re, sweeps));
              holder.appendChild(rt);
              jaEl.appendChild(holder);
            }
            offset += chars.length;
          }
        }
        box.appendChild(jaEl);
      }
      line.appendChild(box);
    }
    lineEls = { idx, sweeps };
  }

  function updateSweeps(t) {
    for (const sw of lineEls.sweeps) {
      const p = t <= sw.s ? 0 : t >= sw.e ? 100 : Math.round(((t - sw.s) / (sw.e - sw.s)) * 100);
      if (p !== sw.p) {
        sw.p = p;
        sw.el.style.setProperty('--p', p + '%');
      }
    }
  }

  function tick() {
    requestAnimationFrame(tick);
    if (!settings.enabled || !videoId || !ja.length) return;
    const v = video();
    if (!v || !ensureOverlay()) return;
    const t = v.currentTime;

    // 剛按上一句／重播／下一句：跳轉生效前時間還停在舊位置，先不要判斷（否則跟讀會立刻又暫停）
    if (seekGuard) {
      const landed = seekGuard.seeked && Math.abs(t - seekGuard.time) < 1;
      if (!landed && performance.now() < seekGuard.until) return;
      seekGuard = null;
    }

    // 跟讀：顯示中的句子念完就暫停
    if (settings.follow && !v.paused && shownIdx >= 0 && pausedFor !== shownIdx && t >= ja[shownIdx].end - 0.03) {
      send('pause'); // 走播放器 API；直接 v.pause() 會讓播放器以為還在播，之後 playVideo() 沒反應
      pausedFor = shownIdx;
      holdIdx = shownIdx;
    }

    const idx = holdIdx ?? K.cueIndexAt(ja, t);
    if (idx !== shownIdx || !lineEls) {
      shownIdx = idx;
      if (idx < 0) {
        overlay.querySelector('.ylp-ktv-line').textContent = '';
        lineEls = { idx, sweeps: [] };
      } else {
        buildLine(idx);
      }
    }
    updateSweeps(holdIdx !== null ? Infinity : t);

    const zhEl = overlay.querySelector('.ylp-ktv-zh');
    const zhIdx = settings.zh && idx >= 0 ? K.cueIndexAt(zh, (ja[idx].start + Math.min(ja[idx].end, ja[idx].start + 1.5)) / 2) : -1;
    const zhText = zhIdx >= 0 ? zh[zhIdx].text : '';
    if (zhEl.textContent !== zhText) zhEl.textContent = zhText;
  }

  function seekCue(delta) {
    const v = video();
    if (!v || !ja.length) return;
    const base = shownIdx >= 0 ? shownIdx : Math.max(0, K.cueIndexAt(ja, v.currentTime));
    const target = Math.min(ja.length - 1, Math.max(0, base + delta));
    holdIdx = null;
    pausedFor = -1;
    resetLine();
    seekGuard = { time: ja[target].start, until: performance.now() + 2000, seeked: false };
    send('seek', { time: ja[target].start, play: true });
  }

  document.addEventListener(
    'play',
    (e) => {
      if (e.target === video()) holdIdx = null;
    },
    true,
  );
  document.addEventListener(
    'seeked',
    (e) => {
      if (e.target !== video()) return;
      holdIdx = null;
      pausedFor = -1;
      if (seekGuard) seekGuard.seeked = true;
    },
    true,
  );
  document.addEventListener(
    'loadeddata',
    (e) => {
      if (e.target === video()) applyRate();
    },
    true,
  );

  // ---------- 控制面板（右下角） ----------
  let panel = null;

  function setStatus(text) {
    status = text;
    renderPanel();
  }

  function ensurePanel() {
    if (panel?.isConnected) return panel;
    panel = document.createElement('div');
    panel.id = 'ylp-ktv-panel';
    panel.innerHTML = `
      <div class="ylp-kp-head">
        <span>🎤 日文 KTV</span>
        <button data-act="collapse" title="縮小／展開">−</button>
      </div>
      <div class="ylp-kp-body">
        <div class="ylp-kp-status"></div>
        <button class="ylp-kp-main" data-act="toggle"></button>
        <div class="ylp-kp-row">
          <label><input type="checkbox" data-set="romaji"> 羅馬拼音</label>
          <label><input type="checkbox" data-set="zh"> 中文</label>
        </div>
        <div class="ylp-kp-row">
          <label>日文
            <select data-set="jaMode">
              <option value="ruby">漢字＋假名</option>
              <option value="plain">只有原文</option>
              <option value="kana">全部假名</option>
              <option value="off">隱藏</option>
            </select>
          </label>
          <label>速度
            <select data-set="rate">
              <option value="1">1×</option>
              <option value="0.75">0.75×</option>
              <option value="0.5">0.5×</option>
            </select>
          </label>
        </div>
        <div class="ylp-kp-row">
          <label title="每句念完自動暫停，按播放繼續"><input type="checkbox" data-set="follow"> 跟讀（每句暫停）</label>
        </div>
        <div class="ylp-kp-row ylp-kp-nav">
          <button data-act="prev" title="上一句">⏮ 上一句</button>
          <button data-act="replay" title="重播這句">⟲ 重播</button>
          <button data-act="next" title="下一句">下一句 ⏭</button>
        </div>
      </div>`;

    panel.addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (act === 'collapse') panel.classList.toggle('ylp-collapsed');
      if (act === 'toggle') (settings.enabled ? stop : start)();
      if (act === 'prev') seekCue(-1);
      if (act === 'replay') seekCue(0);
      if (act === 'next') seekCue(1);
    });
    panel.addEventListener('change', (e) => {
      const key = e.target.dataset.set;
      if (!key) return;
      settings[key] = e.target.type === 'checkbox' ? e.target.checked : key === 'rate' ? Number(e.target.value) : e.target.value;
      saveSettings();
      if (key === 'rate') applyRate(true);
      if (key === 'follow') pausedFor = shownIdx; // 剛打開時不要立刻暫停目前這句
      resetLine();
    });
    document.body.appendChild(panel);
    return panel;
  }

  function renderPanel() {
    if (!videoId || !document.body) {
      panel?.remove();
      return;
    }
    const el = ensurePanel();
    el.classList.toggle('ylp-on', settings.enabled);
    el.querySelector('.ylp-kp-main').textContent = settings.enabled ? '停止 KTV' : '開始 KTV';
    const counts = settings.enabled && ja.length ? `｜中文 ${zh.length} 句` : '';
    el.querySelector('.ylp-kp-status').textContent = (status || (settings.enabled ? '' : '按「開始 KTV」顯示日文字幕')) + counts;
    for (const input of el.querySelectorAll('[data-set]')) {
      const value = settings[input.dataset.set];
      if (input.type === 'checkbox') input.checked = !!value;
      else input.value = String(value);
    }
  }

  // ---------- 換影片（YouTube 是 SPA） ----------
  function onNavigate() {
    const v = location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null;
    if (v === videoId) return;
    videoId = v;
    tracks = null;
    sourceUrl = null;
    ja = [];
    zh = [];
    translationRequested = false;
    annotations.clear();
    annotatingFor = null;
    holdIdx = null;
    pausedFor = -1;
    status = '';
    resetLine();
    overlay?.querySelector('.ylp-ktv-line')?.replaceChildren();
    renderPanel();
    if (!v) return;
    for (const msg of early.splice(0)) {
      if (new URL(msg.url).searchParams.get('v') === v) handleTimedText(msg);
    }
    if (settings.enabled) setTimeout(start, 1000);
  }

  loadSettings().then(() => {
    document.addEventListener('yt-navigate-finish', onNavigate);
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', onNavigate);
    else onNavigate();
    requestAnimationFrame(tick);
  });
})();
