// 비서 캐릭터 표정: 기본/말하기/웃음/윙크/진지/눈감음
// - 말하는 동안 '기본'과 '말하기'를 번갈아 보여 주고
// - 가만히 있을 때는 가끔 눈을 깜빡이고
// - Claude가 고른 표정(답변 앞의 [표정:…])을 보여 줌
(function () {
  const MOODS = [
    ['base', '기본'], ['talk', '말하기'], ['smile', '웃음'],
    ['wink', '윙크'], ['serious', '진지'], ['closed', '눈감음'],
  ];
  const KO = Object.fromEntries(MOODS.map(([k, ko]) => [ko, k]));

  let img = null;
  let mood = 'base';
  let talking = false;
  let talkTimer = null, blinkTimer = null, typeTimer = null;
  let lastTypedAt = null;

  const faces = () => {
    const a = D.state.theme.assistant;
    const f = { ...(a.faces || {}) };
    if (!f.base && a.image) f.base = a.image; // 예전 한 장짜리 그림
    return f;
  };
  const urlOf = (key) => { const f = faces(); return (f[key] || f.base || null)?.url || null; };
  const hidden = () => !!D.state.settings.hideChar;

  function show(key) {
    if (!img) return;
    const u = urlOf(key);
    if (u && img.getAttribute('src') !== u) img.setAttribute('src', u);
  }

  function mount() {
    const fig = document.getElementById('asst-figure');
    const has = !!urlOf('base');
    fig.hidden = !has || hidden();
    if (!has) { fig.innerHTML = ''; img = null; return; }
    if (!img || !fig.contains(img)) {
      fig.innerHTML = '';
      img = document.createElement('img');
      img.alt = D.state.theme.assistant.name;
      img.draggable = false;
      fig.append(img);
      // 미리 불러 두기 (표정 바꿀 때 깜빡임 방지)
      Object.values(faces()).forEach((f) => { if (f && f.url) { const p = new Image(); p.src = f.url; } });
    }
    show(talking ? 'talk' : mood);
    scheduleBlink();
  }

  function scheduleBlink() {
    clearTimeout(blinkTimer);
    blinkTimer = setTimeout(() => {
      if (img && !talking && mood === 'base' && faces().closed) {
        show('closed');
        setTimeout(() => { if (!talking && mood === 'base') show('base'); }, 140);
      }
      scheduleBlink();
    }, 3000 + Math.random() * 3500);
  }

  function setMood(m) {
    mood = KO[m] || (MOODS.some(([k]) => k === m) ? m : 'base');
    if (!talking) show(mood);
  }

  // 글자를 한 자씩 찍으며 입을 움직임
  function speak(el, text, finalMood) {
    clearInterval(typeTimer); clearInterval(talkTimer);
    const chars = Array.from(text);
    let i = 0;
    talking = true;
    let open = false;
    talkTimer = setInterval(() => { open = !open; show(open ? 'talk' : 'base'); }, 130);
    el.textContent = '';
    typeTimer = setInterval(() => {
      i += 2;
      el.textContent = chars.slice(0, i).join('');
      el.scrollTop = el.scrollHeight;
      if (i >= chars.length) {
        clearInterval(typeTimer); clearInterval(talkTimer);
        talking = false;
        setMood(finalMood || 'base');
        // 몇 초 뒤엔 다시 기본 표정
        if (mood !== 'base') setTimeout(() => { if (!talking) setMood('base'); }, 6000);
      }
    }, 28);
  }

  // 새 메시지가 오면 한 번만 타자 효과
  function onMessage(msg, el) {
    if (!msg || msg.thinking) { setMood('closed'); return false; }
    if (msg.at && msg.at !== lastTypedAt && Date.now() - new Date(msg.at).getTime() < 15000) {
      lastTypedAt = msg.at;
      speak(el, msg.text, msg.mood);
      return true;
    }
    return false;
  }

  D.face = { MOODS, mount, setMood, onMessage, isTyping: () => talking };
})();
