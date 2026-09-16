const form = document.getElementById('form');
const siteUrlInput = document.getElementById('site-url');
const tokenInput = document.getElementById('token');
const toggleButton = document.getElementById('toggle-token');
const testButton = document.getElementById('test');
const saveButton = document.getElementById('save');
const message = document.getElementById('message');
const tokenPageLink = document.getElementById('token-page-link');

function showMessage(text, kind) {
  message.textContent = text;
  message.className = `message ${kind}`;
  message.hidden = false;
}

function readForm() {
  return {
    siteUrl: normalizeSiteUrl(siteUrlInput.value),
    token: tokenInput.value.trim(),
  };
}

function updateTokenPageLink() {
  const base = normalizeSiteUrl(siteUrlInput.value);
  tokenPageLink.hidden = !base;
  if (base) tokenPageLink.href = `${base}/extension`;
}

async function testConnection({ siteUrl, token }) {
  if (!siteUrl || !token) {
    showMessage('請先填寫網站網址與 Token', 'bad');
    return null;
  }
  const result = await ext.runtime.sendMessage({ type: 'testConnection', siteUrl, token });
  if (!result.ok) {
    showMessage(`連線失敗：${result.error}`, 'bad');
    return null;
  }
  return result.data;
}

async function init() {
  const settings = await getSettings();
  siteUrlInput.value = settings.siteUrl;
  tokenInput.value = settings.token;
  updateTokenPageLink();

  siteUrlInput.addEventListener('input', updateTokenPageLink);

  toggleButton.addEventListener('click', () => {
    const show = tokenInput.type === 'password';
    tokenInput.type = show ? 'text' : 'password';
    toggleButton.textContent = show ? '隱藏' : '顯示';
  });

  testButton.addEventListener('click', async () => {
    testButton.disabled = true;
    const me = await testConnection(readForm());
    testButton.disabled = false;
    if (me) showMessage(`連線成功：${me.display_name}（影片庫 ${me.video_count} 部）`, 'ok');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm();
    if (!values.siteUrl) {
      showMessage('網站網址格式不正確', 'bad');
      return;
    }
    saveButton.disabled = true;
    const me = await testConnection(values);
    if (me) {
      await saveSettings(values);
      siteUrlInput.value = values.siteUrl;
      showMessage(`已儲存，並連線為 ${me.display_name}`, 'ok');
    }
    saveButton.disabled = false;
  });
}

init();
