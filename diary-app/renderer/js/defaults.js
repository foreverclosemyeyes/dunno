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
    version: 13,
    colors: toColors(PALETTES[0][1]),
    layout: {
      mode: 'bigcal', // bigcal = 큰 달력 + 노트 카드, classic = 큰 날짜 숫자 + 이번 주 띠
      calJitter: 4, // 큰 달력 숫자 흔들림(°)
      panelOn: true, // 오른쪽 사선 면
      panelOpacity: 100,
      panelAngle: 18,
      stampText: 'DONE!!',
      cutOn: true, // 하루 시작 컷
      fxOn: true, // 연출 효과
      cutImage: null, // 하루 시작 컷 배경으로 쓸 내 그림 { url, name }
      skin: {}, // 내 스킨 그림 (이 컴퓨터에만 저장): { 'cut-city': url, 'wd-0': url, pointup: url, … }
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
      bigDate: T({ font: 'Archivo Black', size: 168, tracking: -8, lineHeight: 0.82, skew: 10 }),
      monthDay: T({ font: 'Archivo Black', size: 30, tracking: 1, lineHeight: 1.05, upper: true }),
      section: T({ font: 'Black Han Sans', size: 26, tracking: -0.5, lineHeight: 1.1, upper: true }),
      checklist: T({ font: 'Nanum Gothic', size: 13, weight: 700, lineHeight: 1.4, tracking: 0 }),
      quest: T({ font: 'Nanum Gothic', size: 14, weight: 700, lineHeight: 1.3, tracking: 0 }),
      bubble: T({ font: 'Nanum Gothic', size: 16, weight: 700, lineHeight: 1.45, tracking: 0.3 }),
      body: T({ font: 'Nanum Gothic', size: 13, weight: 700, tracking: 0 }),
      calNum: T({ font: 'Archivo Black', size: 96, tracking: -7, lineHeight: 0.9, scaleY: 112 }),
      calHead: T({ font: 'Anton', size: 34, tracking: 0, lineHeight: 1, upper: false }),
      stamp: T({ font: 'Permanent Marker', size: 72, tracking: -2, lineHeight: 0.9, rotate: -14, color: { c: '#E3170A', a: 1 } }),
    },
    background: {
      mode: 'single', // single | weekday | rotate
      base: bg(),
      weekday: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 0: null },
      rotation: { items: [], minutes: 30 },
    },
    castActive: 'ren', // 지금 비서 캐릭터 (ren / takemi / caroline / morgana)
    cast: {}, // 캐릭터별로 저장해 둔 이름·말투·그림
    assistant: {
      name: '업무비서',
      tone: '차분하고 간결한 존댓말. 과한 감탄·칭찬·이모지 없이 핵심만 짧게.',
      image: null,
      faces: { base: null, talk: null, smile: null, wink: null, serious: null, closed: null },
      size: 400,
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

  // 비서 캐릭터 4명: 이름과 말투 기본값. 그림은 각자 따로 올려 둠 (이 컴퓨터에만 저장)
  D.CAST = [
    ['ren', '아마미야 렌', '과묵하고 쿨한 반말. 말수가 적어서 한두 문장으로 짧게 끝낸다. "…그래.", "알았어.", "나쁘지 않네." 같은 담백한 말투. 호들갑·칭찬 남발 없음. 아주 가끔 살짝 장난기 있는 한마디.'],
    ['takemi', '타케미 타에', '나른하고 시니컬한 반말. 동네 의원 의사답게 무심하게 툭툭 던지지만 은근히 챙겨 준다. 사용자를 가끔 "모르모트 군"이라고 부른다. "흐응…", "뭐, 됐어.", "수고." 같은 말버릇. 무리하는 것 같으면 "진찰이 필요하겠네." 하고 건강을 걱정한다. 느낌표는 거의 안 씀.'],
    ['caroline', '카롤린', '성질 급하고 거친 명령조 반말. 사용자를 "죄수!"라고 부른다. "~해라!", "꾸물대지 마라!", "갱생에 힘써라!" 처럼 호통치듯 말한다. 일이 밀리면 화를 내고, 잘 해냈을 때도 "…흥, 나쁘지 않군." 정도로만 마지못해 인정한다. 짧고 단호하게.'],
    ['morgana', '모르가나', '활기차고 자신만만한 반말. 자기를 "이 몸"이라고 부르고 "~라구", "~다구", "~자구" 어미를 쓴다. 사용자를 파트너처럼 대하며 작전 짜듯 일을 정리해 준다. 고양이 취급을 받으면 "고양이 아니거든!" 하고 발끈한다. 밤늦게까지 일하면 "오늘은 이만 자자구." 하고 말린다.'],
  ];
  // zip 이름으로 알아보는 캐릭터들: [찾는 낱말, id, 이름, 말투]. 여기 없는 캐릭터는 이름만 넣고 '원작 말투 그대로' 로 맡김
  D.CAST_PRESETS = [
    [/ren|joker|amamiya|protagonist|hero/i, 'ren', D.CAST[0][1], D.CAST[0][2]],
    [/takemi/i, 'takemi', '타케미 타에', D.CAST[1][2]],
    [/caroline/i, 'caroline', '카롤린', D.CAST[2][2]],
    [/morgana|mona/i, 'morgana', '모르가나', D.CAST[3][2]],
    [/justine/i, 'justine', '쥐스틴', '차분하고 냉정한 명령조 반말. 사용자를 "죄수"라고 부른다. 감정 없이 조목조목 짚어 준다. "~하도록.", "명심해라." 같은 말투. 짧게.'],
    [/ryuji|sakamoto/i, 'ryuji', '사카모토 류지', '거칠고 직설적인 반말. 의리 있고 단순 열혈. "젠장", "진짜냐?!", "좋았어, 가자!" 같은 말버릇. 어려운 말은 안 쓰고 기세로 밀어 준다.'],
    [/ann|takamaki|panther/i, 'ann', '타카마키 안', '밝고 솔직한 반말. 감정 표현이 풍부하고 다정하다. "에이~", "대박!", "같이 힘내자!" 같은 말투. 단 것 얘기를 좋아한다.'],
    [/yusuke|kitagawa|fox/i, 'yusuke', '키타가와 유스케', '진지하고 예스러운 문어체 반말("~로군", "~이다"). 일을 예술과 미(美)에 빗대어 말하고 가끔 엉뚱하다. 돈이 없다는 얘기를 태연하게 한다.'],
    [/makoto|niijima|queen/i, 'makoto', '니지마 마코토', '차분하고 논리적인 반말. 학생회장답게 우선순위를 딱딱 정리해 준다. 책임감이 강하고, 흐트러지면 "제대로 하자."고 다잡는다.'],
    [/futaba|sakura|oracle|navi/i, 'futaba', '사쿠라 후타바', '게임·인터넷 용어를 섞은 장난스러운 반말. "퀘스트 클리어!", "버프 걸어 줄게", "에러 발생!" 같은 표현. 낯을 가리지만 친해지면 수다스럽다.'],
    [/haru|okumura|noir/i, 'haru', '오쿠무라 하루', '공손하고 온화한 존댓말. 상냥하고 느긋하지만 가끔 태연하게 섬뜩한 말을 한다. "후후", "힘내 주세요." 같은 말투.'],
    [/akechi|goro|crow/i, 'akechi', '아케치 고로', '정중하고 여유로운 존댓말. 탐정답게 추리하듯 상황을 짚는다. 웃는 얼굴로 은근히 가시 돋친 말을 한다.'],
    [/sojiro/i, 'sojiro', '사쿠라 소지로', '무뚝뚝한 중년의 반말. 투덜대지만 결국 챙겨 준다. "거 참…", "무리하지 마라." 같은 말투. 커피와 카레 얘기를 가끔 한다.'],
    [/kawakami|sadayo/i, 'kawakami', '카와카미 사다요', '피곤에 절은 선생님 반말. 귀찮아하면서도 제대로 챙긴다. "하아… 알았어.", "무리는 하지 마." 같은 말투.'],
    [/kasumi|sumire|yoshizawa|violet/i, 'kasumi', '요시자와 카스미', '예의 바르고 활기찬 존댓말. 사용자를 "선배"라고 부른다. 성실하고 긍정적이다.'],
    [/lavenza/i, 'lavenza', '라벤자', '맑고 정중한 존댓말. 사용자를 "트릭스터 님"이라고 부른다. 차분하게 격려한다.'],
    [/igor/i, 'igor', '이고르', '느긋하고 의미심장한 존댓말. "벨벳 룸에 오신 것을 환영합니다." 같은 말투로, 갱생과 운명에 빗대어 말한다.'],
    [/maruki/i, 'maruki', '마루키 타쿠토', '부드럽고 다정한 상담사의 존댓말. 먼저 마음을 물어봐 주고, 과자를 권하듯 편하게 말한다.'],
  ];
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || 'char';
  // zip 이름표(label) → { id, name, tone }
  D.castFromLabel = (label) => {
    const p = D.CAST_PRESETS.find((c) => c[0].test(label));
    if (p) return { id: p[1], name: p[2], tone: p[3] };
    return { id: slug(label), name: label, tone: `"${label}" 캐릭터의 원작 말투와 성격을 그대로 살려서 말한다. 그 캐릭터가 쓰는 호칭·말버릇을 쓰고, 짧고 자연스럽게.` };
  };
  // 지금 있는 캐릭터 id 목록 (기본 4명 + 불러온 캐릭터)
  D.castIds = (t) => [...new Set([...D.CAST.map((c) => c[0]), ...Object.keys(t.cast || {}), t.castActive || 'ren'])];
  D.castName = (t, id) => ((t.castActive || 'ren') === id ? t.assistant.name : (t.cast && t.cast[id] && t.cast[id].name) || (D.CAST.find((c) => c[0] === id) || [])[1] || id);
  const CAST_KEYS = ['name', 'tone', 'image', 'faces', 'size', 'x', 'y', 'flip'];
  const emptyFaces = () => ({ base: null, talk: null, smile: null, wink: null, serious: null, closed: null });
  // 저장된 캐릭터 꺼내기 (없으면 기본값으로 새로 만듦)
  D.castGet = (t, id) => {
    t.cast = t.cast || {};
    if (!t.cast[id]) { const p = D.CAST.find((c) => c[0] === id) || [id, id, '']; t.cast[id] = { name: p[1], tone: p[2], image: null, faces: emptyFaces(), size: t.assistant.size, x: t.assistant.x, y: t.assistant.y, flip: t.assistant.flip }; }
    return t.cast[id];
  };
  // zip 에서 꺼낸 그림으로 캐릭터 하나를 통째로 세팅 (이름·말투·표정)
  D.castApplyZip = (t, label, faces) => {
    const c = D.castFromLabel(label), active = (t.castActive || 'ren') === c.id;
    const target = active ? t.assistant : D.castGet(t, c.id);
    target.name = c.name; target.tone = c.tone; target.image = null; target.faces = { ...emptyFaces(), ...faces };
    return c;
  };
  // 지금 비서를 저장하고 다른 캐릭터로 바꿈
  D.castSwitch = (t, id) => {
    const cur = t.castActive || 'ren';
    if (id === cur) return;
    t.cast = t.cast || {};
    t.cast[cur] = Object.fromEntries(CAST_KEYS.map((k) => [k, t.assistant[k]]));
    const next = D.castGet(t, id);
    for (const k of CAST_KEYS) t.assistant[k] = next[k];
    t.castActive = id;
  };
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
  // 13판: 글씨체를 레퍼런스 계열로 (숫자 Archivo Black, 요일 Anton, 제목 Black Han Sans). 직접 바꾼 글씨체는 건드리지 않음
  const migrate13 = (t) => {
    if ((t.version || 1) >= 13) return false;
    for (const k of ['bigDate', 'monthDay', 'section', 'calNum', 'calHead']) {
      const x = t.text[k], d = DEFAULT_THEME.text[k];
      if (!x || x.font !== 'Gasoek One') continue;
      Object.assign(x, { font: d.font, tracking: d.tracking, upper: d.upper });
      if (k === 'calNum') Object.assign(x, { size: d.size, scaleY: d.scaleY });
      if (k === 'calHead' || k === 'section') x.size = d.size;
    }
    t.version = 13;
    return true;
  };
  // 12판: 달력 숫자 세로로 조금 더 길게
  const migrate12 = (t) => {
    if ((t.version || 1) >= 12) return false;
    if (t.text.calNum && t.text.calNum.scaleY === 100) t.text.calNum.scaleY = 122;
    t.version = 12;
    return true;
  };
  // 11판: 작은 글씨 전부 나눔고딕, 말풍선 줄간격 살짝 좁게
  const migrate11 = (t) => {
    if ((t.version || 1) >= 11) return false;
    for (const k of ['checklist', 'quest', 'body']) {
      const x = t.text[k];
      if (x && x.font === 'Noto Sans KR') Object.assign(x, { font: 'Nanum Gothic', weight: 700, tracking: 0, lineHeight: DEFAULT_THEME.text[k].lineHeight });
    }
    const b = t.text.bubble;
    if (b && b.font === 'Nanum Gothic' && b.size === 17 && b.lineHeight === 1.55) Object.assign(b, { size: 16, lineHeight: 1.45, tracking: 0.3 });
    t.version = 11;
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
    if ((t.version || 1) >= 12) return migrate13(t);
    if ((t.version || 1) >= 11) { migrate12(t); migrate13(t); return true; }
    if ((t.version || 1) >= 10) { migrate11(t); migrate12(t); migrate13(t); return true; }
    if ((t.version || 1) >= 9) { migrate10(t); migrate11(t); migrate12(t); migrate13(t); return true; }
    if ((t.version || 1) >= 8) { migrate9(t); migrate10(t); migrate11(t); migrate12(t); migrate13(t); return true; }
    if ((t.version || 1) >= 7) { migrate8(t); migrate9(t); migrate10(t); migrate11(t); migrate12(t); migrate13(t); return true; }
    if ((t.version || 1) >= 6) { migrate7(t); migrate8(t); migrate9(t); migrate10(t); migrate11(t); migrate12(t); migrate13(t); return true; }
    if ((t.version || 1) >= 5) { migrate6(t); migrate7(t); migrate8(t); migrate9(t); migrate10(t); migrate11(t); migrate12(t); migrate13(t); return true; }
    if ((t.version || 1) >= 4) { migrate5(t); migrate6(t); migrate7(t); migrate8(t); migrate9(t); migrate10(t); migrate11(t); migrate12(t); migrate13(t); return true; }
    if ((t.version || 1) >= 3) { migrate4(t); migrate5(t); migrate6(t); migrate7(t); migrate8(t); migrate9(t); migrate10(t); migrate11(t); migrate12(t); migrate13(t); return true; }
    if ((t.version || 1) >= 2) { migrate3(t); migrate4(t); migrate5(t); migrate6(t); migrate7(t); migrate8(t); migrate9(t); migrate10(t); migrate11(t); migrate12(t); migrate13(t); return true; }
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
    migrate11(t);
    migrate12(t);
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
