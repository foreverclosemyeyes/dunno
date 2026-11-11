// 하루 시작 컷 배경: 3D 상자 도시를 어안렌즈(스테레오 투영) 카메라로 내려다본 만화 잉크풍 그림.
// 외부 그림 없이 코드로 그림. mode 'sky' = 파란 하늘 + 구름, 'rings' = 빨강·검정 동심원 하늘.
(function () {
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  const gray = (g) => `rgb(${g},${g},${g})`;

  // ---------- 도시 만들기 ----------
  function buildCity(rnd) {
    const items = [];
    const BLOCK = 58, STREET = 16, STEP = BLOCK + STREET;
    for (let gx = -22; gx <= 22; gx++) {
      for (let gy = -7; gy <= 22; gy++) {
        const x0 = gx * STEP - BLOCK / 2, y0 = gy * STEP;
        const cx = x0 + BLOCK / 2, cy = y0 + BLOCK / 2;
        const d = Math.hypot(cx, cy * 1.0);
        if (d > 1650) continue;
        if (rnd() < 0.05) continue; // 공터·공원
        items.push({ kind: 'lot', x0, y0, x1: x0 + BLOCK, y1: y0 + BLOCK });
        // 블록을 2~4개 필지로
        const splitX = rnd() < 0.6, n = 1 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) {
          const a = k / n, b = (k + 1) / n;
          let bx0 = splitX ? x0 + BLOCK * a : x0, bx1 = splitX ? x0 + BLOCK * b : x0 + BLOCK;
          let by0 = splitX ? y0 : y0 + BLOCK * a, by1 = splitX ? y0 + BLOCK : y0 + BLOCK * b;
          const ins = 2 + rnd() * 3; bx0 += ins; bx1 -= ins; by0 += ins; by1 -= ins;
          if (bx1 - bx0 < 6 || by1 - by0 < 6) continue;
          // 높이: 발밑은 낮게, 멀어질수록 높게, 가끔 고층
          let h;
          if (d < 260) h = 8 + rnd() * 34;
          else if (d < 650) h = 12 + rnd() * 48 + (rnd() < 0.08 ? 60 : 0);
          else h = 18 + rnd() * 60 + (rnd() < 0.16 ? 60 + rnd() * 140 : 0);
          const boxes = [{ x0: bx0, y0: by0, x1: bx1, y1: by1, z0: 0, z1: h }];
          // 옥상 기계실·물탱크
          if (rnd() < 0.55) {
            const w = (bx1 - bx0) * (0.2 + rnd() * 0.3), l = (by1 - by0) * (0.2 + rnd() * 0.3);
            const ox = bx0 + rnd() * (bx1 - bx0 - w), oy = by0 + rnd() * (by1 - by0 - l);
            boxes.push({ x0: ox, y0: oy, x1: ox + w, y1: oy + l, z0: h, z1: h + 2 + rnd() * 4 });
          }
          // 계단식 고층
          if (h > 120 && rnd() < 0.5) {
            const s = 0.18;
            boxes.push({ x0: bx0 + (bx1 - bx0) * s, y0: by0 + (by1 - by0) * s, x1: bx1 - (bx1 - bx0) * s, y1: by1 - (by1 - by0) * s, z0: h, z1: h + 20 + rnd() * 40 });
          }
          items.push({ kind: 'bld', boxes, cx: (bx0 + bx1) / 2, cy: (by0 + by1) / 2, style: rnd() < 0.55 ? 0 : rnd() < 0.6 ? 1 : 2, h });
        }
      }
    }
    // 멀리 보이는 격자 철탑 두 개 (특정 건물이 아닌 일반적인 전파탑 모양)
    items.push({ kind: 'tower', x: 640, y: 1250, h: 330, w: 46 });
    items.push({ kind: 'tower', x: -520, y: 1420, h: 260, w: 34 });
    return items;
  }

  // ---------- 카메라 ----------
  function makeCam(W, H) {
    const C = [0, -40, 165], pitch = (31 * Math.PI) / 180;
    const f = [0, Math.cos(pitch), -Math.sin(pitch)], r = [1, 0, 0], u = [0, Math.sin(pitch), Math.cos(pitch)];
    const F = H * 0.47, cx = W / 2, cy = H * 0.5;
    function proj(p) {
      const v = [p[0] - C[0], p[1] - C[1], p[2] - C[2]];
      const x = v[0] * r[0] + v[1] * r[1] + v[2] * r[2];
      const y = v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
      const z = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
      const s = Math.hypot(x, y), th = Math.atan2(s, z);
      if (th > 2.6) return null;
      const rho = 2 * F * Math.tan(th / 2) * 1.08;
      return s < 1e-6 ? [cx, cy] : [cx + (rho * x) / s, cy - (rho * y) / s];
    }
    return { C, proj, W, H };
  }

  // 3D 사각형 한 면을 굽은 다각형으로 (어안렌즈라 직선이 휨)
  function facePath(cam, q, seg) {
    const out = [];
    for (let e = 0; e < 4; e++) {
      const a = q[e], b = q[(e + 1) % 4];
      for (let k = 0; k < seg; k++) {
        const t = k / seg, p = cam.proj([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
        if (!p) return null;
        out.push(p);
      }
    }
    return out;
  }
  function fillPoly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function quadArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }

  // ---------- 그리기 ----------
  function drawSky(ctx, W, H, mode, rnd, cam) {
    if (mode === 'rings') {
      ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, W, H);
      const ox = W / 2, oy = H * 1.02, band = H * 0.075;
      for (let r = Math.hypot(W, H) * 1.1; r > band; r -= band * 2) {
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fillStyle = '#d81c1c'; ctx.fill();
        ctx.beginPath(); ctx.arc(ox, oy, r - band, 0, Math.PI * 2); ctx.fillStyle = '#0b0b0b'; ctx.fill();
      }
      return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    g.addColorStop(0, '#93cdee'); g.addColorStop(1, '#bfe2f5');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 구름: 스카이라인 바로 뒤에 걸친 뭉게구름 (회색 그늘 + 가는 잉크선)
    const clouds = [[0.24, 0.17, 1], [0.76, 0.33, 1.25]];
    for (const [fx, fy, s] of clouds) cloud(ctx, W * fx, H * fy, H * 0.05 * s, rnd);
  }
  function cloud(ctx, x, y, R, rnd) {
    const puffs = [];
    for (let i = 0; i < 9; i++) puffs.push([x + (i - 4) * R * 0.75 + (rnd() - 0.5) * R * 0.4, y - Math.sin((i / 8) * Math.PI) * R * 0.9 + (rnd() - 0.5) * R * 0.3, R * (0.55 + Math.sin((i / 8) * Math.PI) * 0.6)]);
    ctx.save();
    ctx.lineWidth = Math.max(1.5, R * 0.06); ctx.strokeStyle = '#222';
    for (const [px, py, pr] of puffs) { ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#f6f6f6';
    for (const [px, py, pr] of puffs) { ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#c9c9c9';
    for (const [px, py, pr] of puffs) { ctx.beginPath(); ctx.ellipse(px + pr * 0.15, py + pr * 0.45, pr * 0.8, pr * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function draw(canvas, mode, seed) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    const rnd = rng(seed || 7);
    const cam = makeCam(W, H);
    drawSky(ctx, W, H, mode, rnd, cam);

    // 땅 (멀리 지평선까지)
    const ground = [];
    for (let a = 0; a <= 360; a += 3) { const t = (a * Math.PI) / 180, p = cam.proj([Math.cos(t) * 6000, Math.sin(t) * 6000 + 600, 0]); if (p) ground.push(p); }
    if (ground.length > 3) fillPoly(ctx, ground, '#5d5d5d', '#111', 2);

    const items = buildCity(rnd);
    const C = cam.C, dist = (x, y, z) => Math.hypot(x - C[0], y - C[1], z - C[2]);
    // 블록 바닥(보도)
    for (const it of items) if (it.kind === 'lot') {
      const d = dist((it.x0 + it.x1) / 2, (it.y0 + it.y1) / 2, 0);
      const p = facePath(cam, [[it.x0, it.y0, 0], [it.x1, it.y0, 0], [it.x1, it.y1, 0], [it.x0, it.y1, 0]], d < 400 ? 3 : 1);
      if (p) fillPoly(ctx, p, gray(mix(150, 175, clamp(d / 1400, 0, 1))), '#1a1a1a', clamp(500 / d, 0.4, 1.6));
    }
    // 건물·철탑: 먼 것부터
    const solids = items.filter((i) => i.kind !== 'lot').map((i) => ({ i, d: i.kind === 'tower' ? dist(i.x, i.y, 0) : dist(i.cx, i.cy, i.h * 0.3) }));
    solids.sort((a, b) => b.d - a.d);
    for (const { i, d } of solids) {
      if (i.kind === 'tower') drawTower(ctx, cam, i, d);
      else for (const b of i.boxes) drawBox(ctx, cam, b, d, i.style, rnd);
    }
  }

  function drawBox(ctx, cam, b, d, style, rnd) {
    const C = cam.C, far = clamp((d - 500) / 1100, 0, 1);
    const lw = clamp(700 / d, 0.6, 3.2);
    const seg = d < 350 ? 6 : d < 800 ? 3 : 1;
    const P = (x, y, z) => [x, y, z];
    const faces = [];
    // 옆면 4개 + 지붕. n·(카메라-면) > 0 이면 보임
    if (C[1] < b.y0) faces.push({ q: [P(b.x0, b.y0, b.z0), P(b.x1, b.y0, b.z0), P(b.x1, b.y0, b.z1), P(b.x0, b.y0, b.z1)], tone: 'front', w: b.x1 - b.x0 });
    if (C[1] > b.y1) faces.push({ q: [P(b.x1, b.y1, b.z0), P(b.x0, b.y1, b.z0), P(b.x0, b.y1, b.z1), P(b.x1, b.y1, b.z1)], tone: 'back', w: b.x1 - b.x0 });
    if (C[0] < b.x0) faces.push({ q: [P(b.x0, b.y1, b.z0), P(b.x0, b.y0, b.z0), P(b.x0, b.y0, b.z1), P(b.x0, b.y1, b.z1)], tone: 'west', w: b.y1 - b.y0 });
    if (C[0] > b.x1) faces.push({ q: [P(b.x1, b.y0, b.z0), P(b.x1, b.y1, b.z0), P(b.x1, b.y1, b.z1), P(b.x1, b.y0, b.z1)], tone: 'east', w: b.y1 - b.y0 });
    const tones = { west: 244, front: 205, back: 120, east: 62 };
    for (const f of faces) {
      const pts = facePath(cam, f.q, seg); if (!pts) continue;
      const base = tones[f.tone], g = mix(base, Math.max(base, 232), far * 0.85);
      fillPoly(ctx, pts, gray(g), '#111', lw);
      // 창문
      const area = quadArea([cam.proj(f.q[0]) || [0, 0], cam.proj(f.q[1]) || [0, 0], cam.proj(f.q[2]) || [0, 0], cam.proj(f.q[3]) || [0, 0]]);
      if (style === 2 || area < 260) continue;
      const hgt = b.z1 - b.z0, floors = Math.max(1, Math.floor(hgt / 4.2)), cols = Math.max(1, Math.floor(f.w / 3.6));
      const dark = g < 120, wc = dark ? gray(mix(150, 190, far)) : gray(mix(70, 150, far));
      ctx.fillStyle = wc;
      const lim = Math.min(floors * cols, 900);
      if (style === 1) { // 가로 띠 창
        for (let fl = 0; fl < floors; fl++) {
          const t0 = (fl + 0.3) / floors, t1 = (fl + 0.7) / floors;
          const qq = [lerp3(lerp3(f.q[0], f.q[3], t0), lerp3(f.q[1], f.q[2], t0), 0.06), lerp3(lerp3(f.q[0], f.q[3], t0), lerp3(f.q[1], f.q[2], t0), 0.94), lerp3(lerp3(f.q[0], f.q[3], t1), lerp3(f.q[1], f.q[2], t1), 0.94), lerp3(lerp3(f.q[0], f.q[3], t1), lerp3(f.q[1], f.q[2], t1), 0.06)];
          const pp = qq.map((p) => cam.proj(p)); if (pp.some((p) => !p)) continue;
          fillPoly(ctx, pp, wc);
        }
      } else if (floors * cols <= lim) {
        for (let fl = 0; fl < floors; fl++) for (let c = 0; c < cols; c++) {
          if (rnd() < 0.12) continue;
          const t0 = (fl + 0.28) / floors, t1 = (fl + 0.72) / floors, s0 = (c + 0.25) / cols, s1 = (c + 0.75) / cols;
          const at = (s, t) => lerp3(lerp3(f.q[0], f.q[1], s), lerp3(f.q[3], f.q[2], s), t);
          const pp = [at(s0, t0), at(s1, t0), at(s1, t1), at(s0, t1)].map((p) => cam.proj(p)); if (pp.some((p) => !p)) continue;
          fillPoly(ctx, pp, wc);
        }
      }
    }
    // 지붕
    if (C[2] > b.z1) {
      const pts = facePath(cam, [P(b.x0, b.y0, b.z1), P(b.x1, b.y0, b.z1), P(b.x1, b.y1, b.z1), P(b.x0, b.y1, b.z1)], seg);
      if (pts) fillPoly(ctx, pts, gray(mix(178, 222, far)), '#111', lw);
    }
  }

  function drawTower(ctx, cam, t, d) {
    const lw = clamp(600 / d, 0.8, 2.4);
    const lv = 9, legs = (z) => { const s = t.w * Math.pow(1 - z / t.h, 1.6) + 2; return [[t.x - s, t.y - s, z], [t.x + s, t.y - s, z], [t.x + s, t.y + s, z], [t.x - s, t.y + s, z]]; };
    ctx.strokeStyle = '#111'; ctx.lineWidth = lw * 1.6;
    // 다리 실루엣을 흰색으로 채우고 격자
    const left = [], right = [];
    for (let k = 0; k <= lv; k++) { const z = (t.h * k) / lv, L = legs(z); left.push(cam.proj(L[0])); right.push(cam.proj(L[1])); }
    if (left.some((p) => !p) || right.some((p) => !p)) return;
    fillPoly(ctx, left.concat(right.slice().reverse()), '#e8e8e8', '#111', lw * 1.8);
    ctx.lineWidth = lw;
    for (let k = 0; k < lv; k++) {
      ctx.beginPath(); ctx.moveTo(left[k][0], left[k][1]); ctx.lineTo(right[k + 1][0], right[k + 1][1]);
      ctx.moveTo(right[k][0], right[k][1]); ctx.lineTo(left[k + 1][0], left[k + 1][1]);
      ctx.moveTo(left[k][0], left[k][1]); ctx.lineTo(right[k][0], right[k][1]); ctx.stroke();
    }
    // 전망대
    const dz = t.h * 0.42, D1 = legs(dz).map((p) => [p[0] * 1, p[1], p[2]]);
    const a = cam.proj([t.x - t.w * 0.55, t.y - t.w * 0.55, dz]), b = cam.proj([t.x + t.w * 0.55, t.y - t.w * 0.55, dz]), c = cam.proj([t.x + t.w * 0.55, t.y - t.w * 0.55, dz + 14]), e = cam.proj([t.x - t.w * 0.55, t.y - t.w * 0.55, dz + 14]);
    if (a && b && c && e && D1) fillPoly(ctx, [a, b, c, e], '#bdbdbd', '#111', lw * 1.4);
    const top = cam.proj([t.x, t.y, t.h + 40]), tb = cam.proj([t.x, t.y, t.h]);
    if (top && tb) { ctx.lineWidth = lw * 2; ctx.beginPath(); ctx.moveTo(tb[0], tb[1]); ctx.lineTo(top[0], top[1]); ctx.stroke(); }
  }

  // 올핸즈 타운홀: 매달 둘째 주 화요일, 마지막 주 화요일
  function isTownHall(d) {
    if (d.getDay() !== 2) return false;
    const n = d.getDate(), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return (n >= 8 && n <= 14) || n + 7 > last;
  }

  // 내 그림(파란 하늘 + 도시)을 타운홀 날에도 쓰기: 파란 하늘 부분만 걷어 내고 빨강·검정 동심원을 깔아 줌
  async function drawOwnRings(canvas, url) {
    const id = url.split('/').pop();
    const b64 = await window.diary.readAsset(id);
    if (!b64) throw new Error('no asset');
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = 'data:image/png;base64,' + b64; });
    const W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 동심원: 가운데가 화면 아래쪽 한참 밑
    ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, W, H);
    const ox = W / 2, oy = H * 1.25, band = H * 0.1;
    for (let r = Math.hypot(W, H) * 1.3; r > band; r -= band * 2) {
      ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fillStyle = '#e0191c'; ctx.fill();
      ctx.beginPath(); ctx.arc(ox, oy, r - band, 0, Math.PI * 2); ctx.fillStyle = '#0b0b0b'; ctx.fill();
    }
    // 그림에서 파란 하늘 지우기
    const off = document.createElement('canvas'); off.width = img.naturalWidth; off.height = img.naturalHeight;
    const o = off.getContext('2d'); o.drawImage(img, 0, 0);
    const d = o.getImageData(0, 0, off.width, off.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const k = p[i + 2] - p[i]; // 파랑 - 빨강
      if (k > 22) p[i + 3] = k > 44 ? 0 : Math.round(255 * (44 - k) / 22);
    }
    o.putImageData(d, 0, 0);
    // object-fit: cover, 위쪽 30% 기준
    const s = Math.max(W / off.width, H / off.height), w = off.width * s, h = off.height * s;
    ctx.drawImage(off, (W - w) / 2, (H - h) * 0.3, w, h);
  }

  D.city = { draw, drawOwnRings, isTownHall };
})();
