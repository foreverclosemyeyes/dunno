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
    '먹었어요': 'Taken', '먹으면 누르기': 'Tap when taken', '화면 모드': 'Appearance', '자동 (아이폰 설정 따라감)': 'Automatic (follows iPhone)',
    '라이트': 'Light', '다크': 'Dark', '알림': 'Reminders', '기록 알림': 'Log reminder', '약 알림 1': 'Med reminder 1', '약 알림 2': 'Med reminder 2',
    '캘린더에 알림 추가': 'Add reminders to Calendar', 'Tide 기록하기': 'Tide: log today', '약 먹을 시간': 'Time to take your meds', '알림 시간을 먼저 정해 주세요': 'Set a reminder time first',
    '아이폰 웹앱은 정해진 시간에 스스로 알림을 보낼 수 없어요. 대신 매일 반복되는 캘린더 알림 파일을 만들어 드려요. 시간을 정하고 버튼을 누른 뒤 “캘린더에 추가”를 고르세요. 안 쓰는 알림은 시간을 비워 두면 돼요.': 'An iPhone web app cannot send scheduled notifications on its own. Instead this makes a calendar file with daily repeating alerts. Set the times, tap the button, then choose “Add to Calendar”. Leave a time empty to skip that reminder.',
    '평소와 비슷': 'About your usual', '평소보다 {0} 김': '{0} more than usual', '평소보다 {0} 짧음': '{0} less than usual',
    '색': 'Colour', '흑백': 'Black & white', '초록': 'Green', '노랑': 'Yellow', '파랑': 'Blue', '보라': 'Purple', '분홍': 'Pink',
    '기분·에너지·자신감이 낮은 날은 회색, 높을수록 고른 색으로 물들어요.': 'Mood, energy and confidence stay grey on low days and shift toward your chosen colour as they rise.',
    '약 저장': 'Save med', '먹는 약 등록하기': 'Add your medications', 
    '에너지와 수면 패턴이 달라지고 있어요. 지켜볼 만해요.': 'Your energy and sleep pattern are shifting. Worth keeping an eye on.',
    '들뜬 상태가 며칠째 이어지고 있어요. 진료 때 이야기해 보세요.': 'An elevated state has continued for several days. Consider mentioning it at your appointment.',
    '우울한 날이 2주 가까이 이어지고 있어요. 진료 때 이야기해 보세요.': 'Low days have continued for nearly two weeks. Consider mentioning it at your appointment.',
    '에너지가 높았던 날 전날 밤에는 다른 날보다 {0} 덜 잤어요.': 'On nights before high-energy days you slept {0} less than on other days.',
    '에너지가 높았던 날 전날 밤에는 다른 날보다 {0} 더 잤어요.': 'On nights before high-energy days you slept {0} more than on other days.',
    '기분이 가라앉은 날 전날 밤에는 다른 날보다 {0} 덜 잤어요.': 'On nights before low-mood days you slept {0} less than on other days.',
    '기분이 가라앉은 날 전날 밤에는 다른 날보다 {0} 더 잤어요.': 'On nights before low-mood days you slept {0} more than on other days.',
    '일어났을 때 피곤했던 날은 다른 날보다 {0} 덜 잤어요.': 'On days you woke up tired you had slept {0} less than on other days.',
    '일어났을 때 피곤했던 날은 다른 날보다 {0} 더 잤어요.': 'On days you woke up tired you had slept {0} more than on other days.',
    '카페인을 많이 마신 날 밤에는 다른 날보다 {0} 덜 잤어요.': 'On nights after high-caffeine days you slept {0} less than on other days.',
    '카페인을 많이 마신 날 밤에는 다른 날보다 {0} 더 잤어요.': 'On nights after high-caffeine days you slept {0} more than on other days.',
    '카페인을 많이 마신 날은 식욕이 낮은 편이에요.': 'Appetite tends to be lower on high-caffeine days.',
    '카페인을 많이 마신 날은 식욕이 높은 편이에요.': 'Appetite tends to be higher on high-caffeine days.',
    '생리 중인 날은 기분 평균이 다른 날보다 {0} 낮아요.': 'Average mood on period days is {0} lower than on other days.',
    '생리 중인 날은 기분 평균이 다른 날보다 {0} 높아요.': 'Average mood on period days is {0} higher than on other days.',
    '안정제·수면제를 체크한 날 밤에는 평균 {0}, 아닌 날 밤에는 평균 {1} 잤어요.': 'You slept {0} on average on nights after checking a sedative or sleep medication, and {1} on other nights.',
    '최근 7일 기분 평균이 그 전 7일보다 {0} 높아요.': 'Average mood over the last 7 days is {0} higher than the 7 days before.',
    '최근 7일 기분 평균이 그 전 7일보다 {0} 낮아요.': 'Average mood over the last 7 days is {0} lower than the 7 days before.',
    '최근 7일은 그 전 7일보다 하루 평균 {0} 덜 잤어요.': 'Over the last 7 days you slept {0} less per night than the 7 days before.',
    '최근 7일은 그 전 7일보다 하루 평균 {0} 더 잤어요.': 'Over the last 7 days you slept {0} more per night than the 7 days before.',
    '14일 중 {0}일': '{0} of 14 days', '인사이트': 'Insights', '기록에서 보이는 것': 'What your log shows',
    '기록이 7일 이상 쌓이면 패턴을 찾아 보여 드려요. 지금은 {0}일이에요.': 'Patterns appear once you have 7 or more days logged. You have {0} so far.',
    '아직 뚜렷한 패턴이 보이지 않아요. 기록이 더 쌓이면 다시 살펴볼게요.': 'No clear pattern yet. This will update as you log more.',
    '약 체크 (최근 14일)': 'Meds checked (last 14 days)', 'AI에게 물어보기': 'Ask an AI', '최근 4주 기록을 글로 복사': 'Copy the last 4 weeks as text',
    '복사한 글을 Claude나 ChatGPT 같은 AI 앱에 붙여 넣으면 기록 전체를 읽고 패턴을 정리해 줘요. 붙여 넣는 순간 그 기록은 해당 AI 서비스로 전송돼요.': 'Paste the copied text into an AI app such as Claude or ChatGPT and it can read the whole log and summarise patterns. Once pasted, that log is sent to that AI service.',
    '위 문장들은 내 기록을 계산한 관찰이에요. 원인이나 진단을 뜻하지 않아요.': 'These sentences are observations calculated from your log. They do not indicate a cause or a diagnosis.',
    '복사했어요. AI 앱에 붙여 넣으세요': 'Copied. Paste it into an AI app',
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
  // 0~10 각 숫자에 붙는 이름
  const NAMES = EN ? {
    mood: ['Very low', 'Low', 'Down', 'A bit down', 'Slightly flat', 'Neutral', 'Slightly good', 'Good', 'Elevated', 'Very elevated', 'Extremely elevated'],
    energy: ['Empty', 'Almost none', 'Drained', 'Tired', 'A bit low', 'Normal', 'A bit lively', 'Energetic', 'Overflowing', 'Very high', 'Hard to contain'],
    appetite: ['None', 'Almost none', 'Poor', 'Low', 'A bit low', 'Normal', 'Good', 'Hearty', 'Strong', 'Constant', 'Insatiable'],
    caffeine: ['None', 'A sip', 'A little', 'Half a cup', 'One cup', '1–2 cups', 'Two cups', '2–3 cups', '3+ cups', 'A lot', 'Too much'],
    conf: ['Very withdrawn', 'Withdrawn', 'Unsure', 'A bit unsure', 'Slightly unsure', 'Normal', 'Slightly confident', 'Confident', 'Very confident', 'Can do anything', 'Unstoppable'],
  } : {
    mood: ['바닥', '많이 우울', '우울', '가라앉음', '살짝 다운', '그럭저럭', '괜찮음', '좋음', '신남', '붕 뜸', '날아갈 듯'],
    energy: ['방전', '녹초', '기진맥진', '축 처짐', '좀 피곤', '보통', '괜찮음', '쌩쌩', '기운 넘침', '가만 못 있음', '멈출 수 없음'],
    appetite: ['전혀 없음', '거의 없음', '입맛 없음', '별로 안 당김', '조금 적음', '보통', '잘 먹음', '입맛 돎', '많이 당김', '계속 당김', '끝없이 당김'],
    caffeine: ['안 마심', '한 모금', '조금', '반 잔쯤', '한 잔', '한두 잔', '두 잔', '두세 잔', '세 잔 이상', '많이', '과하게'],
    conf: ['완전 쭈그러듦', '많이 위축', '주눅 듦', '소심해짐', '살짝 자신 없음', '보통', '할 만함', '자신 있음', '자신만만', '뭐든 될 듯', '무적'],
  };
  const nameOf = (key, v) => (v == null || !NAMES[key] ? '' : NAMES[key][Math.round(v)] || '');
  // 정신건강의학과에서 자주 쓰는 약 (상품명, 성분명). 약 추가할 때 고르는 목록일 뿐, 복용 안내가 아니다.
  const CATALOG = [
    ['알프람', '알프라졸람'], ['자낙스', '알프라졸람'], ['아티반', '로라제팜'], ['리보트릴', '클로나제팜'], ['바리움', '디아제팜'],
    ['스틸녹스', '졸피뎀'], ['부스파', '부스피론'], ['인데놀', '프로프라놀롤'], ['서카딘', '멜라토닌'],
    ['브린텔릭스', '보티옥세틴'], ['렉사프로', '에스시탈로프람'], ['졸로푸트', '설트랄린'], ['프로작', '플루옥세틴'], ['팍실', '파록세틴'],
    ['이팩사', '벤라팍신'], ['프리스틱', '데스벤라팍신'], ['심발타', '둘록세틴'], ['웰부트린', '부프로피온'], ['레메론', '미르타자핀'],
    ['트리티코', '트라조돈'], ['발독산', '아고멜라틴'],
    ['콘서타', '메틸페니데이트'], ['메디키넷', '메틸페니데이트'], ['페니드', '메틸페니데이트'], ['스트라테라', '아토목세틴'],
    ['리단', '리튬'], ['데파코트', '발프로산'], ['라믹탈', '라모트리진'], ['테그레톨', '카르바마제핀'],
    ['아빌리파이', '아리피프라졸'], ['쎄로켈', '쿠에티아핀'], ['자이프렉사', '올란자핀'], ['리스페달', '리스페리돈'], ['인베가', '팔리페리돈'],
    ['라투다', '루라시돈'], ['렉설티', '브렉스피프라졸'],
  ];
  // 잠에 영향을 주는 약 (안정제·수면제). 전날 이 약을 체크했으면 그날 밤 잠은 '약 먹고 잔 밤'으로 본다.
  const SEDATIVES = ['알프람', '자낙스', '아티반', '리보트릴', '바리움', '스틸녹스', '서카딘'];
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
  const blank = () => ({ version: 2, entries: {}, meds: [], taken: {}, settings: {} });
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
const durText = (min) => {
    if (min == null) return '–';
    const h = Math.floor(min / 60), m = min % 60;
    if (EN) return [h ? `${h}h` : '', m || !h ? `${m}m` : ''].filter(Boolean).join(' ');
    return [h ? `${h}시간` : '', m || !h ? `${m}분` : ''].filter(Boolean).join(' ');
  };
  const ampm = (t) => {
    if (!t) return '–';
    const [h, m] = t.split(':').map(Number);
return EN ? `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}` : `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(m)}`;
  };

  // 흑백: 기분이 낮을수록 어둡게, 높을수록 밝게
  function moodFill(v) {
    const c = toneRgb('mood', v);
    if (c) return `background:rgb(${c});color:${(c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 140 ? '#000' : '#fff'}`;
    const g = Math.round(55 + v * 20);
    return `background:rgb(${g},${g},${g});color:${v >= 5 ? '#000' : '#fff'}`;
  }

  // ---------- 색 모드: 낮으면 회색, 높을수록 그 항목의 색 ----------
  const isLight = () => document.documentElement.dataset.theme === 'light';
  // 색 하나로 통일: 기분·에너지·자신감 모두 낮으면 회색, 높을수록 고른 색. 수면은 색을 안 쓴다.
  const ACCENTS = {
    green: ['초록', [48, 209, 88], [36, 178, 72]],
    yellow: ['노랑', [255, 214, 10], [240, 176, 0]],
    blue: ['파랑', [90, 165, 255], [0, 122, 255]],
    purple: ['보라', [150, 130, 255], [110, 90, 220]],
    pink: ['분홍', [255, 110, 150], [235, 70, 120]],
  };
  const accentKey = () => (db.settings.color === 'off' ? null : ACCENTS[db.settings.color] ? db.settings.color : 'green');
  const TINTED = ['mood', 'energy', 'conf'];
  function toneRgb(key, v) {
    const k = accentKey();
    if (!k || v == null || !TINTED.includes(key)) return null;
    const light = isLight(), hue = ACCENTS[k][light ? 2 : 1], gray = light ? [174, 174, 178] : [99, 99, 102];
    const t = Math.max(0, Math.min(1, v / 10));
    return gray.map((g, i) => Math.round(g + (hue[i] - g) * t));
  }
  const tone = (key, v) => { const c = toneRgb(key, v); return c ? `rgb(${c})` : ''; };
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
    spark: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'),
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
      ${sel === t ? signals().map((m) => `<div class="card signal"><i></i><span>${m}</span></div>`).join('') : ''}
      <div class="weekbar">
        <button class="nav" data-act="week" data-step="-1" aria-label="${T('이전 주')}">‹</button>
        <div class="days">${days}</div>
        <button class="nav" data-act="week" data-step="1" aria-label="${T('다음 주')}" ${addDays(ws, 7) > t ? 'disabled' : ''}>›</button>
      </div>
      ${e ? tilesHtml(e) : emptyCard(sel === t)}
      ${medCard(sel)}
      ${e ? detailHtml(e) : ''}
      ${sel !== t ? `<button class="btn plain" data-act="goToday">${T('오늘로 돌아가기')}</button>` : ''}
            <p class="foot">${DISCLAIMER}</p>`;
  }

  function emptyCard(isToday) {
    return `<section class="card empty"><div class="e1">${isToday ? T('오늘 기록이 아직 없어요') : T('이 날은 기록이 없어요')}</div>
      <div>${T('10초면 끝나요.')}</div>
      <button class="btn" data-act="record">${T('기록하기')}</button></section>`;
  }

  // 가운데(보통)에서 얼마나 위·아래인지 보여 주는 막대. pos는 0~1, 0.5가 가운데
  const level = (pos) => {
    const p = Math.max(0, Math.min(1, pos)) * 100, lo = Math.min(50, p), w = Math.abs(p - 50);
    return `<div class="lvl" aria-hidden="true"><i style="left:${lo.toFixed(1)}%;width:${w.toFixed(1)}%"></i><b style="left:${p.toFixed(1)}%"></b></div>`;
  };
  const tile = (label, word, num, pos, sub, color) => `<div class="tile"${color ? ` style="--tone:${color}"` : ''}><div class="tl"><span>${label}</span><span>${num == null ? '' : num}</span></div>
    <div class="word">${word}</div>${pos == null ? '' : level(pos)}${sub ? `<div class="ts">${sub}</div>` : ''}</div>`;
  const bars = (v) => `<span class="bars">${[1, 2, 3, 4].map((i) => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span>`;

  // 그날 먹은 약: 기록이 있으면 기록 안에, 아직 없으면 따로 적어 둔다
  const medsFor = (date) => (db.entries[date] ? db.entries[date].meds || [] : db.taken[date] || []);
  function toggleMed(date, key) {
    const list = medsFor(date).slice(), i = list.findIndex((m) => medKey(m) === key);
    if (i >= 0) list.splice(i, 1);
    else { const m = db.meds.find((x) => medKey(x) === key); if (m) list.push({ name: m.name, dose: m.dose }); }
    if (db.entries[date]) { db.entries[date].meds = list; db.entries[date].updatedAt = new Date().toISOString(); } else db.taken[date] = list;
    save();
  }
  const aided = (e) => medsFor(addDays(e.date, -1)).some((m) => SEDATIVES.includes(m.name));
  function medCard(date) {
    if (!db.meds.length) return `<section class="card list"><button class="li add" data-act="medSetup">${IC.pill}&nbsp; ${T('먹는 약 등록하기')}</button></section>`;
    const taken = new Set(medsFor(date).map(medKey));
    return `<section class="card list">${db.meds.map((m) => `<button class="li med" data-act="takeMed" data-med="${esc(medKey(m))}" aria-pressed="${taken.has(medKey(m))}">
      <span class="lk">${IC.pill}${esc(m.name)}${m.dose ? `<small>${esc(m.dose)}</small>` : ''}</span><span class="chk">${taken.has(medKey(m)) ? T('먹었어요') : T('먹으면 누르기')}</span></button>`).join('')}</section>`;
  }

  function tilesHtml(e) {
    const sleepBig = e.sleepMin == null ? '–'
      : `${Math.floor(e.sleepMin / 60)}<small>${T('시간')}</small>${e.sleepMin % 60 ? ` ${e.sleepMin % 60}<small>${T('분')}</small>` : ''}`;
    // 수면은 내 평균과 비교 (기록이 3일 이상 쌓였을 때)
    const sleeps = Object.values(db.entries).map((x) => x.sleepMin).filter((x) => x != null);
    let pos = null, sub = '';
    if (e.sleepMin != null && sleeps.length >= 3) {
      const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length, diff = Math.round(e.sleepMin - avg);
      pos = 0.5 + diff / 360;   // 막대 끝에서 끝이 ±3시간
      sub = Math.abs(diff) < 10 ? T('평소와 비슷') : F(diff > 0 ? '평소보다 {0} 김' : '평소보다 {0} 짧음', durText(Math.abs(diff)));
    }
    return `<div class="tiles">
        ${tile(T('기분'), nameOf('mood', e.mood), e.mood, e.mood / 10, '', tone('mood', e.mood))}
        ${tile(T('에너지'), nameOf('energy', e.energy), e.energy, e.energy / 10, '', tone('energy', e.energy))}
        ${e.conf == null ? tile(T('자신감'), '–') : tile(T('자신감'), nameOf('conf', e.conf), e.conf, e.conf / 10, '', tone('conf', e.conf))}
        ${tile(T('수면'), sleepBig, null, pos, sub)}
      </div>`;
  }

  function detailHtml(e) {
    const signs = SIGNS.filter(([k]) => e.signs && e.signs[k]).map(([, label]) => label);
    const extra = (e.meds || []).filter((m) => !db.meds.some((x) => medKey(x) === medKey(m))).map((x) => esc(x.name) + (x.dose ? ` ${esc(x.dose)}` : '')).join(', ');
    const ten = (key, v) => `${nameOf(key, v)}<span class="of"> ${v}</span>`;
    const sym = (label, v) => (v ? li(label, `${LEVELS[v]}${bars(v)}`) : '');
    return `<section class="card list">
        ${sym(T('우울'), e.dep)}${sym(T('고조'), e.elev)}${sym(T('불안'), e.anx)}
        ${e.tired ? li(`${IC.moon}${T('일어났을 때')}`, T('피곤')) : ''}
        ${e.period ? li(`${IC.drop}${T('생리')}`, T('생리 중')) : ''}
        ${e.appetite != null ? li(`${IC.fork}${T('식욕')}`, ten('appetite', e.appetite)) : ''}
        ${e.caffeine != null ? li(`${IC.coffee}${T('카페인')}`, ten('caffeine', e.caffeine)) : ''}
        ${extra ? li(`${IC.pill}${T('약')}`, extra) : ''}
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
    const C = document.documentElement.dataset.theme === 'light'
      ? { ink: '#0b0b0c', ring: '#fff', grid: 'rgba(0,0,0,.08)', muted: '#6b6b70', faint: '#a0a0a6', shade: ['rgba(0,0,0,.06)', '#c7c7cc', '#8e8e93', '#48484a', '#000'] }
      : { ink: '#fff', ring: '#1c1c1e', grid: 'rgba(255,255,255,.1)', muted: '#9a9aa0', faint: '#6a6a70', shade: ['rgba(255,255,255,.08)', '#5a5a5e', '#8e8e93', '#c7c7cc', '#fff'] };
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
      return `<text x="${cx(i).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="${(10 * FS).toFixed(1)}" fill="${d === t ? C.ink : C.muted}">${isWeek ? WD()[dt.getDay()] : dt.getDate()}</text>`;
    }).join('');
    const grid = (ticks, y) => ticks.map(([v, label]) => `<line x1="0" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${C.grid}"/>
      <text x="${W + 6}" y="${(y(v) + 3.5).toFixed(1)}" font-size="${(10 * FS).toFixed(1)}" fill="${C.faint}">${label}</text>`).join('');
    const plot = (inner) => `<div class="plot" data-n="${r.n}" data-w="${W}"><svg width="${W + AX}" height="${H}">${inner}${xLabels}</svg></div>`;

    // 카드 머리: 평소에는 평균, 날짜를 누르면 그날 값
    const fmtSleep = (m) => `${Math.floor(m / 60)}<small>${T('시간')}</small> ${Math.round(m % 60)}<small>${T('분')}</small>`;
    const head = (key, icon, name, isSleep) => {
      let big, sub;
      if (pickDate) {
        const v = pickE ? pickE[key] : null;
        big = v == null ? '–' : isSleep ? fmtSleep(v) : v;
        sub = nameOf(key, v) || pickLabel;
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
      const y = (v) => TOP + (1 - v / 10) * (BOT - TOP), ink = tone(key, 10) || C.ink;
      const pts = [];
      days.forEach((e, i) => { if (e && e[key] != null) pts.push([cx(i), y(e[key]), i]); });
      let out = `<defs><linearGradient id="g-${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ink}" stop-opacity=".26"/><stop offset="1" stop-color="${ink}" stop-opacity="0"/></linearGradient></defs>`;
      out += grid([[0, '0'], [5, '5'], [10, '10']], y);
      if (pts.length > 1) {
        const d = smoothPath(pts, TOP, BOT);
        out += `<path d="${d}L${pts[pts.length - 1][0].toFixed(1)},${BOT}L${pts[0][0].toFixed(1)},${BOT}Z" fill="url(#g-${key})"/>
          <path d="${d}" fill="none" stroke="${ink}" stroke-width="${isWeek ? 2.5 : 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      if (isWeek || pts.length === 1) pts.forEach((p) => { out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="${ink}" stroke="${C.ring}" stroke-width="2"/>`; });
      if (pick != null) {
        out += `<line x1="${cx(pick).toFixed(1)}" x2="${cx(pick).toFixed(1)}" y1="${TOP - 4}" y2="${BOT}" stroke="${C.muted}"/>`;
        const p = pts.find((q) => q[2] === pick);
        if (p) out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5.5" fill="${ink}" stroke="${C.ring}" stroke-width="2.5"/>`;
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
          fill="${pick == null || pick === i ? C.ink : C.faint}"/>`;
      });
      if (all != null) out += `<line x1="0" x2="${W}" y1="${y(all).toFixed(1)}" y2="${y(all).toFixed(1)}" stroke="${C.muted}" stroke-dasharray="2 4" stroke-linecap="round"/>`;
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
    const SHADE = ['${C.grid}', '#5a5a5e', C.muted, '#c7c7cc', C.ink];
    const strip = (name, cell) => `<div class="srow"><svg width="${W}" height="18">${days.map((e, i) => (e ? cell(e, i) : '')).join('')}${
      pick == null ? '' : `<rect x="${(col * pick).toFixed(1)}" y="0" width="${col.toFixed(1)}" height="18" rx="4" fill="none" stroke="${C.ink}"/>`}</svg><span>${name}</span></div>`;
    const gap = isWeek ? 4 : 1.5;
    const level = (key) => (e, i) => `<rect x="${(col * i + gap / 2).toFixed(1)}" y="2" width="${(col - gap).toFixed(1)}" height="14" rx="${isWeek ? 5 : 3}" fill="${SHADE[e[key] || 0]}"/>`;
    const dot = (test) => (e, i) => (test(e) ? `<circle cx="${cx(i).toFixed(1)}" cy="9" r="${isWeek ? 4.5 : Math.min(3, col / 2 - 1)}" fill="${C.ink}"/>` : '');
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

  // ---------- 초기 신호 · 인사이트 (전부 이 폰 안에서 계산) ----------
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const sortedEntries = () => Object.keys(db.entries).sort().map((k) => db.entries[k]);

  function signals() {
    const out = [], t = today();
    const run = [];   // 오늘(없으면 어제)부터 거꾸로, 하루도 안 빠지고 이어진 기록
    for (let d = db.entries[t] ? t : addDays(t, -1); db.entries[d]; d = addDays(d, -1)) run.push(db.entries[d]);
    const count = (test) => { let n = 0; while (n < run.length && test(run[n])) n++; return n; };
    const sleeps = Object.values(db.entries).map((e) => e.sleepMin).filter((x) => x != null);
    const hi = count((e) => e.energy >= 7 || e.elev >= 3);
    if (hi >= 2 && sleeps.length >= 5) {
      const recent = run.slice(0, hi).map((e) => e.sleepMin).filter((x) => x != null);
      if (recent.length && avg(recent) < avg(sleeps) - 20) out.push(T('에너지와 수면 패턴이 달라지고 있어요. 지켜볼 만해요.'));
    }
    if (count((e) => e.elev >= 3) >= 4) out.push(T('들뜬 상태가 며칠째 이어지고 있어요. 진료 때 이야기해 보세요.'));
    if (count((e) => e.dep >= 3) >= 12) out.push(T('우울한 날이 2주 가까이 이어지고 있어요. 진료 때 이야기해 보세요.'));
    return out;
  }

  function insights() {
    const all = sortedEntries(), out = [];
    if (all.length < 7) return out;
    const sl = all.filter((e) => e.sleepMin != null);
    const sleepOf = (list) => avg(list.map((e) => e.sleepMin));
    // 두 묶음의 수면 차이를 문장으로 (각 3일 이상, 20분 이상 차이 날 때만)
    const sleepGap = (a, b, less, more) => {
      if (a.length < 3 || b.length < 3) return;
      const d = Math.round(sleepOf(a) - sleepOf(b));
      if (Math.abs(d) >= 20) out.push(F(d < 0 ? less : more, durText(Math.abs(d))));
    };
    sleepGap(sl.filter((e) => e.energy >= 7), sl.filter((e) => e.energy < 7),
      '에너지가 높았던 날 전날 밤에는 다른 날보다 {0} 덜 잤어요.', '에너지가 높았던 날 전날 밤에는 다른 날보다 {0} 더 잤어요.');
    sleepGap(sl.filter((e) => e.mood <= 3), sl.filter((e) => e.mood > 3),
      '기분이 가라앉은 날 전날 밤에는 다른 날보다 {0} 덜 잤어요.', '기분이 가라앉은 날 전날 밤에는 다른 날보다 {0} 더 잤어요.');
    sleepGap(sl.filter((e) => e.tired), sl.filter((e) => !e.tired),
      '일어났을 때 피곤했던 날은 다른 날보다 {0} 덜 잤어요.', '일어났을 때 피곤했던 날은 다른 날보다 {0} 더 잤어요.');
    // 카페인 많이 마신 날 → 그날 밤 잠 (다음 날 기록의 수면)
    const night = (e) => db.entries[addDays(e.date, 1)];
    const caf = all.filter((e) => e.caffeine != null && night(e) && night(e).sleepMin != null);
    sleepGap(caf.filter((e) => e.caffeine >= 7).map(night), caf.filter((e) => e.caffeine < 7).map(night),
      '카페인을 많이 마신 날 밤에는 다른 날보다 {0} 덜 잤어요.', '카페인을 많이 마신 날 밤에는 다른 날보다 {0} 더 잤어요.');
    const ap = all.filter((e) => e.caffeine != null && e.appetite != null), apHi = ap.filter((e) => e.caffeine >= 7), apLo = ap.filter((e) => e.caffeine < 7);
    if (apHi.length >= 3 && apLo.length >= 3) {
      const d = avg(apHi.map((e) => e.appetite)) - avg(apLo.map((e) => e.appetite));
      if (Math.abs(d) >= 1) out.push(T(d < 0 ? '카페인을 많이 마신 날은 식욕이 낮은 편이에요.' : '카페인을 많이 마신 날은 식욕이 높은 편이에요.'));
    }
    const per = all.filter((e) => e.period), non = all.filter((e) => !e.period);
    if (per.length >= 3 && non.length >= 3) {
      const d = avg(per.map((e) => e.mood)) - avg(non.map((e) => e.mood));
      if (Math.abs(d) >= 0.8) out.push(F(d < 0 ? '생리 중인 날은 기분 평균이 다른 날보다 {0} 낮아요.' : '생리 중인 날은 기분 평균이 다른 날보다 {0} 높아요.', Math.abs(d).toFixed(1)));
    }
    const aid = sl.filter(aided), noAid = sl.filter((e) => !aided(e));
    if (aid.length >= 2 && noAid.length >= 2) out.push(F('안정제·수면제를 체크한 날 밤에는 평균 {0}, 아닌 날 밤에는 평균 {1} 잤어요.', durText(Math.round(sleepOf(aid))), durText(Math.round(sleepOf(noAid)))));
    // 최근 7일과 그 전 7일
    const t = today(), span = (from, to) => all.filter((e) => e.date > addDays(t, -from) && e.date <= addDays(t, -to));
    const now = span(7, 0), was = span(14, 7);
    if (now.length >= 3 && was.length >= 3) {
      const d = avg(now.map((e) => e.mood)) - avg(was.map((e) => e.mood));
      if (Math.abs(d) >= 1) out.push(F(d > 0 ? '최근 7일 기분 평균이 그 전 7일보다 {0} 높아요.' : '최근 7일 기분 평균이 그 전 7일보다 {0} 낮아요.', Math.abs(d).toFixed(1)));
      const a = now.filter((e) => e.sleepMin != null), b = was.filter((e) => e.sleepMin != null);
      if (a.length >= 3 && b.length >= 3) {
        const ds2 = Math.round(sleepOf(a) - sleepOf(b));
        if (Math.abs(ds2) >= 30) out.push(F(ds2 < 0 ? '최근 7일은 그 전 7일보다 하루 평균 {0} 덜 잤어요.' : '최근 7일은 그 전 7일보다 하루 평균 {0} 더 잤어요.', durText(Math.abs(ds2))));
      }
    }
    return out;
  }

  // AI 앱에 붙여 넣을 수 있는 최근 4주 요약 글
  function aiSummary() {
    const t = today(), lines = [];
    for (let i = 27; i >= 0; i--) {
      const d = addDays(t, -i), e = db.entries[d], meds = medsFor(d).map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ''}`).join(', ');
      if (!e) { if (meds) lines.push(`${d} | (기록 없음) | 약: ${meds}`); continue; }
      const signs = SIGNS.filter(([k]) => e.signs && e.signs[k]).map(([, l]) => l).join(', ');
      lines.push([d, `기분 ${e.mood}`, `에너지 ${e.energy}`, e.conf != null ? `자신감 ${e.conf}` : '', `우울 ${e.dep}/4`, `고조 ${e.elev}/4`, `불안 ${e.anx}/4`,
        e.sleepMin != null ? `수면 ${Math.floor(e.sleepMin / 60)}시간 ${e.sleepMin % 60}분${aided(e) ? '(전날 안정제·수면제 복용)' : ''}` : '', e.tired ? '기상 시 피곤' : '', e.period ? '생리 중' : '',
        e.appetite != null ? `식욕 ${e.appetite}` : '', e.caffeine != null ? `카페인 ${e.caffeine}` : '', `약: ${meds || '없음'}`, signs ? `체크: ${signs}` : '', e.note ? `메모: ${e.note}` : '']
        .filter(Boolean).join(' | '));
    }
    return `아래는 내가 직접 적은 최근 4주 기분·수면·복약 기록이야 (기분·에너지·자신감·식욕·카페인은 0~10, 우울·고조·불안은 0~4).
진단은 하지 말고, 눈에 띄는 패턴과 진료 때 의사에게 이야기하거나 물어볼 만한 점을 쉬운 말로 정리해 줘.

${lines.join('\n') || '(기록 없음)'}`;
  }

  function viewInsight() {
    const n = Object.keys(db.entries).length, list = insights(), sig = signals(), t = today();
    const adher = db.meds.map((m) => {
      let c = 0;
      for (let i = 0; i < 14; i++) if (medsFor(addDays(t, -i)).some((x) => medKey(x) === medKey(m))) c++;
      return li(`${IC.pill}${esc(m.name)}${m.dose ? `<small>${esc(m.dose)}</small>` : ''}`, F('14일 중 {0}일', c));
    }).join('');
    app.innerHTML = `
      <header class="top"><div><div class="over">${F('기록 {0}일', n)}</div><h1>${T('인사이트')}</h1></div></header>
      ${sig.map((m) => `<div class="card signal"><i></i><span>${m}</span></div>`).join('')}
      <div class="sec">${T('기록에서 보이는 것')}</div>
      <section class="card list">${list.length ? list.map((x) => `<div class="li say">${x}</div>`).join('')
        : `<div class="li say mut">${n < 7 ? F('기록이 7일 이상 쌓이면 패턴을 찾아 보여 드려요. 지금은 {0}일이에요.', n) : T('아직 뚜렷한 패턴이 보이지 않아요. 기록이 더 쌓이면 다시 살펴볼게요.')}</div>`}</section>
      ${adher ? `<div class="sec">${T('약 체크 (최근 14일)')}</div><section class="card list">${adher}</section>` : ''}
      <div class="sec">${T('AI에게 물어보기')}</div>
      <section class="card list"><button class="li add" data-act="copyAi">${IC.spark}&nbsp; ${T('최근 4주 기록을 글로 복사')}</button></section>
      <p class="secnote">${T('복사한 글을 Claude나 ChatGPT 같은 AI 앱에 붙여 넣으면 기록 전체를 읽고 패턴을 정리해 줘요. 붙여 넣는 순간 그 기록은 해당 AI 서비스로 전송돼요.')}</p>
      <p class="foot">${T('위 문장들은 내 기록을 계산한 관찰이에요. 원인이나 진단을 뜻하지 않아요.')}</p>`;
  }

  function render() {
    ({ trend: viewTrend, insight: viewInsight }[ui.tab] || viewToday)();
    app.insertAdjacentHTML('beforeend', `<nav class="tabbar">
      <button data-act="tab" data-tab="today" aria-pressed="${ui.tab === 'today'}">${IC.today}<span>${T('오늘')}</span></button>
      <button data-act="tab" data-tab="trend" aria-pressed="${ui.tab === 'trend'}">${IC.chart}<span>${T('흐름')}</span></button>
      <button data-act="tab" data-tab="insight" aria-pressed="${ui.tab === 'insight'}">${IC.spark}<span>${T('인사이트')}</span></button></nav>`);
  }

  const themeQuery = matchMedia('(prefers-color-scheme: light)');
  function applyTheme() {
    const pref = db.settings.theme || 'auto', light = pref === 'light' || (pref === 'auto' && themeQuery.matches);
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    const meta = $('meta[name=theme-color]');
    if (meta) meta.content = light ? '#eef0f3' : '#000000';
  }
  themeQuery.addEventListener('change', () => { applyTheme(); if (sheet.hidden) render(); });

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
      tired: false, period: false, appetite: 5, caffeine: 0, meds: (db.taken[date] || []).slice(), note: '', signs: {},
    };
  }

  const medKey = (m) => `${m.name}|${m.dose || ''}`;
  const seg = (field, labels, value) => `<div class="seg" data-field="${field}">${
    labels.map((l, i) => `<button type="button" data-v="${i}" aria-pressed="${value === i}">${l}</button>`).join('')}</div>`;
  const SLIDERS = ['mood', 'energy', 'conf', 'appetite', 'caffeine'];
  const slider = (id, icon, label, v, lo, hi) => `<div class="li sl">
    <div class="slh"><span class="lk"><span id="i-${id}">${icon}</span>${label}</span><span class="slv"><span class="nm" id="n-${id}"></span><b id="v-${id}">${v}</b></span></div>
    <input type="range" id="f-${id}" min="0" max="10" step="1" value="${v}" style="--v:${v / 10}" aria-label="${label}">
    <div class="ends"><span>${lo}</span><span>${hi}</span></div></div>`;
  const sw = (attr, on, label, icon) => `<button type="button" class="li sw" ${attr} aria-pressed="${!!on}"><span class="lk">${icon || ''}${label}</span><i></i></button>`;

  // 약 추가: 이름을 치면 목록에서 골라 넣을 수 있다
  function sugHtml(q) {
    const have = new Set(db.meds.map((m) => m.name));
    const hit = CATALOG.filter(([b, g]) => !have.has(b) && (!q || b.includes(q) || g.includes(q))).slice(0, q ? 12 : 10);
    return hit.map(([b, g]) => `<button type="button" class="sug" data-act="pickSug" data-name="${esc(b)}">${esc(b)}<small>${esc(g)}</small></button>`).join('');
  }
  function medAddHtml() {
    return ui.addingMed
      ? `<div class="li med-new">
           <input type="text" id="med-name" placeholder="${T('약 이름')}" autocomplete="off" maxlength="30">
           <input type="text" id="med-dose" placeholder="${T('용량 (예: 300mg)')}" autocomplete="off" maxlength="20">
           <div class="sugs" id="med-sug">${sugHtml('')}</div>
           <button type="button" class="btn gray" data-act="saveMed">${T('약 저장')}</button>
         </div>`
      : `<button type="button" class="li add" data-act="addMed">${T('+ 약 추가')}</button>`;
  }
  function medsHtml() {
    const d = ui.draft;
    const taken = new Set(d.meds.map(medKey));
    const all = db.meds.concat(d.meds.filter((m) => !db.meds.some((x) => medKey(x) === medKey(m))));
    const rows = all.map((m) => `<button type="button" class="li med" data-med="${esc(medKey(m))}" aria-pressed="${taken.has(medKey(m))}">
      <span class="lk">${esc(m.name)}${m.dose ? `<small>${esc(m.dose)}</small>` : ''}</span><span class="chk">✓</span></button>`).join('');
    return rows + medAddHtml();
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
      $(`#n-${k}`).textContent = nameOf(k, d[k]);
      const col = tone(k, d[k]);
      if (col) $(`#f-${k}`).style.setProperty('--tone', col); else $(`#f-${k}`).style.removeProperty('--tone');
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
    delete db.taken[d.date];
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
      : '';
    sheet.innerHTML = `<div class="sheet-in" style="padding-bottom:calc(var(--safe-b) + 30px)">
      <div class="sheet-top">
        <span class="txt"></span>
        <div class="st"><b>${T('설정')}</b><span>${F('기록 {0}일', n)}</span></div>
        <button class="txt strong" data-act="close">${T('완료')}</button>
      </div>

      <div class="sec">${T('언어 · Language')}</div>
      <section class="card list">${pick('lang', 'data-lang="ko"', !EN, '한국어')}${pick('lang', 'data-lang="en"', EN, 'English')}</section>

      <div class="sec">${T('화면 모드')}</div>
      <section class="card list">${[['auto', T('자동 (아이폰 설정 따라감)')], ['light', T('라이트')], ['dark', T('다크')]].map(([k, label]) =>
        pick('theme', `data-theme-pick="${k}"`, (db.settings.theme || 'auto') === k, label)).join('')}</section>

      <div class="sec">${T('색')}</div>
      <section class="card list">${pick('color', 'data-color-pick="off"', !accentKey(), T('흑백'))}${Object.keys(ACCENTS).map((k) =>
        pick('color', `data-color-pick="${k}"`, accentKey() === k, `<i class="sw-dot" style="background:rgb(${ACCENTS[k][isLight() ? 2 : 1]})"></i>${T(ACCENTS[k][0])}`)).join('')}</section>
      <p class="secnote">${T('기분·에너지·자신감이 낮은 날은 회색, 높을수록 고른 색으로 물들어요.')}</p>

      <div class="sec">${T('알림')}</div>
      <section class="card list">
        <label class="li"><span class="lk">${T('기록 알림')}</span><input type="time" id="r-log" value="${esc(remind().log || '')}"></label>
        <label class="li"><span class="lk">${T('약 알림 1')}</span><input type="time" id="r-med1" value="${esc(remind().med1 || '')}"></label>
        <label class="li"><span class="lk">${T('약 알림 2')}</span><input type="time" id="r-med2" value="${esc(remind().med2 || '')}"></label>
        <button class="li add" data-act="ics">${T('캘린더에 알림 추가')}</button>
      </section>
      <p class="secnote">${T('아이폰 웹앱은 정해진 시간에 스스로 알림을 보낼 수 없어요. 대신 매일 반복되는 캘린더 알림 파일을 만들어 드려요. 시간을 정하고 버튼을 누른 뒤 “캘린더에 추가”를 고르세요. 안 쓰는 알림은 시간을 비워 두면 돼요.')}</p>

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

      <div class="sec" id="sec-meds">${T('자주 먹는 약')}</div>
      <section class="card list">${meds}${medAddHtml()}</section>

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

  const remind = () => (db.settings.remind || (db.settings.remind = { log: '21:30', med1: '', med2: '' }));
  // 매일 반복되는 캘린더 알림 파일(.ics)을 만든다
  function makeIcs() {
    const r = remind(), day = today().replace(/-/g, '');
    const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
    const url = location.href.split('#')[0];
    const ev = (uid, time, title) => (time ? ['BEGIN:VEVENT', `UID:${uid}@tide-app`, `DTSTAMP:${stamp}`, `DTSTART:${day}T${time.replace(':', '')}00`,
      'DURATION:PT5M', 'RRULE:FREQ=DAILY', `SUMMARY:${title}`, `URL:${url}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'] : []);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tide//Reminders//KO', 'CALSCALE:GREGORIAN',
      ...ev('log', r.log, T('Tide 기록하기')), ...ev('med1', r.med1, T('약 먹을 시간')), ...ev('med2', r.med2, T('약 먹을 시간')), 'END:VCALENDAR'].join('\r\n');
  }

  // 파일 건네기: 아이폰에서는 공유 창, 그 밖에는 내려받기
  async function giveFile(name, text, type) {
    try {
      const file = new File([text], name, { type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return true; }
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return true;
  }

  async function exportData() {
    const name = `tide-backup-${today()}.json`;
    const text = JSON.stringify(Object.assign({ app: 'tide', exportedAt: new Date().toISOString() }, db), null, 2);
    if (await giveFile(name, text, 'application/json')) toast(T('백업 파일을 만들었어요'));
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
      Object.keys(inc.taken || {}).forEach((k) => { if (!db.taken[k] && !db.entries[k] && Array.isArray(inc.taken[k])) db.taken[k] = inc.taken[k]; });
      if (!save()) return;
      render();
      openSettings();
      toast(F('{0}일치 기록을 불러왔어요', n));
    };
    reader.readAsText(file);
  }

  // ---------- 시트 열고 닫기 ----------
  function showSheet() { sheet.hidden = false; sheet.scrollTop = 0; document.body.classList.add('locked'); }
  function closeSheet() { ui.addingMed = false; sheet.hidden = true; sheet.innerHTML = ''; ui.draft = null; document.body.classList.remove('locked'); }

  // ---------- 이벤트 ----------
  const actions = {
    tab: (el) => { ui.tab = el.dataset.tab; window.scrollTo(0, 0); render(); },
    color: (el) => { db.settings.color = el.dataset.colorPick; save(); applyTheme(); render(); openSettings(); },
    theme: (el) => { db.settings.theme = el.dataset.themePick; save(); applyTheme(); render(); openSettings(); },
    takeMed: (el) => { toggleMed(ui.selected, el.dataset.med); render(); },
    ics: async () => {
      const r = remind();
      if (!r.log && !r.med1 && !r.med2) { toast(T('알림 시간을 먼저 정해 주세요')); return; }
      await giveFile('tide-reminders.ics', makeIcs(), 'text/calendar');
    },
    copyAi: async () => {
      const text = aiSummary();
      try { await navigator.clipboard.writeText(text); }
      catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (err) { /* 복사 불가 */ }
        ta.remove();
      }
      toast(T('복사했어요. AI 앱에 붙여 넣으세요'));
    },
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
    addMed: () => {
      ui.addingMed = !ui.addingMed;
      if (ui.draft) $('#meds').innerHTML = medsHtml(); else { const y = sheet.scrollTop; openSettings(); sheet.scrollTop = y; }
      if (ui.addingMed) $('#med-name').focus();
    },
    pickSug: (el) => { $('#med-name').value = el.dataset.name; $('#med-sug').innerHTML = ''; $('#med-dose').focus(); },
    medSetup: () => { ui.addingMed = true; openSettings(); $('#sec-meds').scrollIntoView(); },
    saveMed: () => {
      const name = $('#med-name').value.trim(), dose = $('#med-dose').value.trim();
      if (!name) { toast(T('약 이름을 적어 주세요')); return; }
      const m = { name, dose };
      if (!db.meds.some((x) => medKey(x) === medKey(m))) { db.meds.push(m); save(); }
      ui.addingMed = false;
      if (ui.draft) {
        if (!ui.draft.meds.some((x) => medKey(x) === medKey(m))) ui.draft.meds.push(m);
        $('#meds').innerHTML = medsHtml();
      } else { const y = sheet.scrollTop; render(); openSettings(); sheet.scrollTop = y; }
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
    if (el.id === 'med-name') { $('#med-sug').innerHTML = sugHtml(el.value.trim()); return; }
    if (el.id.startsWith('r-')) { remind()[el.id.slice(2)] = el.value; save(); return; }
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
  applyTheme();
  applyFont();
  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
