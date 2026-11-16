// 【KTV】斷詞＋讀音：kuromoji 斷詞取得讀音（片假名）→ wanakana 轉平假名／羅馬拼音。
(() => {
  const ns = (globalThis.ylpKtv ??= {});

  const KANJI = /[㐀-䶿一-鿿豈-﫿々〆ヵヶ]/;
  // 助詞的特殊念法（Hepburn）
  const PARTICLE_ROMAJI = { は: 'wa', へ: 'e', を: 'o' };

  let tokenizerPromise = null;

  // kuromoji 用 path.join 組網址，會把 chrome-extension:// 變成 chrome-extension:/
  const fixUrl = (url) => String(url).replace(/^([a-z-]+):\/(?!\/)/, '$1://');

  // Chrome 的 service worker 沒有 XMLHttpRequest：用 fetch 模擬 kuromoji 用到的那幾個欄位
  class FetchXHR {
    open(_method, url) {
      this.url = fixUrl(url);
    }
    send() {
      fetch(this.url)
        .then(async (res) => {
          this.status = res.status;
          this.statusText = res.statusText;
          this.response = await res.arrayBuffer();
          this.onload?.call(this);
        })
        .catch((err) => this.onerror?.(err));
    }
  }

  /**
   * 載入 kuromoji 辭典（約 18MB，解壓很吃 CPU → 只在擴充功能背景執行，不要在 YouTube 頁面裡跑）。
   * 載入期間暫時換掉 XMLHttpRequest，把網址修回來。
   */
  function loadTokenizer(dicUrl) {
    if (tokenizerPromise) return tokenizerPromise;
    tokenizerPromise = new Promise((resolve, reject) => {
      const Orig = globalThis.XMLHttpRequest;
      globalThis.XMLHttpRequest = Orig
        ? class extends Orig {
            open(method, url, ...rest) {
              return super.open(method, fixUrl(url), ...rest);
            }
          }
        : FetchXHR;
      const done = () => (globalThis.XMLHttpRequest = Orig);
      globalThis.kuromoji.builder({ dicPath: dicUrl }).build((err, tokenizer) => {
        done();
        if (err) {
          tokenizerPromise = null;
          reject(err);
        } else {
          resolve(tokenizer);
        }
      });
    });
    return tokenizerPromise;
  }

  // 漢字詞的讀音拆成 ruby：去掉跟原文相同的假名前後綴（送り仮名）
  // 例：食べる／たべる → [{食, た}, {べる}]
  function rubyParts(surface, kana) {
    const { toHiragana } = globalThis.wanakana;
    const s = [...surface];
    const k = [...kana];
    let head = 0;
    while (head < s.length && head < k.length && !KANJI.test(s[head]) && toHiragana(s[head]) === k[head]) head++;
    let tail = 0;
    while (
      tail < s.length - head &&
      tail < k.length - head &&
      !KANJI.test(s[s.length - 1 - tail]) &&
      toHiragana(s[s.length - 1 - tail]) === k[k.length - 1 - tail]
    ) tail++;

    const parts = [];
    if (head) parts.push({ text: s.slice(0, head).join(''), rt: null });
    const midText = s.slice(head, s.length - tail).join('');
    const midKana = k.slice(head, k.length - tail).join('');
    if (midText) parts.push({ text: midText, rt: midKana || null });
    if (tail) parts.push({ text: s.slice(s.length - tail).join(''), rt: null });
    return parts;
  }

  /**
   * @returns {{ surface, from, to, kana, romaji, ruby: {text, rt}[], isWord:boolean }[]}
   *   from/to = 在原句中的字元位置（以 code point 計），to 不含
   */
  function annotate(tokenizer, text) {
    const { toHiragana, toRomaji, isKatakana, isKana } = globalThis.wanakana;
    const chars = [...text];
    const tokens = [];
    let pos = 0;

    for (const tk of tokenizer.tokenize(text)) {
      const surface = tk.surface_form;
      const len = [...surface].length;
      const from = pos;
      pos += len;

      const isSpace = !surface.trim();
      const isSymbol = tk.pos === '記号' || isSpace;
      let kana = null;
      if (tk.reading && tk.reading !== '*') kana = isKatakana(surface) ? surface : toHiragana(tk.reading);
      else if (isKana(surface)) kana = surface;

      let romaji = '';
      if (!isSymbol) {
        if (tk.pos === '助詞' && PARTICLE_ROMAJI[surface]) romaji = PARTICLE_ROMAJI[surface];
        else if (kana) romaji = toRomaji(kana);
        else romaji = surface; // 英數字、未知詞
      }

      tokens.push({
        surface,
        from,
        to: from + len,
        kana,
        romaji,
        ruby: kana && KANJI.test(surface) ? rubyParts(surface, toHiragana(kana)) : [{ text: surface, rt: null }],
        isWord: !isSymbol,
        pos: tk.pos,
      });
    }

    // 保險：kuromoji 斷詞後的字數應該跟原句一致
    if (pos !== chars.length) console.warn('[ylp-ktv] 斷詞字數不一致', text, pos, chars.length);
    return tokens;
  }

  Object.assign(ns, { loadTokenizer, annotate, rubyParts });
})();
