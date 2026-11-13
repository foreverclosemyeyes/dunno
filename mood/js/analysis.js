// 초기 신호 · 인사이트 · 진료용 요약 계산 (전부 이 폰 안에서)
import { SIGNS, STIMULANTS, cafMg, customText, drinkText, fxName, fxNames, psyName, psyNames } from './constants.js';
import { WD, addDays, durText, md, parse, today } from './dates.js';
import { F, T } from './i18n.js';
import { aided, medsFor, medsText } from './meds.js';
import { customDefs, db, usesOn } from './store.js';

// ---------- 초기 신호 · 인사이트 (전부 이 폰 안에서 계산) ----------
export const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
// 인사이트가 나오기 시작하는 기록 일수
export const INSIGHT_MIN_DAYS = 5;

export function signals() {
  const out = [], t = today();
  const run = [];   // 오늘(없으면 어제)부터 거꾸로, 하루도 안 빠지고 이어진 기록
  for (let d = db.entries[t] ? t : addDays(t, -1); db.entries[d]; d = addDays(d, -1)) run.push(db.entries[d]);
  const count = (test) => { let n = 0; while (n < run.length && test(run[n])) n++; return n; };
  const sleeps = Object.values(db.entries).map((e) => e.sleepMin).filter((x) => x != null);
  const hi = count((e) => e.energy >= 7);
  if (hi >= 2 && sleeps.length >= 5) {
    const recent = run.slice(0, hi).map((e) => e.sleepMin).filter((x) => x != null);
    if (recent.length && avg(recent) < avg(sleeps) - 20) out.push(T('에너지와 수면 패턴이 달라지고 있어요. 지켜볼 만해요.'));
  }
  if (count((e) => e.mood >= 8 || e.energy >= 8) >= 4) out.push(T('들뜬 상태가 며칠째 이어지고 있어요. 진료 때 이야기해 보세요.'));
  if (count((e) => e.dep >= 3) >= 12) out.push(T('우울한 날이 2주 가까이 이어지고 있어요. 진료 때 이야기해 보세요.'));
  if (count((e) => e.si >= 1) >= 3) out.push(T('죽고 싶은 생각이 며칠째 이어지고 있어요. 진료 때 꼭 이야기해 보세요.'));
  return out;
}

// ---------- 종합 읽기: 최근 7일의 모습, 언제부터인지, 그 전에 무엇이 달랐는지 ----------
// 사용자가 요청했다: "경조증 같은 게 보인다" 같은, 증상들을 다 합쳐서 본 인사이트.
//
// 기준 숫자의 근거 (2026-11-13에 찾아 읽은 것. 원문 전체가 아니라 공개된 요약·초록·표로 확인했다):
//  [1] DSM-5-TR 조증·경조증 삽화: 기분이 들뜨거나 과민하고 활동·에너지가 늘어남. 경조증은 4일 이상, 조증은 1주 이상.
//      증상 7가지(부풀어 오른 자존감, 잠을 덜 자도 됨, 말이 많아짐, 생각이 빠름, 산만함, 목표 지향 활동 증가, 위험한 일에 몰두) 중 3가지 이상.
//  [2] DSM-5-TR 주요우울 삽화: 같은 2주 동안 9가지 증상 중 5가지 이상, 그중 하나는 우울한 기분이나 흥미 상실.
//  [3] DSM-5 혼재 양상: 한쪽 삽화 중에 반대쪽 증상이 3가지 이상.
//  [4] Jackson, Cavanagh, Scott (2003) J Affect Disord, 조증·우울 전조 체계적 고찰: 조증의 가장 뚜렷한 초기 증상은 수면 문제(중앙값 77%).
//      Van Meter 외 (2016) JAACAP 메타분석: 재발 전의 약한 증상은 평균 1.0±0.9개월 이어짐.
//  [5] Bauer 외 (2006) Bipolar Disord, (2008) Psychol Med: 하루 사이에 수면이 3시간 넘게 달라지면 큰 기분 변화가 뒤따르기도 함 (환자의 약 40%에서 하루 간격으로 관련).
//  [6] Mitchell 외 (2008) Bipolar Disord: 조울증의 우울은 과수면·식욕 증가·정신운동 지연·정신병적 증상이 조금 더 흔함. 이것만으로 가를 수는 없음(확률적 접근).
//  [7] Adult ADHD vs. bipolar disorder in the DSM-5 era (2014) J Psychiatr Pract: ADHD는 늘 이어지고 조울증은 삽화로 옴.
//      잠을 덜 자도 피곤하지 않은 것과 부풀어 오른 자신감은 ADHD의 모습이 아님.
//  [8] Birchwood 외 (1989, 2000), Eisner 외 (2013) Clin Psychol Rev: 정신병 재발 몇 주 전에 불안·불면 등이 먼저 나타남. 예측력은 보통 수준이고, 자기 평소와 견줄 때 더 나음.
// 진단이 아니라, 그런 때 흔히 보이는 모습과 기록이 겹치는 점을 세어서 보여 주는 것이다. 문장도 "겹친다"까지만 말한다.

// 들뜬 날 / 가라앉은 날로 보는 기준
const upDay = (e) => e.mood >= 7 || e.energy >= 8;
const downDay = (e) => (e.mood != null && e.mood <= 3) || e.dep >= 3;
const dayGap = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

// 기준에 맞는 날이 이어진 "시기"들을 찾는다. 하루쯤 빠지거나 안 맞아도 이어진 것으로 보고, 맞는 날이 3일 이상이어야 시기로 친다.
// [{ start, end, n: 맞는 날 수 }] (오래된 것부터)
function runs(entries, test) {
  const hits = Object.keys(entries).sort().filter((k) => test(entries[k])), out = [];
  hits.forEach((d) => {
    const last = out[out.length - 1];
    if (last && dayGap(last.end, d) <= 2) { last.end = d; last.n++; } else out.push({ start: d, end: d, n: 1 });
  });
  return out.filter((r) => r.n >= 3);
}

// 어떤 시기가 시작되기 전 2주가 평소(그 앞 4주)와 어떻게 달랐는지. mine이면 약 기록도 본다.
// 2주로 잡은 까닭: 재발 전에 나타나는 약한 증상은 평균 한 달쯤(0.5~1.3개월) 이어진다 [근거 4].
function before(entries, start, mine) {
  const pick = (from, to) => Object.keys(entries).filter((k) => k >= addDays(start, -from) && k <= addDays(start, -to)).map((k) => entries[k]);
  const win = pick(14, 1), base = pick(42, 15), vals = (list, key) => list.map((e) => e[key]).filter((x) => x != null);
  if (win.length < 4) return { points: [], lessSleep: false };
  const points = [], sw = vals(win, 'sleepMin'), sb = vals(base, 'sleepMin');
  const sleepDiff = sw.length && sb.length >= 3 ? Math.round(avg(sw) - avg(sb)) : 0;
  if (Math.abs(sleepDiff) >= 45) points.push(F(sleepDiff < 0 ? '잠이 평소보다 {0} 적었어요' : '잠이 평소보다 {0} 많았어요', durText(Math.abs(sleepDiff))));
  const missed = mine && db.meds.length ? win.filter((e) => !medsFor(e.date).length).length : 0;
  if (missed) points.push(F('약을 안 먹은 날이 {0}일 있었어요', missed));
  const cw = vals(win, 'caffeine'), cb = vals(base, 'caffeine');
  if (cw.length && cb.length >= 3 && avg(cw) >= avg(cb) + 2) points.push(T('카페인이 평소보다 많았어요'));
  // 내 항목 가운데 했음/안 했음 항목 (술, 운동처럼 사용자가 만든 것)
  if (mine) customDefs().filter((c) => c.type === 'check').forEach((c) => {
    const n = win.filter((e) => e.custom && e.custom[c.id]).length;
    if (n) points.push(F('“{0}” 한 날이 {1}일 있었어요', c.name, n));
  });
  const anxious = win.filter((e) => e.anx >= 2).length;
  if (anxious >= 3) points.push(F('불안이 보통 이상인 날이 {0}일 있었어요', anxious));
  if (win.some((e) => e.period)) points.push(T('생리 중이었어요'));
  return { points, lessSleep: sleepDiff <= -45 };
}

// 최근 7일 읽기. 진단 기준의 틀을 빌려서 센다 (진단을 내리는 것이 아니라, 기준에 나오는 모습이 기록에 얼마나 있는지 세는 것).
//   들뜬 쪽: 기분과 에너지가 둘 다 높은 날이 대부분이고 [근거 1: 경조증·조증은 기분과 활동·에너지가 함께 올라감],
//            기준 증상 7가지 가운데 3가지 이상이 기록에 있을 때 [근거 1]
//   가라앉은 쪽: 우울한 날이 대부분이고, 이 앱으로 적는 기준 증상 6가지(전체 9가지 가운데) 중 3가지 이상이 있을 때 [근거 2: 9가지 중 5가지 이상, 2주]
//   섞인 모습: 한쪽이 뚜렷한데 반대쪽 증상이 3가지 이상 함께 있을 때 [근거 3: 혼재 양상은 반대쪽 증상 3가지 이상]
//   "거의 매일"은 7일 중 4일 이상으로 본다. 수면은 그 전 4주의 내 평균과 견준다 [근거 8: 자기 평소와 견줄 때 더 잘 맞음].
// 돌려주는 것: { kind: 'high' | 'low' | 'mixed' | 'up'(높지만 기준 증상은 적음) | 'down'(우울하지만 기준 증상은 적음) | 'even', title,
//   flow: 언제부터 며칠째인지·기준 기간과 견준 말·요 사흘 방향, groups: [[묶음 이름, [근거 문장, …]], …], notes: [덧붙이는 말, …],
//   lead: 시작되기 전 2주 { title, points, past } 또는 null, beyond: 고른 진단명에 없는 모습일 때의 말 }
// 최근 7일 중 4일 이상 적었을 때만 나온다 (모자라면 null).
export function recentState(entries = db.entries) {
  const t = today(), mine = entries === db.entries, dx = usesOn();
  const span = (from, to) => Object.keys(entries).sort().filter((k) => k > addDays(t, -from) && k <= addDays(t, -to)).map((k) => entries[k]);
  const now = span(7, 0), prior = span(35, 7);
  if (now.length < 4) return null;
  const vals = (list, key) => list.map((e) => e[key]).filter((x) => x != null);
  const n = (test) => now.filter(test).length, most = (test) => n(test) >= 4;
  const sleep = avg(vals(now, 'sleepMin')), base = vals(prior, 'sleepMin'), sleepDiff = sleep != null && base.length >= 3 ? Math.round(sleep - avg(base)) : null;
  const sign = (k) => n((e) => !!(e.signs && e.signs[k])) >= 2, label = (k) => SIGNS.find(([key]) => key === k)[1];

  // 들뜬 쪽: 기분·에너지(A), 기준 증상 7가지(B) [근거 1]
  const moodUp = n((e) => e.mood >= 7), energyUp = n((e) => e.energy >= 7), hasEnergy = now.some((e) => e.energy != null);
  const aHigh = moodUp >= 4 && (!hasEnergy || energyUp >= 4);
  const lessNeed = sign('lessSleep') || (sleepDiff != null && sleepDiff <= -60 && n((e) => e.tired) <= 1);   // 잠이 줄었는데 피곤하지 않음
  const grand = most((e) => e.conf >= 8);
  const B = [[T('자신감이 크게 높아짐'), grand], [label('lessSleep'), lessNeed], [label('talkative'), sign('talkative')], [label('racing'), sign('racing')],
    [label('distract'), sign('distract')], [label('projects'), sign('projects')], [label('impulsive'), sign('impulsive')]].filter(([, on]) => on).map(([name]) => name);
  // 가라앉은 쪽: 우울한 기분(A), 이 앱으로 적는 기준 증상 6가지 [근거 2]. 흥미 없음·몸이 느려짐·집중 어려움은 적는 칸이 없어서 못 센다.
  const depMood = most((e) => e.dep >= 2 || (e.mood != null && e.mood <= 3));
  const moreSleep = sleepDiff != null && sleepDiff >= 60, moreAppetite = most((e) => e.appetite >= 9);
  const D = [[T('우울한 기분'), depMood], [T('식욕이 크게 줄거나 늘어남'), most((e) => e.appetite != null && (e.appetite <= 2 || e.appetite >= 9))],
    [T('잠이 평소보다 한 시간 넘게 늘거나 줄어듦'), sleepDiff != null && Math.abs(sleepDiff) >= 60 && !lessNeed], [T('기운이 없음'), most((e) => e.energy != null && e.energy <= 3)],
    [T('자신감이 크게 낮아짐'), most((e) => e.conf != null && e.conf <= 2)], [T('죽고 싶은 생각'), n((e) => e.si >= 1) >= 2]].filter(([, on]) => on).map(([name]) => name);

  const isHigh = aHigh && B.length >= 3, isLow = depMood && D.length >= 3;
  const kind = (isHigh && (isLow || D.length >= 3)) || (isLow && B.length >= 3) ? 'mixed' : isHigh ? 'high' : isLow ? 'low' : aHigh ? 'up' : depMood ? 'down' : 'even';

  // 어느 쪽이든 함께 봐야 하는 것
  const also = [], add = (count, min, text) => { if (count >= min) also.push(F(text, count)); };
  const psyDays = n((e) => e.psy >= 1), anxDays = n((e) => e.anx >= 2);
  add(psyDays, 1, '정신병적 증상이 있던 날 {0}일');
  add(anxDays, 3, '불안이 보통 이상인 날 {0}일');
  add(n((e) => e.sleepMin != null && e.sleepMin < SHORT_SLEEP), 2, '5시간 미만으로 잔 밤 {0}일');
  // 하루 사이에 잠이 3시간 넘게 달라진 날: 큰 기분 변화에 하루쯤 앞서 나타나기도 한다 [근거 5]
  const withSleep = span(8, 0).filter((e) => e.sleepMin != null);
  add(withSleep.filter((e, i) => i && dayGap(withSleep[i - 1].date, e.date) === 1 && Math.abs(e.sleepMin - withSleep[i - 1].sleepMin) > 180).length, 1, '하루 사이에 잠이 3시간 넘게 달라진 날 {0}일');
  if (mine && db.meds.length) add(n((e) => !medsFor(e.date).length), 2, '약을 안 먹은 날 {0}일');

  const psyAlso = psyDays ? T(' 정신병적 증상도 함께 적혀 있어요.') : '';
  const title = {
    mixed: T('최근 7일은 들뜬 모습과 가라앉은 모습이 함께 보여요.'),
    high: T('최근 7일은 경조증·조증 때 흔히 보이는 모습과 겹치는 점이 많아요.'),
    low: T('최근 7일은 우울 삽화 때 흔히 보이는 모습과 겹치는 점이 많아요.'),
    up: T('최근 7일은 기분과 에너지가 높은 날이 많아요. 진단 기준에 나오는 다른 증상은 기록에 많지 않아요.'),
    down: T('최근 7일은 우울한 날이 많아요. 진단 기준에 나오는 다른 증상은 기록에 많지 않아요.'),
    even: anxDays >= 4 ? T('최근 7일은 기분이 한쪽으로 뚜렷하게 기울지는 않았지만, 불안이 높은 날이 많아요.') : T('최근 7일은 한쪽으로 뚜렷하게 기운 모습이 보이지 않아요.'),
  }[kind] + psyAlso;
  const upLines = [moodUp >= 4 ? F('기분이 7 이상인 날 {0}일', moodUp) : '', energyUp >= 4 ? F('에너지가 7 이상인 날 {0}일', energyUp) : '', ...B].filter(Boolean);
  const groups = [
    [F('들뜬 쪽 · 진단 기준 증상 7가지 중 {0}가지', B.length), aHigh || B.length >= 2 ? upLines : []],
    [F('가라앉은 쪽 · 이 앱으로 적는 기준 증상 6가지 중 {0}가지', D.length), depMood || D.length >= 2 ? D : []],
    [T('함께 보이는 것'), also],
  ].filter(([, list]) => list.length);

  // 언제부터인지, 기준에 나오는 기간과 견주면 어떤지, 요 사흘 방향은 어떤지, 그리고 시작되기 전 2주
  let flow = '', lead = null, started = '';
  const up = kind === 'high' || kind === 'up', down = kind === 'low' || kind === 'down';
  if (up || down) {
    const all = runs(entries, up ? upDay : downDay), cur = all[all.length - 1];
    if (cur && dayGap(cur.end, t) <= 2) {
      const days = dayGap(cur.start, t) + 1, moods = vals(now, 'mood'), late = moods.slice(-3), early = moods.slice(0, -3);
      const turn = late.length === 3 && early.length >= 2 ? avg(late) - avg(early) : 0;
      const dir = turn >= 1 ? T(' 요 사흘은 기분이 더 올라가는 중이에요.') : turn <= -1 ? T(' 요 사흘은 기분이 더 내려가는 중이에요.') : '';
      // 진단 기준의 기간: 경조증 4일 이상, 조증 1주 이상 [근거 1], 우울 삽화 2주 이상 [근거 2]
      const length = up ? (days >= 7 ? T(' 진단 기준에서 말하는 조증의 기간(1주 이상)만큼 이어졌어요.') : days >= 4 ? T(' 진단 기준에서 말하는 경조증의 기간(4일 이상)만큼 이어졌어요.') : T(' 진단 기준에서 말하는 경조증의 기간(4일)보다는 아직 짧아요.'))
        : days >= 14 ? T(' 진단 기준에서 말하는 우울 삽화의 기간(2주 이상)만큼 이어졌어요.') : T(' 진단 기준에서 말하는 우울 삽화의 기간(2주)보다는 아직 짧아요.');
      flow = F('{0}쯤부터 {1}일째 이어지고 있어요.', md(parse(cur.start)), days) + length + dir;
      started = cur.start;
      const b = before(entries, cur.start, mine), past = all.slice(0, -1);
      const pastLess = past.filter((r) => before(entries, r.start, mine).lessSleep).length;
      const pastText = past.length >= 2 ? F(up ? '지금까지 들뜬 시기 {0}번 중 {1}번은 시작 전에 잠이 줄었어요.' : '지금까지 가라앉은 시기 {0}번 중 {1}번은 시작 전에 잠이 줄었어요.', past.length, pastLess) : '';
      if (b.points.length || pastText) lead = { title: up ? T('들뜬 흐름이 시작되기 전 2주') : T('가라앉은 흐름이 시작되기 전 2주'), points: b.points, past: pastText };
    }
  }

  // 덧붙이는 말: 비슷해 보이는 것들을 가르는 데 연구에서 쓰는 단서가 기록에 있으면 알려 준다 (어느 쪽이라고 정하지는 않는다)
  const notes = [];
  // ADHD와 들뜬 시기: ADHD는 늘 이어지고, 들뜬 시기는 어느 날부터 시작된다. 잠이 줄어도 피곤하지 않은 것과 부풀어 오른 자신감은 ADHD의 모습이 아니다 [근거 7]
  if (up && (dx.includes('adhd') || !dx.includes('bipolar'))) {
    const clues = [started && prior.filter(upDay).length <= prior.length / 4 ? T('어느 날부터 시작됨') : '', lessNeed ? T('잠이 줄었는데 피곤하지 않음') : '', grand ? T('자신감이 크게 높아짐') : ''].filter(Boolean);
    notes.push(clues.length >= 2
      ? F('산만함이나 충동은 ADHD에서도 흔하지만, 이번에는 {0}이 함께 보여요. 이런 점은 ADHD보다 들뜬 시기에서 흔한 모습이에요.', clues.join(' · '))
      : T('산만함이나 충동만 있고 잠과 자신감이 평소와 비슷하다면, ADHD에서도 흔한 모습이에요.'));
  }
  // 가라앉은 시기에 잠·식욕이 늘거나 정신병적 증상이 있는 것은 조울증의 우울에서 조금 더 흔하다. 그것만으로 가를 수는 없다 [근거 6]
  if (down && !dx.includes('bipolar')) {
    const clues = [moreSleep ? T('잠이 늘어남') : '', moreAppetite ? T('식욕이 늘어남') : '', psyDays ? T('정신병적 증상') : ''].filter(Boolean);
    if (clues.length) notes.push(F('가라앉은 시기에 {0}이 함께 있는 것은, 연구에서 조울증의 우울에서 조금 더 흔하다고 알려진 모습이에요. 이것만으로 구분되지는 않으니 진료 때 이야기해 보세요.', clues.join(' · ')));
  }
  // 조현병: 재발 몇 주 전에 불안과 잠 문제가 먼저 나타나기도 한다 [근거 8]
  if ((dx.includes('psychosis') || Object.keys(entries).some((k) => entries[k].psy >= 1)) && !psyDays && anxDays >= 3 && sleepDiff != null && sleepDiff <= -60) {
    notes.push(T('불안과 잠 문제가 함께 늘었어요. 정신병적 증상은 다시 나타나기 몇 주 전에 이런 변화가 먼저 오기도 해요.'));
  }

  // 고른 진단명은 참고일 뿐이다 (진단이 틀렸을 수도 있다: 조울증이 우울증으로, ADHD가 조울증으로 진단되는 일이 있다).
  // 그래서 기록에 보이는 모습을 진단명으로 걸러 내지 않고, 고른 진단명에 없는 모습이 보이면 그 점을 따로 짚어 준다.
  const beyond = (kind === 'high' || kind === 'mixed') && dx.length && !dx.includes('bipolar')
    ? T('고른 진단명에는 조울증이 없지만, 기록에는 들뜬 시기에 가까운 모습이 보여요. 진단이 틀렸다는 뜻은 아니에요. 진료 때 이 기록을 보여 주며 이야기해 볼 만해요.')
    : kind === 'low' && dx.length && !dx.includes('depression') && !dx.includes('bipolar')
      ? T('고른 진단명에는 우울증이나 조울증이 없지만, 기록에는 가라앉은 시기에 가까운 모습이 보여요. 진료 때 이 기록을 보여 주며 이야기해 볼 만해요.') : '';
  return { kind, title, flow, groups, notes, lead, beyond };
}

// ---------- 내 시기들 · 시기별 내 평균 · 약을 바꾼 앞뒤 ----------
// 지금까지의 들뜬 시기와 가라앉은 시기 (최근 것부터), 그리고 몇 번이었고 평균 며칠 갔는지
export function episodes(entries = db.entries) {
  const list = [...runs(entries, upDay).map((r) => ({ ...r, kind: 'high' })), ...runs(entries, downDay).map((r) => ({ ...r, kind: 'low' }))]
    .map((r) => ({ ...r, days: dayGap(r.start, r.end) + 1 })).sort((a, b) => (a.start < b.start ? 1 : -1));
  const stat = (kind) => { const l = list.filter((r) => r.kind === kind); return l.length ? { n: l.length, avg: Math.round(avg(l.map((r) => r.days))) } : null; };
  // 들뜬 시기와 가라앉은 시기가 둘 다 있었는데 조울증을 고르지 않았으면 짚어 준다 (진단명은 참고일 뿐이라 걸러 내지 않는다)
  const dx = usesOn(), cycle = list.some((r) => r.kind === 'high') && list.some((r) => r.kind === 'low');
  const beyond = cycle && dx.length && !dx.includes('bipolar')
    ? T('들뜬 시기와 가라앉은 시기가 둘 다 있었어요. 고른 진단명에는 조울증이 없으니, 진료 때 이 흐름을 보여 주며 이야기해 볼 만해요.') : '';
  return { list, high: stat('high'), low: stat('low'), beyond };
}

// 평소 / 들뜬 시기 / 가라앉은 시기에 내 잠·기분·에너지·불안이 각각 어땠는지.
// { cols: [[이름, 날 수], …], rows: [[항목, [값, …]], …] }. 견줄 묶음이 둘 이상(각 3일 이상)일 때만 나온다.
export function baseline(entries = db.entries) {
  const ep = episodes(entries).list, inRun = (e, kind) => ep.some((r) => r.kind === kind && e.date >= r.start && e.date <= r.end);
  const all = Object.keys(entries).sort().map((k) => entries[k]);
  const groups = [[T('평소'), all.filter((e) => !inRun(e, 'high') && !inRun(e, 'low'))], [T('들뜬 시기'), all.filter((e) => inRun(e, 'high'))], [T('가라앉은 시기'), all.filter((e) => inRun(e, 'low'))]]
    .filter(([, list]) => list.length >= 3);
  if (groups.length < 2) return null;
  const cell = (list, key, fmt) => { const v = list.map((e) => e[key]).filter((x) => x != null); return v.length ? fmt(avg(v)) : '–'; };
  const dur = (m) => durText(Math.round(m)), num = (x) => x.toFixed(1);
  return {
    cols: groups.map(([name, list]) => [name, list.length]),
    rows: [[T('잠'), 'sleepMin', dur], [T('기분'), 'mood', num], [T('에너지'), 'energy', num], [T('불안'), 'anx', num]].map(([name, key, fmt]) => [name, groups.map(([, list]) => cell(list, key, fmt))]),
  };
}

// 약을 바꾼 날(진료 화면에 적어 둔 것)의 앞 2주와 뒤 2주. 앞뒤로 각각 4일 이상 적었을 때만 나온다. (최근 것부터)
// [{ date, text, after: 뒤쪽에 적은 날 수, rows: [[항목, 앞, 뒤], …] }]
export function medChanges() {
  const t = today(), log = (db.clinic && db.clinic.log) || [];
  const pick = (from, to) => Object.keys(db.entries).filter((k) => k >= from && k <= to).map((k) => db.entries[k]);
  const dur = (m) => durText(Math.round(m)), num = (x) => x.toFixed(1);
  const cell = (list, key, fmt) => { const v = list.map((e) => e[key]).filter((x) => x != null); return v.length ? fmt(avg(v)) : '–'; };
  const count = (list, test) => F('{0}일 중 {1}일', list.length, list.filter(test).length);
  return log.filter((x) => x.kind === 'med' && x.date <= t).map((x) => {
    const b = pick(addDays(x.date, -14), addDays(x.date, -1)), last = addDays(x.date, 13), a = pick(x.date, last < t ? last : t);
    if (b.length < 4 || a.length < 4) return null;
    return {
      date: x.date, text: x.text, after: a.length,
      rows: [[T('기분'), cell(b, 'mood', num), cell(a, 'mood', num)], [T('에너지'), cell(b, 'energy', num), cell(a, 'energy', num)], [T('잠'), cell(b, 'sleepMin', dur), cell(a, 'sleepMin', dur)],
        [T('우울이 보통 이상'), count(b, (e) => e.dep >= 2), count(a, (e) => e.dep >= 2)], [T('불안이 보통 이상'), count(b, (e) => e.anx >= 2), count(a, (e) => e.anx >= 2)]],
    };
  }).filter(Boolean).reverse();
}

// 인사이트: 두 묶음의 평균을 견준 관찰들. 차이가 큰 것부터 나온다.
// 누구에게나 흔한 쪽으로 나온 것(카페인을 많이 마시면 덜 잔다 등)은 새로운 정보가 아니라서 뺀다:
// say의 세 번째 값이 "흔히 예상되는 쪽"(0 = 앞 문장, 1 = 뒤 문장)이고, 기록이 그 반대로 나왔을 때만 넣는다. 예상이 따로 없는 것은 그대로 넣는다.
//   { text: 한 줄 결론, a: [이름, 값, 날 수], b: [이름, 값, 날 수] }
// 차이가 뚜렷할 때만 넣는다. entries를 주면 그 기록으로 계산한다 (예시 기록 미리 보기).
// 약에 관한 비교는 내 약 기록을 보기 때문에 내 기록일 때만 넣는다.
export function insights(entries = db.entries) {
  const all = Object.keys(entries).sort().map((k) => entries[k]), out = [], mine = entries === db.entries;
  if (all.length < INSIGHT_MIN_DAYS) return out;
  const mean = (list, key) => avg(list.map((e) => e[key]));
  const dur = (m) => durText(Math.round(m)), num = (x) => x.toFixed(1);
  // 두 묶음(각 min일 이상)의 평균이 gap 이상 차이 나면 넣는다. say는 [앞쪽이 낮을 때 문장, 높을 때 문장], {0}에 차이가 들어간다.
  // unit은 "한 칸"의 크기(수면 60분, 점수 1점)로, 서로 다른 항목의 차이를 같은 잣대로 줄 세울 때 쓴다.
  // dx: 이 비교가 특히 관련 있는 진단명들. 사용자가 고른 진단명과 겹치면 순서를 앞으로 당긴다 (1.5배).
  const chosen = usesOn(), boost = (dx) => (dx && dx.some((k) => chosen.includes(k)) ? 1.5 : 1);
  const compare = (key, a, b, labels, { min = 3, gap, fmt, unit, dx }, say) => {
    if (a.length < min || b.length < min) return;
    const x = mean(a, key), y = mean(b, key), d = Math.abs(x - y);
    if (d < gap || say[2] === (x < y ? 0 : 1)) return;
    out.push({ text: F(say[x < y ? 0 : 1], fmt(d)), a: [labels[0], fmt(x), a.length], b: [labels[1], fmt(y), b.length], weight: d / unit * boost(dx) });
  };
  const sleep = { gap: 20, fmt: dur, unit: 60 }, score = { gap: 0.8, fmt: num, unit: 1 }, days = [T('그런 날'), T('다른 날')];
  // 항목을 따로따로 적을 수 있어서 빈 값(null)이 섞여 있다. null은 비교에서 0처럼 굴기 때문에, 값이 있는 날만 골라서 나눈다.
  const has = (key) => (e) => e[key] != null;
  const sl = all.filter(has('sleepMin')), slE = sl.filter(has('energy')), slM = sl.filter(has('mood')), withMood = all.filter(has('mood'));
  const night = (e) => entries[addDays(e.date, 1)];   // 그날 밤의 잠과 다음 날 기분은 다음 날 기록에 있다

  // 잠과 에너지·기분
  compare('energy', slE.filter((e) => e.sleepMin < 360), slE.filter((e) => e.sleepMin >= 360), [T('적게 잔 날'), T('다른 날')], { ...score, dx: ['bipolar'] },
    ['6시간보다 적게 잔 날은 에너지가 {0} 낮았어요.', '6시간보다 적게 잔 날은 에너지가 {0} 높았어요.', 0]);
  compare('sleepMin', slE.filter((e) => e.energy >= 7), slE.filter((e) => e.energy < 7), days, { ...sleep, dx: ['bipolar'] },
    ['에너지가 높았던 날은 전날 밤에 {0} 덜 잤어요.', '에너지가 높았던 날은 전날 밤에 {0} 더 잤어요.', 1]);
  compare('sleepMin', slM.filter((e) => e.mood <= 3), slM.filter((e) => e.mood > 3), days, { ...sleep, dx: ['depression', 'bipolar'] },
    ['기분이 가라앉은 날은 전날 밤에 {0} 덜 잤어요.', '기분이 가라앉은 날은 전날 밤에 {0} 더 잤어요.', 0]);
  compare('sleepMin', sl.filter((e) => e.tired), sl.filter((e) => !e.tired), days, sleep,
    ['일어났을 때 피곤했던 날은 {0} 덜 잤어요.', '일어났을 때 피곤했던 날은 {0} 더 잤어요.', 0]);
  // 진단명을 골랐을 때만 넣는 비교들 (내 기록일 때만)
  if (mine && chosen.includes('adhd') && db.meds.some((m) => STIMULANTS.includes(m.name))) {
    const took = (e) => medsFor(e.date).some((m) => STIMULANTS.includes(m.name)), pair = [T('먹은 날'), T('안 먹은 날')], adhd = { dx: ['adhd'] };
    compare('energy', ...[all.filter(has('energy'))].flatMap((l) => [l.filter(took), l.filter((e) => !took(e))]), pair, { ...score, ...adhd },
      ['각성제를 먹은 날은 에너지가 {0} 낮았어요.', '각성제를 먹은 날은 에너지가 {0} 높았어요.']);
    const nights = all.filter((e) => night(e) && night(e).sleepMin != null);
    compare('sleepMin', nights.filter(took).map(night), nights.filter((e) => !took(e)).map(night), pair, { ...sleep, ...adhd },
      ['각성제를 먹은 날 밤에는 {0} 덜 잤어요.', '각성제를 먹은 날 밤에는 {0} 더 잤어요.']);
    compare('appetite', ...[all.filter(has('appetite'))].flatMap((l) => [l.filter(took), l.filter((e) => !took(e))]), pair, { ...score, gap: 1, ...adhd },
      ['각성제를 먹은 날은 식욕이 {0} 낮았어요.', '각성제를 먹은 날은 식욕이 {0} 높았어요.']);
  }
  if (mine && chosen.includes('psychosis') && db.meds.length) {
    compare('psy', all.filter((e) => !medsFor(e.date).length), all.filter((e) => medsFor(e.date).length), [T('안 먹은 날'), T('먹은 날')], { gap: 0.3, fmt: num, unit: 0.5, dx: ['psychosis'] },
      ['약을 안 먹은 날은 정신병적 증상이 {0}가지 적었어요.', '약을 안 먹은 날은 정신병적 증상이 {0}가지 많았어요.']);
  }
  // 약
  if (mine && db.meds.length) {
    compare('mood', withMood.filter((e) => !medsFor(e.date).length), withMood.filter((e) => medsFor(e.date).length), [T('안 먹은 날'), T('먹은 날')], score,
      ['약을 안 먹은 날은 기분이 {0} 낮았어요.', '약을 안 먹은 날은 기분이 {0} 높았어요.', 0]);
    compare('sleepMin', sl.filter(aided), sl.filter((e) => !aided(e)), [T('먹은 날'), T('안 먹은 날')], { ...sleep, min: 2 },
      ['안정제·수면제를 먹은 날 밤에는 {0} 덜 잤어요.', '안정제·수면제를 먹은 날 밤에는 {0} 더 잤어요.', 1]);
  }
  // 카페인 · 술 · 운동 · 생리
  const caf = all.filter((e) => e.caffeine != null && night(e) && night(e).sleepMin != null);
  compare('sleepMin', caf.filter((e) => e.caffeine >= 7).map(night), caf.filter((e) => e.caffeine < 7).map(night), days, sleep,
    ['카페인을 많이 마신 날 밤에는 {0} 덜 잤어요.', '카페인을 많이 마신 날 밤에는 {0} 더 잤어요.', 0]);
  const ap = all.filter((e) => e.caffeine != null && e.appetite != null);
  compare('appetite', ap.filter((e) => e.caffeine >= 7), ap.filter((e) => e.caffeine < 7), days, { ...score, gap: 1 },
    ['카페인을 많이 마신 날은 식욕이 {0} 낮았어요.', '카페인을 많이 마신 날은 식욕이 {0} 높았어요.', 0]);
  // 내 항목 가운데 했음/안 했음 항목: 한 다음 날의 기분, 한 날 밤의 잠 (내 기록일 때만. 흔한 예상은 따로 두지 않는다)
  if (mine) customDefs().filter((c) => c.type === 'check').forEach((c) => {
    const did = (e) => !!(e.custom && e.custom[c.id]), named = (text) => F(text, '{0}', c.name);
    const nextMood = all.filter((e) => night(e) && night(e).mood != null), nextSleep = all.filter((e) => night(e) && night(e).sleepMin != null);
    compare('mood', nextMood.filter(did).map(night), nextMood.filter((e) => !did(e)).map(night), days, score,
      [named('“{1}” 한 다음 날은 기분이 {0} 낮았어요.'), named('“{1}” 한 다음 날은 기분이 {0} 높았어요.')]);
    compare('sleepMin', nextSleep.filter(did).map(night), nextSleep.filter((e) => !did(e)).map(night), days, sleep,
      [named('“{1}” 한 날 밤에는 {0} 덜 잤어요.'), named('“{1}” 한 날 밤에는 {0} 더 잤어요.')]);
  });
  compare('mood', withMood.filter((e) => e.period), withMood.filter((e) => !e.period), [T('생리 중'), T('다른 날')], score,
    ['생리 중인 날은 기분이 {0} 낮았어요.', '생리 중인 날은 기분이 {0} 높았어요.', 0]);
  // 기분이 가장 낮은 요일 (요일마다 2일 이상 적었을 때)
  const byDay = WD().map((name, d) => [name, withMood.filter((e) => parse(e.date).getDay() === d)]).filter(([, list]) => list.length >= 2);
  if (byDay.length >= 4) {
    const [name, low] = byDay.reduce((m, x) => (mean(x[1], 'mood') < mean(m[1], 'mood') ? x : m));
    const rest = withMood.filter((e) => !low.includes(e)), d = mean(rest, 'mood') - mean(low, 'mood'), day = F('{0}요일', name);
    if (d >= 1) out.push({ text: F('기분이 가장 낮은 요일은 {0}이에요.', day), a: [day, num(mean(low, 'mood')), low.length], b: [T('다른 요일'), num(mean(rest, 'mood')), rest.length], weight: d });
  }
  // 증상이 있던 날과 없던 날: 전날 밤 잠, 그리고 증상끼리 같이 움직이는지
  const level = { gap: 0.8, fmt: num, unit: 1 };
  const split = (list, test) => [list.filter(test), list.filter((e) => !test(e))];
  const isDep = (e) => e.dep >= 2, isAnx = (e) => e.anx >= 2, isPsy = (e) => e.psy >= 1, isSi = (e) => e.si >= 1;
  compare('sleepMin', ...split(sl.filter(has('dep')), isDep), days, { ...sleep, dx: ['depression', 'bipolar'] }, ['우울이 보통 이상인 날은 전날 밤에 {0} 덜 잤어요.', '우울이 보통 이상인 날은 전날 밤에 {0} 더 잤어요.']);
  compare('sleepMin', ...split(sl.filter(has('anx')), isAnx), days, { ...sleep, dx: ['anxiety'] }, ['불안이 보통 이상인 날은 전날 밤에 {0} 덜 잤어요.', '불안이 보통 이상인 날은 전날 밤에 {0} 더 잤어요.', 0]);
  compare('sleepMin', ...split(sl, isPsy), days, { ...sleep, dx: ['psychosis'] }, ['정신병적 증상이 있던 날은 전날 밤에 {0} 덜 잤어요.', '정신병적 증상이 있던 날은 전날 밤에 {0} 더 잤어요.', 0]);
  compare('sleepMin', ...split(sl.filter(has('si')), isSi), days, sleep, ['죽고 싶은 생각이 있던 날은 전날 밤에 {0} 덜 잤어요.', '죽고 싶은 생각이 있던 날은 전날 밤에 {0} 더 잤어요.', 0]);
  const both = (a, b) => all.filter((e) => e[a] != null && e[b] != null);
  compare('energy', ...split(all.filter(has('energy')), isPsy), days, { ...score, dx: ['psychosis'] }, ['정신병적 증상이 있던 날은 에너지가 {0} 낮았어요.', '정신병적 증상이 있던 날은 에너지가 {0} 높았어요.']);
  compare('mood', ...split(withMood, isPsy), days, { ...score, dx: ['psychosis'] }, ['정신병적 증상이 있던 날은 기분이 {0} 낮았어요.', '정신병적 증상이 있던 날은 기분이 {0} 높았어요.']);
  compare('dep', ...split(both('anx', 'dep'), isAnx), days, { ...level, dx: ['anxiety', 'depression'] }, ['불안이 보통 이상인 날은 우울이 {0}단계 낮았어요.', '불안이 보통 이상인 날은 우울이 {0}단계 높았어요.', 1]);
  compare('anx', ...split(all.filter(has('anx')), isPsy), days, { ...level, dx: ['psychosis'] }, ['정신병적 증상이 있던 날은 불안이 {0}단계 낮았어요.', '정신병적 증상이 있던 날은 불안이 {0}단계 높았어요.', 1]);
  compare('caffeine', ...split(both('anx', 'caffeine'), isAnx), days, { ...score, gap: 1, dx: ['anxiety'] }, ['불안이 보통 이상인 날은 카페인이 {0} 적었어요.', '불안이 보통 이상인 날은 카페인이 {0} 많았어요.', 1]);
  // 차이가 큰 것부터 여덟 개까지만 (많으면 다 비슷해 보인다)
  return out.sort((p, q) => q.weight - p.weight).slice(0, 8);
}

// AI 앱에 붙여 넣을 수 있는 최근 4주 요약 글
export function aiSummary() {
  const t = today(), lines = [];
  for (let i = 27; i >= 0; i--) {
    const d = addDays(t, -i), e = db.entries[d], meds = medsText(medsFor(d));
    if (!e) { if (meds) lines.push(`${d} | (기록 없음) | 약: ${meds}`); continue; }
    const signs = SIGNS.filter(([k]) => e.signs && e.signs[k]).map(([, l]) => l).join(', ');
    const val = (label, v, unit) => (v == null ? '' : `${label} ${v}${unit || ''}`);   // 안 적은 항목은 줄에서 뺀다
    lines.push([d, val('기분', e.mood), val('에너지', e.energy), val('자신감', e.conf), val('우울', e.dep, '/4'), val('불안', e.anx, '/4'), psyNames(e.psych).length ? `정신병적 증상: ${psyNames(e.psych).join(', ')}` : val('정신병적 증상', e.psy, '/4'), val('죽고 싶은 생각', e.si, '/4'),
      e.sleepMin != null ? `수면 ${Math.floor(e.sleepMin / 60)}시간 ${e.sleepMin % 60}분${aided(e) ? '(전날 안정제·수면제 복용)' : ''}` : '', e.tired ? '기상 시 피곤' : '', e.period ? '생리 중' : '',
      e.appetite != null ? `식욕 ${e.appetite}` : '', e.drinks ? `카페인 약 ${cafMg(e.drinks)}mg(${drinkText(e.drinks) || '없음'})` : e.caffeine != null ? `카페인 ${e.caffeine}/10` : '', `약: ${meds || '없음'}`, fxNames(e.fx).length ? `부작용: ${fxNames(e.fx).join(', ')}` : '', ...(e.custom ? customDefs().map((c) => (customText(c, e.custom[c.id]) ? `${c.name}: ${customText(c, e.custom[c.id])}` : '')) : []), signs ? `체크: ${signs}` : '', e.note ? `메모: ${e.note}` : '']
      .filter(Boolean).join(' | '));
  }
  return `아래는 내가 직접 적은 최근 4주 기분·수면·복약 기록이야 (기분·에너지·자신감·식욕·카페인은 0~10, 우울·불안·죽고 싶은 생각은 0~4).
진단은 하지 말고, 눈에 띄는 패턴과 진료 때 의사에게 이야기하거나 물어볼 만한 점을 쉬운 말로 정리해 줘.

${lines.join('\n') || '(기록 없음)'}`;
}

// ---------- 진료용 요약: 최근 n주를 숫자로 정리 (화면·글·인쇄가 같이 쓴다) ----------
export const SHORT_SLEEP = 300;   // 이 분(5시간)보다 짧게 잔 날을 따로 적는다
// back: 며칠 전에 끝나는 구간인지 (0이면 오늘까지). 주 단위로 나눠 그릴 때 쓴다.
export function summary(weeks, back = 0) {
  const n = weeks * 7, t = addDays(today(), -back);
  const dates = Array.from({ length: n }, (_, i) => addDays(t, i - n + 1));
  const days = dates.map((d) => db.entries[d] || null), got = days.filter(Boolean);
  const stat = (key) => {
    const v = got.map((e) => e[key]).filter((x) => x != null);
    return v.length ? { avg: avg(v), min: Math.min(...v), max: Math.max(...v), n: v.length } : null;
  };
  // 그 항목이 from 단계 이상이었던 날짜들
  const when = (key, from) => got.filter((e) => e[key] != null && e[key] >= from).map((e) => e.date);
  return {
    weeks, dates, days, got,
    mood: stat('mood'), energy: stat('energy'), conf: stat('conf'), sleep: stat('sleepMin'),
    high: { dep: when('dep', 3), anx: when('anx', 3), psy: when('psy', 1), si: when('si', 1) },
    shortSleep: got.filter((e) => e.sleepMin != null && e.sleepMin < SHORT_SLEEP).map((e) => e.date),
    signs: SIGNS.map(([k, label]) => [label, got.filter((e) => e.signs && e.signs[k]).length]).filter(([, c]) => c),
    psych: [...new Set(got.flatMap((e) => Object.keys(e.psych || {}).filter((k) => e.psych[k])))].map((k) => [psyName(k), got.filter((e) => e.psych && e.psych[k]).length]),
    fx: [...new Set(got.flatMap((e) => Object.keys(e.fx || {}).filter((k) => e.fx[k])))].map((k) => [fxName(k), got.filter((e) => e.fx && e.fx[k]).length]),
    meds: db.meds.map((m) => [m, dates.filter((d) => medsFor(d).some((x) => x.name === m.name && (x.dose || '') === (m.dose || ''))).length]),
    period: got.filter((e) => e.period).map((e) => e.date),
    notes: got.filter((e) => e.note).map((e) => [e.date, e.note]),
    signals: signals(),
  };
}
