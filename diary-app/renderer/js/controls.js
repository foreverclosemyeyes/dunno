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

  function section(title, open = false) {
    const d = h('details', 'sec');
    d.open = open;
    d.append(h('summary', null, title));
    const body = h('div', 'sec-body');
    d.append(body);
    return { el: d, body };
  }

  D.ctl = { row, slider, colorA, select, toggle, text, section, h };
})();
