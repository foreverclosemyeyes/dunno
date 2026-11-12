(() => {
  'use strict';

  // ---------- 고정 값 ----------
  const KEY = 'tide.v1', OLD_KEY = 'harugyeol.v1';

  // ---------- 언어 ----------
  // 한국어 문장을 그대로 열쇠로 쓰고, 영어일 때만 아래 표에서 바꿔 준다. 언어를 바꾸면 앱을 새로 연다.
  const EN = (() => { try { return JSON.parse(localStorage.getItem(KEY)).settings.lang === 'en'; } catch (e) { return false; } })();
  document.documentElement.lang = EN ? 'en' : 'ko';
  const DICT = {
    '없음': 'None',
    '약간': 'Mild',
    '보통': 'Moderate',
    '보통 ': 'Normal',
    '글씨 크기': 'Text size', '작게': 'Small', '크게': 'Large', '아주 크게': 'Extra large',
    '취소': 'Cancel', '완료': 'Done', '설정': 'Settings', '증상': 'Symptoms', '몸': 'Body',
    '수면 시간': 'Time asleep', '일어났을 때 피곤함': 'Tired on waking', '일어났을 때': 'On waking', '피곤': 'Tired',
    '높음': 'High',
    '매우 높음': 'Very high',
    '낮음': 'Low',
    '조금': 'Some',
    '많음': 'A lot',
    '우울': 'Depressed',
    '고조 (들뜸)': 'Elevated',
    '불안': 'Anxious',
    '적게 자도 안 피곤함': 'Not tired on little sleep',
    '말이 많아짐': 'More talkative',
    '생각이 빠르게 튐': 'Racing thoughts',
    '주의가 쉽게 흩어짐': 'Easily distracted',
    '새로운 일·프로젝트에 몰두': 'Absorbed in new projects',
    '충동적인 지출이나 결정': 'Impulsive spending or decisions',
    '기본': 'Default',
    '애플 고딕': 'Apple Gothic',
    '명조': 'Serif',
    '이 앱은 진단 도구가 아니에요. 내 상태를 기록해 두는 참고용이에요.': 'This app is not a diagnostic tool. It is a personal log for reference.',
    '저장하지 못했어요. 저장 공간을 확인해 주세요.': 'Could not save. Please check your storage space.',
    '기분': 'Mood',
    '기록 없음': 'No entry',
    '홈 화면에 추가해서 쓰세요.': 'Add this to your Home Screen.',
    '사파리 아래쪽 공유 버튼(네모에 화살표) → “홈 화면에 추가”를 누르면 앱처럼 열려요.': 'In Safari, tap the Share button (square with an arrow) → “Add to Home Screen” to open it like an app.',
    '닫기': 'Close',
    '오늘': 'Today',
    '지난 기록': 'Past entry',
    '설정과 백업': 'Settings & backup',
    '이전 주': 'Previous week',
    '다음 주': 'Next week',
    '오늘로 돌아가기': 'Back to today',
    '오늘 기록이 아직 없어요': 'No entry for today yet',
    '이 날은 기록이 없어요': 'No entry for this day',
    '10초면 끝나요.': 'It takes 10 seconds.',
    '기록하기': 'Log',
    '시간': 'h',
    '분': 'm',
    '에너지': 'Energy',
    '자신감': 'Confidence',
    '수면': 'Sleep',
    '고조': 'Elevated',
    '잠든 → 깬': 'Asleep → Awake',
    ' · 피곤': ' · tired',
    ' · 개운': ' · rested',
    '생리': 'Period',
    '생리 중': 'On period',
    '식욕': 'Appetite',
    '카페인': 'Caffeine',
    '약': 'Meds',
    '체크': 'Checked',
    '메모': 'Note',
    '수정하기': 'Edit',
    '지난주': 'last week',
    '지난달': 'last month',
    '평균': 'Average',
    '{0}와 비슷': 'same as {0}',
    '{0}보다 {1} {2}': '{1} {2} vs {0}',
    '12시간': '12h',
    '점선은 지금까지의 내 평균 수면': 'Dotted line is your average sleep so far',
    '기분 달력': 'Mood calendar',
    '가라앉음': 'Low',
    '들뜸': 'High',
    '증상 · 생리 · 약': 'Symptoms · Period · Meds',
    '흐름': 'Trends',
    '기록 {0}일 / {1}일': '{0} of {1} days logged',
    '이전': 'Previous',
    '다음': 'Next',
    ' · 기록 없음': ' · no entry',
    '기록 열기': 'Open entry',
    '그래프나 달력에서 날짜를 누르면 그날 값을 볼 수 있어요.': 'Tap a date on a chart or the calendar to see that day.',
    '약 이름': 'Medication name',
    '용량 (예: 300mg)': 'Dose',
    '이 약 저장하고 선택': 'Save and select',
    '+ 약 추가': '+ Add med',
    '자주 먹는 약을 한 번 추가해 두면 다음부터는 탭 한 번이면 돼요.': 'Add a medication once and it is one tap from then on.',
    '기록 수정': 'Edit entry',
    '기분 0에서 10': 'Mood, 0 to 10',
    '에너지 0에서 10': 'Energy, 0 to 10',
    '바닥': 'Empty',
    '넘침': 'Full',
    '자신감 0에서 10': 'Confidence, 0 to 10',
    '위축': 'Low',
    '오늘 이런 점이 있었나요?': 'Did any of these apply today?',
    '해당하는 것만': 'Only those that apply',
    '지난밤 수면': 'Last night\'s sleep',
    '잠든 시각': 'Fell asleep',
    '깬 시각': 'Woke up',
    '일어났을 때 피곤했나요?': 'Tired when you woke up?',
    '아니오': 'No',
    '예': 'Yes',
    '오늘 먹은 약': 'Meds taken today',
    '탭해서 선택': 'Tap to select',
    '선택': 'Optional',
    '한 줄로 남기기': 'One line',
    '이 날 기록 삭제': 'Delete this entry',
    '저장': 'Save',
    '시각을 넣으면 자동 계산': 'Calculated from the times',
    '{0} 잤어요': 'Slept {0}',
    '저장했어요': 'Saved',
    '삭제': 'Delete',
    '저장된 약이 없어요. 기록 화면에서 “+ 약 추가”로 넣을 수 있어요.': 'No saved meds. Add one with “+ Add med” on the log screen.',
    '기록 {0}일': '{0} days logged',
    '글씨체': 'Font',
    '가나다 123': 'Abc 가나다 123',
    '백업': 'Backup',
    '기록은 이 아이폰 안에만 저장돼요. 폰을 바꾸거나 앱을 지우면 사라지니, 가끔 백업 파일을 만들어 “파일” 앱이나 iCloud에 넣어 두세요.': 'Entries are stored only on this iPhone. They are lost if you change phones or delete the app, so export a backup file now and then and keep it in Files or iCloud.',
    '백업 파일 내보내기': 'Export backup file',
    '백업 파일 불러오기': 'Import backup file',
    '자주 먹는 약': 'Saved meds',
    '홈 화면에 추가하는 방법': 'How to add to Home Screen',
    '사파리에서 이 페이지를 엽니다.': 'Open this page in Safari.',
    '아래쪽 공유 버튼(네모에 위쪽 화살표)을 누릅니다.': 'Tap the Share button at the bottom (square with an up arrow).',
    '“홈 화면에 추가”를 누릅니다.': 'Tap “Add to Home Screen”.',
    '안내': 'About',
    '걱정되는 변화가 있으면 진료 때 이 기록을 보여 주며 이야기해 보세요.': 'If a change worries you, show this log at your appointment and talk it through.',
    '백업 파일을 만들었어요': 'Backup file created',
    '이 앱의 백업 파일이 아니에요': 'This is not a backup file from this app',
    '백업 파일에 {0}일치 기록이 있어요.\n지금 기록과 합칠까요? (같은 날짜는 더 최근에 수정한 쪽을 남겨요)': 'The backup file has {0} days of entries.\nMerge with your current entries? (For the same date, the more recently edited one is kept)',
    '{0}일치 기록을 불러왔어요': 'Imported {0} days of entries',
    '이 날 기록을 삭제할까요?': 'Delete this entry?',
    '삭제했어요': 'Deleted',
    '약 이름을 적어 주세요': 'Please enter a medication name',
  };
  const T = (ko) => (EN && DICT[ko] != null ? DICT[ko] : ko);
  const F = (ko, ...a) => T(ko).replace(/\{(\d)\}/g, (_, i) => a[i]);
  const LEVELS = [T('없음'), T('약간'), T('보통'), T('높음'), T('매우 높음')];
  const SYMPTOMS = [['dep', T('우울')], ['elev', T('고조 (들뜸)')], ['anx', T('불안')]];
  const SIGNS = [
    ['lessSleep', T('적게 자도 안 피곤함')],
    ['talkative', T('말이 많아짐')],
    ['racing', T('생각이 빠르게 튐')],
    ['distract', T('주의가 쉽게 흩어짐')],
    ['projects', T('새로운 일·프로젝트에 몰두')],
    ['impulsive', T('충동적인 지출이나 결정')],
  ];
  const SIGN_THRESHOLD = 7;
  const isHigh = (d) => d.mood >= SIGN_THRESHOLD || d.energy >= SIGN_THRESHOLD || (d.conf != null && d.conf >= SIGN_THRESHOLD);
  const FONTS = {
    system: [T('기본'), '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'],
    gothic: [T('애플 고딕'), '"Apple SD Gothic Neo", "AppleGothic", "Noto Sans KR", sans-serif'],
    pretendard: ['Pretendard', '"Pretendard Variable", -apple-system, "Apple SD Gothic Neo", sans-serif'],
    myungjo: [T('명조'), '"AppleMyungjo", "Nanum Myeongjo", "Noto Serif KR", serif'],
  };
  const SIZES = { s: [T('작게'), 1], m: [T('보통 '), 1.12], l: [T('크게'), 1.25], xl: [T('아주 크게'), 1.4] };
  const fontScale = () => (SIZES[db.settings.size] || SIZES.m)[1];
  const WD = () => (EN ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['일', '월', '화', '수', '목', '금', '토']);
  const DISCLAIMER = T('이 앱은 진단 도구가 아니에요. 내 상태를 기록해 두는 참고용이에요.');

  // ---------- 저장소 (이 기기 안에만 저장) ----------
  const blank = () => ({ version: 2, entries: {}, meds: [], settings: {} });
  // 예전 기록(식욕·카페인 3단계)을 0~10 숫자로 옮긴다
  function migrate(data) {
    if ((data.version || 1) < 2) {
      Object.values(data.entries || {}).forEach((e) => {
        if (e.appetite != null) e.appetite = [2, 5, 8][e.appetite];
        if (e.caffeine != null) e.caffeine = [0, 4, 8][e.caffeine];
      });
      data.version = 2;
    }
    return data;
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY));
      if (raw && typeof raw === 'object' && raw.entries) return migrate(Object.assign(blank(), raw, { version: raw.version || 1 }));
    } catch (e) { /* 처음 실행이거나 읽기 실패 */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { toast(T('저장하지 못했어요. 저장 공간을 확인해 주세요.')); return false; }
  }
  let db = load();

  // ---------- 날짜·시간 도우미 ----------
  const pad = (n) => String(n).padStart(2, '0');
  const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ds(d); };
  const today = () => ds(new Date());
  const weekStart = (s) => { const d = parse(s); return addDays(s, -((d.getDay() + 6) % 7)); }; // 월요일 시작
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const md = (d) => (EN ? `${MON[d.getMonth()]} ${d.getDate()}` : `${d.getMonth() + 1}월 ${d.getDate()}일`);
  const monthTitle = (d) => (EN ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : `${d.getFullYear()}년 ${d.getMonth() + 1}월`);
  const longDate = (s) => { const d = parse(s); return EN ? `${WD()[d.getDay()]}, ${md(d)}` : `${md(d)} ${WD()[d.getDay()]}요일`; };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  function sleepMinutes(bed, wake) {
    if (!bed || !wake) return null;
    const diff = (toMin(wake) - toMin(bed) + 1440) % 1440;
    return diff || null;
  }
const durText = (min) => (min == null ? '–' : EN
    ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}`
    : `${Math.floor(min / 60)}시간${min % 60 ? ` ${min % 60}분` : ''}`);
  const ampm = (t) => {
    if (!t) return '–';
    const [h, m] = t.split(':').map(Number);
return EN ? `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}` : `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(m)}`;
  };

  // 흑백: 기분이 낮을수록 어둡게, 높을수록 밝게
  function moodFill(v) {
    const g = Math.round(55 + v * 20);
    return `background:rgb(${g},${g},${g});color:${v >= 5 ? '#000' : '#fff'}`;
  }

  // ---------- 아이콘 (선 그림) ----------
  const svg = (inner) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const IC = {
    // 기분: 값에 따라 입꼬리가 바뀌는 얼굴
    face: (v) => { const e = 15 - (v - 5) * 0.3, c = 15 + (v - 5) * 0.8;
      return svg(`<circle cx="12" cy="12" r="9"/><path d="M9 9.5v.6M15 9.5v.6" stroke-width="2"/><path d="M8 ${e}Q12 ${c} 16 ${e}"/>`); },
    // 에너지: 값만큼 차는 배터리
    battery: (v) => svg(`<rect x="2.5" y="7.5" width="17" height="9" rx="2.5"/><path d="M22 10.5v3"/>${v > 0 ? `<rect x="4.5" y="9.5" width="${(13 * v / 10).toFixed(1)}" height="5" rx="1" fill="currentColor" stroke="none"/>` : ''}`),
    moon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
    drop: svg('<path d="M12 3.5c3 4 5.5 6.8 5.5 10a5.5 5.5 0 0 1-11 0c0-3.2 2.5-6 5.5-10z"/>'),
    pill: svg('<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>'),
    coffee: svg('<path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10.5h1.5a2.25 2.25 0 0 1 0 4.5H16M8.5 3v2.5M12.5 3v2.5"/>'),
    fork: svg('<path d="M7 3v6.5a2 2 0 0 0 4 0V3M9 3v18M17.5 3c-2 2-2.5 5-2.5 8h2.5v10"/>'),
    note: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
    wave: svg('<path d="M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/>'),
    star: svg('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>'),
    today: svg('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>'),
    chart: svg('<path d="M4 19h16M6 15l4-5 3.5 3L19 6"/>'),
    sliders: svg('<path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/>'),
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = $('#app'), sheet = $('#sheet');

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- 화면 상태 ----------
  const ui = { tab: 'today', selected: today(), draft: null, addingMed: false };
  const standalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

  // ---------- 오늘 화면 ----------
  const li = (left, right) => `<div class="li"><span class="lk">${left}</span><span class="lv">${right}</span></div>`;

  function viewToday() {
    const t = today(), sel = ui.selected, ws = weekStart(sel), e = db.entries[sel];

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i), en = db.entries[d], dt = parse(d);
      return `<button class="cday${d === sel ? ' sel' : ''}${d === t ? ' now' : ''}" data-act="pick" data-date="${d}" ${d > t ? 'disabled' : ''}
        aria-label="${longDate(d)}, ${en ? `${T('기분')} ${en.mood}` : T('기록 없음')}">
        <span class="cw">${WD()[dt.getDay()]}</span><span class="cdot" ${en ? `style="${moodFill(en.mood)}"` : ''}>${dt.getDate()}</span></button>`;
    }).join('');

    const hint = (!standalone() && !db.settings.hintClosed)
      ? `<div class="card hint"><div><b>${T('홈 화면에 추가해서 쓰세요.')}</b><br>${T('사파리 아래쪽 공유 버튼(네모에 화살표) → “홈 화면에 추가”를 누르면 앱처럼 열려요.')}</div>
         <button class="x" data-act="closeHint" aria-label="${T('닫기')}">✕</button></div>` : '';

    app.innerHTML = `
      <header class="top">
        <div><div class="over">${sel === t ? longDate(sel) : T('지난 기록')}</div><h1>${sel === t ? T('오늘') : longDate(sel)}</h1></div>
        <button class="icon-btn" data-act="settings" aria-label="${T('설정과 백업')}">${IC.sliders}</button>
      </header>
      ${hint}
      <div class="weekbar">
        <button class="nav" data-act="week" data-step="-1" aria-label="${T('이전 주')}">‹</button>
        <div class="days">${days}</div>
        <button class="nav" data-act="week" data-step="1" aria-label="${T('다음 주')}" ${addDays(ws, 7) > t ? 'disabled' : ''}>›</button>
      </div>
      ${e ? summary(e) : emptyCard(sel === t)}
      ${sel !== t ? `<button class="btn plain" data-act="goToday">${T('오늘로 돌아가기')}</button>` : ''}
      <p class="foot">${DISCLAIMER}</p>`;
  }

  function emptyCard(isToday) {
    return `<section class="card empty"><div class="e1">${isToday ? T('오늘 기록이 아직 없어요') : T('이 날은 기록이 없어요')}</div>
      <div>${T('10초면 끝나요.')}</div>
      <button class="btn" data-act="record">${T('기록하기')}</button></section>`;
  }

  const tile = (icon, n, label) => `<div class="tile"><div class="tl">${icon}${label}</div><div class="n">${n}</div></div>`;
  const bars = (v) => `<span class="bars">${[1, 2, 3, 4].map((i) => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span>`;

  function summary(e) {
    const sleepBig = e.sleepMin == null ? '–'
      : `${Math.floor(e.sleepMin / 60)}<small>${T('시간')}</small>${e.sleepMin % 60 ? ` ${e.sleepMin % 60}<small>${T('분')}</small>` : ''}`;
    const signs = SIGNS.filter(([k]) => e.signs && e.signs[k]).map(([, label]) => label);
    const meds = (e.meds || []).map((x) => esc(x.name) + (x.dose ? ` ${esc(x.dose)}` : '')).join(', ');
    const ten = (v) => `${v}<span class="of"> / 10</span>`;
    return `
      <div class="tiles">
        ${tile(IC.face(e.mood), e.mood, T('기분'))}
        ${tile(IC.battery(e.energy), e.energy, T('에너지'))}
        ${tile(IC.star, e.conf == null ? '–' : e.conf, T('자신감'))}
        ${tile(IC.moon, sleepBig, T('수면'))}
      </div>
      <section class="card list">
        ${li(T('우울'), `${LEVELS[e.dep]}${bars(e.dep)}`)}
        ${li(T('고조'), `${LEVELS[e.elev]}${bars(e.elev)}`)}
        ${li(T('불안'), `${LEVELS[e.anx]}${bars(e.anx)}`)}
      </section>
      <section class="card list">
        ${e.bed && e.wake ? li(`${IC.moon}${T('잠든 → 깬')}`, `${ampm(e.bed)} → ${ampm(e.wake)}`) : ''}
        ${e.tired ? li(`${IC.moon}${T('일어났을 때')}`, T('피곤')) : ''}
        ${e.period ? li(`${IC.drop}${T('생리')}`, T('생리 중')) : ''}
        ${e.appetite != null ? li(`${IC.fork}${T('식욕')}`, ten(e.appetite)) : ''}
        ${e.caffeine != null ? li(`${IC.coffee}${T('카페인')}`, ten(e.caffeine)) : ''}
        ${li(`${IC.pill}${T('약')}`, meds || T('기록 없음'))}
        ${signs.length ? li(T('체크'), signs.map(esc).join('<br>')) : ''}
        ${e.note ? li(`${IC.note}${T('메모')}`, esc(e.note)) : ''}
      </section>
      <button class="btn gray" data-act="record">${T('수정하기')}</button>`;
  }

  // ---------- 흐름 화면 (주 / 월) ----------
  const trend = { mode: 'week', anchor: today(), pick: null };
  function trendRange(anchor) {
    if (trend.mode === 'week') return { start: weekStart(anchor), n: 7 };
    const d = parse(anchor);
    return { start: ds(new Date(d.getFullYear(), d.getMonth(), 1)), n: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() };
  }
  function shiftAnchor(anchor, step) {
    if (trend.mode === 'week') return addDays(anchor, 7 * step);
    const d = parse(anchor);
    return ds(new Date(d.getFullYear(), d.getMonth() + step, 1));
  }
  function shiftTrend(step) { trend.anchor = shiftAnchor(trend.anchor, step); trend.pick = null; }
  const mean = (list, key) => {
    const v = list.map((e) => e[key]).filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const rangeEntries = (r) => Array.from({ length: r.n }, (_, i) => db.entries[addDays(r.start, i)] || null);

  // 점들을 부드러운 곡선으로 잇는다
  function smoothPath(pts, yMin, yMax) {
    if (!pts.length) return '';
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    const clamp = (y) => Math.max(yMin, Math.min(yMax, y));
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6)];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6)];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }

  function viewTrend() {
    const t = today(), r = trendRange(trend.anchor), prev = trendRange(shiftAnchor(trend.anchor, -1));
    const days = rangeEntries(r), got = days.filter(Boolean), before = rangeEntries(prev).filter(Boolean);
    const isWeek = trend.mode === 'week';
    const sD = parse(r.start), eD = parse(addDays(r.start, r.n - 1));
    const title = isWeek
      ? `${md(sD)} – ${md(eD)}`
      : monthTitle(sD);
    const word = isWeek ? T('지난주') : T('지난달');
    const pick = trend.pick, pickDate = pick == null ? null : addDays(r.start, pick), pickE = pickDate ? db.entries[pickDate] : null;
    const pickLabel = pickDate ? longDate(pickDate) : '';

    // 크기: 오른쪽에 눈금 숫자 자리를 남기고 나머지를 날짜 수로 나눈다
    const FS = fontScale(), AX = Math.round(26 * FS), W = Math.max(160, Math.min(app.clientWidth, 480) - 28 - 32 - AX), col = W / r.n;
    const cx = (i) => col * (i + 0.5);
    const TOP = 8, BOT = 104, H = 124;
    const xLabels = days.map((_, i) => {
      const d = addDays(r.start, i), dt = parse(d);
      if (!isWeek && (dt.getDate() - 1) % 7 !== 0) return '';
      return `<text x="${cx(i).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="${(10 * FS).toFixed(1)}" fill="${d === t ? '#fff' : '#8e8e93'}">${isWeek ? WD()[dt.getDay()] : dt.getDate()}</text>`;
    }).join('');
    const grid = (ticks, y) => ticks.map(([v, label]) => `<line x1="0" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#2c2c2e"/>
      <text x="${W + 6}" y="${(y(v) + 3.5).toFixed(1)}" font-size="${(10 * FS).toFixed(1)}" fill="#636366">${label}</text>`).join('');
    const plot = (inner) => `<div class="plot" data-n="${r.n}" data-w="${W}"><svg width="${W + AX}" height="${H}">${inner}${xLabels}</svg></div>`;

    // 카드 머리: 평소에는 평균, 날짜를 누르면 그날 값
    const fmtSleep = (m) => `${Math.floor(m / 60)}<small>${T('시간')}</small> ${Math.round(m % 60)}<small>${T('분')}</small>`;
    const head = (key, icon, name, isSleep) => {
      let big, sub;
      if (pickDate) {
        const v = pickE ? pickE[key] : null;
        big = v == null ? '–' : isSleep ? fmtSleep(v) : v;
        sub = pickLabel;
      } else {
        const a = mean(got, key), b = mean(before, key);
        big = a == null ? '–' : isSleep ? fmtSleep(a) : a.toFixed(1);
        sub = T('평균');
        if (a != null && b != null) {
          const diff = a - b, mag = isSleep ? `${Math.round(Math.abs(diff))}${T('분')}` : Math.abs(diff).toFixed(1);
          sub += Math.abs(diff) < (isSleep ? 5 : 0.05) ? ` · ${F('{0}와 비슷', word)}` : ` · ${F('{0}보다 {1} {2}', word, diff > 0 ? '↑' : '↓', mag)}`;
        }
      }
      return `<div class="mt">${icon}${name}</div><div class="mv"><b>${big}</b><span>${sub}</span></div>`;
    };

    const lineCard = (key, icon, name) => {
      const y = (v) => TOP + (1 - v / 10) * (BOT - TOP);
      const pts = [];
      days.forEach((e, i) => { if (e && e[key] != null) pts.push([cx(i), y(e[key]), i]); });
      let out = `<defs><linearGradient id="g-${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
      out += grid([[0, '0'], [5, '5'], [10, '10']], y);
      if (pts.length > 1) {
        const d = smoothPath(pts, TOP, BOT);
        out += `<path d="${d}L${pts[pts.length - 1][0].toFixed(1)},${BOT}L${pts[0][0].toFixed(1)},${BOT}Z" fill="url(#g-${key})"/>
          <path d="${d}" fill="none" stroke="#fff" stroke-width="${isWeek ? 2.5 : 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      if (isWeek || pts.length === 1) pts.forEach((p) => { out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="#fff" stroke="#1c1c1e" stroke-width="2"/>`; });
      if (pick != null) {
        out += `<line x1="${cx(pick).toFixed(1)}" x2="${cx(pick).toFixed(1)}" y1="${TOP - 4}" y2="${BOT}" stroke="#8e8e93"/>`;
        const p = pts.find((q) => q[2] === pick);
        if (p) out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5.5" fill="#fff" stroke="#1c1c1e" stroke-width="2.5"/>`;
      }
      return `<section class="card mcard">${head(key, icon, name)}${plot(out)}</section>`;
    };

    const sleepCard = () => {
      const MAX = 12 * 60, y = (m) => TOP + (1 - Math.min(m, MAX) / MAX) * (BOT - TOP);
      const bw = isWeek ? 20 : Math.max(3, col - 3), rx = Math.min(bw / 2, 5);
      const all = mean(Object.values(db.entries), 'sleepMin');
      let out = grid([[0, '0'], [360, '6'], [720, T('12시간')]], y);
      days.forEach((e, i) => {
        if (!e || e.sleepMin == null) return;
        const top = Math.min(y(e.sleepMin), BOT - 3);
        out += `<rect x="${(cx(i) - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${(BOT - top).toFixed(1)}" rx="${rx.toFixed(1)}"
          fill="${pick == null || pick === i ? '#fff' : '#636366'}"/>`;
      });
      if (all != null) out += `<line x1="0" x2="${W}" y1="${y(all).toFixed(1)}" y2="${y(all).toFixed(1)}" stroke="#aeaeb2" stroke-dasharray="2 4" stroke-linecap="round"/>`;
      return `<section class="card mcard">${head('sleepMin', IC.moon, T('수면'), true)}${plot(out)}
        <div class="mnote">${T('점선은 지금까지의 내 평균 수면')}${all != null ? ` (${durText(Math.round(all))})` : ''}</div></section>`;
    };

    // 월: 기분 달력
    const calendar = () => {
      const lead = (sD.getDay() + 6) % 7;
      const cells = Array.from({ length: lead }, () => '<span></span>').concat(days.map((e, i) => {
        const d = addDays(r.start, i);
        return `<button class="cday${pick === i ? ' sel' : ''}${d === t ? ' now' : ''}" data-act="pickDay" data-i="${i}" ${d > t ? 'disabled' : ''}
          aria-label="${longDate(d)}, ${e ? `${T('기분')} ${e.mood}` : T('기록 없음')}">
          <span class="cdot" ${e ? `style="${moodFill(e.mood)}"` : ''}>${parse(d).getDate()}</span>${e && e.period ? '<i></i>' : ''}</button>`;
      })).join('');
      const scale = [0, 2.5, 5, 7.5, 10].map((v) => `<i style="${moodFill(v)}"></i>`).join('');
      return `<section class="card mcard"><div class="mt">${IC.today}${T('기분 달력')}</div>
        <div class="cal">${[1, 2, 3, 4, 5, 6, 0].map((i) => WD()[i]).map((w) => `<span class="cw">${w}</span>`).join('')}${cells}</div>
        <div class="mnote calkey"><span>${T('가라앉음')} ${scale} ${T('들뜸')}</span><span><i class="pdot"></i> ${T('생리')}</span></div></section>`;
    };

    // 증상·생리·약: 날짜별 칸
    const SHADE = ['#2c2c2e', '#5a5a5e', '#8e8e93', '#c7c7cc', '#fff'];
    const strip = (name, cell) => `<div class="srow"><svg width="${W}" height="18">${days.map((e, i) => (e ? cell(e, i) : '')).join('')}${
      pick == null ? '' : `<rect x="${(col * pick).toFixed(1)}" y="0" width="${col.toFixed(1)}" height="18" rx="4" fill="none" stroke="#fff"/>`}</svg><span>${name}</span></div>`;
    const gap = isWeek ? 4 : 1.5;
    const level = (key) => (e, i) => `<rect x="${(col * i + gap / 2).toFixed(1)}" y="2" width="${(col - gap).toFixed(1)}" height="14" rx="${isWeek ? 5 : 3}" fill="${SHADE[e[key] || 0]}"/>`;
    const dot = (test) => (e, i) => (test(e) ? `<circle cx="${cx(i).toFixed(1)}" cy="9" r="${isWeek ? 4.5 : Math.min(3, col / 2 - 1)}" fill="#fff"/>` : '');
    const symptoms = `<section class="card mcard"><div class="mt">${IC.wave}${T('증상 · 생리 · 약')}</div>
      <div class="plot strips" data-n="${r.n}" data-w="${W}">
        ${strip(T('우울'), level('dep'))}${strip(T('고조'), level('elev'))}${strip(T('불안'), level('anx'))}
        <div style="height:8px"></div>
        ${strip(T('생리'), dot((e) => e.period))}${strip(T('약'), dot((e) => e.meds && e.meds.length))}
      </div>
      <div class="mnote calkey"><span>${T('없음')} ${SHADE.map((c) => `<i style="background:${c}"></i>`).join('')} ${T('매우 높음')}</span></div></section>`;

    app.innerHTML = `
      <header class="top"><div><div class="over">${F('기록 {0}일 / {1}일', got.length, r.n)}</div><h1>${T('흐름')}</h1></div>
        <div class="segc"><button data-act="mode" data-mode="week" aria-pressed="${isWeek}">${EN ? 'Week' : T('주')}</button>
          <button data-act="mode" data-mode="month" aria-pressed="${!isWeek}">${EN ? 'Month' : T('월')}</button></div></header>
      <div class="pnav">
        <button data-act="shift" data-step="-1" aria-label="${T('이전')}">‹</button><span>${title}</span>
        <button data-act="shift" data-step="1" aria-label="${T('다음')}" ${shiftAnchor(r.start, 1) > t ? 'disabled' : ''}>›</button></div>
      ${pickDate ? `<div class="pickbar"><span>${pickLabel}${pickE ? '' : T(' · 기록 없음')}</span><button class="mini" data-act="openDay" data-date="${pickDate}">${pickE ? T('기록 열기') : T('기록하기')}</button></div>` : ''}
      ${isWeek ? '' : calendar()}
      ${lineCard('mood', IC.face(5), T('기분'))}${lineCard('energy', IC.battery(6), T('에너지'))}${lineCard('conf', IC.star, T('자신감'))}
      ${sleepCard()}${symptoms}
      <p class="foot">${T('그래프나 달력에서 날짜를 누르면 그날 값을 볼 수 있어요.')}<br>${DISCLAIMER}</p>`;
  }

  function render() {
    (ui.tab === 'trend' ? viewTrend : viewToday)();
    app.insertAdjacentHTML('beforeend', `<nav class="tabbar">
      <button data-act="tab" data-tab="today" aria-pressed="${ui.tab === 'today'}">${IC.today}<span>${T('오늘')}</span></button>
      <button data-act="tab" data-tab="trend" aria-pressed="${ui.tab === 'trend'}">${IC.chart}<span>${T('흐름')}</span></button></nav>`);
  }

  function applyFont() {
    document.documentElement.style.setProperty('--font', (FONTS[db.settings.font] || FONTS.system)[1]);
    document.documentElement.style.setProperty('--fs', fontScale());
  }

  // ---------- 기록 화면 ----------
  function newDraft(date) {
    const old = db.entries[date];
    if (old) return JSON.parse(JSON.stringify(Object.assign({ signs: {}, meds: [], period: false }, old, {
      conf: old.conf == null ? 5 : old.conf, appetite: old.appetite == null ? 5 : old.appetite, caffeine: old.caffeine == null ? 0 : old.caffeine })));
    // 잠든·깬 시각은 가장 최근 기록을 기본값으로 (대부분 비슷하니까 덜 만져도 되게)
    const last = Object.keys(db.entries).sort().reverse().map((k) => db.entries[k]).find((x) => x.bed && x.wake);
    return {
      date, mood: 5, energy: 5, conf: 5, dep: 0, elev: 0, anx: 0,
      bed: last ? last.bed : '23:30', wake: last ? last.wake : '07:00',
      tired: false, period: false, appetite: 5, caffeine: 0, meds: [], note: '', signs: {},
    };
  }

  const medKey = (m) => `${m.name}|${m.dose || ''}`;
  const seg = (field, labels, value) => `<div class="seg" data-field="${field}">${
    labels.map((l, i) => `<button type="button" data-v="${i}" aria-pressed="${value === i}">${l}</button>`).join('')}</div>`;
  const SLIDERS = ['mood', 'energy', 'conf', 'appetite', 'caffeine'];
  const slider = (id, icon, label, v, lo, hi) => `<div class="li sl">
    <div class="slh"><span class="lk"><span id="i-${id}">${icon}</span>${label}</span><b id="v-${id}">${v}</b></div>
    <input type="range" id="f-${id}" min="0" max="10" step="1" value="${v}" style="--v:${v / 10}" aria-label="${label}">
    <div class="ends"><span>${lo}</span><span>${hi}</span></div></div>`;
  const sw = (attr, on, label, icon) => `<button type="button" class="li sw" ${attr} aria-pressed="${!!on}"><span class="lk">${icon || ''}${label}</span><i></i></button>`;

  function medsHtml() {
    const d = ui.draft;
    const taken = new Set(d.meds.map(medKey));
    const all = db.meds.concat(d.meds.filter((m) => !db.meds.some((x) => medKey(x) === medKey(m))));
    const rows = all.map((m) => `<button type="button" class="li med" data-med="${esc(medKey(m))}" aria-pressed="${taken.has(medKey(m))}">
      <span class="lk">${esc(m.name)}${m.dose ? `<small>${esc(m.dose)}</small>` : ''}</span><span class="chk">✓</span></button>`).join('');
    const add = ui.addingMed
      ? `<div class="li med-new">
           <input type="text" id="med-name" placeholder="${T('약 이름')}" autocomplete="off" maxlength="30">
           <input type="text" id="med-dose" placeholder="${T('용량 (예: 300mg)')}" autocomplete="off" maxlength="20">
           <button type="button" class="btn gray" data-act="saveMed">${T('이 약 저장하고 선택')}</button>
         </div>`
      : `<button type="button" class="li add" data-act="addMed">${T('+ 약 추가')}</button>`;
    return rows + add;
  }

  function signsHtml() {
    const d = ui.draft;
    return SIGNS.map(([k, label]) => sw(`data-sign="${k}"`, d.signs[k], label)).join('');
  }

  function openRecord(date) {
    ui.draft = newDraft(date);
    ui.addingMed = false;
    const d = ui.draft, isEdit = !!db.entries[date];
    sheet.innerHTML = `<div class="sheet-in">
      <div class="sheet-top">
        <button class="txt" data-act="close">${T('취소')}</button>
        <div class="st"><b>${isEdit ? T('기록 수정') : T('기록하기')}</b><span>${longDate(date)}</span></div>
        <button class="txt strong" data-act="save">${T('저장')}</button>
      </div>

      <section class="card list">
        ${slider('mood', '', T('기분'), d.mood, T('가라앉음'), T('들뜸'))}
        ${slider('energy', '', T('에너지'), d.energy, T('바닥'), T('넘침'))}
        ${slider('conf', IC.star, T('자신감'), d.conf, T('위축'), T('넘침'))}
      </section>

      <div id="signs" hidden>
        <div class="sec">${T('오늘 이런 점이 있었나요?')}</div>
        <section class="card list">${signsHtml()}</section>
      </div>

      <div class="sec">${T('증상')}</div>
      <section class="card list">
        ${SYMPTOMS.map(([k, label]) => `<div class="li col"><span class="lk">${label}</span>${seg(k, LEVELS, d[k])}</div>`).join('')}
      </section>

      <div class="sec">${T('지난밤 수면')}</div>
      <section class="card list">
        <label class="li"><span class="lk">${T('잠든 시각')}</span><input type="time" id="f-bed" value="${esc(d.bed || '')}"></label>
        <label class="li"><span class="lk">${T('깬 시각')}</span><input type="time" id="f-wake" value="${esc(d.wake || '')}"></label>
        <div class="li"><span class="lk">${T('수면 시간')}</span><span class="lv" id="v-sleep"></span></div>
        ${sw('data-flag="tired"', d.tired, T('일어났을 때 피곤함'))}
      </section>

      <div class="sec">${T('몸')}</div>
      <section class="card list">
        ${sw('data-flag="period"', d.period, T('생리 중'), IC.drop)}
        ${slider('appetite', IC.fork, T('식욕'), d.appetite, T('없음'), T('많음'))}
        ${slider('caffeine', IC.coffee, T('카페인'), d.caffeine, T('없음'), T('많음'))}
      </section>

      <div class="sec">${T('오늘 먹은 약')}</div>
      <section class="card list" id="meds">${medsHtml()}</section>

      <div class="sec">${T('메모')}</div>
      <section class="card list">
        <div class="li"><input type="text" id="f-note" maxlength="120" placeholder="${T('한 줄로 남기기')}" value="${esc(d.note || '')}" autocomplete="off"></div>
      </section>

      ${isEdit ? `<button class="btn plain danger" data-act="deleteEntry">${T('이 날 기록 삭제')}</button>` : ''}
      <div class="savebar"><button class="btn" data-act="save">${T('저장')}</button></div>
    </div>`;
    showSheet();
    syncForm();
  }

  // 슬라이더 값에 따라 숫자·아이콘·체크리스트·수면 시간을 바로 갱신
  function syncForm() {
    const d = ui.draft;
    if (!d) return;
    SLIDERS.forEach((k) => {
      $(`#v-${k}`).textContent = d[k];
      $(`#f-${k}`).style.setProperty('--v', d[k] / 10);
    });
    $('#i-mood').innerHTML = IC.face(d.mood);
    $('#i-energy').innerHTML = IC.battery(d.energy);
    $('#signs').hidden = !isHigh(d);
    $('#v-sleep').textContent = durText(sleepMinutes(d.bed, d.wake));
  }

  function saveEntry() {
    const d = ui.draft;
    const showSigns = isHigh(d);
    const signs = {};
    if (showSigns) SIGNS.forEach(([k]) => { if (d.signs[k]) signs[k] = true; });
    db.entries[d.date] = {
      date: d.date, mood: d.mood, energy: d.energy, conf: d.conf, dep: d.dep, elev: d.elev, anx: d.anx,
      bed: d.bed || null, wake: d.wake || null, sleepMin: sleepMinutes(d.bed, d.wake),
      tired: !!d.tired, period: !!d.period, appetite: d.appetite, caffeine: d.caffeine,
      meds: d.meds, note: (d.note || '').trim(), signs, updatedAt: new Date().toISOString(),
    };
    if (!save()) return;
    closeSheet();
    render();
    toast(T('저장했어요'));
  }

  // ---------- 설정·백업 ----------
  function openSettings() {
    const n = Object.keys(db.entries).length;
    const pick = (act, attr, on, label, style) => `<button class="li med" data-act="${act}" ${attr} aria-pressed="${on}"${style ? ` style="${style}"` : ''}>
      <span class="lk">${label}</span><span class="chk">✓</span></button>`;
    const meds = db.meds.length
      ? db.meds.map((m) => `<div class="li"><span class="lk">${esc(m.name)}<small>${esc(m.dose || '')}</small></span>
          <button class="txt dim" data-act="delMed" data-med="${esc(medKey(m))}">${T('삭제')}</button></div>`).join('')
      : `<div class="li"><span class="lv">${T('저장된 약이 없어요. 기록 화면에서 “+ 약 추가”로 넣을 수 있어요.')}</span></div>`;
    sheet.innerHTML = `<div class="sheet-in" style="padding-bottom:calc(var(--safe-b) + 30px)">
      <div class="sheet-top">
        <span class="txt"></span>
        <div class="st"><b>${T('설정')}</b><span>${F('기록 {0}일', n)}</span></div>
        <button class="txt strong" data-act="close">${T('완료')}</button>
      </div>

      <div class="sec">${T('언어 · Language')}</div>
      <section class="card list">${pick('lang', 'data-lang="ko"', !EN, '한국어')}${pick('lang', 'data-lang="en"', EN, 'English')}</section>

      <div class="sec">${T('글씨체')}</div>
      <section class="card list">${Object.keys(FONTS).map((k) => pick('font', `data-font="${k}"`, (db.settings.font || 'system') === k,
        `${FONTS[k][0]}<small>${T('가나다 123')}</small>`, `font-family:${esc(FONTS[k][1])}`)).join('')}</section>

      <div class="sec">${T('글씨 크기')}</div>
      <section class="card list">${Object.keys(SIZES).map((k) => pick('size', `data-size="${k}"`, (db.settings.size || 'm') === k,
        `<span style="font-size:${15 * SIZES[k][1]}px">${SIZES[k][0]}</span>`)).join('')}</section>

      <div class="sec">${T('백업')}</div>
      <section class="card list">
        <button class="li add" data-act="export">${T('백업 파일 내보내기')}</button>
        <button class="li add" data-act="import">${T('백업 파일 불러오기')}</button>
      </section>
      <p class="secnote">${T('기록은 이 아이폰 안에만 저장돼요. 폰을 바꾸거나 앱을 지우면 사라지니, 가끔 백업 파일을 만들어 “파일” 앱이나 iCloud에 넣어 두세요.')}</p>

      <div class="sec">${T('자주 먹는 약')}</div>
      <section class="card list">${meds}</section>

      <div class="sec">${T('홈 화면에 추가하는 방법')}</div>
      <section class="card"><ol class="steps">
        <li>${T('사파리에서 이 페이지를 엽니다.')}</li>
        <li>${T('아래쪽 공유 버튼(네모에 위쪽 화살표)을 누릅니다.')}</li>
        <li>${T('“홈 화면에 추가”를 누릅니다.')}</li>
      </ol></section>
      <p class="secnote">${DISCLAIMER} ${T('걱정되는 변화가 있으면 진료 때 이 기록을 보여 주며 이야기해 보세요.')}</p>
    </div>`;
    showSheet();
  }

  async function exportData() {
    const name = `tide-backup-${today()}.json`;
    const text = JSON.stringify(Object.assign({ app: 'tide', exportedAt: new Date().toISOString() }, db), null, 2);
    try {
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });   // 아이폰: 공유 창에서 “파일에 저장”
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;     // 사용자가 공유 창을 닫음
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(T('백업 파일을 만들었어요'));
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let inc;
      try { inc = JSON.parse(reader.result); } catch (e) { inc = null; }
      const ok = inc && typeof inc.entries === 'object' && inc.entries &&
        Object.values(inc.entries).every((e) => e && typeof e.mood === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''));
      if (!ok) { toast(T('이 앱의 백업 파일이 아니에요')); return; }
      migrate(inc);
      const n = Object.keys(inc.entries).length;
      if (!confirm(F('백업 파일에 {0}일치 기록이 있어요.\n지금 기록과 합칠까요? (같은 날짜는 더 최근에 수정한 쪽을 남겨요)', n))) return;
      Object.values(inc.entries).forEach((e) => {
        const cur = db.entries[e.date];
        if (!cur || (e.updatedAt || '') >= (cur.updatedAt || '')) db.entries[e.date] = e;
      });
      (Array.isArray(inc.meds) ? inc.meds : []).forEach((m) => {
        if (m && m.name && !db.meds.some((s) => medKey(s) === medKey(m))) db.meds.push({ name: String(m.name), dose: String(m.dose || '') });
      });
      if (!save()) return;
      render();
      openSettings();
      toast(F('{0}일치 기록을 불러왔어요', n));
    };
    reader.readAsText(file);
  }

  // ---------- 시트 열고 닫기 ----------
  function showSheet() { sheet.hidden = false; sheet.scrollTop = 0; document.body.classList.add('locked'); }
  function closeSheet() { sheet.hidden = true; sheet.innerHTML = ''; ui.draft = null; document.body.classList.remove('locked'); }

  // ---------- 이벤트 ----------
  const actions = {
    tab: (el) => { ui.tab = el.dataset.tab; window.scrollTo(0, 0); render(); },
    lang: (el) => { db.settings.lang = el.dataset.lang; if (save()) location.reload(); },
    size: (el) => { db.settings.size = el.dataset.size; save(); applyFont(); render(); openSettings(); },
    font: (el) => { db.settings.font = el.dataset.font; save(); applyFont(); openSettings(); },
    mode: (el) => { trend.mode = el.dataset.mode; trend.pick = null; if (trend.anchor > today()) trend.anchor = today(); render(); },
    shift: (el) => { shiftTrend(Number(el.dataset.step)); render(); },
    pickDay: (el) => { const i = Number(el.dataset.i); trend.pick = trend.pick === i ? null : i; render(); },
    openDay: (el) => { ui.selected = el.dataset.date; ui.tab = 'today'; window.scrollTo(0, 0); render(); },
    pick: (el) => { ui.selected = el.dataset.date; render(); },
    week: (el) => {
      const next = addDays(ui.selected, 7 * Number(el.dataset.step));
      ui.selected = next > today() ? today() : next;
      render();
    },
    goToday: () => { ui.selected = today(); render(); },
    closeHint: () => { db.settings.hintClosed = true; save(); render(); },
    record: () => openRecord(ui.selected),
    settings: openSettings,
    close: closeSheet,
    save: saveEntry,
    deleteEntry: () => {
      if (!confirm(T('이 날 기록을 삭제할까요?'))) return;
      delete db.entries[ui.draft.date];
      save(); closeSheet(); render(); toast(T('삭제했어요'));
    },
    addMed: () => { ui.addingMed = !ui.addingMed; $('#meds').innerHTML = medsHtml(); if (ui.addingMed) $('#med-name').focus(); },
    saveMed: () => {
      const name = $('#med-name').value.trim(), dose = $('#med-dose').value.trim();
      if (!name) { toast(T('약 이름을 적어 주세요')); return; }
      const m = { name, dose };
      if (!db.meds.some((s) => medKey(s) === medKey(m))) { db.meds.push(m); save(); }
      if (!ui.draft.meds.some((s) => medKey(s) === medKey(m))) ui.draft.meds.push(m);
      ui.addingMed = false;
      $('#meds').innerHTML = medsHtml();
    },
    delMed: (el) => {
      db.meds = db.meds.filter((m) => medKey(m) !== el.dataset.med);
      save(); openSettings();
    },
    export: exportData,
    import: () => $('#importFile').click(),
  };

  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('button');
    if (!t) return;
    if (t.dataset.act) { actions[t.dataset.act](t); return; }
    const d = ui.draft;
    if (!d) return;
    const segEl = t.closest('.seg');
    if (segEl) {                                   // 단계 버튼
      const f = segEl.dataset.field, v = Number(t.dataset.v);
      const required = f === 'dep' || f === 'elev' || f === 'anx';
      const cur = f === 'tired' ? (d.tired == null ? null : +d.tired) : d[f];
      const next = (cur === v && !required) ? null : v;   // 선택 항목은 다시 누르면 해제
      d[f] = f === 'tired' ? (next == null ? null : !!next) : next;
      segEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === next)));
    } else if (t.dataset.flag) {                   // 단독 토글 (생리 중)
      d[t.dataset.flag] = !d[t.dataset.flag];
      t.setAttribute('aria-pressed', String(!!d[t.dataset.flag]));
    } else if (t.dataset.sign) {                   // 조건부 체크리스트
      d.signs[t.dataset.sign] = !d.signs[t.dataset.sign];
      t.setAttribute('aria-pressed', String(!!d.signs[t.dataset.sign]));
    } else if (t.dataset.med) {                    // 약 선택
      const k = t.dataset.med, i = d.meds.findIndex((m) => medKey(m) === k);
      if (i >= 0) d.meds.splice(i, 1);
      else { const m = db.meds.find((s) => medKey(s) === k); if (m) d.meds.push({ name: m.name, dose: m.dose }); }
      t.setAttribute('aria-pressed', String(i < 0));
    }
  });

  sheet.addEventListener('input', (ev) => {
    const d = ui.draft, el = ev.target;
    if (!d) return;
    const k = el.id.slice(2);
    if (SLIDERS.includes(k)) d[k] = Number(el.value);
    else if (el.id === 'f-bed') d.bed = el.value;
    else if (el.id === 'f-wake') d.wake = el.value;
    else if (el.id === 'f-note') d.note = el.value;
    else return;
    syncForm();
  });

  // 흐름 그래프에서 날짜 칸을 누르면 그날 값을 보여 준다
  app.addEventListener('click', (ev) => {
    const plot = ev.target.closest('.plot');
    if (!plot) return;
    const box = plot.querySelector('svg').getBoundingClientRect(), n = Number(plot.dataset.n);
    const i = Math.floor((ev.clientX - box.left) / (Number(plot.dataset.w) / n));
    if (i < 0 || i >= n || addDays(trendRange(trend.anchor).start, i) > today()) return;
    trend.pick = trend.pick === i ? null : i;
    render();
  });
  window.addEventListener('resize', () => { if (ui.tab === 'trend' && sheet.hidden) render(); });

  $('#importFile').addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (f) importData(f);
  });

  // 자정을 넘긴 뒤 앱으로 돌아오면 '오늘'을 새로 계산
  let lastDay = today();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || today() === lastDay) return;
    if (ui.selected === lastDay) ui.selected = today();
    lastDay = today();
    if (sheet.hidden) render();
  });

  // ---------- 시작 ----------
  applyFont();
  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
