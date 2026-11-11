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
    version: 1,
    colors: {
      bg: { c: '#141414', a: 1 },
      main: { c: '#F3EEE3', a: 1 },
      accent: { c: '#FF4A1C', a: 1 },
      card: { c: '#F3EEE3', a: 1 },
      cardText: { c: '#151515', a: 1 },
      sat: { c: '#2FA4C7', a: 1 },
      panel: { c: '#F3EEE3', a: 1 },
      event: { c: '#F3EEE3', a: 1 },
    },
    layout: {
      mode: 'bigcal', // bigcal = 큰 달력 + 노트 카드, classic = 큰 날짜 숫자 + 이번 주 띠
      calJitter: 4, // 큰 달력 숫자 흔들림(°)
      panelOn: true, // 오른쪽 사선 면
      panelOpacity: 12,
      panelAngle: 18,
      stampText: 'DONE!!',
      calTilt: -4,
      cardTilt: 1.2,
      stripeOn: true,
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
      stamp: T({ font: 'Gasoek One', size: 64, tracking: -2, lineHeight: 0.9, rotate: -14, color: { c: '#FF4A1C', a: 1 } }),
    },
    background: {
      mode: 'single', // single | weekday | rotate
      base: bg(),
      weekday: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 0: null },
      rotation: { items: [], minutes: 30 },
    },
    assistant: {
      name: '모모',
      tone: '다정하고 씩씩한 반말. 짧고 명랑하게, 가끔 응원 한마디.',
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
    ['quest', '퀘스트'],
    ['bubble', '비서 말풍선'],
    ['body', '본문'],
    ['calNum', '큰 달력 숫자'],
    ['calHead', '큰 달력 요일'],
    ['stamp', '완료 도장'],
  ];

  window.D = window.D || {};
  D.DEFAULT_THEME = DEFAULT_THEME;
  D.makeBg = bg;
  D.ELEMENTS = ELEMENTS;
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
