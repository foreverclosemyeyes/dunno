// 고정 값: 단계 이름, 체크리스트, 약 목록, 음료, 글씨체
import { EN, T } from './i18n.js';

export const LEVELS = [T('없음'), T('약간'), T('보통'), T('높음'), T('매우 높음')];
// si(죽고 싶은 생각)는 진료 때 꼭 필요한 정보라 다른 증상과 같은 5단계로 적는다. 문구는 담담하게, 판단 없이.
// "고조(들뜸)"는 기분·에너지와 겹쳐서 뺐다 (2026-11-13). 예전 기록에 남아 있는 값(elev)은 쓰지 않고, 그 날을 다시 저장하면 빠진다.
export const SYMPTOMS = [['dep', T('우울')], ['anx', T('불안')], ['si', T('죽고 싶은 생각')]];
// 기록 항목: 설정에서 하나씩 끌 수 있다 (끄면 기록·오늘·흐름·진료 화면에서 안 보인다. 적어 둔 값은 지우지 않는다).
export const ITEMS = [
  ['mood', T('기분')], ['energy', T('에너지')], ['conf', T('자신감')], ['sleep', T('수면')],
  ['dep', T('우울')], ['anx', T('불안')], ['si', T('죽고 싶은 생각')],
  ['period', T('생리')], ['appetite', T('식욕')], ['caffeine', T('카페인')], ['meds', T('약')],
  ['fx', T('부작용')], ['tags', T('술 · 운동')], ['note', T('메모')],
];
// 부작용: 그날 겪은 것을 눌러서 적는다 (entry.fx = { 열쇠: true })
export const SIDE_EFFECTS = [
  ['sleepy', T('졸림')], ['nausea', T('메스꺼움')], ['dizzy', T('어지러움')], ['tremor', T('손 떨림')], ['drymouth', T('입 마름')], ['headache', T('두통')],
];
// 생활: 그날 있었던 것 (entry.tags = { 열쇠: true }). 인사이트에서 그런 날과 다른 날을 견준다.
export const TAGS = [['alcohol', T('술')], ['exercise', T('운동')]];
// 켜진 열쇠만 남긴다. 하나도 없으면 undefined (저장할 때 빈 칸을 남기지 않으려고)
export const onlyOn = (obj) => {
  const keys = Object.keys(obj || {}).filter((k) => obj[k]);
  return keys.length ? Object.fromEntries(keys.map((k) => [k, true])) : undefined;
};
// 죽고 싶은 생각이 이 단계(높음) 이상이면 오늘 화면에 상담전화를 조용히 보여 준다
export const SI_CARE_FROM = 3;
export const HELPLINE = '109';   // 자살예방상담전화 (한국, 24시간)
export const SIGNS = [
  ['lessSleep', T('적게 자도 안 피곤함')],
  ['talkative', T('말이 많아짐')],
  ['racing', T('생각이 빠르게 튐')],
  ['distract', T('주의가 쉽게 흩어짐')],
  ['projects', T('새로운 일·프로젝트에 몰두')],
  ['impulsive', T('충동적인 지출이나 결정')],
];
// 0~10 각 숫자에 붙는 이름
export const NAMES = EN ? {
  mood: ['Very low', 'Low', 'Down', 'A bit down', 'Slightly flat', 'Neutral', 'Slightly good', 'Good', 'Elevated', 'Very elevated', 'Extremely elevated'],
  energy: ['Empty', 'Almost none', 'Drained', 'Tired', 'A bit low', 'Normal', 'A bit lively', 'Energetic', 'Overflowing', 'Very high', 'Hard to contain'],
  appetite: ['None', 'Almost none', 'Poor', 'Low', 'A bit low', 'Normal', 'Good', 'Hearty', 'Strong', 'Constant', 'Insatiable'],
  caffeine: ['None', 'Very little', 'A little', 'A little', 'Moderate', 'Moderate', 'Quite a bit', 'A lot', 'A lot', 'Very high', 'Too much'],
  conf: ['Very withdrawn', 'Withdrawn', 'Unsure', 'A bit unsure', 'Slightly unsure', 'Normal', 'Slightly confident', 'Confident', 'Very confident', 'Can do anything', 'Unstoppable'],
} : {
  mood: ['바닥', '많이 우울', '우울', '가라앉음', '살짝 다운', '그럭저럭', '괜찮음', '좋음', '신남', '붕 뜸', '날아갈 듯'],
  energy: ['방전', '녹초', '기진맥진', '축 처짐', '좀 피곤', '보통', '괜찮음', '쌩쌩', '기운 넘침', '가만 못 있음', '멈출 수 없음'],
  appetite: ['전혀 없음', '거의 없음', '입맛 없음', '별로 안 당김', '조금 적음', '보통', '잘 먹음', '입맛 돎', '많이 당김', '계속 당김', '끝없이 당김'],
  caffeine: ['안 마심', '아주 조금', '조금', '조금', '적당히', '적당히', '꽤', '많이', '많이', '아주 많이', '과하게'],
  conf: ['완전 쭈그러듦', '많이 위축', '주눅 듦', '소심해짐', '살짝 자신 없음', '보통', '할 만함', '자신 있음', '자신만만', '뭐든 될 듯', '무적'],
};
export const nameOf = (key, v) => (v == null || !NAMES[key] ? '' : NAMES[key][Math.round(v)] || '');
// 정신건강의학과에서 자주 쓰는 약 (상품명, 성분명). 약 추가할 때 고르는 목록일 뿐, 복용 안내가 아니다.
export const CATALOG = [
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
export const SEDATIVES = ['알프람', '자낙스', '아티반', '리보트릴', '바리움', '스틸녹스', '서카딘'];
// 카페인은 마신 것을 개수로 적는다. mg는 대략적인 값 (제품·크기에 따라 다름).
export const DRINKS = [['monster', T('몬스터'), 100], ['coffee', T('커피'), 150], ['cola', T('콜라'), 35]];
export const cafMg = (dr) => DRINKS.reduce((sum, [k, , mg]) => sum + ((dr && dr[k]) || 0) * mg, 0);
export const cafScore = (dr) => Math.min(10, Math.round(cafMg(dr) / 40));   // 400mg 이상이면 10
export const drinkText = (dr) => DRINKS.filter(([k]) => dr && dr[k]).map(([k, name]) => `${name} ${dr[k]}`).join(' · ');
export const SIGN_THRESHOLD = 7;
export const isHigh = (d) => d.mood >= SIGN_THRESHOLD || d.energy >= SIGN_THRESHOLD || (d.conf != null && d.conf >= SIGN_THRESHOLD);
export const FONTS = {
  system: [T('기본'), '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'],
  // 아래 셋은 앱에 넣어 둔 글꼴 파일(mood/fonts)을 쓴다. 고르면 그때 내려받는다.
  pretendard: ['Pretendard', '"Pretendard Variable", -apple-system, "Apple SD Gothic Neo", sans-serif'],
  dodum: [T('고운돋움'), '"Gowun Dodum", -apple-system, "Apple SD Gothic Neo", sans-serif'],
  batang: [T('고운바탕'), '"Gowun Batang", "AppleMyungjo", serif'],
};
export const SIZES = { s: [T('작게'), 1], m: [T('보통 '), 1.12], l: [T('크게'), 1.25], xl: [T('아주 크게'), 1.4] };

export const DISCLAIMER = T('이 앱은 진단 도구가 아니에요. 내 상태를 기록해 두는 참고용이에요.');
