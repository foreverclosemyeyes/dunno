// 아주 작은 zip 읽기 (외부 모듈 없이): 파일 목록과 내용만. 저장(0)·deflate(8) 방식 지원.
const zlib = require('zlib');

function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('zip 파일이 아니에요.');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nlen).toString(flags & 0x800 ? 'utf8' : 'latin1');
    entries.push({ name, method, csize, usize, local });
    p += 46 + nlen + elen + clen;
  }
  const read = (e) => {
    if (e.usize > 40 * 1024 * 1024) throw new Error('그림이 너무 커요.');
    const nlen = buf.readUInt16LE(e.local + 26), elen = buf.readUInt16LE(e.local + 28);
    const start = e.local + 30 + nlen + elen;
    const data = buf.slice(start, start + e.csize);
    if (e.method === 0) return data;
    if (e.method === 8) return zlib.inflateRawSync(data);
    throw new Error('지원하지 않는 압축 방식이에요.');
  };
  return { entries, read };
}

// 표정 6칸에 맞는 그림 고르기: 폴더 이름(Normal, Smiling, Annoyed …)의 낱말로 판단
const MOOD_WORDS = {
  base: [/normal|neutral|default/],
  smile: [/smil|happy|grin|laugh/],
  talk: [/talk|surpris|shock/],
  wink: [/wink|blush|shiny|greedy|smug/],
  serious: [/annoy|angry|anger|serious|scowl|frown|determin/],
  closed: [/closed|melanch|sad|squint|tired|sigh/],
};
function pickFaces(entries) {
  const pngs = entries.filter((e) => /\.png$/i.test(e.name) && !/(^|\/)(__MACOSX|\._)/.test(e.name) && !/_[em]\d+\.png$/i.test(e.name));
  if (!pngs.length) return {};
  const items = pngs.map((e) => {
    const parts = e.name.split('/'); const folder = (parts.length > 1 ? parts[parts.length - 2] : parts[parts.length - 1]).toLowerCase();
    const num = parseInt(folder, 10);
    return { e, folder, variant: /\((?![^)]*(eye|mouth))/.test(folder), num: Number.isFinite(num) ? num : 999 };
  }).sort((a, b) => (a.variant - b.variant) || (a.num - b.num) || a.e.name.localeCompare(b.e.name));
  // 번호로 된 파일(b108_000_00.png …): 000 기본 / 001 웃음 / 002 짜증·진지 / 003 우울 / 004 놀람 / 006·008 홍조·반짝. 100 번대 이상이나 _01 은 옷이 다른 버전
  const CODE = { base: [0], smile: [1, 11], serious: [2, 3], closed: [3, 5], talk: [4, 7, 10], wink: [6, 8, 11] };
  const flat = items.every((i) => !Object.values(MOOD_WORDS).some((res) => res.some((re) => re.test(i.folder))));
  for (const i of items) {
    const m = i.e.name.match(/_(\d{3})_(\d{2})\.png$/i);
    i.code = m ? parseInt(m[1], 10) : null;
    if (m && (i.code >= 100 || m[2] !== '00')) i.variant = true;
  }
  const out = {}, used = new Set();
  if (flat) for (const mood of Object.keys(CODE)) for (const c of CODE[mood]) {
    const hit = items.find((i) => !i.variant && i.code === c && !used.has(i.e));
    if (hit) { out[mood] = hit.e; used.add(hit.e); break; }
  }
  for (const mood of Object.keys(MOOD_WORDS)) {
    const hit = items.find((i) => !used.has(i.e) && !i.variant && MOOD_WORDS[mood].some((re) => re.test(i.folder)));
    if (hit) { out[mood] = hit.e; used.add(hit.e); }
  }
  if (!out.base) { out.base = items[0].e; used.add(items[0].e); }
  // 못 찾은 칸은 남은 그림으로 채우고, 그래도 없으면 기본 표정
  for (const mood of Object.keys(MOOD_WORDS)) if (!out[mood]) { const rest = items.find((i) => !used.has(i.e) && !i.variant); if (rest) { out[mood] = rest.e; used.add(rest.e); } else out[mood] = out.base; }
  return out;
}

// 'PlayStation 3 - Persona 5 - Bust-Ups - Tae Takemi.zip' → 'Tae Takemi'
function labelFromFile(file) {
  let s = file.replace(/\.zip$/i, '').replace(/_/g, ' ').replace(/^[0-9a-f]{8}-/i, '');
  const parts = s.split(/\s+-\s+/);
  return parts[parts.length - 1].replace(/\s*\(\d+\)\s*$/, '').trim() || s.trim();
}

module.exports = { readZip, pickFaces, labelFromFile };
