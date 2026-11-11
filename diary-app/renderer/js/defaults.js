// 기본 꾸밈값. "기본값으로" 버튼은 모두 여기 값으로 돌아감.
(function () {
  // 색 조합 (설정 > 색·배치 > 색 조합에서 한 번에 바꾸기)
  const P = (bg, main, accent, card, cardText, sun, sat, panel, param, event) => ({ bg, main, accent, card, cardText, sun, sat, panel, param, event: event || main });
  const PALETTES = [
    ['레퍼런스', P('#0B0808', '#D6D2D3', '#E3170A', '#FDFDFD', '#000000', '#9C0C01', '#007C94', '#B5B5B5', '#FFCF34', '#D6D2D3')],
    ['블랙 레드', P('#0D0D0F', '#EDEDED', '#E3241B', '#FAFAF7', '#111111', '#E3241B', '#2F9BD6', '#C7C7C9', '#F5C518')],
    ['모노크롬', P('#111111', '#F2F2F2', '#FF3B30', '#FFFFFF', '#0A0A0A', '#FF3B30', '#8E8E93', '#E5E5E5', '#FF3B30')],
    ['미드나잇 옐로', P('#0E1726', '#E8EDF5', '#FFC629', '#FFFFFF', '#0E1726', '#FF6B5B', '#5FB3FF', '#C9D3E0', '#FFC629')],
    ['버건디 골드', P('#240A10', '#F1E6D8', '#D9A441', '#FBF6EE', '#2A1016', '#E25C4B', '#7FB7C9', '#D9CBB8', '#D9A441')],
    ['포레스트', P('#0F1D17', '#E7EFE9', '#F28C38', '#FAFBF7', '#13241D', '#F05D4F', '#4FB3A9', '#C5D4CB', '#F2C14E')],
    ['네온 퍼플', P('#140E24', '#EDE8FA', '#FF3D8B', '#FFFFFF', '#140E24', '#FF3D8B', '#3DD6E8', '#CFC6E8', '#FFD23F')],
  ];
  const toColors = (p) => Object.fromEntries(Object.entries(p).map(([k, c]) => [k, { c, a: 1 }]));

  const textBase = {
    font: 'Noto Sans KR',
    size: 14,
    weight: 400,
    tracking: 0, // 자간 (px)
    lineHeight: 1.5,
    scaleX: 100, // 가로 폭 (%)
    scaleY: 100, // 세로 길이 (%)
    rotate: 0,
    origin: 'center',
    skew: 0,
    perChar: false,
    perCharMode: 'random',
    perCharRange: 8,
    perCharSeed: 1,
    perCharAngles: '-6, 4, -2, 8',
    color: { c: '', a: 1 }, // c 가 비어 있으면 자동(배경/카드에 맞춤)
    strokeW: 0,
    strokeC: { c: '#000000', a: 1 },
    shadowOn: false,
    shadowAngle: 135,
    shadowDist: 4,
    shadowBlur: 0,
    shadowC: { c: '#000000', a: 0.6 },
    upper: false,
    deco: 'none',
    decoStyle: 'solid',
  };
  const T = (o) => ({ ...JSON.parse(JSON.stringify(textBase)), ...o });

  const bg = (o = {}) => ({
    type: 'gradient', // theme = 색 탭의 '배경' 색 그대로
    solid: { c: '#151515', a: 1 },
    grad: {
      kind: 'linear',
      angle: 200,
      stops: [
        { c: '#211414', a: 1, p: 0 },
        { c: '#110B0B', a: 1, p: 45 },
        { c: '#060505', a: 1, p: 100 },
      ],
    },
    media: null,
    fit: 'cover',
    x: 0,
    y: 0,
    scale: 100,
    rotate: 0,
    brightness: 100,
    blur: 0,
    opacity: 100,
    overlayC: { c: '#000000', a: 1 },
    overlay: 0,
    ...o,
  });

  const DEFAULT_THEME = {
    version: 10,
    colors: toColors(PALETTES[0][1]),
    layout: {
      mode: 'bigcal', // bigcal = 큰 달력 + 노트 카드, classic = 큰 날짜 숫자 + 이번 주 띠
      calJitter: 4, // 큰 달력 숫자 흔들림(°)
      panelOn: true, // 오른쪽 사선 면
      panelOpacity: 100,
      panelAngle: 18,
      stampText: 'DONE!!',
      cutOn: true, // 하루 시작 컷
      dialog: 'angular', // angular = 각진 대화창, flat = 네모 칸
      calTilt: -4,
      cardTilt: 1.2,
      stripeOn: false,
      stripeAngle: -24,
      stripeWidth: 130,
      stripePos: 58,
      stripeOpacity: 92,
      textureOn: true,
      texture: 35,
    },
    text: {
      bigDate: T({ font: 'Gasoek One', size: 168, tracking: -5, lineHeight: 0.82, skew: 10 }),
      monthDay: T({ font: 'Gasoek One', size: 30, tracking: 1, lineHeight: 1.05, upper: true }),
      section: T({ font: 'Gasoek One', size: 22, tracking: 0.5, lineHeight: 1.1, upper: true }),
      checklist: T({ size: 13, weight: 400, lineHeight: 1.45, tracking: -0.5 }),
      quest: T({ size: 14, weight: 600, lineHeight: 1.35, tracking: -0.5 }),
      bubble: T({ font: 'Nanum Gothic', size: 17, weight: 700, lineHeight: 1.55, tracking: 0.5 }),
      body: T({ size: 13, weight: 500, tracking: -0.3 }),
      calNum: T({ font: 'Gasoek One', size: 92, tracking: -4, lineHeight: 0.9 }),
      calHead: T({ font: 'Gasoek One', size: 30, tracking: -1, lineHeight: 1, upper: true }),
      stamp: T({ font: 'Gasoek One', size: 64, tracking: -2, lineHeight: 0.9, rotate: -14, color: { c: '#E3170A', a: 1 } }),
    },
    background: {
      mode: 'single', // single | weekday | rotate
      base: bg(),
      weekday: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 0: null },
      rotation: { items: [], minutes: 30 },
    },
    assistant: {
      name: '업무비서',
      tone: '차분하고 간결한 존댓말. 과한 감탄·칭찬·이모지 없이 핵심만 짧게.',
      image: null,
      faces: { base: null, talk: null, smile: null, wink: null, serious: null, closed: null },
      size: 300,
      outline: 4, // 캐릭터 검은 외곽선 두께(px)
      outlineColor: { c: '#0B0B0B', a: 1 },
      x: 0,
      y: 0,
      flip: false,
    },
    fonts: [], // 올린 글씨체 [{family,url,name,variable:{min,max}|null}]
  };

  const ELEMENTS = [
    ['bigDate', '큰 날짜 숫자'],
    ['monthDay', '월·요일'],
    ['section', '섹션 제목'],
    ['checklist', '체크리스트'],
    ['quest', '진행 중 업무'],
    ['bubble', '비서 메시지'],
    ['body', '본문'],
    ['calNum', '큰 달력 숫자'],
    ['calHead', '큰 달력 요일'],
    ['stamp', '완료 도장'],
  ];

  window.D = window.D || {};
  D.DEFAULT_THEME = DEFAULT_THEME;
  D.makeBg = bg;
  D.ELEMENTS = ELEMENTS;
  D.PALETTES = PALETTES;
  D.paletteColors = (i) => toColors(PALETTES[i][1]);
  // 예전(1판) 기본값을 그대로 쓰던 항목만 새 기본값으로 바꿔 줌. 직접 바꾼 값은 그대로 둠.
  const OLD = { bg: '#141414', main: '#F3EEE3', accent: '#FF4A1C', card: '#F3EEE3', cardText: '#151515', sun: '#FF4A1C', sat: '#2FA4C7', panel: '#F3EEE3', event: '#F3EEE3' };
  const V2 = { bg: '#1E0B0B', main: '#E4E4E4', accent: '#D8231B', card: '#F8F8F5', cardText: '#111111', sun: '#C81E17', sat: '#1C8BA5', panel: '#C9C9C9', param: '#F2C230', event: '#E4E4E4' };
  const migrate3 = (t) => {
    if ((t.version || 1) >= 3) return false;
    for (const k in V2) if (t.colors[k] && t.colors[k].c && t.colors[k].c.toUpperCase() === V2[k].toUpperCase()) t.colors[k] = { ...DEFAULT_THEME.colors[k] };
    if (t.text.stamp && t.text.stamp.color && t.text.stamp.color.c === '#D8231B') t.text.stamp.color.c = DEFAULT_THEME.colors.accent.c;
    t.version = 3;
    return true;
  };
  const V3 = { bg: '#0D0D0F', main: '#EDEDED', accent: '#E3241B', card: '#FAFAF7', cardText: '#111111', sun: '#E3241B', sat: '#2F9BD6', panel: '#C7C7C9', param: '#F5C518', event: '#EDEDED' };
  const migrate4 = (t) => {
    if ((t.version || 1) >= 4) return false;
    for (const k in V3) if (t.colors[k] && t.colors[k].c && t.colors[k].c.toUpperCase() === V3[k].toUpperCase()) t.colors[k] = { ...DEFAULT_THEME.colors[k] };
    if (t.text.stamp && t.text.stamp.color && ['#E3241B', '#D8231B', '#FF4A1C'].includes(t.text.stamp.color.c)) t.text.stamp.color.c = DEFAULT_THEME.colors.accent.c;
    if (t.background && t.background.base && t.background.base.type === 'theme') t.background.base = JSON.parse(JSON.stringify(DEFAULT_THEME.background.base));
    t.version = 4;
    return true;
  };
  // 10판: 대화 글씨 나눔고딕
  const migrate10 = (t) => {
    if ((t.version || 1) >= 10) return false;
    const b = t.text.bubble;
    if (b && b.font === 'Noto Sans KR') Object.assign(b, { font: 'Nanum Gothic', size: 17, weight: 700, lineHeight: 1.55, tracking: 0.5 });
    t.version = 10;
    return true;
  };
  // 9판: 캐릭터 크게
  const migrate9 = (t) => {
    if ((t.version || 1) >= 9) return false;
    if (t.assistant && (t.assistant.size === 230 || t.assistant.size === 120)) t.assistant.size = 300;
    t.version = 9;
    return true;
  };
  // 8판: 한글 자간 살짝 좁게
  const migrate8 = (t) => {
    if ((t.version || 1) >= 8) return false;
    for (const k of ['checklist', 'quest', 'bubble', 'body']) if (t.text[k] && t.text[k].tracking === 0) t.text[k].tracking = DEFAULT_THEME.text[k].tracking;
    t.version = 8;
    return true;
  };
  // 7판: 체크리스트 글씨 작게 (줄 간격은 글씨 크기를 따라감)
  const migrate7 = (t) => {
    if ((t.version || 1) >= 7) return false;
    if (t.text.checklist && t.text.checklist.size === 15) t.text.checklist.size = 13;
    t.version = 7;
    return true;
  };
  // 6판: 체크리스트 글씨 살짝 얇게
  const migrate6 = (t) => {
    if ((t.version || 1) >= 6) return false;
    if (t.text.checklist && t.text.checklist.weight === 500) t.text.checklist.weight = 400;
    t.version = 6;
    return true;
  };
  // 5판: 배경만 더 어둡고 채도 낮게
  const migrate5 = (t) => {
    if ((t.version || 1) >= 5) return false;
    if (t.colors.bg && t.colors.bg.c && t.colors.bg.c.toUpperCase() === '#140202') t.colors.bg = { ...DEFAULT_THEME.colors.bg };
    const b = t.background && t.background.base;
    if (b && b.type === 'gradient' && b.grad.stops[0] && b.grad.stops[0].c.toUpperCase() === '#3A0909') b.grad = JSON.parse(JSON.stringify(DEFAULT_THEME.background.base.grad));
    t.version = 5;
    return true;
  };
  D.migrateTheme = (t) => {
    if ((t.version || 1) >= 9) return migrate10(t);
    if ((t.version || 1) >= 8) { migrate9(t); migrate10(t); return true; }
    if ((t.version || 1) >= 7) { migrate8(t); migrate9(t); migrate10(t); return true; }
    if ((t.version || 1) >= 6) { migrate7(t); migrate8(t); migrate9(t); migrate10(t); return true; }
    if ((t.version || 1) >= 5) { migrate6(t); migrate7(t); migrate8(t); migrate9(t); migrate10(t); return true; }
    if ((t.version || 1) >= 4) { migrate5(t); migrate6(t); migrate7(t); migrate8(t); migrate9(t); migrate10(t); return true; }
    if ((t.version || 1) >= 3) { migrate4(t); migrate5(t); migrate6(t); migrate7(t); migrate8(t); migrate9(t); migrate10(t); return true; }
    if ((t.version || 1) >= 2) { migrate3(t); migrate4(t); migrate5(t); migrate6(t); migrate7(t); migrate8(t); migrate9(t); migrate10(t); return true; }
    for (const k in OLD) if (t.colors[k] && t.colors[k].c && t.colors[k].c.toUpperCase() === OLD[k].toUpperCase()) t.colors[k] = { ...DEFAULT_THEME.colors[k] };
    if (t.layout.panelOpacity === 12) t.layout.panelOpacity = 100;
    if (t.layout.stripeOn === true && t.layout.stripeAngle === -24) t.layout.stripeOn = false;
    if (t.text.stamp && t.text.stamp.color && t.text.stamp.color.c === '#FF4A1C') t.text.stamp.color.c = '#D8231B';
    if (t.background && t.background.base && t.background.base.type === 'gradient' && t.background.base.grad.stops[0].c === '#1a1a1a') t.background.base.type = 'theme';
    t.version = 2;
    migrate3(t);
    migrate4(t);
    migrate5(t);
    migrate6(t);
    migrate7(t);
    migrate8(t);
    migrate9(t);
    migrate10(t);
    return true;
  };
  D.clone = (o) => JSON.parse(JSON.stringify(o));
  D.getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  D.setPath = (obj, path, val) => {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {};
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = val;
  };
  // 저장된 테마에 새 항목이 빠져 있으면 기본값으로 채움
  D.mergeDefaults = function merge(def, val) {
    if (val === undefined) return D.clone(def);
    if (def && typeof def === 'object' && !Array.isArray(def) && val && typeof val === 'object' && !Array.isArray(val)) {
      const out = {};
      for (const k of new Set([...Object.keys(def), ...Object.keys(val)])) {
        out[k] = k in def ? merge(def[k], val[k]) : val[k];
      }
      return out;
    }
    return val;
  };
  D.rgba = (v) => {
    if (!v || !v.c) return '';
    const h = v.c.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${v.a == null ? 1 : v.a})`;
  };
})();
