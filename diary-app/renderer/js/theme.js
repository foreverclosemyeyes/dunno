// 꾸밈값 → 화면 반영 (CSS 변수, 요소별 글씨 스타일, 배경)
(function () {
  const styleEl = document.createElement('style');
  styleEl.id = 'theme-style';
  document.head.appendChild(styleEl);

  function textCss(key, s) {
    const out = [];
    out.push(`font-family:${D.fonts.cssStack(s.font)}`);
    out.push(`font-size:${s.size}px`);
    out.push(`font-weight:${s.weight}`);
    out.push(`letter-spacing:${s.tracking}px`);
    out.push(`line-height:${s.lineHeight}`);
    if (s.color && s.color.c) out.push(`color:${D.rgba(s.color)}`);
    if (s.strokeW > 0) { out.push(`-webkit-text-stroke:${s.strokeW}px ${D.rgba(s.strokeC)}`); out.push('paint-order:stroke fill'); }
    if (s.shadowOn) {
      const rad = (s.shadowAngle * Math.PI) / 180;
      const x = (Math.cos(rad) * s.shadowDist).toFixed(1), y = (Math.sin(rad) * s.shadowDist).toFixed(1);
      out.push(`text-shadow:${x}px ${y}px ${s.shadowBlur}px ${D.rgba(s.shadowC)}`);
    }
    out.push(`text-transform:${s.upper ? 'uppercase' : 'none'}`);
    if (s.deco !== 'none') {
      out.push(`text-decoration-line:${s.deco}`);
      out.push(`text-decoration-style:${s.decoStyle}`);
      out.push('text-decoration-thickness:from-font');
    }
    const tf = [];
    if (s.rotate) tf.push(`rotate(${s.rotate}deg)`);
    if (s.skew) tf.push(`skewX(${-s.skew}deg)`);
    if (s.scaleX !== 100 || s.scaleY !== 100) tf.push(`scale(${s.scaleX / 100}, ${s.scaleY / 100})`);
    const origin = { left: 'left center', center: 'center center', right: 'right center' }[s.origin] || 'center';
    const tfCss = tf.length ? `transform:${tf.join(' ')};transform-origin:${origin}` : 'transform:none';
    return { base: out.join(';'), tf: tfCss };
  }

  function apply(theme) {
    const c = theme.colors, L = theme.layout;
    const vars = [
      `--bg:${D.rgba(c.bg)}`, `--main:${D.rgba(c.main)}`, `--accent:${D.rgba(c.accent)}`,
      `--card:${D.rgba(c.card)}`, `--card-text:${D.rgba(c.cardText)}`,
      `--accent-solid:${c.accent.c}`, `--main-solid:${c.main.c}`, `--card-solid:${c.card.c}`, `--card-text-solid:${c.cardText.c}`,
      `--cal-tilt:${L.calTilt}deg`, `--card-tilt:${L.cardTilt}deg`,
      `--stripe-angle:${L.stripeAngle}deg`, `--stripe-w:${L.stripeWidth}px`, `--stripe-pos:${L.stripePos}%`,
      `--stripe-op:${L.stripeOpacity / 100}`, `--texture:${L.texture / 100}`,
      `--asst-size:${theme.assistant.size}px`, `--asst-x:${theme.assistant.x}px`, `--asst-y:${theme.assistant.y}px`,
      `--asst-flip:${theme.assistant.flip ? -1 : 1}`,
      `--sat:${D.rgba(c.sat)}`, `--panel:${D.rgba(c.panel)}`, `--event:${D.rgba(c.event)}`, `--panel-op:${L.panelOpacity / 100}`, `--panel-angle:${L.panelAngle}`,
    ];
    let css = `:root{${vars.join(';')}}\n`;
    for (const [key] of D.ELEMENTS) {
      const s = theme.text[key];
      const { base, tf } = textCss(key, s);
      if (key === 'body') {
        css += `body{${base}}\n.el-body{display:inline-block;${tf}}\n`;
      } else {
        css += `.el-${key}{display:inline-block;${base};${tf}}\n`;
      }
      css += `.el-${key} .ch{display:inline-block;white-space:pre}\n`;
    }
    styleEl.textContent = css;
    document.body.classList.toggle('no-stripe', !L.stripeOn);
    document.body.classList.toggle('no-texture', !L.textureOn);
    document.body.classList.toggle('layout-bigcal', L.mode === 'bigcal');
    document.body.classList.toggle('no-panel', !L.panelOn);
    document.body.classList.toggle('dialog-angular', L.dialog !== 'flat');
    (theme.fonts || []).forEach(D.fonts.registerUploaded);
    renderBackground(theme);
  }

  // ---- 글자 하나하나 회전 ----
  function seeded(seed) {
    let s = (seed * 9301 + 49297) % 233280 || 1;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  // 요소 종류(key)에 맞는 꾸밈을 입힌 글씨 조각을 만들어 줌
  function styledText(key, text, extraClass) {
    const el = document.createElement('span');
    el.className = `el-${key}${extraClass ? ' ' + extraClass : ''}`;
    const s = D.state.theme.text[key];
    const str = String(text ?? '');
    if (!s.perChar) { el.textContent = str; return el; }
    const chars = Array.from(s.upper ? str.toUpperCase() : str);
    const rnd = seeded(s.perCharSeed + str.length);
    const manual = String(s.perCharAngles).split(/[,\s]+/).map(Number).filter((n) => !isNaN(n));
    let idx = 0;
    for (const ch of chars) {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      if (ch.trim()) {
        const r = s.perCharMode === 'manual' && manual.length ? manual[idx % manual.length] : (rnd() * 2 - 1) * s.perCharRange;
        span.style.transform = `rotate(${r.toFixed(1)}deg)`;
        idx++;
      }
      el.appendChild(span);
    }
    return el;
  }

  // ---- 배경 ----
  function activeBg(theme, now = new Date()) {
    const B = theme.background;
    if (B.mode === 'weekday') return B.weekday[now.getDay()] || B.base;
    if (B.mode === 'rotate' && B.rotation.items.length) {
      const slot = Math.floor(now.getTime() / (Math.max(1, B.rotation.minutes) * 60000));
      return B.rotation.items[slot % B.rotation.items.length];
    }
    return B.base;
  }

  let lastMediaKey = '';
  function renderBackground(theme, force) {
    const bg = D.state.previewBg || activeBg(theme);
    const layer = document.getElementById('bg-media');
    const overlay = document.getElementById('bg-overlay');
    if (!layer) return;
    const filter = `brightness(${bg.brightness}%) blur(${bg.blur}px)`;
    const tf = `translate(${bg.x}px, ${bg.y}px) rotate(${bg.rotate}deg) scale(${bg.scale / 100})`;
    const isVideo = bg.type === 'video' && bg.media;
    const mediaKey = isVideo ? 'v:' + bg.media.url : 'x';
    if (mediaKey !== lastMediaKey || force) {
      layer.innerHTML = '';
      if (isVideo) {
        const v = document.createElement('video');
        Object.assign(v, { src: bg.media.url, muted: true, loop: true, autoplay: true, playsInline: true });
        v.setAttribute('muted', '');
        layer.appendChild(v);
        v.play().catch(() => {});
      }
      lastMediaKey = mediaKey;
    }
    Object.assign(layer.style, { filter, transform: tf, opacity: bg.opacity / 100, backgroundImage: '', backgroundColor: 'transparent', backgroundSize: '', backgroundRepeat: '', backgroundPosition: '' });
    if (bg.type === 'theme') layer.style.backgroundColor = D.rgba(theme.colors.bg);
    else if (bg.type === 'solid') layer.style.backgroundColor = D.rgba(bg.solid);
    else if (bg.type === 'gradient') {
      const stops = [...bg.grad.stops].sort((a, b) => a.p - b.p).map((s) => `${D.rgba(s)} ${s.p}%`).join(', ');
      layer.style.backgroundImage = bg.grad.kind === 'radial'
        ? `radial-gradient(circle at center, ${stops})`
        : bg.grad.kind === 'conic' ? `conic-gradient(from ${bg.grad.angle}deg, ${stops})`
          : `linear-gradient(${bg.grad.angle}deg, ${stops})`;
    } else if (bg.type === 'image' && bg.media) {
      layer.style.backgroundImage = `url("${bg.media.url}")`;
      const fits = {
        cover: ['cover', 'no-repeat', 'center'], contain: ['contain', 'no-repeat', 'center'],
        tile: ['auto', 'repeat', 'top left'], center: ['auto', 'no-repeat', 'center'],
      }[bg.fit] || ['cover', 'no-repeat', 'center'];
      [layer.style.backgroundSize, layer.style.backgroundRepeat, layer.style.backgroundPosition] = fits;
    } else if (isVideo) {
      const v = layer.querySelector('video');
      if (v) v.style.objectFit = { cover: 'cover', contain: 'contain', center: 'none', tile: 'cover' }[bg.fit] || 'cover';
    }
    overlay.style.background = D.rgba(bg.overlayC);
    overlay.style.opacity = bg.overlay / 100;
  }

  D.theme = { apply, styledText, renderBackground, activeBg };
})();
