// 연출 효과: 화면 등장, 날짜·달 넘김, 체크 터짐, 도장 쿵. 짧고(0.3~0.6초) 한 번만.
// 설정 > 색·배치 > '화려한 연출' 로 끌 수 있고, 맥의 '동작 줄이기' 를 켜 두면 자동으로 꺼짐.
(function () {
  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const on = () => !reduce.matches && !(D.state && D.state.theme && D.state.theme.layout && D.state.theme.layout.fxOn === false);

  // 같은 요소에 같은 애니메이션을 다시 걸기
  function replay(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(el['_fx_' + cls]);
    el['_fx_' + cls] = setTimeout(() => el.classList.remove(cls), ms);
  }

  // 켤 때: 패널들이 사선으로 차례차례 튀어 들어옴
  function intro() {
    if (!on()) return;
    replay(document.body, 'fx-intro', 1300);
  }

  // 날짜를 바꿀 때: 기록 카드가 휙 넘어오고 빨간 사선이 한 번 긋고 지나감
  function swap(sel, dir = 1) {
    if (!on()) return;
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return;
    el.style.setProperty('--fx-dir', dir < 0 ? -1 : 1);
    replay(el, 'fx-swap', 450);
    const slash = document.createElement('div');
    slash.className = 'fx-slash';
    const r = el.getBoundingClientRect();
    Object.assign(slash.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    slash.style.setProperty('--fx-dir', dir < 0 ? -1 : 1);
    slash.append(document.createElement('i'));
    document.body.append(slash);
    setTimeout(() => slash.remove(), 460);
  }

  // 체크할 때: 상자에서 빨간 별이 '팡' 하고 조각이 튐
  function burst(anchor) {
    if (!on() || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const b = document.createElement('div');
    b.className = 'fx-burst';
    b.style.left = r.left + r.width / 2 + 'px';
    b.style.top = r.top + r.height / 2 + 'px';
    b.append(Object.assign(document.createElement('i'), { className: 'fx-star' }));
    const n = 7;
    for (let k = 0; k < n; k++) {
      const s = document.createElement('i');
      s.className = 'fx-shard' + (k % 3 === 0 ? ' dark' : '');
      const a = (k / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const d = 22 + Math.random() * 16;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px');
      s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      s.style.setProperty('--rot', Math.round(Math.random() * 360) + 'deg');
      b.append(s);
    }
    document.body.append(b);
    setTimeout(() => b.remove(), 650);
  }

  // 다 끝냈을 때: 도장이 찍히면서 카드가 살짝 '쿵'
  function thud(el) {
    if (!on()) return;
    replay(typeof el === 'string' ? document.querySelector(el) : el, 'fx-thud', 400);
  }

  // 큰 화면(설정·인간 파라미터)을 열 때: 빨강·검정 사선 띠가 훑고 지나감
  function wipe() {
    if (!on()) return;
    const w = document.createElement('div');
    w.className = 'fx-wipe';
    w.append(document.createElement('i'), document.createElement('i'));
    document.body.append(w);
    setTimeout(() => w.remove(), 560);
  }

  D.fx = { on, intro, swap, burst, thud, wipe };
})();
