const $ = (id) => document.getElementById(id);

const els = {
  status: $('status'),
  unconfigured: $('unconfigured'),
  current: $('current'),
  noVideo: $('no-video'),
  manual: $('manual'),
  manualForm: $('manual-form'),
  manualUrl: $('manual-url'),
  thumb: $('thumb'),
  videoTitle: $('video-title'),
  videoId: $('video-id'),
  addCurrent: $('add-current'),
  message: $('message'),
  openLibrary: $('open-library'),
};

let currentVideo = null;

function send(message) {
  return ext.runtime.sendMessage(message);
}

function showMessage(text, kind) {
  els.message.textContent = text;
  els.message.className = `message ${kind}`;
  els.message.hidden = false;
}

function setAddButton(state) {
  const labels = { idle: '加入影片庫', loading: '加入中…', added: '已在影片庫' };
  els.addCurrent.textContent = labels[state];
  els.addCurrent.disabled = state !== 'idle';
  els.addCurrent.classList.toggle('added', state === 'added');
}

async function loadCurrentTab() {
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  const videoId = tab?.url ? extractVideoId(tab.url) : null;

  if (!videoId) {
    els.noVideo.hidden = false;
    return;
  }

  currentVideo = {
    video_id: videoId,
    title: cleanYouTubeTitle(tab.title),
    thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };

  els.thumb.src = currentVideo.thumbnail_url;
  els.videoTitle.textContent = currentVideo.title || videoId;
  els.videoId.textContent = videoId;
  els.current.hidden = false;
  setAddButton('loading');

  const result = await send({ type: 'checkVideo', videoId });
  setAddButton(result.ok && result.data.exists ? 'added' : 'idle');
}

async function addVideo(video) {
  const result = await send({ type: 'addVideo', video });
  if (result.ok) {
    showMessage(`已加入：${result.data.title}`, 'ok');
    return true;
  }
  if (result.status === 409) {
    showMessage('這部影片已經在影片庫裡了', 'ok');
    return true;
  }
  showMessage(result.error, 'bad');
  return false;
}

async function init() {
  els.openLibrary.addEventListener('click', async (event) => {
    event.preventDefault();
    const { siteUrl } = await getSettings();
    const base = normalizeSiteUrl(siteUrl);
    if (base) ext.tabs.create({ url: `${base}/library` });
  });
  $('open-options').addEventListener('click', () => ext.runtime.openOptionsPage());
  $('go-options').addEventListener('click', () => ext.runtime.openOptionsPage());

  const status = await send({ type: 'getStatus' });

  if (!status.ok) {
    els.status.textContent = status.error;
    els.status.className = 'status bad';
    els.unconfigured.hidden = false;
    return;
  }

  if (!status.data.configured) {
    els.status.textContent = '尚未設定';
    els.unconfigured.hidden = false;
    return;
  }

  const me = status.data.me;
  els.status.textContent = `${me.display_name}・影片庫 ${me.video_count} 部`;
  els.status.className = 'status ok';
  els.manual.hidden = false;

  els.addCurrent.addEventListener('click', async () => {
    setAddButton('loading');
    const ok = await addVideo(currentVideo);
    setAddButton(ok ? 'added' : 'idle');
  });

  els.manualForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const videoId = extractVideoId(els.manualUrl.value);
    if (!videoId) {
      showMessage('看不懂這個網址，請貼上 YouTube 影片網址', 'bad');
      return;
    }
    const button = els.manualForm.querySelector('button');
    button.disabled = true;
    const ok = await addVideo({ video_id: videoId });
    button.disabled = false;
    if (ok) els.manualUrl.value = '';
  });

  await loadCurrentTab();
}

init().catch((err) => showMessage(err.message, 'bad'));
