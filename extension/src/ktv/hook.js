// 【KTV】注入到 YouTube 頁面本身（MAIN world）執行。
// YouTube 的字幕網址需要播放器產生的 pot token，直接抓會拿到空內容，
// 所以改成攔截播放器自己發出的 /api/timedtext 請求，把回應轉交給 content script。
(() => {
  if (window.__ylpCaptionHook) return;
  window.__ylpCaptionHook = true;

  const SOURCE = 'ylp-captions';
  const isTimedText = (url) => typeof url === 'string' && url.includes('/api/timedtext');

  function post(payload) {
    window.postMessage({ source: SOURCE, ...payload }, location.origin);
  }

  // --- XHR ---
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__ylpUrl = String(url);
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (isTimedText(this.__ylpUrl)) {
      this.addEventListener('load', () => {
        try {
          post({ type: 'timedtext', via: 'xhr', url: new URL(this.__ylpUrl, location.href).href, body: this.responseText });
        } catch (err) {
          post({ type: 'error', error: String(err) });
        }
      });
    }
    return origSend.apply(this, args);
  };

  // --- fetch ---
  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    const response = await origFetch.call(this, input, init);
    if (isTimedText(url) && !init?.__ylpInternal) {
      response.clone().text().then(
        (body) => post({ type: 'timedtext', via: 'fetch', url: new URL(url, location.href).href, body }),
        () => {},
      );
    }
    return response;
  };

  function player() {
    return document.getElementById('movie_player');
  }

  // content script 下的指令
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.data?.source !== SOURCE + '-cmd') return;
    const { action, id } = event.data;

    if (action === 'tracks') {
      const resp = player()?.getPlayerResponse?.();
      const tracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      post({
        type: 'tracks',
        id,
        videoId: resp?.videoDetails?.videoId ?? null,
        tracks: tracks.map((t) => ({ languageCode: t.languageCode, kind: t.kind || '', name: t.name?.simpleText || '' })),
      });
    }

    if (action === 'enable') {
      // 讓播放器自己開啟日文字幕 → 觸發帶 pot 的 timedtext 請求
      const p = player();
      try {
        p?.loadModule?.('captions');
        const list = p?.getOption?.('captions', 'tracklist') ?? [];
        const track =
          list.find((t) => t.languageCode === event.data.lang && t.kind !== 'asr') ||
          list.find((t) => t.languageCode === event.data.lang) ||
          { languageCode: event.data.lang };
        p?.setOption?.('captions', 'track', track);
        post({ type: 'enabled', id, ok: true, track: { languageCode: track.languageCode, kind: track.kind || '' } });
      } catch (err) {
        post({ type: 'enabled', id, ok: false, error: String(err) });
      }
    }

    // 播放控制要走播放器 API；直接改 <video>.currentTime 會被 YouTube 播放器蓋回去
    if (action === 'seek') {
      const p = player();
      p?.seekTo?.(event.data.time, true);
      if (event.data.play) p?.playVideo?.();
      post({ type: 'seeked', id, ok: !!p?.seekTo });
    }

    if (action === 'pause') {
      player()?.pauseVideo?.();
      post({ type: 'paused', id, ok: true });
    }

    if (action === 'rate') {
      player()?.setPlaybackRate?.(event.data.rate);
      post({ type: 'rate', id, ok: true });
    }

    if (action === 'fetch') {
      // 用攔截到的（帶 pot 的）網址改參數再抓，例如加 tlang 取得翻譯
      try {
        const res = await origFetch(event.data.url, { credentials: 'include' });
        post({ type: 'fetched', id, status: res.status, body: await res.text() });
      } catch (err) {
        post({ type: 'fetched', id, status: 0, body: '', error: String(err) });
      }
    }
  });

  post({ type: 'ready' });
})();
