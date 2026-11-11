// 기본 꾸밈값. "기본값으로" 버튼은 모두 여기 값으로 돌아감.
(function () {
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
    type: 'theme', // theme = 색 탭의 '배경' 색 그대로
    solid: { c: '#151515', a: 1 },
    grad: {
      kind: 'linear',
      angle: 155,
      stops: [
        { c: '#1a1a1a', a: 1, p: 0 },
        { c: '#101010', a: 1, p: 60 },
        { c: '#2a1a14', a: 1, p: 100 },
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
    version: 2,
    colors: {
      bg: { c: '#1E0B0B', a: 1 },
      main: { c: '#E4E4E4', a: 1 },
      accent: { c: '#D8231B', a: 1 },
      card: { c: '#F8F8F5', a: 1 },
      cardText: { c: '#111111', a: 1 },
      sun: { c: '#C81E17', a: 1 },
      sat: { c: '#1C8BA5', a: 1 },
      panel: { c: '#C9C9C9', a: 1 },
      param: { c: '#F2C230', a: 1 },
      event: { c: '#E4E4E4', a: 1 },
    },
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
      checklist: T({ size: 15, weight: 500, lineHeight: 1.45 }),
      quest: T({ size: 14, weight: 500, lineHeight: 1.35 }),
      bubble: T({ size: 15, weight: 500, lineHeight: 1.55 }),
      body: T({ size: 13, weight: 400 }),
      calNum: T({ font: 'Gasoek One', size: 92, tracking: -4, lineHeight: 0.9 }),
      calHead: T({ font: 'Gasoek One', size: 30, tracking: -1, lineHeight: 1, upper: true }),
      stamp: T({ font: 'Gasoek One', size: 64, tracking: -2, lineHeight: 0.9, rotate: -14, color: { c: '#D8231B', a: 1 } }),
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
      size: 120,
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
  // 예전(1판) 기본값을 그대로 쓰던 항목만 새 기본값으로 바꿔 줌. 직접 바꾼 값은 그대로 둠.
  const OLD = { bg: '#141414', main: '#F3EEE3', accent: '#FF4A1C', card: '#F3EEE3', cardText: '#151515', sun: '#FF4A1C', sat: '#2FA4C7', panel: '#F3EEE3', event: '#F3EEE3' };
  D.migrateTheme = (t) => {
    if ((t.version || 1) >= 2) return false;
    for (const k in OLD) if (t.colors[k] && t.colors[k].c && t.colors[k].c.toUpperCase() === OLD[k].toUpperCase()) t.colors[k] = { ...DEFAULT_THEME.colors[k] };
    if (t.layout.panelOpacity === 12) t.layout.panelOpacity = 100;
    if (t.layout.stripeOn === true && t.layout.stripeAngle === -24) t.layout.stripeOn = false;
    if (t.text.stamp && t.text.stamp.color && t.text.stamp.color.c === '#FF4A1C') t.text.stamp.color.c = '#D8231B';
    if (t.background && t.background.base && t.background.base.type === 'gradient' && t.background.base.grad.stops[0].c === '#1a1a1a') t.background.base.type = 'theme';
    t.version = 2;
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
