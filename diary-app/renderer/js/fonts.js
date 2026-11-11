// 글씨체 관리: 기본 글씨체 / 내 컴퓨터 글씨체 / 올린 글씨체 파일 / 이름 직접 입력
(function () {
  const registry = new Map(); // 표시 이름 → { css, variable:{min,max}|null, weights:[], source }
  const ALL_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

  registry.set('Gasoek One', { css: 'Gasoek One', variable: null, weights: [400], source: 'builtin' });
  registry.set('Anton', { css: 'Anton', variable: null, weights: [400], source: 'builtin' });
  registry.set('Archivo Black', { css: 'Archivo Black', variable: null, weights: [400], source: 'builtin' });
  registry.set('Black Han Sans', { css: 'Black Han Sans', variable: null, weights: [400], source: 'builtin' });
  registry.set('Permanent Marker', { css: 'Permanent Marker', variable: null, weights: [400], source: 'builtin' });
  registry.set('Nanum Gothic', { css: 'Nanum Gothic', variable: null, weights: [400, 700, 800], source: 'builtin' });
  registry.set('Noto Sans KR', { css: 'Noto Sans KR Variable', variable: { min: 100, max: 900 }, weights: ALL_WEIGHTS, source: 'builtin' });

  const WEIGHT_WORDS = [
    [/hairline|thin/i, 100], [/extra\s*light|ultra\s*light/i, 200], [/light/i, 300],
    [/semi\s*bold|demi\s*bold/i, 600], [/extra\s*bold|ultra\s*bold/i, 800], [/black|heavy/i, 900],
    [/bold/i, 700], [/medium/i, 500], [/regular|normal|book|roman|plain/i, 400],
  ];
  function weightFromStyle(style) {
    for (const [re, w] of WEIGHT_WORDS) if (re.test(style)) return w;
    const m = String(style).match(/\b([1-9]00)\b/);
    return m ? +m[1] : 400;
  }

  // ---- OpenType 표 읽기 (가변 글씨체 판별 + 이름 읽기) ----
  function readTables(buf) {
    const dv = new DataView(buf);
    const sig = dv.getUint32(0);
    if (![0x00010000, 0x4f54544f, 0x74727565].includes(sig)) return null; // ttf / OTTO / true
    const n = dv.getUint16(4);
    const tables = {};
    for (let i = 0; i < n; i++) {
      const o = 12 + i * 16;
      const tag = String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
      tables[tag] = { offset: dv.getUint32(o + 8), length: dv.getUint32(o + 12) };
    }
    return { dv, tables };
  }
  function parseFont(buf) {
    const out = { family: null, variable: null };
    try {
      const t = readTables(buf);
      if (!t) return out;
      const { dv, tables } = t;
      if (tables.fvar) {
        const base = tables.fvar.offset;
        const axesOff = dv.getUint16(base + 4);
        const count = dv.getUint16(base + 8);
        const size = dv.getUint16(base + 10);
        for (let i = 0; i < count; i++) {
          const o = base + axesOff + i * size;
          const tag = String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
          if (tag === 'wght') {
            out.variable = { min: Math.round(dv.getInt32(o + 4) / 65536), max: Math.round(dv.getInt32(o + 12) / 65536) };
          }
        }
      }
      if (tables.name) {
        const base = tables.name.offset;
        const count = dv.getUint16(base + 2);
        const strOff = base + dv.getUint16(base + 4);
        const found = {};
        for (let i = 0; i < count; i++) {
          const r = base + 6 + i * 12;
          const platform = dv.getUint16(r), lang = dv.getUint16(r + 4), nameId = dv.getUint16(r + 6);
          const len = dv.getUint16(r + 8), off = dv.getUint16(r + 10);
          if (![1, 16].includes(nameId)) continue;
          let s = '';
          if (platform === 3 || platform === 0) {
            for (let j = 0; j < len; j += 2) s += String.fromCharCode(dv.getUint16(strOff + off + j));
          } else {
            for (let j = 0; j < len; j++) s += String.fromCharCode(dv.getUint8(strOff + off + j));
          }
          const score = (nameId === 16 ? 2 : 0) + (lang === 0x409 || lang === 0 ? 1 : 0);
          if (!found.s || score > found.score) { found.s = s; found.score = score; }
        }
        out.family = found.s || null;
      }
    } catch (e) { console.warn('font parse', e); }
    return out;
  }

  // ---- 올린 글씨체 등록 ----
  const loadedFaces = new Set();
  function registerUploaded(f) {
    registry.set(f.family, {
      css: f.family,
      variable: f.variable,
      weights: f.variable ? ALL_WEIGHTS.filter((w) => w >= f.variable.min && w <= f.variable.max) : [f.weight || 400],
      source: 'upload',
    });
    if (loadedFaces.has(f.url)) return;
    loadedFaces.add(f.url);
    const weight = f.variable ? `${f.variable.min} ${f.variable.max}` : String(f.weight || 400);
    const face = new FontFace(f.family, `url("${f.url}")`, { weight });
    face.load().then((ff) => { document.fonts.add(ff); D.onFontsChanged && D.onFontsChanged(); }).catch((e) => console.warn('font load', e));
  }

  async function analyzeUpload(asset) {
    const buf = await fetch(asset.url).then((r) => r.arrayBuffer());
    const info = parseFont(buf);
    const base = asset.name.replace(/\.(ttf|otf|woff2?)$/i, '');
    const family = (info.family || base).trim();
    const weight = weightFromStyle(base);
    return { family, url: asset.url, name: asset.name, variable: info.variable, weight };
  }

  // ---- 내 컴퓨터 글씨체 ----
  let systemLoaded = false;
  const localFaces = new Map(); // family → [FontData]
  async function loadSystemFonts() {
    if (systemLoaded) return [...localFaces.keys()];
    try {
      if (window.queryLocalFonts) {
        const list = await window.queryLocalFonts();
        for (const f of list) {
          if (!localFaces.has(f.family)) localFaces.set(f.family, []);
          localFaces.get(f.family).push(f);
        }
      }
    } catch (e) { console.warn('queryLocalFonts', e); }
    if (localFaces.size === 0) {
      const names = await window.diary.systemFonts();
      names.forEach((n) => localFaces.set(n, []));
    }
    for (const [family, faces] of localFaces) {
      if (registry.has(family)) continue;
      const weights = [...new Set(faces.map((f) => weightFromStyle(f.style)))].sort((a, b) => a - b);
      registry.set(family, { css: family, variable: null, weights: weights.length ? weights : [400, 700], source: 'system', checked: false });
    }
    systemLoaded = true;
    return [...localFaces.keys()].sort((a, b) => a.localeCompare(b, 'ko'));
  }

  // 시스템 글씨체가 가변인지 실제 파일을 열어 확인 (고를 때 한 번만)
  async function checkVariable(family) {
    const r = registry.get(family);
    if (!r || r.source !== 'system' || r.checked) return r;
    r.checked = true;
    const faces = localFaces.get(family) || [];
    for (const f of faces.slice(0, 2)) {
      try {
        const blob = await f.blob();
        const info = parseFont(await blob.arrayBuffer());
        if (info.variable) { r.variable = info.variable; r.weights = ALL_WEIGHTS.filter((w) => w >= info.variable.min && w <= info.variable.max); break; }
      } catch { /* 읽을 수 없는 글씨체 */ }
    }
    return r;
  }

  function info(name) {
    return registry.get(name) || { css: name, variable: null, weights: ALL_WEIGHTS, source: 'custom' };
  }
  function cssStack(name) {
    const i = info(name);
    return `"${i.css.replace(/"/g, '')}", "Noto Sans KR Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
  }

  D.fonts = { registry, info, cssStack, analyzeUpload, registerUploaded, loadSystemFonts, checkVariable, builtin: ['Archivo Black', 'Anton', 'Gasoek One', 'Black Han Sans', 'Noto Sans KR', 'Nanum Gothic', 'Permanent Marker'] };
})();
