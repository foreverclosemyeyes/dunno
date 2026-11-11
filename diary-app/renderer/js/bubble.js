// 말풍선: 몸통과 꼬리를 하나의 외곽선으로 그리고(이음매 없음),
// 큰 달력 마지막 줄 오른쪽 빈칸으로 올려 보냄. 꼬리는 캐릭터 얼굴을 향함.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s) => document.querySelector(s);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  function place() {
    const col = $('#asst-col');
    if (!col) return;
    col.style.transform = '';
    col.style.maxWidth = '';
    if (!document.body.classList.contains('layout-bigcal') || $('#assistant').hidden) return;
    const cells = [...document.querySelectorAll('#bc-grid .bc-d:not(.out)')];
    const last = cells[cells.length - 1];
    const left = $('#left');
    if (!last || !left) return;
    const r = last.getBoundingClientRect();
    const L = left.getBoundingClientRect();
    const c = col.getBoundingClientRect();
    const freeLeft = r.right + 24;
    const freeW = L.right - freeLeft;
    if (freeW < 300) return; // 마지막 줄이 꽉 찬 달은 원래 자리에
    const dx = Math.max(0, freeLeft - c.left);
    const dy = Math.min(0, r.bottom + 4 - c.top); // 마지막 줄 바로 아래부터
    col.style.transform = `translate(${dx}px, ${dy}px)`;
    col.style.maxWidth = `${Math.max(300, L.right - (c.left + dx) - 4)}px`;
  }

  function draw() {
    const bub = $('#asst-bubble');
    if (!bub || !document.body.classList.contains('dialog-angular')) return;
    let svg = bub.querySelector('svg.dlg-shape');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.classList.add('dlg-shape');
      svg.setAttribute('aria-hidden', 'true');
      svg.append(document.createElementNS(NS, 'path'));
      bub.prepend(svg);
    }
    const w = bub.offsetWidth, h = bub.offsetHeight;
    if (!w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w); svg.setAttribute('height', h);

    // 비스듬한 몸통
    const TL = [14, 6], TR = [w - 2, 0], BR = [w - 14, h], BL = [0, h - 8];
    // 꼬리 끝: 캐릭터 얼굴 쪽 (없으면 왼쪽 아래)
    const br = bub.getBoundingClientRect();
    const img = document.querySelector('#asst-figure:not([hidden]) img');
    let target = [-90, h * 0.9];
    if (img) {
      const f = img.getBoundingClientRect();
      target = [f.left + f.width * 0.5 - br.left, f.top + f.height * 0.72 - br.top]; // 목 쪽
    }
    // 꼬리: 아래쪽 가장자리 왼편에 넓게 붙어서, 목 쪽으로 짧고 굵은 번개 모양
    const P1 = lerp(BL, BR, 0.07), P2 = lerp(BL, BR, 0.2); // P1 왼쪽, P2 오른쪽 (바닥선 위)
    const mid = lerp(P1, P2, 0.5);
    let d = [target[0] - mid[0], target[1] - mid[1]];
    const len = Math.hypot(d[0], d[1]) || 1;
    d = [d[0] / len, d[1] / len];
    if (d[1] < 0.35) { d = [d[0], 0.35]; const l2 = Math.hypot(d[0], d[1]); d = [d[0] / l2, d[1] / l2]; } // 항상 아래쪽으로
    const Lt = Math.min(118, Math.max(60, len - 20));
    const n = [-d[1], d[0]];
    const side = Math.sign((P1[0] - mid[0]) * n[0] + (P1[1] - mid[1]) * n[1]) || 1; // P1 이 있는 쪽
    const half = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]) / 2;
    const at = (t, off) => [mid[0] + d[0] * Lt * t + n[0] * off * side, mid[1] + d[1] * Lt * t + n[1] * off * side];
    const T = at(1, 0);
    // P1 쪽 가장자리: 안으로 꺾였다 다시 나감 / P2 쪽도 같은 방향으로 한 번 꺾임 (Z 모양)
    const A1 = at(0.45, half * 0.15), A2 = at(0.5, half * 0.65);
    const B1 = at(0.55, -half * 0.05), B2 = at(0.5, -half * 0.55);
    const pts = [TL, TR, BR, P2, B2, B1, T, A2, A1, P1, BL];
    svg.firstChild.setAttribute('d', 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + ' Z');
  }

  // 답하는 칸: 흰 테두리 검은 칸 + 오른쪽 뾰족한 꼬리 (한 외곽선)
  function drawReply() {
    const f = document.getElementById('chat-form');
    if (!f) return;
    let svg = f.querySelector('svg.reply-shape');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.classList.add('reply-shape');
      svg.setAttribute('aria-hidden', 'true');
      svg.append(document.createElementNS(NS, 'path'));
      f.prepend(svg);
    }
    const w = f.offsetWidth, h = f.offsetHeight;
    if (!w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    const tail = 34;
    const R = w - tail;
    const pts = [[10, 4], [R - 6, 0], [R - 3, h * 0.34], [w, h * 0.6], [R - 8, h * 0.72], [R - 12, h], [0, h - 5]]; // 꼬리 하나
    svg.firstChild.setAttribute('d', 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + ' Z');
  }

  // 스킨 그림(말풍선·답하는 칸)을 불러왔으면 직접 그린 모양 대신 그 그림을 깔아 줌
  function skin() {
    const sk = (D.state && D.state.theme && D.state.theme.layout.skin) || {};
    document.body.classList.toggle('skin-bubble', !!sk.bubble);
    document.body.classList.toggle('skin-reply', !!sk.reply);
    for (const k of ['change', 'mask']) {
      document.body.classList.toggle('skin-has-' + k, !!sk[k]);
      document.body.style.setProperty('--skin-' + k, sk[k] ? `url("${sk[k]}")` : 'none');
    }
    const bub = $('#asst-bubble'), f = document.getElementById('chat-form');
    if (bub) bub.style.setProperty('--skin-bubble', sk.bubble ? `url("${sk.bubble}")` : 'none');
    if (f) f.style.setProperty('--skin-reply', sk.reply ? `url("${sk.reply}")` : 'none');
  }

  function update() {
    skin();
    requestAnimationFrame(() => { place(); requestAnimationFrame(() => { draw(); drawReply(); }); });
  }
  window.addEventListener('resize', update);
  if (window.ResizeObserver) {
    window.addEventListener('DOMContentLoaded', () => {
      const ro = new ResizeObserver(update);
      ['#asst-bubble', '#bigcal', '#asst-figure', '#chat-form'].forEach((q) => { const el = $(q); if (el) ro.observe(el); });
    });
  }
  D.bubble = { update };
})();
