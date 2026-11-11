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

  // 날짜를 바꿀 때: 기록 카드가 휙 넘어오고 제목 상자가 톡 튐
  function swap(sel, dir = 1) {
    if (!on()) return;
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return;
    el.style.setProperty('--fx-dir', dir < 0 ? -1 : 1);
    replay(el, 'fx-swap', 450);
    // 제목의 회색 '기' 상자가 톡 튀어나옴 (기록 카드일 때)
    const box = el.querySelector('.tl-box');
    if (box) replay(box, 'fx-pop', 420);
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

  // 설정·파라미터를 열 때 쓰던 사선 띠는 뺐음 (호출은 남겨 둠)
  function wipe() {}

  D.fx = { on, intro, swap, burst, thud, wipe };
})();
