// 【KTV】把 YouTube timedtext（json3）解析成句子，並保留每個字的開始時間。
// - 自動字幕（asr）的 segs 帶 tOffsetMs → 逐字（詞）時間
// - 人工字幕通常只有整句時間 → 依字數平均分配
(() => {
  const ns = (globalThis.ylpKtv ??= {});

  const MAX_CHAR_SECONDS = 0.35; // 一句最後一個詞後面常有空白，不要讓它拖太長

  /**
   * @returns {{ start:number, end:number, text:string, times:number[], wordTimed:boolean }[]}
   *   times[i] = 第 i 個字開始的秒數；字的結束 = times[i+1]（最後一字 = end）
   */
  function parseJson3(body) {
    if (!body) return [];
    const data = typeof body === 'string' ? JSON.parse(body) : body;

    const raw = [];
    for (const ev of data.events ?? []) {
      if (!ev.segs) continue;
      const start = (ev.tStartMs ?? 0) / 1000;
      const end = start + (ev.dDurationMs ?? 0) / 1000;
      const segs = ev.segs
        .map((s) => ({ text: (s.utf8 ?? '').replace(/\n/g, ' '), start: start + (s.tOffsetMs ?? 0) / 1000 }))
        .filter((s) => s.text.length);
      if (!segs.some((s) => s.text.trim())) continue;
      raw.push({ start, end, segs, wordTimed: segs.length > 1 && ev.segs.some((s) => s.tOffsetMs) });
    }
    raw.sort((a, b) => a.start - b.start);

    // 自動字幕是「滾動式」兩行顯示，前一句會跟下一句重疊；把結束時間截到下一句開始
    for (let i = 0; i < raw.length - 1; i++) {
      const next = raw[i + 1].start;
      if (next > raw[i].start && next < raw[i].end) raw[i].end = next;
    }

    return raw.map(buildCue).filter(Boolean);
  }

  function buildCue({ start, end, segs, wordTimed }) {
    const chars = [];
    segs.forEach((seg, i) => {
      const segStart = Math.max(start, seg.start);
      const nextStart = i + 1 < segs.length ? segs[i + 1].start : end;
      const len = [...seg.text].length;
      const segEnd = Math.min(Math.max(nextStart, segStart), segStart + len * MAX_CHAR_SECONDS, end);
      const step = (segEnd - segStart) / len;
      [...seg.text].forEach((ch, k) => chars.push({ ch, t: segStart + step * k }));
    });

    // 去頭尾空白、連續空白合併
    const cleaned = [];
    for (const c of chars) {
      if (/\s/.test(c.ch)) {
        if (!cleaned.length || cleaned[cleaned.length - 1].ch === ' ') continue;
        cleaned.push({ ch: ' ', t: c.t });
      } else {
        cleaned.push(c);
      }
    }
    while (cleaned.length && cleaned[cleaned.length - 1].ch === ' ') cleaned.pop();
    if (!cleaned.length) return null;

    // 只有一個 seg（人工字幕）：整句平均分配，但不要超過每字上限
    if (!wordTimed) {
      const span = Math.min(end - start, cleaned.length * MAX_CHAR_SECONDS);
      cleaned.forEach((c, i) => (c.t = start + (span * i) / cleaned.length));
    }

    return {
      start,
      end,
      text: cleaned.map((c) => c.ch).join(''),
      times: cleaned.map((c) => c.t),
      wordTimed,
    };
  }

  /** 第 i 個字的 [開始, 結束) */
  function charRange(cue, i) {
    const start = cue.times[i];
    if (i + 1 < cue.times.length) return [start, cue.times[i + 1]];
    return [start, Math.max(start, Math.min(cue.end, start + MAX_CHAR_SECONDS))];
  }

  /** 目前要顯示的句子：最後一個已開始的句子（句子間的空檔繼續顯示上一句，最多 2 秒） */
  function cueIndexAt(cues, t) {
    let lo = 0;
    let hi = cues.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cues[mid].start <= t) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (found < 0 || t > cues[found].end + 2) return -1;
    return found;
  }

  Object.assign(ns, { parseJson3, charRange, cueIndexAt });
})();
