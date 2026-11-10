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
      cell.onclick = () => select(di);
      grid.append(cell);
    }
  }

  // ---------- 오른쪽 ----------
  function todoNode(item) {
    const wrap = document.createDocumentFragment();
    const row = h('div', 'todo' + (item.checked ? ' done' : ''));
    row.append(h('span', 'box', item.checked ? '✓' : ''));
    row.append(S('checklist', item.text, 'txt'));
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
    head.append(S('section', '진행 중 퀘스트'), h('small', null, `${state.data.quests.length}개`));
    const list = $('#quest-list'); list.innerHTML = '';
    if (!state.data.quests.length) {
      const e = h('div', 'empty'); e.append(S('body', state.data.needsSetup ? '노션 연결 후 표시돼요.' : '진행 중인 퀘스트가 없어요.'));
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
    const fig = $('#asst-figure'); fig.innerHTML = '';
    if (a.image) { const img = h('img'); img.src = a.image.url; img.alt = a.name; fig.append(img); }
    else { const p = h('div', 'placeholder'); p.textContent = '설정 > 비서에서\n캐릭터 그림(PNG)을\n올려 주세요'; p.style.whiteSpace = 'pre-line'; fig.append(p); }
    $('#asst-name').textContent = a.name;
    const msg = state.lastAssistant;
    const text = $('#asst-text');
    text.classList.toggle('thinking', !!(msg && msg.thinking));
    text.replaceChildren(S('bubble', msg && msg.thinking ? '생각하는 중…' : msg ? msg.text : `안녕! 나는 ${a.name}. "지금 확인해줘"를 누르면 오늘 할 일을 같이 봐줄게.`));
    const meta = $('#asst-meta');
    if (msg && msg.at && !msg.thinking) {
      const t = new Date(msg.at);
      meta.textContent = `${pad(t.getHours())}:${pad(t.getMinutes())} · ${msg.source === 'claude' ? 'AI' : '기본 문장'}${msg.note ? ' · ' + msg.note : ''}`;
    } else meta.textContent = '';
    $('#chk-hourly').checked = !!state.settings.hourly;
  }

  function renderStats() {
    const head = $('#stats-title'); head.innerHTML = '';
    const sel = parse(state.selected);
    const lg = h('small', 'stats-legend');
    lg.innerHTML = `<span><i style="background:var(--main)"></i>${sel.getMonth() + 1}월 누적</span><span><i style="background:var(--accent)"></i>${sel.getMonth() + 1}/${sel.getDate()}</span>`;
    head.append(S('section', '능력치'), lg);
    const month = state.selected.slice(0, 7);
    const totals = Object.fromEntries(STATS.map((s) => [s, 0]));
    for (const [date, v] of Object.entries(state.stats)) {
      if (!date.startsWith(month)) continue;
      STATS.forEach((s) => { totals[s] += v[s] || 0; });
    }
    const max = Math.max(10, ...Object.values(totals));
    const today = state.stats[state.selected] || {};
    const list = $('#stats-list'); list.innerHTML = '';
    for (const s of STATS) {
      const row = h('div', 'stat');
      row.append(S('body', s, 'nm'));
      const tr = h('div', 'track');
      const all = h('i'); all.style.width = `${(totals[s] / max) * 100}%`;
      const mine = h('b'); const t = today[s] || 0;
      mine.style.left = `${((totals[s] - t) / max) * 100}%`; mine.style.width = `${(t / max) * 100}%`;
      tr.append(all, mine);
      row.append(tr, h('span', 'num', String(totals[s])));
      const minus = h('button', 'minus', '−'); minus.title = '하나 빼기';
      const plus = h('button', 'plus', '+'); plus.title = `${s} +1`;
      minus.onclick = () => bump(s, -1);
      plus.onclick = () => bump(s, 1);
      row.append(minus, plus);
      list.append(row);
    }
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
    renderLeft(); renderRecord(); renderQuests(); renderAssistant(); renderStats(); renderSync();
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
    renderLeft(); renderRecord();
  }

  function dayChanged(newToday) {
    if (newToday === state.today) return;
    state.today = newToday;
    state.selected = newToday;
    state.viewMonth = newToday.slice(0, 7);
    window.diary.setView({ selected: newToday, month: state.viewMonth });
    D.theme.renderBackground(state.theme);
    renderAll();
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
    state.data = init.data;
    state.today = init.data.today || state.today;
    state.selected = state.today;
    state.viewMonth = state.today.slice(0, 7);
    if (init.theme) state.theme = D.mergeDefaults(D.DEFAULT_THEME, init.theme);
    D.theme.apply(state.theme);
    renderAll();
    D.settings && D.settings.init();

    window.diary.onData((d) => { state.data = d; if (d.today && d.today !== state.today) dayChanged(d.today); renderAll(); });
    window.diary.onDayChanged(({ today }) => dayChanged(today));
    window.diary.onAssistant((m) => { state.lastAssistant = m; renderAssistant(); });
    window.diary.onSettings((s) => { state.settings = s; renderAssistant(); renderSync(); D.settings && D.settings.refresh && D.settings.refresh(); });

    $('#btn-refresh').onclick = () => { window.diary.sync(true); };
    $('#btn-today').onclick = goToday;
    $('#mc-prev').onclick = () => shiftMonth(-1);
    $('#mc-next').onclick = () => shiftMonth(1);
    $('#btn-ask').onclick = () => window.diary.askAssistant();
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
