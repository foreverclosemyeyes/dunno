// 오른쪽 설정 패널: 연결 / 글씨 / 색·배치 / 배경 / 비서 / 테마
(function () {
  const { h } = D.ctl;
  const C = D.ctl;
  const panel = document.getElementById('settings');
  const state = D.state;
  let tab = 'connect';
  let textKey = 'bigDate';
  let bgSlot = 'base'; // base | weekday.N | rotation.items.N
  let dragOn = false;

  // ---------- 저장 / 실행 취소 ----------
  const history = { list: [], idx: -1 };
  let saveTimer = null, commitTimer = null;
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => window.diary.saveTheme(state.theme), 400);
  }
  function snapshotHistory() {
    const j = JSON.stringify(state.theme);
    if (history.list[history.idx] === j) return;
    history.list = history.list.slice(0, history.idx + 1);
    history.list.push(j);
    if (history.list.length > 150) history.list.shift();
    history.idx = history.list.length - 1;
    updateUndoButtons();
  }
  function commit() {
    clearTimeout(commitTimer);
    commitTimer = setTimeout(snapshotHistory, 250);
    saveSoon();
  }
  function loadTheme(themeObj, { record = true } = {}) {
    state.theme = D.mergeDefaults(D.DEFAULT_THEME, themeObj);
    applyAll();
    if (record) commit(); else saveSoon();
    render();
  }
  function undo() {
    if (history.idx <= 0) return;
    history.idx--;
    loadTheme(JSON.parse(history.list[history.idx]), { record: false });
    updateUndoButtons();
  }
  function redo() {
    if (history.idx >= history.list.length - 1) return;
    history.idx++;
    loadTheme(JSON.parse(history.list[history.idx]), { record: false });
    updateUndoButtons();
  }
  function updateUndoButtons() {
    const u = panel.querySelector('#btn-undo'), r = panel.querySelector('#btn-redo');
    if (u) u.disabled = history.idx <= 0;
    if (r) r.disabled = history.idx >= history.list.length - 1;
  }

  let rafPending = false;
  function applyAll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      D.theme.apply(state.theme);
      D.renderAll();
    });
  }

  // 꾸밈값 읽기/쓰기 도우미
  const ctx = {
    get: (p) => D.getPath(state.theme, p),
    set: (p, v) => { D.setPath(state.theme, p, v); applyAll(); },
    commit,
    def: (p) => {
      const m = p.match(/^background\.(?:base|weekday\.\d|rotation\.items\.\d+)\.(.+)$/);
      if (m) return D.getPath(D.makeBg(), m[1]);
      return D.getPath(D.DEFAULT_THEME, p);
    },
    rerender: () => render(),
  };

  // ---------- 패널 틀 ----------
  const TABS = [
    ['connect', '연결'], ['text', '글씨'], ['look', '색·배치'], ['bg', '배경'], ['asst', '비서'], ['themes', '테마'],
  ];

  function open() {
    document.body.classList.add('settings-open');
    panel.setAttribute('aria-hidden', 'false');
    render();
  }
  function close() {
    document.body.classList.remove('settings-open');
    panel.setAttribute('aria-hidden', 'true');
    setDrag(false);
    state.previewBg = null;
    D.theme.renderBackground(state.theme);
  }

  function render() {
    const scroll = panel.querySelector('.set-body');
    const keep = scroll ? scroll.scrollTop : 0;
    const openSecs = [...panel.querySelectorAll('details.sec')].map((d) => d.open);
    panel.innerHTML = '';
    const head = h('div', 'set-head');
    head.append(h('div', 'set-title', '꾸미기 · 설정'));
    const acts = h('div', 'set-acts');
    const u = h('button', 'icon-btn sm', '↶'); u.id = 'btn-undo'; u.title = '실행 취소 (⌘/Ctrl+Z)'; u.onclick = undo;
    const r = h('button', 'icon-btn sm', '↷'); r.id = 'btn-redo'; r.title = '다시 실행 (⌘/Ctrl+Shift+Z)'; r.onclick = redo;
    const x = h('button', 'icon-btn sm', '✕'); x.title = '닫기'; x.onclick = close;
    acts.append(u, r, x);
    head.append(acts);
    panel.append(head);

    const tabs = h('div', 'set-tabs');
    for (const [k, t] of TABS) {
      const b = h('button', k === tab ? 'on' : '', t);
      b.onclick = () => { tab = k; if (k !== 'bg') { state.previewBg = null; setDrag(false); D.theme.renderBackground(state.theme); } render(); };
      tabs.append(b);
    }
    panel.append(tabs);

    const body = h('div', 'set-body scroll');
    panel.append(body);
    ({ connect: renderConnect, text: renderText, look: renderLook, bg: renderBg, asst: renderAsst, themes: renderThemes })[tab](body);
    const secs = [...body.querySelectorAll('details.sec')];
    if (secs.length === openSecs.length) secs.forEach((d, i) => { d.open = openSecs[i]; });
    body.scrollTop = keep;
    updateUndoButtons();
  }

  const note = (text) => { const n = h('div', 'note'); n.innerHTML = text; return n; };
  const btn = (label, cls, fn) => { const b = h('button', 'btn ' + (cls || ''), label); b.onclick = fn; return b; };
  const linkBtn = (label, url) => btn(label, 'link', () => window.diary.open(url));

  // ---------- 연결 ----------
  function keyField(name, label, placeholder) {
    const wrap = h('div', 'key');
    const status = h('div', 'key-status ' + (state.hasKeys[name] ? 'ok' : ''), state.hasKeys[name] ? '● 저장됨 (암호화 보관)' : '○ 아직 없음');
    const input = h('input'); input.type = 'password'; input.placeholder = placeholder; input.autocomplete = 'off';
    const save = btn('저장', 'primary', async () => {
      if (!input.value.trim()) return D.toast('키를 붙여 넣어 주세요.');
      state.hasKeys = await window.diary.setSecret(name, input.value);
      input.value = '';
      D.renderAll();
      D.toast('저장했어요.');
      render();
    });
    const del = btn('지우기', '', async () => { state.hasKeys = await window.diary.setSecret(name, ''); D.renderAll(); render(); });
    const line = h('div', 'row-inline'); line.append(input, save, del);
    wrap.append(h('div', 'ctl-label', label), status, line);
    return wrap;
  }

  function renderConnect(body) {
    const n = C.section('노션 연결', true);
    const lg = h('div', 'key');
    lg.append(h('div', 'ctl-label', '노션으로 로그인 (관리자 권한 없이 — 추천)'));
    lg.append(h('div', 'key-status ' + (state.notionLogin ? 'ok' : ''), state.notionLogin ? '● 로그인됨' : '○ 아직 안 함'));
    const lr = h('div', 'row-inline');
    if (!state.notionLogin) {
      lr.append(btn('노션으로 로그인', 'primary', async (ev) => {
        ev.target.textContent = '브라우저에서 허용을 눌러 주세요…';
        const r = await window.diary.notionLogin();
        if (r.ok) { state.notionLogin = true; state.hasKeys.notion = true; D.toast('노션 연결 완료! 불러오는 중…'); D.renderAll(); }
        else D.toast(r.message, 6000);
        render();
      }));
    } else {
      lr.append(btn('로그아웃', '', async () => { await window.diary.notionLogout(); state.notionLogin = false; render(); }));
    }
    lg.append(lr);
    n.body.append(lg, note('브라우저에서 노션 로그인 화면이 열리면 <b>Buzz & Beyond</b> 워크스페이스를 고르고 <b>허용</b>을 누르세요. 회사에서 API 키를 만들 수 없을 때 쓰는 방법이에요. 아래 노션 키 칸은 비워 두면 돼요.'));
    n.body.append(keyField('notion', '노션 내부 통합 키', 'ntn_ 로 시작하는 키 붙여넣기'));
    const test = h('div', 'test-result');
    n.body.append(h('div', 'row-inline', null));
    n.body.lastChild.append(
      btn('연결 테스트', '', async () => { test.textContent = '확인 중…'; const r = await window.diary.testNotion(); test.textContent = r.message; test.className = 'test-result ' + (r.ok ? 'ok' : 'err'); }),
      btn('지금 새로고침', '', () => window.diary.sync(true)),
      linkBtn('통합 만들기 페이지 ↗', 'https://www.notion.so/profile/integrations'),
    );
    n.body.append(test);
    n.body.append(note('키 발급·DB 연결 방법은 <b>안내서(사용설명서.md)</b>의 "노션 연결하기"를 따라 하세요. 키는 이 컴퓨터의 보안 저장소로 암호화돼서 저장되고 화면에는 다시 보이지 않아요.'));

    const ids = C.section('노션 대상 (보통은 바꿀 필요 없음)');
    const fields = [['userId', '내 노션 user ID'], ['dataSourceId', 'data source ID'], ['databaseId', 'database ID']];
    const inputs = {};
    for (const [k, l] of fields) {
      const i = h('input'); i.type = 'text'; i.value = (state.notionCfg || {})[k] || '';
      inputs[k] = i;
      const r = h('div', 'ctl'); r.append(h('label', 'ctl-label', l), i, h('span')); ids.body.append(r);
    }
    ids.body.append(btn('저장하고 다시 불러오기', 'primary', async () => {
      const p = {}; for (const k in inputs) p[k] = inputs[k].value.trim();
      state.notionCfg = await window.diary.setNotionCfg(p); D.toast('저장했어요. 다시 불러오는 중…');
    }));

    const a = C.section('AI 비서 (Anthropic)', true);
    a.body.append(keyField('anthropic', 'Anthropic API 키', 'sk-ant- 로 시작하는 키 붙여넣기'));
    a.body.append(h('div', 'row-inline'));
    a.body.lastChild.append(linkBtn('키 발급 페이지 ↗', 'https://console.anthropic.com/settings/keys'), btn('지금 확인해줘', '', () => window.diary.askAssistant()));
    a.body.append(note('쓴 만큼 요금이 나가요(선불 크레딧). 가볍고 빠른 <b>Claude Haiku 5.5</b>를 쓰고, 매시간 체크를 켜도 한 달에 보통 <b>몇십 원~몇백 원</b> 수준이에요. <b>키 없이 Claude 구독으로 대화하기</b>: 이 맥에 Claude Code를 설치하고 로그인하면(사용설명서 4장), 렌이 구독으로 대답해요. 크레딧은 안 써요. 둘 다 없으면 렌은 정해진 문장으로만 말해요.'));

    const up = C.section('업데이트', true);
    const u = state.update || {};
    up.body.append(note(`지금 버전: <b>v${state.version || '?'}</b>${u.latest ? ` · 최신: <b>v${u.latest}</b>` : ''}${u.available ? ' · <b style="color:#c62d0d">새 버전 있음</b>' : u.latest ? ' · 최신이에요' : ''}${u.error ? `<br>⚠ ${u.error}` : ''}`));
    up.body.append(keyField('github', 'GitHub 열쇠 (저장소가 비공개일 때만)', 'github_pat_ 로 시작하는 토큰 붙여넣기'));
    up.body.append(h('div', 'row-inline'));
    up.body.lastChild.append(
      btn('지금 확인', '', async () => { await window.diary.checkUpdate(); render(); }),
      ...(u.available ? [btn(`v${u.latest} 로 업데이트`, 'primary', () => document.getElementById('btn-update').click())] : []),
      linkBtn('열쇠 만들기 페이지 ↗', 'https://github.com/settings/personal-access-tokens/new'),
    );
    up.body.append(note('새 버전이 있으면 위쪽에 <b>UPDATE</b> 버튼이 떠요. 누르면 받아서 바꿔 끼우고 다시 켜져요. 앱은 <b>응용 프로그램 폴더</b>에 있어야 해요.'));
    const g = C.section('일반', true);
    const sw = (key, label, desc) => {
      const r = h('div', 'ctl');
      const l = h('label', 'switch'); const cb = h('input'); cb.type = 'checkbox'; cb.checked = key === 'autoStats' ? state.settings[key] !== false : !!state.settings[key];
      cb.onchange = async () => { state.settings = await window.diary.setSettings({ [key]: cb.checked }); };
      l.append(cb, h('span'));
      const lab = h('label', 'ctl-label', label);
      if (desc) lab.title = desc;
      r.append(lab, l, h('span'));
      return r;
    };
    g.body.append(
      sw('autoLaunch', '컴퓨터 켜면 자동 실행', '로그인할 때 트레이에 조용히 켜져요'),
      sw('hourly', '매시간 체크 (평일 9~19시 정시)'),
      sw('alwaysOnTop', '항상 다른 창 위에 띄우기'),
      sw('autoStats', '인간 파라미터 자동으로 올리기', '체크리스트를 완료하면 일의 성격을 보고 파라미터 +1'),
    );
    g.body.append(h('div', 'row-inline'));
    g.body.lastChild.append(btn('인간 파라미터 처음부터 다시', 'danger', async () => {
      if (!confirm('인간 파라미터 점수를 모두 0으로 되돌릴까요?\n오늘부터 끝낸 일만 다시 쌓여요.')) return;
      state.stats = await window.diary.resetStats(); D.renderAll(); D.toast('처음부터 다시 시작해요.');
    }));
    g.body.append(note('창을 닫아도(✕) 앱은 메뉴 막대/트레이에 남아 정시 알림을 보내요. 완전히 끄려면 트레이 아이콘 → "완전히 종료".'));
    if (!state.settings.isPackaged) { /* 개발 실행에서는 자동 실행이 등록되지 않음 */ }
    const hq = C.section(`숨긴 업무 (${(state.settings.hiddenQuests || []).length})`);
    const names = state.settings.hiddenQuestNames || {};
    if (!(state.settings.hiddenQuests || []).length) hq.body.append(note('진행 중 업무 줄에 마우스를 올려 <b>×</b>를 누르면 여기로 숨겨져요. (휴지통에 넣은 노션 업무가 보일 때 쓰세요)'));
    for (const id of state.settings.hiddenQuests || []) {
      const r = h('div', 'row-inline');
      r.append(h('span', 'file-name', names[id] || id), btn('다시 보이기', 'sm', async () => {
        state.settings = await window.diary.setSettings({ hiddenQuests: (state.settings.hiddenQuests || []).filter((x) => x !== id) });
        D.renderAll(); render();
      }));
      hq.body.append(r);
    }
    body.append(n.el, a.el, hq.el, up.el, g.el, ids.el);
  }

  // ---------- 글씨 ----------
  function renderText(body) {
    const chips = h('div', 'chips');
    for (const [k, label] of D.ELEMENTS) {
      const b = h('button', k === textKey ? 'on' : '', label);
      b.onclick = () => { textKey = k; render(); };
      chips.append(b);
    }
    body.append(chips);
    const P = `text.${textKey}`;
    const s = ctx.get(P);

    const f = C.section('글씨체 · 크기', true);
    f.body.append(
      C.font(ctx, `${P}.font`, '글씨체', () => render()),
      C.weight(ctx, `${P}.weight`, s.font),
      C.slider(ctx, `${P}.size`, '크기', 6, textKey === 'bigDate' ? 480 : 120, 1, 'px'),
      C.slider(ctx, `${P}.tracking`, '자간', -30, 60, 0.5, 'px'),
      C.slider(ctx, `${P}.lineHeight`, '행간', 0.5, 3, 0.05, '배'),
    );
    const tf = C.section('늘이기 · 회전 · 기울임', true);
    tf.body.append(
      C.slider(ctx, `${P}.scaleY`, '세로 길이', 20, 300, 1, '%'),
      C.slider(ctx, `${P}.scaleX`, '가로 폭', 20, 300, 1, '%'),
      C.slider(ctx, `${P}.rotate`, '통째로 회전', -180, 180, 1, '°'),
      C.select(ctx, `${P}.origin`, '회전 기준점', [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']]),
      C.slider(ctx, `${P}.skew`, '기울임 (이탤릭)', -30, 30, 0.5, '°'),
    );
    const pc = C.section('글자 하나하나 회전');
    pc.body.append(C.toggle(ctx, `${P}.perChar`, '글자별 회전 켜기', () => render()));
    if (s.perChar) {
      pc.body.append(C.select(ctx, `${P}.perCharMode`, '방식', [['random', '랜덤'], ['manual', '직접 정한 각도']], () => render()));
      if (s.perCharMode === 'random') {
        pc.body.append(C.slider(ctx, `${P}.perCharRange`, '흔들림 범위 ±', 0, 45, 0.5, '°'), C.slider(ctx, `${P}.perCharSeed`, '랜덤 모양 번호', 1, 999, 1));
      } else {
        pc.body.append(C.text(ctx, `${P}.perCharAngles`, '각도 목록', { placeholder: '예: -6, 4, -2, 8 (글자마다 차례로)' }));
      }
    }
    const col = C.section('색 · 외곽선 · 그림자', true);
    col.body.append(
      C.colorA(ctx, `${P}.color`, '글자 색', { allowAuto: true }),
      C.slider(ctx, `${P}.strokeW`, '외곽선 두께', 0, 12, 0.25, 'px'),
      C.colorA(ctx, `${P}.strokeC`, '외곽선 색'),
      C.toggle(ctx, `${P}.shadowOn`, '그림자', () => render()),
    );
    if (s.shadowOn) {
      col.body.append(
        C.slider(ctx, `${P}.shadowAngle`, '그림자 방향', 0, 360, 1, '°'),
        C.slider(ctx, `${P}.shadowDist`, '그림자 거리', 0, 60, 0.5, 'px'),
        C.slider(ctx, `${P}.shadowBlur`, '그림자 흐림', 0, 40, 0.5, 'px'),
        C.colorA(ctx, `${P}.shadowC`, '그림자 색'),
      );
    }
    const dec = C.section('대문자 · 밑줄');
    dec.body.append(
      C.toggle(ctx, `${P}.upper`, '영문 대문자로'),
      C.select(ctx, `${P}.deco`, '선', [['none', '없음'], ['underline', '밑줄'], ['line-through', '줄긋기'], ['overline', '윗줄'], ['underline line-through', '밑줄+줄긋기']]),
      C.select(ctx, `${P}.decoStyle`, '선 모양', [['solid', '실선'], ['double', '이중선'], ['dotted', '점선'], ['dashed', '파선'], ['wavy', '물결']]),
    );
    body.append(f.el, tf.el, pc.el, col.el, dec.el);
    body.append(btn(`"${D.ELEMENTS.find((e) => e[0] === textKey)[1]}" 전체 기본값으로`, '', () => { ctx.set(P, D.clone(D.DEFAULT_THEME.text[textKey])); commit(); render(); }));
  }

  // ---------- 색 · 배치 ----------
  function renderLook(body) {
    const pal = C.section('색 조합 (누르면 한 번에 바뀌어요)', true);
    const pg = h('div', 'pal-grid');
    D.PALETTES.forEach(([name, p], i) => {
      const b = h('button', 'pal');
      const sw = h('div', 'pal-sw');
      ['bg', 'panel', 'card', 'accent', 'param', 'sat'].forEach((k) => { const d = h('i'); d.style.background = p[k]; sw.append(d); });
      b.append(sw, h('span', null, name));
      b.onclick = () => {
        state.theme.colors = { ...state.theme.colors, ...D.paletteColors(i) };
        state.theme.text.stamp.color = { c: p.accent, a: 1 };
        applyAll(); commit(); render();
      };
      pg.append(b);
    });
    pal.body.append(pg, note('바꾼 뒤에 아래에서 색을 하나씩 더 고칠 수 있고, 실행 취소(↶)로 되돌릴 수 있어요.'));
    body.append(pal.el);
    const c = C.section('색 하나씩', true);
    c.body.append(
      C.colorA(ctx, 'colors.bg', '배경'), C.colorA(ctx, 'colors.main', '메인 (글씨/선)'), C.colorA(ctx, 'colors.accent', '포인트'),
      C.colorA(ctx, 'colors.card', '카드'), C.colorA(ctx, 'colors.cardText', '카드 글씨'),
      C.colorA(ctx, 'colors.sun', '일요일'),
      C.colorA(ctx, 'colors.sat', '토요일'),
      C.colorA(ctx, 'colors.panel', '사선 면'),
      C.colorA(ctx, 'colors.param', '인간 파라미터 별'),
      C.colorA(ctx, 'colors.event', '일정 점·선'),
    );
    const mode = C.section('레이아웃', true);
    mode.body.append(C.select(ctx, 'layout.mode', '화면 구성', [['bigcal', '큰 달력 + 노트 카드'], ['classic', '큰 날짜 숫자 + 이번 주 띠']], () => render()));
    if (state.theme.layout.mode === 'bigcal') {
      mode.body.append(
        C.slider(ctx, 'layout.calJitter', '달력 숫자 흔들림', 0, 15, 0.5, '°'),
        C.toggle(ctx, 'layout.panelOn', '오른쪽 사선 면'),
        C.slider(ctx, 'layout.panelOpacity', '사선 면 진하기', 0, 100, 1, '%'),
        C.slider(ctx, 'layout.panelAngle', '사선 면 기울기', -60, 60, 1),
        C.text(ctx, 'layout.stampText', '다 끝냈을 때 도장 글씨'),
        C.toggle(ctx, 'layout.cutOn', '하루 시작 컷 (날짜 바뀐 뒤 처음 켤 때)'),
      );
      const er = h('div', 'ctl');
      const sel = h('select');
      [['all', '내 업무 중 기간이 있는 것 전부'], ['tags', 'Tags가 meeting·seminar 인 것만']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; sel.append(o); });
      sel.value = state.settings.eventMode || 'all';
      sel.onchange = async () => { state.settings = await window.diary.setSettings({ eventMode: sel.value }); D.toast('일정을 다시 불러오는 중…'); };
      er.append(h('label', 'ctl-label', '달력 일정 점'), sel, h('span'));
      mode.body.append(er);
      mode.body.append(btn('하루 시작 컷 미리 보기', '', () => D.cutscene.play({ force: true })));
      mode.body.append(note('일정은 노션 "기간"으로 표시돼요. 하루짜리는 ○, 여러 날은 ○—○ 로 이어져요. Tags에 meeting·seminar 가 있으면 포인트 색이에요. 큰 달력 숫자·요일·도장 글씨는 "글씨" 탭에서 꾸며요.'));
    }
    const l = C.section('배치 · 기울기', true);
    l.body.append(
      C.slider(ctx, 'layout.calTilt', '달력 영역 기울기', -20, 20, 0.5, '°'),
      C.slider(ctx, 'layout.cardTilt', '카드 기울기', -10, 10, 0.1, '°'),
    );
    const s = C.section('사선 띠 · 질감', true);
    s.body.append(
      C.toggle(ctx, 'layout.stripeOn', '사선 띠 보이기'),
      C.slider(ctx, 'layout.stripeAngle', '띠 각도', -80, 80, 0.5, '°'),
      C.slider(ctx, 'layout.stripeWidth', '띠 두께', 0, 700, 1, 'px'),
      C.slider(ctx, 'layout.stripePos', '띠 위치 (왼→오)', -20, 120, 0.5, '%'),
      C.slider(ctx, 'layout.stripeOpacity', '띠 진하기', 0, 100, 1, '%'),
      C.toggle(ctx, 'layout.textureOn', '질감 보이기'),
      C.slider(ctx, 'layout.texture', '질감 세기', 0, 100, 1, '%'),
    );
    body.append(mode.el, c.el, l.el, s.el);
  }

  // ---------- 배경 ----------
  const WD_NAMES = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토', 0: '일' };
  function slotPath() { return `background.${bgSlot}`; }
  function setDrag(on) {
    dragOn = on;
    document.getElementById('bg-drag').hidden = !on;
  }
  function previewSlot() {
    const b = ctx.get(slotPath());
    state.previewBg = b && bgSlot !== 'base' ? b : null;
    D.theme.renderBackground(state.theme);
  }

  function renderBg(body) {
    const B = state.theme.background;
    const m = C.section('배경 바꾸는 방식', true);
    m.body.append(C.select(ctx, 'background.mode', '방식', [['single', '하나만 쓰기'], ['weekday', '요일별로 다르게'], ['rotate', '여러 장을 시간마다 바꾸기']], () => { bgSlot = 'base'; render(); }));

    const chips = h('div', 'chips');
    const chip = (slot, label, extra) => {
      const b = h('button', (slot === bgSlot ? 'on ' : '') + (extra || ''), label);
      b.onclick = () => { bgSlot = slot; previewSlot(); render(); };
      chips.append(b);
    };
    chip('base', '기본 배경');
    if (B.mode === 'weekday') {
      for (const d of [1, 2, 3, 4, 5, 6, 0]) chip(`weekday.${d}`, WD_NAMES[d], B.weekday[d] ? 'has' : 'empty');
    }
    if (B.mode === 'rotate') {
      B.rotation.items.forEach((_, i) => chip(`rotation.items.${i}`, `${i + 1}번`));
      const add = h('button', 'add', '+ 그림/동영상 추가');
      add.onclick = async () => {
        const assets = await window.diary.pickAsset('media');
        for (const a of assets) {
          const isVid = /\.(mp4|webm)$/i.test(a.name);
          B.rotation.items.push(D.makeBg({ type: isVid ? 'video' : 'image', media: { url: a.url, name: a.name } }));
        }
        if (assets.length) { bgSlot = `rotation.items.${B.rotation.items.length - 1}`; applyAll(); commit(); previewSlot(); render(); }
      };
      chips.append(add);
      m.body.append(C.slider(ctx, 'background.rotation.minutes', '바꾸는 간격', 1, 720, 1, '분'));
    }
    m.body.append(chips);
    if (B.mode === 'weekday') m.body.append(note('요일을 따로 꾸미지 않으면 기본 배경을 써요. 오늘이 아닌 요일을 고르면 미리보기로 잠깐 보여 줘요.'));
    body.append(m.el);

    const cur = ctx.get(slotPath());
    if (!cur) {
      const e = C.section(`${WD_NAMES[bgSlot.split('.')[1]]}요일 배경`, true);
      e.body.append(note('지금은 기본 배경을 써요.'), btn('이 요일 따로 꾸미기', 'primary', () => {
        ctx.set(slotPath(), D.clone(B.base)); commit(); previewSlot(); render();
      }));
      body.append(e.el);
      return;
    }
    const P = slotPath();
    const t = C.section('종류', true);
    t.body.append(C.select(ctx, `${P}.type`, '종류', [['theme', '색·배치 탭의 배경색'], ['solid', '단색'], ['gradient', '그라데이션'], ['image', '이미지'], ['video', '동영상 (소리 없이 반복)']], () => render()));
    if (cur.type === 'solid') t.body.append(C.colorA(ctx, `${P}.solid`, '색'));
    if (cur.type === 'gradient') {
      t.body.append(
        C.select(ctx, `${P}.grad.kind`, '모양', [['linear', '직선'], ['radial', '원형'], ['conic', '회전형']], () => render()),
        C.slider(ctx, `${P}.grad.angle`, '방향 · 각도', 0, 360, 1, '°'),
      );
      cur.grad.stops.forEach((s, i) => {
        const g = h('div', 'stop');
        g.append(C.colorA(ctx, `${P}.grad.stops.${i}`, `색 ${i + 1}`), C.slider(ctx, `${P}.grad.stops.${i}.p`, `색 ${i + 1} 위치`, 0, 100, 1, '%'));
        if (cur.grad.stops.length > 2) g.append(btn('이 색 빼기', 'sm', () => { cur.grad.stops.splice(i, 1); applyAll(); commit(); render(); }));
        t.body.append(g);
      });
      t.body.append(btn('+ 색 추가', '', () => { cur.grad.stops.push({ c: '#ff4a1c', a: 1, p: 100 }); applyAll(); commit(); render(); }));
    }
    if (cur.type === 'image' || cur.type === 'video') {
      const r = h('div', 'row-inline');
      r.append(h('span', 'file-name', cur.media ? cur.media.name : '아직 파일 없음'), btn('파일 올리기', 'primary', async () => {
        const assets = await window.diary.pickAsset(cur.type === 'video' ? 'video' : 'image');
        if (assets[0]) { ctx.set(`${P}.media`, { url: assets[0].url, name: assets[0].name }); commit(); D.theme.renderBackground(state.theme, true); render(); }
      }));
      t.body.append(r);
      t.body.append(C.select(ctx, `${P}.fit`, '채우기 방식', [['cover', '꽉 채우기'], ['contain', '맞추기'], ['tile', '바둑판'], ['center', '가운데']]));
      if (cur.type === 'video') t.body.append(note('동영상은 "바둑판" 대신 꽉 채우기로 보여요.'));
    }
    const pos = C.section('위치 · 크기 · 회전', true);
    const drag = btn(dragOn ? '드래그 끄기' : '드래그로 옮기기', dragOn ? 'primary' : '', () => { setDrag(!dragOn); render(); });
    pos.body.append(drag,
      C.slider(ctx, `${P}.x`, '가로 위치', -1500, 1500, 1, 'px'),
      C.slider(ctx, `${P}.y`, '세로 위치', -1500, 1500, 1, 'px'),
      C.slider(ctx, `${P}.scale`, '확대 · 축소', 10, 400, 1, '%'),
      C.slider(ctx, `${P}.rotate`, '회전', -180, 180, 0.5, '°'),
    );
    const fx = C.section('글씨가 잘 보이게', true);
    fx.body.append(
      C.slider(ctx, `${P}.brightness`, '밝기', 0, 200, 1, '%'),
      C.slider(ctx, `${P}.blur`, '흐림', 0, 40, 0.5, 'px'),
      C.slider(ctx, `${P}.opacity`, '투명도 (보이는 정도)', 0, 100, 1, '%'),
      C.colorA(ctx, `${P}.overlayC`, '색 덮개 색'),
      C.slider(ctx, `${P}.overlay`, '색 덮개 세기', 0, 100, 1, '%'),
    );
    const layers = C.section('배경 위 장식', true);
    layers.body.append(C.toggle(ctx, 'layout.stripeOn', '사선 띠'), C.toggle(ctx, 'layout.textureOn', '질감'));
    body.append(t.el, pos.el, fx.el, layers.el);

    if (bgSlot.startsWith('weekday.')) body.append(btn('이 요일은 기본 배경 쓰기', '', () => { ctx.set(P, null); commit(); previewSlot(); render(); }));
    if (bgSlot.startsWith('rotation.items.')) {
      const i = +bgSlot.split('.')[2];
      body.append(btn('이 배경 빼기', '', () => { B.rotation.items.splice(i, 1); bgSlot = 'base'; applyAll(); commit(); previewSlot(); render(); }));
    }
  }

  // 배경 드래그
  (function dragSetup() {
    const layer = document.getElementById('bg-drag');
    let start = null;
    layer.addEventListener('pointerdown', (e) => {
      const b = ctx.get(slotPath()); if (!b) return;
      start = { x: e.clientX, y: e.clientY, bx: b.x, by: b.y };
      layer.setPointerCapture(e.pointerId);
    });
    layer.addEventListener('pointermove', (e) => {
      if (!start) return;
      const P = slotPath();
      D.setPath(state.theme, `${P}.x`, Math.round(start.bx + e.clientX - start.x));
      D.setPath(state.theme, `${P}.y`, Math.round(start.by + e.clientY - start.y));
      if (state.previewBg) state.previewBg = ctx.get(P);
      D.theme.renderBackground(state.theme);
    });
    layer.addEventListener('pointerup', () => { if (start) { start = null; commit(); render(); } });
  })();

  // ---------- 비서 ----------
  function renderAsst(body) {
    const a = C.section('이름 · 말투', true);
    a.body.append(
      C.text(ctx, 'assistant.name', '비서 이름'),
      C.text(ctx, 'assistant.tone', '말투 · 성격', { multiline: true, placeholder: '예: 시크하지만 챙겨주는 존댓말, 짧게' }),
    );
    a.body.append(C.select(ctx, 'layout.dialog', '대화창 모양', [['angular', '각진 대화창'], ['flat', '네모 칸']]));
    const img = C.section('캐릭터 그림 (표정 6가지)', true);
    const grid = h('div', 'face-grid');
    const faces = state.theme.assistant.faces || {};
    if (!faces.base && state.theme.assistant.image) faces.base = state.theme.assistant.image;
    for (const [key, ko] of D.face.MOODS) {
      const cell = h('div', 'face-cell');
      const pic = h('div', 'face-pic');
      if (faces[key]) { const im = h('img'); im.src = faces[key].url; pic.append(im); } else pic.append(h('span', null, '+'));
      pic.title = `${ko} 표정 올리기`;
      pic.onclick = async () => {
        const [asset] = await window.diary.pickAsset('image');
        if (asset) { ctx.set(`assistant.faces.${key}`, { url: asset.url, name: asset.name }); commit(); render(); }
      };
      cell.append(pic, h('div', 'face-ko', ko));
      if (faces[key]) { const x = h('button', 'face-x', '×'); x.title = '빼기'; x.onclick = () => { ctx.set(`assistant.faces.${key}`, null); if (key === 'base') ctx.set('assistant.image', null); commit(); render(); }; cell.append(x); }
      grid.append(cell);
    }
    const r = h('div', 'row-inline');
    r.append(btn('여러 장 한 번에 올리기 (기본→말하기→웃음→윙크→진지→눈감음 순서)', '', async () => {
      const assets = await window.diary.pickAsset('image');
      assets.slice(0, 6).forEach((a, k) => ctx.set(`assistant.faces.${D.face.MOODS[k][0]}`, { url: a.url, name: a.name }));
      if (assets.length) { commit(); render(); }
    }));
    img.body.append(grid, r,
      C.slider(ctx, 'assistant.size', '그림 크기', 40, 600, 1, 'px'),
      C.slider(ctx, 'assistant.x', '가로 위치', -400, 400, 1, 'px'),
      C.slider(ctx, 'assistant.y', '세로 위치', -400, 400, 1, 'px'),
      C.slider(ctx, 'assistant.outline', '외곽선 두께', 0, 12, 0.5, 'px'),
      C.colorA(ctx, 'assistant.outlineColor', '외곽선 색'),
      C.toggle(ctx, 'assistant.flip', '좌우 뒤집기'),
    );
    img.body.append(note('투명 배경 PNG를 추천해요. 말할 때는 기본↔말하기가 번갈아 나오고, 가끔 눈감음으로 깜빡여요. Claude가 대답에 맞춰 웃음·윙크·진지 표정을 골라요. 그림은 이 컴퓨터에만 저장돼요.'));
    const hide = C.section('회사에서 숨기기', true);
    const bk = h('select');
    [['CommandOrControl+Shift+X', '⌘/Ctrl + Shift + X'], ['CommandOrControl+Shift+Space', '⌘/Ctrl + Shift + Space'], ['CommandOrControl+Alt+Space', '⌘/Ctrl + Option(Alt) + Space'], ['', '쓰지 않음']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; bk.append(o); });
    bk.value = state.settings.bossKey ?? 'CommandOrControl+Shift+X';
    bk.onchange = async () => { state.settings = await window.diary.setSettings({ bossKey: bk.value }); D.toast(bk.value ? '단축키를 바꿨어요.' : '단축키를 껐어요.'); };
    const bkr = h('div', 'ctl'); bkr.append(h('label', 'ctl-label', '앱 창 바로 숨기기'), bk, h('span'));
    const ck = h('select');
    [['alt+h', 'Option + H (추천)'], ['alt+z', 'Option + Z'], ['backquote', '` (숫자 1 왼쪽 키)'], ['f8', 'F8'], ['mod+shift+h', '⌘ + Shift + H']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; ck.append(o); });
    ck.value = state.settings.charKey || 'alt+h';
    ck.onchange = async () => { state.settings = await window.diary.setSettings({ charKey: ck.value }); D.toast('캐릭터 숨기기 키를 바꿨어요.'); };
    const ckr = h('div', 'ctl'); ckr.append(h('label', 'ctl-label', '캐릭터 숨기기 키'), ck, h('span'));
    const hc = h('div', 'ctl'); const hl = h('label', 'switch'); const hcb = h('input'); hcb.type = 'checkbox'; hcb.checked = !!state.settings.hideChar;
    hcb.onchange = async () => { state.settings = await window.diary.setSettings({ hideChar: hcb.checked }); D.renderAll(); };
    hl.append(hcb, h('span')); hc.append(h('label', 'ctl-label', '캐릭터 숨기기'), hl, h('span'));
    hide.body.append(hc, ckr, bkr, note('• 위쪽 HIDE 버튼이나 위에서 고른 키(기본 Option + H): 캐릭터만 숨기기/보이기<br>• 위 단축키: 어떤 프로그램을 쓰고 있든 업무다이어리 창 전체를 바로 숨기고, 한 번 더 누르면 다시 보여요.'));
    img.body.append(note('말풍선 글씨는 "글씨" 탭 > 비서 말풍선에서 꾸밀 수 있어요. AI 키는 "연결" 탭에서 넣어요.'));

    const mdl = C.section('렌이 쓰는 Claude 모델', true);
    const ms = h('select');
    [['opus', 'Opus 5.5 (가장 똑똑함 · 기본)'], ['sonnet', 'Sonnet 5.5 (빠르고 똑똑함)'], ['haiku', 'Haiku 5.5 (가장 빠르고 가벼움)']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; ms.append(o); });
    ms.value = state.settings.aiModel || 'opus';
    ms.onchange = async () => { state.settings = await window.diary.setSettings({ aiModel: ms.value }); D.toast('모델을 바꿨어요.'); };
    const mr = h('div', 'ctl'); mr.append(h('label', 'ctl-label', '모델'), ms, h('span'));
    mdl.body.append(mr, note('Claude 구독으로 쓰면 고른 모델의 구독 사용량이 쓰여요. Opus는 대답이 조금 느릴 수 있어요(10~30초).'));
    body.append(mdl.el);
    const cl = C.section('업무비서 지침 · Claude 채팅 연결', true);
    const ins = h('textarea'); ins.value = state.settings.assistantInstructions || '';
    ins.placeholder = 'Claude의 "업무비서" 프로젝트 지침(또는 채팅에서 정해 둔 규칙)을 그대로 붙여 넣으세요.\n예: 나는 경영지원 담당이고, 매주 월요일엔 자금일보를 먼저 챙긴다…';
    ins.style.minHeight = '140px';
    const url = h('input'); url.type = 'text'; url.value = state.settings.claudeUrl || '';
    url.placeholder = 'https://claude.ai/project/… 또는 https://claude.ai/chat/…';
    const r1 = h('div', 'ctl'); r1.append(h('label', 'ctl-label', '업무비서 지침'), ins, h('span'));
    const r2 = h('div', 'ctl'); r2.append(h('label', 'ctl-label', 'Claude 채팅 주소'), url, h('span'));
    cl.body.append(r1, r2, h('div', 'row-inline'));
    cl.body.lastChild.append(
      btn('저장', 'primary', async () => {
        const u = url.value.trim();
        if (u && !/^https:\/\/claude\.ai\//.test(u)) return D.toast('주소는 https://claude.ai/ 로 시작해야 해요.');
        state.settings = await window.diary.setSettings({ assistantInstructions: ins.value.trim(), claudeUrl: u });
        D.toast('저장했어요. 다음 대화부터 이 지침을 따라요.'); D.renderAll();
      }),
      btn('Claude 채팅 열기 ↗', '', () => url.value.trim() && window.diary.open(url.value.trim())),
    );
    cl.body.append(note('앱 안의 비서는 Claude(Haiku 5.5)가 이 지침과 오늘 노션 업무를 보고 대답해요. claude.ai 채팅방 자체와 대화 기록이 직접 이어지지는 않아요(Claude가 그걸 외부 앱에 열어 주지 않아요). 대신 지침을 똑같이 맞추고, "Claude에서 열기" 버튼으로 그 채팅방을 바로 열 수 있어요.'));
    body.append(a.el, img.el, hide.el, cl.el);
  }

  // ---------- 테마 ----------
  async function collectAssets(theme) {
    const json = JSON.stringify(theme);
    const ids = [...new Set([...json.matchAll(/diary-asset:\/\/local\/([\w.-]+)/g)].map((m) => m[1]))];
    const assets = {};
    for (const id of ids) { const data = await window.diary.readAsset(id); if (data) assets[id] = data; }
    return assets;
  }
  async function exportTheme(theme, name) {
    D.toast('파일을 만드는 중…');
    const file = { format: 'work-diary-theme', version: 1, name, theme, assets: await collectAssets(theme) };
    const ok = await window.diary.exportTheme(JSON.stringify(file), name);
    if (ok) D.toast('내보냈어요.');
  }
  async function importTheme() {
    const raw = await window.diary.importTheme();
    if (!raw) return;
    try {
      const file = JSON.parse(raw);
      if (file.format !== 'work-diary-theme' || !file.theme) throw new Error('형식');
      let json = JSON.stringify(file.theme);
      for (const [id, data] of Object.entries(file.assets || {})) {
        const saved = await window.diary.writeAsset(id, data);
        json = json.split(`diary-asset://local/${id}`).join(saved.url);
      }
      const theme = JSON.parse(json);
      const name = uniqueName(file.name || '가져온 테마');
      state.themes.push({ name, savedAt: new Date().toISOString(), theme });
      await window.diary.saveThemes(state.themes);
      loadTheme(theme);
      D.toast(`"${name}" 테마를 가져와서 적용했어요.`);
    } catch (e) {
      D.toast('테마 파일을 읽지 못했어요.');
    }
  }
  function uniqueName(n) {
    let name = n, i = 2;
    while (state.themes.find((t) => t.name === name)) name = `${n} (${i++})`;
    return name;
  }

  function renderThemes(body) {
    const s = C.section('지금 꾸밈 저장', true);
    const r = h('div', 'row-inline');
    const input = h('input'); input.type = 'text'; input.placeholder = '테마 이름 (예: 월요병 퇴치)';
    r.append(input, btn('저장', 'primary', async () => {
      const name = input.value.trim(); if (!name) return D.toast('이름을 적어 주세요.');
      const existing = state.themes.find((t) => t.name === name);
      if (existing) { existing.theme = D.clone(state.theme); existing.savedAt = new Date().toISOString(); }
      else state.themes.push({ name, savedAt: new Date().toISOString(), theme: D.clone(state.theme) });
      await window.diary.saveThemes(state.themes);
      D.toast(`"${name}" 저장했어요.`); render();
    }));
    s.body.append(r);
    s.body.append(h('div', 'row-inline'));
    s.body.lastChild.append(
      btn('파일로 내보내기', '', () => exportTheme(state.theme, input.value.trim() || '내 테마')),
      btn('파일 가져오기', '', importTheme),
    );
    s.body.append(note('내보낸 <b>.diarytheme</b> 파일에는 글씨체·그림·동영상 파일까지 함께 들어 있어서 다른 컴퓨터에서도 똑같이 보여요.'));

    const l = C.section(`저장한 테마 (${state.themes.length})`, true);
    if (!state.themes.length) l.body.append(note('아직 없어요.'));
    state.themes.forEach((t, i) => {
      const row = h('div', 'theme-row');
      const d = new Date(t.savedAt);
      row.append(h('div', 'theme-name', t.name), h('div', 'theme-date', `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`));
      const acts = h('div', 'theme-acts');
      acts.append(
        btn('불러오기', 'primary sm', () => { loadTheme(D.clone(t.theme)); D.toast(`"${t.name}" 적용`); }),
        btn('덮어쓰기', 'sm', async () => { t.theme = D.clone(state.theme); t.savedAt = new Date().toISOString(); await window.diary.saveThemes(state.themes); D.toast('덮어썼어요.'); render(); }),
        btn('내보내기', 'sm', () => exportTheme(t.theme, t.name)),
        btn('삭제', 'sm danger', async () => { if (!confirm(`"${t.name}" 테마를 지울까요?`)) return; state.themes.splice(i, 1); await window.diary.saveThemes(state.themes); render(); }),
      );
      row.append(acts);
      l.body.append(row);
    });

    const reset = C.section('처음으로');
    reset.body.append(btn('모든 꾸밈을 처음 기본값으로', 'danger', () => {
      if (!confirm('지금 꾸밈을 모두 기본값으로 바꿀까요? (실행 취소로 되돌릴 수 있어요)')) return;
      const fonts = state.theme.fonts;
      const t = D.clone(D.DEFAULT_THEME); t.fonts = fonts;
      loadTheme(t);
    }));
    body.append(s.el, l.el, reset.el);
  }

  // ---------- 글씨체 자동완성 목록 ----------
  const datalist = document.createElement('datalist');
  datalist.id = 'font-options';
  document.body.append(datalist);
  function refreshFontOptions() {
    datalist.innerHTML = '';
    const names = new Set([...D.fonts.builtin, ...state.theme.fonts.map((f) => f.family), ...D.fonts.registry.keys()]);
    for (const n of names) { const o = document.createElement('option'); o.value = n; o.label = D.fonts.info(n).source === 'system' ? '내 컴퓨터' : D.fonts.info(n).source === 'upload' ? '올린 파일' : '기본'; datalist.append(o); }
  }

  // ---------- 시작 ----------
  function init() {
    document.getElementById('btn-settings').onclick = () => (document.body.classList.contains('settings-open') ? close() : open());
    snapshotHistory();
    refreshFontOptions();
    if (!state.hasKeys.notion) { tab = 'connect'; setTimeout(open, 400); }
    window.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox';
      if (typing) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (e.key === ',') { e.preventDefault(); open(); }
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('settings-open')) close(); });
  }

  D.settings = { init, open, close, refreshFontOptions, refresh: () => { if (document.body.classList.contains('settings-open') && tab === 'connect' && !document.activeElement.matches('input')) render(); } };
})();
