// 하루 시작 컷: 날짜가 바뀐 뒤 처음 켰을 때(또는 켜 둔 채 자정이 지났을 때) 한 번 보여 줌
(function () {
  const WD_EN = ['SUNDaY', 'MoNDaY', 'TUESDaY', 'WeDNESDaY', 'THURSDaY', 'FRiDaY', 'SaTURDaY']; // 레퍼런스처럼 대소문자 섞기
  const WD_KO = ['일', '월', '화', '수', '목', '금', '토'];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // 자리(slot) → 화면 위치. 가운데가 가장 크고 아래, 양옆은 작고 위로 휘어짐
  function place(slot) {
    // 레퍼런스 배치: 지난 날은 왼쪽 아래로 크게, 다가올 날은 오른쪽 위로 작게 멀어짐
    const T = { '-4': [-8, 36, 0.3], '-3': [-6, 40, 0.36], '-2': [10, 44, 0.56], '-1': [30, 54, 0.78], 0: [52, 56, 1.05], 1: [67, 45, 0.6], 2: [77, 34, 0.5], 3: [90, 36, 0.52], 4: [104, 34, 0.4] };
    const [x, y, scale] = T[Math.max(-4, Math.min(4, Math.round(slot)))];
    return { x, y, scale };
  }

  let playing = null;

  function play({ force = false } = {}) {
    const state = D.state;
    if (playing) return playing;
    if (!force && state.theme.layout.cutOn === false) return Promise.resolve();
    const today = new Date(state.today + 'T00:00:00');

    const hall = D.city.isTownHall(today);
    const skin = state.theme.layout.skin || {};
    const root = h('div', 'cut ' + (hall ? 'hall' : 'sky'));
    root.style.setProperty('--cut-font', D.fonts.cssStack(state.theme.text.calNum.font));
    const city = h('div', 'cut-city'); const cv = h('canvas');
    // 내 그림을 올려 뒀으면(설정 > 색·배치) 평소 날 배경으로 그 그림을 씀. 타운홀 날은 동심원 배경 그대로
    const own = skin['cut-city'] || (state.theme.layout.cutImage && state.theme.layout.cutImage.url);
    if (own && !hall) { const im = h('img'); im.src = own; city.append(im); } else city.append(cv);
    root.append(city);
    // 구름 (스킨 그림이 있을 때, 평소 날만): 천천히 흘러감
    if (!hall) [['cloud-1', 14, 9, 30], ['cloud-3', 70, 24, 22], ['cloud-2', 88, 6, 20]].forEach(([k, x, y, w], n) => {
      if (!skin[k]) return;
      const c = h('img', 'cut-cloud'); c.src = skin[k];
      Object.assign(c.style, { left: x + '%', top: y + '%', width: w + 'vw', animationDelay: `${-n * 3}s` });
      root.append(c);
    });
    const head = h('div', 'cut-head');
    head.append(h('span', 'cut-year', String(today.getFullYear())), h('span', 'cut-month', `${today.getMonth() + 1}월`));
    root.append(head);
    const stage = h('div', 'cut-stage');
    root.append(stage);

    // 어제-3 … 오늘+3
    const items = [];
    for (let off = -4; off <= 3; off++) {
      const d = new Date(today); d.setDate(today.getDate() + off);
      const it = h('div', 'cut-day' + (d.getDay() === 0 ? ' sun' : d.getDay() === 6 ? ' sat' : '') + (off < 0 ? ' past' : '') + (off === 0 ? ' today' : ''));
      // 숫자: 스킨 그림(digit-0~9, 빨강·파랑)이 다 있으면 그림으로, 없으면 글씨로
      const num = h('div', 'cut-num', String(d.getDate()));
      const suf = d.getDay() === 0 ? '-red' : d.getDay() === 6 ? '-blue' : '';
      const digs = [...String(d.getDate())].map((c) => skin[`digit-${c}${suf}`]);
      if (digs.every(Boolean)) { num.textContent = ''; num.classList.add('img'); digs.forEach((u) => { const im = h('img'); im.src = u; num.append(im); }); }
      it.append(num);
      const lab = h('div', 'cut-wd');
      // 레퍼런스처럼 글자마다 크기·높이·기울기가 조금씩 다른 스티커 글씨
      const word = h('span', 'cut-wd-en');
      [...WD_EN[d.getDay()]].forEach((ch, k) => {
        const r1 = Math.sin((d.getDate() * 31 + k * 17) * 12.9898) * 43758.5453, r2 = Math.sin((d.getDate() * 7 + k * 29) * 78.233) * 12345.678;
        const f1 = r1 - Math.floor(r1), f2 = r2 - Math.floor(r2);
        const c = h('i', null, ch);
        c.style.setProperty('--s', (ch === ch.toLowerCase() ? 0.9 : 0.94 + f1 * 0.16).toFixed(2));
        c.style.setProperty('--r', ((f2 - 0.5) * 10).toFixed(1) + 'deg');
        c.style.setProperty('--y', ((f1 - 0.5) * 0.12).toFixed(2) + 'em');
        word.append(c);
      });
      if (skin['wd-' + d.getDay()]) { const im = h('img'); im.src = skin['wd-' + d.getDay()]; lab.classList.add('img'); lab.append(im); }
      else lab.append(word, h('b', null, WD_KO[d.getDay()]));
      it.append(lab);
      it.style.setProperty('--i', String(off + 4));
      stage.append(it);
      items.push({ el: it, off });
    }
    const layout = (focus) => {
      for (const { el, off } of items) {
        const p = place(off - focus);
        el.style.left = `${p.x}%`;
        el.style.top = `${p.y}%`;
        el.style.transform = `translate(-50%, -50%) scale(${p.scale})`;
        el.style.zIndex = String(100 - Math.abs(off - focus) * 10);
        el.style.opacity = (off - focus) < -2.5 || (off - focus) > 3.5 ? '0' : '1';
      }
    };
    layout(-1); // 어제가 가운데에서 시작

    // 오늘 요약
    const info = state.data.days[state.today];
    let left = 0, total = 0;
    const walk = (l) => (l || []).forEach((i) => { total++; if (!i.checked) left++; walk(i.children); });
    walk(info && info.items);
    const soon = (state.data.quests || []).filter((q) => {
      const t = q.end || q.start; if (!t) return false;
      return (new Date(t + 'T00:00:00') - today) / 86400000 <= 3;
    }).length;
    const evs = (state.data.events || []).filter((e) => e.start <= state.today && e.end >= state.today).length;
    const note = h('div', 'cut-note');
    const lines = [];
    lines.push(total ? `오늘 할 일 ${left}개` : '오늘 체크리스트 없음');
    if (evs) lines.push(`일정 ${evs}개`);
    if (soon) lines.push(`마감 임박 ${soon}건`);
    note.append(h('b', null, `${today.getMonth() + 1}/${today.getDate()} ${WD_KO[today.getDay()]}요일`), h('span', null, lines.join('  /  ')));
    if (hall) note.append(h('span', 'cut-hall', 'TODAY: 올핸즈 타운홀 미팅'));
    root.append(note);
    root.append(h('div', 'cut-skip', '누르면 넘어가요'));

    document.body.append(root);
    const fallback = () => { try { D.city.draw(cv, hall ? 'rings' : 'sky', Number(state.today.replace(/-/g, '')) % 9973); } catch (e) { console.error(e); } };
    if (own && hall) D.city.drawOwnRings(cv, own).catch(fallback);
    else if (!own) try { D.city.draw(cv, hall ? 'rings' : 'sky', Number(state.today.replace(/-/g, '')) % 9973); } catch (e) { console.error(e); }

    playing = new Promise((resolve) => {
      const timers = [];
      const finish = () => {
        timers.forEach(clearTimeout);
        root.classList.add('out');
        setTimeout(() => { root.remove(); playing = null; resolve(); }, 460);
        window.removeEventListener('keydown', onKey);
      };
      const onKey = (e) => { if (['Escape', 'Enter', ' '].includes(e.key)) finish(); };
      root.addEventListener('click', finish);
      window.addEventListener('keydown', onKey);
      requestAnimationFrame(() => root.classList.add('in'));
      timers.push(setTimeout(() => { layout(0); root.classList.add('advance', 'moving'); }, 1250)); // 오늘로 한 칸 이동
      timers.push(setTimeout(() => root.classList.remove('moving'), 1650));
      timers.push(setTimeout(() => root.classList.add('pop'), 1750)); // 오늘 숫자 튀어나오기
      timers.push(setTimeout(() => root.classList.add('note-in'), 2000));
      timers.push(setTimeout(finish, 4300));
    });
    return playing;
  }

  // 오늘 아직 안 봤으면 보여 줌
  function maybePlay() {
    const s = D.state.settings || {};
    if (s.lastCut === D.state.today) return;
    // 창이 숨겨진 채 시작했으면(로그인 자동 실행) 창이 보일 때 재생
    if (document.visibilityState !== 'visible') {
      document.addEventListener('visibilitychange', function once() {
        if (document.visibilityState !== 'visible') return;
        document.removeEventListener('visibilitychange', once);
        maybePlay();
      });
      return;
    }
    window.diary.setSettings({ lastCut: D.state.today });
    return play();
  }

  D.cutscene = { play, maybePlay };
})();
