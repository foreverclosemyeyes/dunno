// 설정 패널용 조절 부품: 슬라이더(+숫자 입력), 색(+투명도), 선택, 켜기/끄기, 글씨체 고르기...
// 모든 부품 오른쪽에 "↺ 기본값으로" 버튼이 붙음.
(function () {
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ctx: { get(path), set(path, value, opts), def(path) }
  function row(label, control, ctx, path, onReset) {
    const r = h('div', 'ctl');
    r.append(h('label', 'ctl-label', label));
    const body = h('div', 'ctl-body');
    body.append(control);
    r.append(body);
    if (path) {
      const reset = h('button', 'reset', '↺');
      reset.title = '기본값으로';
      reset.onclick = () => { const d = ctx.def(path); if (d !== undefined) { ctx.set(path, D.clone(d)); onReset && onReset(); ctx.rerender(); } };
      r.append(reset);
    } else r.append(h('span'));
    return r;
  }

  function slider(ctx, path, label, min, max, step = 1, unit = '') {
    const wrap = h('div', 'slider');
    const range = h('input'); range.type = 'range'; Object.assign(range, { min, max, step });
    const num = h('input', 'num'); num.type = 'number'; Object.assign(num, { step });
    const val = ctx.get(path);
    range.value = val; num.value = val;
    range.oninput = () => { num.value = range.value; ctx.set(path, +range.value, { live: true }); };
    range.onchange = () => ctx.commit();
    num.onchange = () => {
      let v = +num.value; if (isNaN(v)) v = ctx.get(path);
      // 숫자 입력은 슬라이더 범위를 넘어도 허용 (자유도)
      range.value = v; ctx.set(path, v); ctx.commit();
    };
    wrap.append(range, num);
    if (unit) wrap.append(h('span', 'unit', unit));
    return row(label, wrap, ctx, path);
  }

  function colorA(ctx, path, label, { allowAuto = false } = {}) {
    const v = ctx.get(path) || { c: '#000000', a: 1 };
    const wrap = h('div', 'color');
    const auto = allowAuto ? h('label', 'mini') : null;
    const pick = h('input'); pick.type = 'color'; pick.value = v.c || '#888888';
    const alpha = h('input'); alpha.type = 'range'; Object.assign(alpha, { min: 0, max: 100, step: 1 }); alpha.value = Math.round((v.a ?? 1) * 100);
    const an = h('span', 'unit', `${alpha.value}%`);
    const upd = (live) => ctx.set(path, { c: auto && auto.firstChild.checked ? '' : pick.value, a: alpha.value / 100 }, { live });
    pick.oninput = () => { if (auto) auto.firstChild.checked = false; upd(true); };
    pick.onchange = () => ctx.commit();
    alpha.oninput = () => { an.textContent = `${alpha.value}%`; upd(true); };
    alpha.onchange = () => ctx.commit();
    if (auto) {
      const cb = h('input'); cb.type = 'checkbox'; cb.checked = !v.c;
      cb.onchange = () => { upd(false); ctx.commit(); };
      auto.append(cb, document.createTextNode('자동'));
      wrap.append(auto);
    }
    wrap.append(pick, alpha, an);
    return row(label, wrap, ctx, path);
  }

  function select(ctx, path, label, options, onChange) {
    const s = h('select');
    for (const [v, t] of options) { const o = h('option', null, t); o.value = v; s.append(o); }
    s.value = String(ctx.get(path));
    s.onchange = () => {
      const opt = options.find(([v]) => String(v) === s.value);
      ctx.set(path, opt ? opt[0] : s.value); ctx.commit(); onChange && onChange(s.value);
    };
    return row(label, s, ctx, path, onChange);
  }

  function toggle(ctx, path, label, onChange) {
    const l = h('label', 'switch');
    const cb = h('input'); cb.type = 'checkbox'; cb.checked = !!ctx.get(path);
    cb.onchange = () => { ctx.set(path, cb.checked); ctx.commit(); onChange && onChange(cb.checked); };
    l.append(cb, h('span'));
    return row(label, l, ctx, path, onChange);
  }

  function text(ctx, path, label, { multiline = false, placeholder = '' } = {}) {
    const i = h(multiline ? 'textarea' : 'input');
    if (!multiline) i.type = 'text';
    i.placeholder = placeholder;
    i.value = ctx.get(path) || '';
    i.oninput = () => ctx.set(path, i.value, { live: true });
    i.onchange = () => ctx.commit();
    return row(label, i, ctx, path);
  }

  // 글씨체: 목록 + 직접 입력 + 내 컴퓨터 글씨체 + 파일 올리기
  function font(ctx, path, label, onChange) {
    const wrap = h('div', 'font-pick');
    const cur = ctx.get(path);
    const input = h('input'); input.type = 'text'; input.value = cur; input.setAttribute('list', 'font-options');
    input.placeholder = '글씨체 이름';
    input.style.fontFamily = D.fonts.cssStack(cur);
    const apply = async () => {
      const v = input.value.trim(); if (!v) return;
      await D.fonts.checkVariable(v);
      input.style.fontFamily = D.fonts.cssStack(v);
      ctx.set(path, v); ctx.commit(); onChange && onChange(v);
    };
    input.onchange = apply;
    const btnSys = h('button', 'mini-btn', '내 컴퓨터');
    btnSys.title = '내 컴퓨터에 설치된 글씨체 목록 불러오기';
    btnSys.onclick = async () => {
      btnSys.textContent = '불러오는 중…';
      const list = await D.fonts.loadSystemFonts();
      D.settings.refreshFontOptions();
      btnSys.textContent = `${list.length}개 불러옴`;
      input.focus(); input.value = ''; input.placeholder = '이름을 입력하면 목록이 떠요';
      if (input.showPicker) try { input.showPicker(); } catch { /* 일부 환경 미지원 */ }
    };
    const btnUp = h('button', 'mini-btn', '파일 올리기');
    btnUp.title = '.ttf / .otf 글씨체 파일 올리기';
    btnUp.onclick = async () => {
      const assets = await window.diary.pickAsset('font');
      for (const a of assets) {
        const f = await D.fonts.analyzeUpload(a);
        const list = D.state.theme.fonts;
        if (!list.find((x) => x.url === f.url)) list.push(f);
        D.fonts.registerUploaded(f);
        input.value = f.family;
        D.toast(`"${f.family}" 글씨체를 추가했어요${f.variable ? ` (가변 ${f.variable.min}~${f.variable.max})` : ''}`);
      }
      D.settings.refreshFontOptions();
      if (assets.length) apply();
    };
    wrap.append(input, h('div', 'font-btns'));
    wrap.lastChild.append(btnSys, btnUp);
    return row(label, wrap, ctx, path, onChange);
  }

  // 굵기: 가변 글씨체면 연속 슬라이더, 아니면 있는 굵기 중 선택
  function weight(ctx, path, fontName) {
    const info = D.fonts.info(fontName);
    if (info.variable) {
      const r = slider(ctx, path, `굵기 (가변 ${info.variable.min}~${info.variable.max})`, info.variable.min, info.variable.max, 1);
      return r;
    }
    const names = { 100: '100 가장 얇게', 200: '200', 300: '300 얇게', 400: '400 보통', 500: '500 중간', 600: '600', 700: '700 굵게', 800: '800', 900: '900 가장 굵게' };
    const opts = info.weights.map((w) => [w, names[w] || String(w)]);
    if (!info.weights.includes(ctx.get(path))) opts.unshift([ctx.get(path), `${ctx.get(path)} (지금 값)`]);
    return select(ctx, path, '굵기', opts);
  }

  function section(title, open = false) {
    const d = h('details', 'sec');
    d.open = open;
    d.append(h('summary', null, title));
    const body = h('div', 'sec-body');
    d.append(body);
    return { el: d, body };
  }

  D.ctl = { row, slider, colorA, select, toggle, text, font, weight, section, h };
})();
