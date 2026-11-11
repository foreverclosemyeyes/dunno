// 메인 화면
(function () {
  const $ = (s) => document.querySelector(s);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => new Date(s + 'T00:00:00');
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const WD_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const STATS = ['지식', '배짱', '손재주', '친절', '매력'];
  const S = (key, text, cls) => D.theme.styledText(key, text, cls);

  const state = (D.state = {
    theme: D.clone(D.DEFAULT_THEME),
    data: { days: {}, quests: [], weeks: [] },
    today: iso(new Date()),
    selected: iso(new Date()),
    viewMonth: iso(new Date()).slice(0, 7),
    stats: {},
    settings: {},
    hasKeys: {},
    lastAssistant: null,
    chat: [],
    previewBg: null,
  });

  function toast(msg, ms = 2600) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), ms);
  }
  D.toast = toast;

  function count(items) {
    let total = 0, done = 0;
    const walk = (l) => (l || []).forEach((i) => { total++; if (i.checked) done++; walk(i.children); });
    walk(items);
    return { total, done };
  }
  function dayInfo(date) { return state.data.days[date]; }
  function mondayOf(date) {
    const d = parse(date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  }
  function dday(q) {
    const target = q.end || q.start;
    if (!target) return null;
    return Math.round((parse(target) - parse(state.today)) / 86400000);
  }

  // ---------- 왼쪽 ----------
  function renderLeft() {
    const t = parse(state.today);
    const big = $('#big-date'); big.innerHTML = '';
    big.appendChild(S('bigDate', String(t.getDate())));
    $('#md-month').replaceChildren(S('monthDay', `${t.getMonth() + 1}월`));
    $('#md-day').replaceChildren(S('monthDay', `${WD[t.getDay()]}요일`));
    $('#md-year').replaceChildren(S('body', `${t.getFullYear()} · ${WD_EN[t.getDay()]}`));

    // 이번 주 월~금
    const strip = $('#week-strip'); strip.innerHTML = '';
    const mon = mondayOf(state.today);
    for (let i = 0; i < 5; i++) {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const di = iso(d);
      const info = dayInfo(di);
      const c = count(info && info.items);
      const cell = h('div', 'wk' + (di === state.today ? ' today' : '') + (di === state.selected ? ' sel' : ''));
      cell.append(h('div', 'wd', WD_EN[d.getDay()]), h('div', 'dn', String(d.getDate())));
      cell.append(h('div', 'cnt', c.total ? `${c.done}/${c.total} 완료` : '—'));
      const bar = h('div', 'bar'); const fill = h('i'); fill.style.width = c.total ? `${(c.done / c.total) * 100}%` : '0'; bar.append(fill);
      cell.append(bar);
      cell.onclick = () => select(di);
      strip.append(cell);
    }

    // 이번 달 달력
    const [y, m] = state.viewMonth.split('-').map(Number);
    $('#mc-title').replaceChildren(S('section', `${y}.${pad(m)}`));
    const grid = $('#mc-grid'); grid.innerHTML = '';
    ['월', '화', '수', '목', '금', '토', '일'].forEach((w) => grid.append(h('div', 'mc-wd', w)));
    const first = new Date(y, m - 1, 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const last = new Date(y, m, 0);
    const cells = Math.ceil((((first.getDay() + 6) % 7) + last.getDate()) / 7) * 7;
    for (let i = 0; i < cells; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const di = iso(d);
      const info = dayInfo(di);
      const c = count(info && info.items);
      const cls = ['mc-d'];
      if (d.getMonth() !== m - 1) cls.push('out');
      if (d.getDay() === 0 || d.getDay() === 6) cls.push('we');
      if (di === state.today) cls.push('today');
      if (di === state.selected) cls.push('sel');
      const cell = h('div', cls.join(' '));
      cell.append(h('span', null, String(d.getDate())));
      if (c.total) { const dot = h('i', 'dot' + (c.done < c.total ? ' part' : '')); cell.append(dot); cell.title = `${c.done}/${c.total} 완료`; }
      if (eventsOn(di).length) cell.classList.add('has-ev');
      cell.onclick = () => select(di);
      grid.append(cell);
    }
  }

  // ---------- 일정 (노션 기간) ----------
  const isMeet = (e) => (e.tags || []).some((t) => /meeting|seminar/i.test(t));
  function eventsOn(date) { return (state.data.events || []).filter((e) => e.start <= date && e.end >= date); }
  // 달력 칸마다 겹치지 않게 줄(lane) 배정
  function assignLanes(evs) {
    const lanes = [];
    const out = new Map();
    for (const e of [...evs].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))) {
      let i = lanes.findIndex((end) => end < e.start);
      if (i < 0) { i = lanes.length; lanes.push(e.end); } else lanes[i] = e.end;
      out.set(e.id, i);
    }
    return out;
  }

  // ---------- 큰 달력 ----------
  const MON_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function jitter(seedStr, range) {
    let h = 0; for (const ch of seedStr) h = (h * 31 + ch.charCodeAt(0)) | 0;
    const r1 = ((h >>> 0) % 1000) / 1000, r2 = ((((h >>> 0) / 1000) | 0) % 1000) / 1000;
    return { rot: (r1 * 2 - 1) * range, dy: (r2 * 2 - 1) * range * 1.6 };
  }
  function renderBigCal() {
    if (state.theme.layout.mode !== 'bigcal') return;
    const [y, m] = state.viewMonth.split('-').map(Number);
    const sel = parse(state.selected);
    $('#bc-month-label').replaceChildren(S('calHead', MON_EN[m - 1]), S('body', ` ${y}`, 'bc-year'));
    $('#bc-tag').replaceChildren(S('body', `${sel.getMonth() + 1}/${sel.getDate()} (${WD[sel.getDay()]})${state.selected === state.today ? ' · 오늘' : ''}`));

    const head = $('#bc-head'); head.innerHTML = '';
    const grid = $('#bc-grid'); grid.innerHTML = '';
    const J = state.theme.layout.calJitter;
    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach((w, i) => {
      const cell = h('div', 'bc-h' + (i === 0 ? ' sun' : i === 6 ? ' sat' : ''));
      const j = jitter('h' + w, J);
      cell.style.transform = `translateY(${j.dy.toFixed(1)}px) rotate(${j.rot.toFixed(1)}deg)`;
      cell.append(S('calHead', w));
      head.append(cell);
    });
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const lead = first.getDay();
    const MAX_LANES = 3;
    const monthEvents = (state.data.events || []).filter((e) => e.end >= iso(first) && e.start <= iso(last));
    const lanes = assignLanes(monthEvents);
    const cellOf = new Map();
    const rows = Math.ceil((lead + last.getDate()) / 7);
    for (let r = 0; r < rows; r++) {
      let todayCol = -1;
      for (let c = 0; c < 7; c++) {
        const dayNum = r * 7 + c - lead + 1;
        const cell = h('div', 'bc-d');
        if (dayNum < 1 || dayNum > last.getDate()) { cell.classList.add('out'); cell.append(S('calNum', '00')); grid.append(cell); continue; }
        const d = new Date(y, m - 1, dayNum);
        const di = iso(d);
        if (c === 0) cell.classList.add('sun');
        if (c === 6) cell.classList.add('sat');
        if (di === state.today) { cell.classList.add('today'); todayCol = c; }
        if (di === state.selected) cell.classList.add('sel');
        const j = jitter(di, J);
        cell.style.transform = `translateY(${j.dy.toFixed(1)}px) rotate(${j.rot.toFixed(1)}deg)`;
        cell.append(S('calNum', String(dayNum)));
        cellOf.set(di, { cell, row: r, col: c });
        const evs = eventsOn(di);
        const hidden = evs.filter((e) => lanes.get(e.id) >= MAX_LANES).length;
        if (hidden) cell.append(h('b', 'bc-more', `+${hidden}`));
        if (evs.length) cell.title = evs.map((e) => `• ${e.name}`).join('\n');
        const cnt = count(dayInfo(di) && dayInfo(di).items);
        if (cnt.total) { cell.append(h('i', 'dot' + (cnt.done < cnt.total ? ' part' : ''))); cell.title = `${cnt.done}/${cnt.total} 완료` + (cell.title ? '\n' + cell.title : ''); }
        cell.onclick = () => select(di);
        grid.append(cell);
      }
      if (todayCol >= 0) {
        const line = h('div', 'bc-line');
        line.style.setProperty('--x', `${((todayCol + 0.5) / 7) * 100}%`);
        grid.append(line);
      }
    }
    drawEventLines(monthEvents, lanes, cellOf, MAX_LANES, y, m);
    fitBigCal();
  }

  // 일정 선: 칸이 흔들려 있어도 끊기지 않게 주(줄)마다 한 번에 곧게 그림
  function drawEventLines(evs, lanes, cellOf, maxLanes, y, m) {
    const grid = $('#bc-grid');
    const layer = h('div', 'bc-evlayer');
    grid.append(layer);
    const rowsInfo = new Map(); // row → {left, right, top}
    for (const { cell, row } of cellOf.values()) {
      const info = rowsInfo.get(row) || { left: Infinity, right: -Infinity, top: Infinity };
      info.left = Math.min(info.left, cell.offsetLeft);
      info.right = Math.max(info.right, cell.offsetLeft + cell.offsetWidth);
      info.top = Math.min(info.top, cell.offsetTop);
      rowsInfo.set(row, info);
    }
    const center = (cell) => cell.offsetLeft + cell.offsetWidth / 2;
    const first = iso(new Date(y, m - 1, 1)), last = iso(new Date(y, m, 0));
    for (const e of evs) {
      const lane = lanes.get(e.id);
      if (lane >= maxLanes) continue;
      const s0 = e.start < first ? first : e.start, e0 = e.end > last ? last : e.end;
      // 이 일정이 걸친 날짜를 주(줄)별로 나눔
      const byRow = new Map();
      for (let d = parse(s0); iso(d) <= e0; d.setDate(d.getDate() + 1)) {
        const c = cellOf.get(iso(d)); if (!c) continue;
        const list = byRow.get(c.row) || []; list.push({ ...c, date: iso(d) }); byRow.set(c.row, list);
      }
      for (const [row, list] of byRow) {
        const info = rowsInfo.get(row);
        const a = list[0], b = list[list.length - 1];
        const isStart = a.date === e.start, isEnd = b.date === e.end;
        const x1 = isStart ? center(a.cell) : info.left - 6;
        const x2 = isEnd ? center(b.cell) : info.right + 6;
        const top = info.top - 8 + lane * 17;
        const cls = isMeet(e) ? ' meet' : '';
        if (x2 > x1) { const ln = h('i', 'ev-line' + cls); Object.assign(ln.style, { left: `${x1}px`, width: `${x2 - x1}px`, top: `${top}px` }); layer.append(ln); }
        if (isStart) { const d = h('i', 'ev-dot' + cls); Object.assign(d.style, { left: `${x1}px`, top: `${top}px` }); layer.append(d); }
        if (isEnd && e.end !== e.start) { const d = h('i', 'ev-dot' + cls); Object.assign(d.style, { left: `${x2}px`, top: `${top}px` }); layer.append(d); }
      }
    }
  }
  function fitBigCal() {
    const box = $('#bigcal'), inner = $('#bc-inner');
    if (!box || state.theme.layout.mode !== 'bigcal') return;
    inner.style.transform = 'none';
    const bw = box.clientWidth, bh = box.clientHeight;
    const iw = inner.scrollWidth, ih = inner.scrollHeight;
    if (!iw || !ih) return;
    const t = state.theme.layout.calTilt;
    const rad = Math.abs(t) * Math.PI / 180; // 기울인 만큼 커지는 크기도 계산
    const rw = iw * Math.cos(rad) + ih * Math.sin(rad), rh = iw * Math.sin(rad) + ih * Math.cos(rad);
    const f = Math.min(bw / rw, bh / rh) * 0.98;
    inner.style.transformOrigin = '50% 50%';
    const ty = (rh * f - ih) / 2 + 4; // 위쪽에 붙임
    inner.style.transform = `translate(${(bw - iw) / 2}px, ${ty}px) scale(${f}) rotate(${t}deg)`;
  }
  window.addEventListener('resize', () => fitBigCal());

  // ---------- 오른쪽 ----------
  function todoNode(item) {
    const wrap = document.createDocumentFragment();
    const row = h('div', 'todo' + (item.checked ? ' done' : ''));
    row.append(h('span', 'box', item.checked ? '✓' : ''));
    row.append(S('checklist', item.text, 'txt'));
    row.title = item.checked ? '눌러서 체크 풀기 (노션에도 반영)' : '눌러서 완료 체크 (노션에도 반영)';
    row.onclick = async () => {
      row.classList.add('busy');
      const r = await window.diary.toggleTodo(item.id, !item.checked);
      row.classList.remove('busy');
      if (!r.ok) toast(r.message, 5000);
    };
    wrap.append(row);
    if (item.children && item.children.length) {
      const ch = h('div', 'todo-children');
      item.children.forEach((c) => ch.append(todoNode(c)));
      wrap.append(ch);
    }
    return wrap;
  }

  function renderRecord() {
    const sel = parse(state.selected);
    const isToday = state.selected === state.today;
    $('#record-title').replaceChildren(S('section', isToday ? '오늘의 기록' : `${sel.getMonth() + 1}/${sel.getDate()} (${WD[sel.getDay()]})의 기록`));
    const info = dayInfo(state.selected);
    $('#record-sub').replaceChildren(S('body', info ? info.pageName : `${sel.getMonth() + 1}월 ${sel.getDate()}일 ${WD[sel.getDay()]}요일`));
    const c = count(info && info.items);
    const rc = $('#record-count'); rc.innerHTML = '';
    if (c.total) {
      rc.append(h('span', 'big', String(c.done)), h('span', 'of', ` / ${c.total}`), h('span', 'lbl', c.done === c.total ? 'ALL CLEAR!' : 'DONE'));
    }
    const evBox = $('#record-events'); evBox.innerHTML = '';
    for (const e of eventsOn(state.selected)) {
      const chip = h('button', 'ev-chip' + (isMeet(e) ? ' meet' : ''), `${isMeet(e) ? '● ' : ''}${e.name}${e.start !== e.end ? `  ${e.start.slice(5).replace('-', '/')}~${e.end.slice(5).replace('-', '/')}` : ''}`);
      chip.title = '노션에서 열기';
      chip.onclick = () => window.diary.open(e.url);
      evBox.append(chip);
    }
    const stamp = $('#record-stamp');
    const allDone = c.total > 0 && c.done === c.total;
    if (allDone && stamp.hidden) { stamp.replaceChildren(S('stamp', state.theme.layout.stampText || 'DONE!!')); stamp.hidden = false; }
    else if (allDone) stamp.replaceChildren(S('stamp', state.theme.layout.stampText || 'DONE!!'));
    else stamp.hidden = true;
    const list = $('#record-list'); list.innerHTML = '';
    if (info && info.items.length) info.items.forEach((i) => list.append(todoNode(i)));
    else {
      const msg = state.data.needsSetup ? '노션 키를 넣으면 체크리스트가 여기 떠요.\n오른쪽 위 ⚙ 설정 > 연결'
        : (sel.getDay() === 0 || sel.getDay() === 6) ? '주말이에요. 푹 쉬어요!' : '이 날짜의 체크리스트가 없어요.';
      const e = h('div', 'empty'); e.append(S('body', msg)); e.style.whiteSpace = 'pre-line';
      list.append(e);
    }
    const btn = $('#btn-open-notion');
    btn.disabled = !info;
    btn.onclick = () => info && window.diary.open(info.url);
    $('#btn-today').hidden = isToday && state.viewMonth === state.today.slice(0, 7);
  }

  function renderQuests() {
    const head = $('#quest-title'); head.innerHTML = '';
    head.append(S('section', '진행 중 업무'), h('small', null, `${state.data.quests.length}개`));
    const list = $('#quest-list'); list.innerHTML = '';
    if (!state.data.quests.length) {
      const e = h('div', 'empty'); e.append(S('body', state.data.needsSetup ? '노션 연결 후 표시돼요.' : '진행 중인 업무가 없어요.'));
      list.append(e);
    }
    for (const q of state.data.quests) {
      const d = dday(q);
      const row = h('div', 'quest' + (d !== null && d <= 3 ? ' soon' : '') + (d !== null && d < 0 ? ' over' : ''));
      row.append(S('quest', q.name));
      const meta = h('div', 'meta');
      meta.append(h('span', 'st', q.status || ''), h('span', null, q.end ? `마감 ${q.end.slice(5).replace('-', '/')}` : '마감일 없음'));
      row.append(meta);
      row.append(h('div', 'dd', d === null ? '—' : d === 0 ? 'D-DAY' : d > 0 ? `D-${d}` : `D+${-d}`));
      row.title = '노션에서 열기';
      row.onclick = () => window.diary.open(q.url);
      list.append(row);
    }
  }

  // ---------- 아래 ----------
  function renderAssistant() {
    const a = state.theme.assistant;
    $('#assistant').hidden = !state.hasKeys.anthropic; // Claude 키가 있을 때만 비서 칸을 보여 줌
    if (!state.hasKeys.anthropic) return;
    const fig = $('#asst-figure'); fig.innerHTML = '';
    fig.hidden = !a.image;
    if (a.image) { const img = h('img'); img.src = a.image.url; img.alt = a.name; fig.append(img); }

    $('#asst-name').textContent = a.name;
    const msg = state.lastAssistant;
    const text = $('#asst-text');
    text.classList.toggle('thinking', !!(msg && msg.thinking));
    text.replaceChildren(S('bubble', msg && msg.thinking ? '생각하는 중…' : msg ? msg.text : '오늘 업무를 같이 확인해 드릴게요. "지금 확인해줘"를 누르거나 아래에 물어보세요.'));
    const meta = $('#asst-meta');
    if (msg && msg.at && !msg.thinking) {
      const t = new Date(msg.at);
      meta.textContent = `${pad(t.getHours())}:${pad(t.getMinutes())} · ${msg.source === 'claude' ? 'Claude' : '연결 안 됨'}${msg.note ? ' · ' + msg.note : ''}`;
    } else meta.textContent = '';
    $('#chk-hourly').checked = !!state.settings.hourly;
    $('#btn-claude').hidden = !state.settings.claudeUrl;
  }

  function renderChat() {
    const list = $('#chat-list'); list.innerHTML = '';
    if (!state.chat.length) list.append(h('div', 'msg auto', '아직 대화가 없어요. 아래 칸에 말을 걸어 보세요.'));
    for (const m of state.chat) {
      if (m.auto) { list.append(h('div', 'msg auto', `⏰ 정시 체크 · ${new Date(m.at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}`)); continue; }
      const el = h('div', 'msg ' + m.role, m.text);
      const t = h('time', null, new Date(m.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
      el.append(t);
      list.append(el);
    }
    list.scrollTop = list.scrollHeight;
  }
  function openChat(on) {
    $('#chat-log').hidden = !on;
    $('#btn-chatlog').textContent = on ? '대화 닫기' : '대화 보기';
    if (on) renderChat();
  }

  // 인간 파라미터: 이번 달 누적을 다섯 꼭짓점 별(레이더) 모양으로
  const LV = [0, 3, 8, 15, 25]; // Lv1~Lv5 기준 (달 누적)
  const lvOf = (v) => (v >= LV[4] ? 5 : v >= LV[3] ? 4 : v >= LV[2] ? 3 : v >= LV[1] ? 2 : 1);
  function radarSvg(totals, today) {
    const NS = 'http://www.w3.org/2000/svg';
    const R = 54, C = 70;
    const pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 140 140');
    svg.classList.add('radar');
    const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.append(e); return e; };
    for (let ring = 5; ring >= 1; ring--) {
      el('polygon', { points: [0, 1, 2, 3, 4].map((i) => pt(i, (R * ring) / 5).join(',')).join(' '), class: 'r-ring' + (ring === 5 ? ' outer' : '') });
    }
    [0, 1, 2, 3, 4].forEach((i) => { const [x, y] = pt(i, R); el('line', { x1: C, y1: C, x2: x, y2: y, class: 'r-axis' }); });
    const top = Math.max(6, ...Object.values(totals)) * 1.15; // 이번 달 가장 높은 값에 맞춰 크게
    const val = (v) => R * Math.max(0.08, Math.min(1, v / top));
    const before = STATS.map((s, i) => pt(i, val(totals[s] - (today[s] || 0))).join(',')).join(' ');
    const now = STATS.map((s, i) => pt(i, val(totals[s])).join(',')).join(' ');
    el('polygon', { points: now, class: 'r-now' });
    el('polygon', { points: before, class: 'r-before' });
    STATS.forEach((s, i) => { const [x, y] = pt(i, val(totals[s])); el('circle', { cx: x, cy: y, r: 3.2, class: 'r-dot' }); });
    STATS.forEach((s, i) => {
      const [x, y] = pt(i, R + 11);
      const t = el('text', { x, y: y + 3.5, class: 'r-label', 'text-anchor': 'middle' });
      t.textContent = s;
    });
    return svg;
  }

  function renderStats() {
    const head = $('#stats-title'); head.innerHTML = '';
    const sel = parse(state.selected);
    const lg = h('small', 'stats-legend');
    lg.textContent = `${sel.getMonth() + 1}월 누적${state.settings.autoStats === false ? '' : ' · 업무 완료하면 자동 UP'}`;
    head.append(S('section', '인간 파라미터'), lg);
    const month = state.selected.slice(0, 7);
    const totals = Object.fromEntries(STATS.map((s) => [s, 0]));
    for (const [date, v] of Object.entries(state.stats)) {
      if (!date.startsWith(month)) continue;
      STATS.forEach((s) => { totals[s] += v[s] || 0; });
    }
    const today = state.stats[state.selected] || {};
    const list = $('#stats-list'); list.innerHTML = '';
    const wrap = h('div', 'param');
    wrap.append(radarSvg(totals, today));
    const rows = h('div', 'param-rows');
    for (const s of STATS) {
      const row = h('div', 'stat');
      const lv = lvOf(totals[s]);
      row.append(S('body', s, 'nm'));
      const stars = h('span', 'stars');
      for (let k = 1; k <= 5; k++) stars.append(h('i', k <= lv ? 'on' : '', '★'));
      row.append(stars);
      const t = today[s] || 0;
      row.append(h('span', 'num', lv === 5 ? 'MAX' : `${totals[s]}`), h('span', 'today', t ? `+${t}` : ''));
      const minus = h('button', 'minus', '−'); minus.title = `${s} 하나 빼기 (고른 날)`;
      const plus = h('button', 'plus', '+'); plus.title = `${s} +1 (고른 날)`;
      minus.onclick = () => bump(s, -1);
      plus.onclick = () => bump(s, 1);
      row.append(minus, plus);
      rows.append(row);
    }
    wrap.append(rows);
    list.append(wrap);
  }

  function bump(stat, delta) {
    const d = (state.stats[state.selected] = state.stats[state.selected] || {});
    d[stat] = Math.max(0, (d[stat] || 0) + delta);
    window.diary.saveStats(state.stats);
    renderStats();
  }

  function renderSync() {
    const el = $('#sync-status');
    const d = state.data;
    el.classList.toggle('err', !!d.error);
    $('#btn-refresh').classList.toggle('spin', !!d.syncing);
    let txt = '';
    if (d.error) txt = '⚠ ' + d.error;
    else if (d.syncing) txt = '동기화 중…';
    else if (d.lastSync) { const t = new Date(d.lastSync); txt = `마지막 동기화 ${pad(t.getHours())}:${pad(t.getMinutes())}`; }
    el.textContent = txt.length > 70 ? txt.slice(0, 70) + '…' : txt;
    el.title = d.error || '';
    $('#record-sync').textContent = d.lastSync ? `노션 ${pad(new Date(d.lastSync).getHours())}:${pad(new Date(d.lastSync).getMinutes())} 기준 · 2분마다 자동` : '';
    $('#btn-pin').classList.toggle('on', !!state.settings.alwaysOnTop);
  }

  function renderAll() {
    renderLeft(); renderBigCal(); renderRecord(); renderQuests(); renderAssistant(); renderStats(); renderSync();
  }
  D.renderAll = renderAll;
  D.onFontsChanged = () => renderAll();

  function select(date) {
    state.selected = date;
    if (date.slice(0, 7) !== state.viewMonth) state.viewMonth = date.slice(0, 7);
    window.diary.setView({ selected: date, month: state.viewMonth });
    renderAll();
  }
  function goToday() { select(state.today); }
  D.goToday = goToday;

  function shiftMonth(delta) {
    const [y, m] = state.viewMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    state.viewMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    window.diary.setView({ month: state.viewMonth });
    renderLeft(); renderBigCal(); renderRecord();
  }

  function dayChanged(newToday) {
    if (newToday === state.today) return;
    state.today = newToday;
    state.selected = newToday;
    state.viewMonth = newToday.slice(0, 7);
    window.diary.setView({ selected: newToday, month: state.viewMonth });
    D.theme.renderBackground(state.theme);
    renderAll();
    D.cutscene && D.cutscene.maybePlay();
  }

  // ---------- 시작 ----------
  async function start() {
    const init = await window.diary.init();
    document.body.classList.toggle('mac', init.platform === 'darwin');
    state.platform = init.platform;
    state.settings = init.settings || {};
    state.notionCfg = init.notionCfg;
    state.hasKeys = init.hasKeys;
    state.stats = init.stats || {};
    state.themes = init.themes || [];
    state.lastAssistant = init.lastAssistant;
    state.chat = init.chat || [];
    state.data = init.data;
    state.today = init.data.today || state.today;
    state.selected = state.today;
    state.viewMonth = state.today.slice(0, 7);
    if (init.theme) state.theme = D.mergeDefaults(D.DEFAULT_THEME, init.theme);
    // 예전 기본 말투(반말·명랑)를 쓰던 경우 새 기본 말투로 바꿔 줌
    if (state.theme.assistant.tone === '다정하고 씩씩한 반말. 짧고 명랑하게, 가끔 응원 한마디.') {
      state.theme.assistant.tone = D.DEFAULT_THEME.assistant.tone;
      if (state.theme.assistant.name === '모모') state.theme.assistant.name = D.DEFAULT_THEME.assistant.name;
      window.diary.saveTheme(state.theme);
    }
    D.theme.apply(state.theme);
    renderAll();
    D.settings && D.settings.init();
    document.fonts.ready.then(() => D.cutscene && D.cutscene.maybePlay());

    window.diary.onData((d) => { state.data = d; if (d.today && d.today !== state.today) dayChanged(d.today); renderAll(); });
    window.diary.onDayChanged(({ today }) => dayChanged(today));
    window.diary.onAssistant((m) => { state.lastAssistant = m; renderAssistant(); });
    window.diary.onSettings((s) => { state.settings = s; renderAssistant(); renderSync(); D.settings && D.settings.refresh && D.settings.refresh(); });

    $('#btn-refresh').onclick = () => { window.diary.sync(true); };
    $('#btn-today').onclick = goToday;
    $('#mc-prev').onclick = () => shiftMonth(-1);
    $('#mc-next').onclick = () => shiftMonth(1);
    $('#bc-prev').onclick = () => shiftMonth(-1);
    $('#bc-next').onclick = () => shiftMonth(1);
    document.fonts.ready.then(fitBigCal);
    $('#btn-ask').onclick = () => window.diary.askAssistant();
    window.diary.onStats(({ stats, changes }) => {
      state.stats = stats;
      renderStats();
      const ups = changes.filter((c) => c.delta > 0);
      if (ups.length) toast(ups.map((c) => `${c.stat} UP! · ${c.text}`).slice(-3).join('\n'), 3500);
    });
    window.diary.onChat((list) => { state.chat = list; if (!$('#chat-log').hidden) renderChat(); });
    $('#chat-form').onsubmit = async (e) => {
      e.preventDefault();
      const input = $('#chat-input');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      input.disabled = true;
      await window.diary.chat(text);
      input.disabled = false;
      input.focus();
    };
    $('#btn-chatlog').onclick = () => openChat($('#chat-log').hidden);
    $('#btn-chat-close').onclick = () => openChat(false);
    $('#btn-chat-clear').onclick = async () => { if (confirm('비서와의 대화 기록을 지울까요?')) state.chat = await window.diary.clearChat(); renderChat(); };
    $('#btn-claude').onclick = () => state.settings.claudeUrl && window.diary.open(state.settings.claudeUrl);
    $('#chk-hourly').onchange = (e) => window.diary.setSettings({ hourly: e.target.checked });
    $('#btn-pin').onclick = () => window.diary.setSettings({ alwaysOnTop: !state.settings.alwaysOnTop });

    // 자정 대비 2중 장치 + 배경 시간표(요일별/일정 시간마다)
    let lastBgKey = '';
    setInterval(() => {
      const t = iso(new Date());
      if (t !== state.today) dayChanged(t);
      const bg = D.theme.activeBg(state.theme);
      const key = JSON.stringify(bg).length + ':' + (bg.media ? bg.media.url : '') + ':' + bg.type;
      if (key !== lastBgKey) { lastBgKey = key; D.theme.renderBackground(state.theme); }
    }, 30 * 1000);
  }

  window.addEventListener('DOMContentLoaded', start);
})();
