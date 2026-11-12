// 글씨체 관리: 앱에 들어 있는 글씨체 + (예전에 올려 둔) 글씨체 파일
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

  function info(name) {
    return registry.get(name) || { css: name, variable: null, weights: ALL_WEIGHTS, source: 'custom' };
  }
  function cssStack(name) {
    const i = info(name);
    return `"${i.css.replace(/"/g, '')}", "Noto Sans KR Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
  }

  D.fonts = { registry, info, cssStack, registerUploaded };
})();
