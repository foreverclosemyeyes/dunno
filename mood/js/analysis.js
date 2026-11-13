// 초기 신호 · 인사이트 · 진료용 요약 계산 (전부 이 폰 안에서)
import { SIGNS, TAGS, cafMg, drinkText, fxName, fxNames, psyName, psyNames } from './constants.js';
import { WD, addDays, durText, md, parse, today } from './dates.js';
import { F, T } from './i18n.js';
import { aided, medsFor, medsText } from './meds.js';
import { db } from './store.js';

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

// 어떤 시기가 시작되기 전 사흘이 평소(그 앞 4주)와 어떻게 달랐는지. mine이면 약 기록도 본다.
function before(entries, start, mine) {
  const pick = (from, to) => Object.keys(entries).filter((k) => k >= addDays(start, -from) && k <= addDays(start, -to)).map((k) => entries[k]);
  const win = pick(3, 1), base = pick(31, 4), vals = (list, key) => list.map((e) => e[key]).filter((x) => x != null);
  if (win.length < 2) return { points: [], lessSleep: false };
  const points = [], sw = vals(win, 'sleepMin'), sb = vals(base, 'sleepMin');
  const sleepDiff = sw.length && sb.length >= 3 ? Math.round(avg(sw) - avg(sb)) : 0;
  if (Math.abs(sleepDiff) >= 45) points.push(F(sleepDiff < 0 ? '잠이 평소보다 {0} 적었어요' : '잠이 평소보다 {0} 많았어요', durText(Math.abs(sleepDiff))));
  const missed = mine && db.meds.length ? win.filter((e) => !medsFor(e.date).length).length : 0;
  if (missed) points.push(F('약을 안 먹은 날이 {0}일 있었어요', missed));
  const cw = vals(win, 'caffeine'), cb = vals(base, 'caffeine');
  if (cw.length && cb.length >= 3 && avg(cw) >= avg(cb) + 2) points.push(T('카페인이 평소보다 많았어요'));
  const drank = win.filter((e) => e.tags && e.tags.alcohol).length;
  if (drank) points.push(F('술을 마신 날이 {0}일 있었어요', drank));
  const anxious = win.filter((e) => e.anx >= 2).length;
  if (anxious >= 2) points.push(F('불안이 보통 이상인 날이 {0}일 있었어요', anxious));
  if (win.some((e) => e.period)) points.push(T('생리 중이었어요'));
  return { points, lessSleep: sleepDiff <= -45 };
}

// 최근 7일 읽기.
//   { kind: 'high'(들뜬 쪽) | 'low'(가라앉은 쪽) | 'mixed'(둘 다) | 'even'(뚜렷하지 않음), title,
//     flow: 언제부터 며칠째인지와 방향(없으면 ''), groups: [[묶음 이름, [근거 문장, …]], …],
//     lead: 이번 흐름이 시작되기 전 사흘 { title, points, past: 예전 시기들과 견준 문장 } 또는 null }
// 최근 7일 중 4일 이상 적었을 때만 나온다 (모자라면 null). 수면은 그 전 4주의 내 평균과 견준다.
export function recentState(entries = db.entries) {
  const t = today(), mine = entries === db.entries;
  const span = (from, to) => Object.keys(entries).filter((k) => k > addDays(t, -from) && k <= addDays(t, -to)).map((k) => entries[k]);
  const now = span(7, 0), prior = span(35, 7);
  if (now.length < 4) return null;
  const vals = (list, key) => list.map((e) => e[key]).filter((x) => x != null);
  // 평균이 아니라 "그런 날이 며칠이었는지"로 센다 (7일 중 4~5일만 들떠도 평균은 묻히기 때문에). 4일 이상이면 근거로 넣는다.
  const daysWith = (test) => now.filter(test).length, sleep = avg(vals(now, 'sleepMin'));
  const base = vals(prior, 'sleepMin'), sleepDiff = sleep != null && base.length >= 3 ? Math.round(sleep - avg(base)) : null;
  const high = [], low = [], also = [];
  const add = (list, n, min, text) => { if (n >= min) list.push(F(text, n)); };
  const energyUp = daysWith((e) => e.energy >= 7);
  add(high, daysWith((e) => e.mood >= 7), 4, '기분이 7 이상인 날 {0}일');
  add(high, energyUp, 4, '에너지가 7 이상인 날 {0}일');
  if (sleepDiff != null && sleepDiff <= -60 && energyUp >= 3) high.push(F('잠이 평소보다 {0} 줄었는데 에너지는 높음', durText(-sleepDiff)));
  add(high, daysWith((e) => e.conf >= 8), 4, '자신감이 8 이상인 날 {0}일');
  add(high, daysWith((e) => !!e.signs && Object.keys(e.signs).some((k) => e.signs[k])), 2, '말·생각이 빨라지거나 일을 벌인 날 {0}일');
  add(low, daysWith((e) => e.mood != null && e.mood <= 3), 4, '기분이 3 이하인 날 {0}일');
  add(low, daysWith((e) => e.energy != null && e.energy <= 3), 4, '에너지가 3 이하인 날 {0}일');
  add(low, daysWith((e) => e.dep >= 2), 4, '우울이 보통 이상인 날 {0}일');
  if (sleepDiff != null && Math.abs(sleepDiff) >= 60 && high.length < 3) low.push(F(sleepDiff > 0 ? '잠이 평소보다 {0} 늘어남' : '잠이 평소보다 {0} 줄어듦', durText(Math.abs(sleepDiff))));
  add(low, daysWith((e) => e.si >= 1), 1, '죽고 싶은 생각이 있던 날 {0}일');
  // 어느 쪽이든 함께 봐야 하는 것
  const psyDays = daysWith((e) => e.psy >= 1);
  add(also, psyDays, 1, '정신병적 증상이 있던 날 {0}일');
  add(also, daysWith((e) => e.anx >= 2), 3, '불안이 보통 이상인 날 {0}일');
  add(also, daysWith((e) => e.sleepMin != null && e.sleepMin < SHORT_SLEEP), 2, '5시간 미만으로 잔 밤 {0}일');
  if (mine && db.meds.length) add(also, daysWith((e) => !medsFor(e.date).length), 2, '약을 안 먹은 날 {0}일');

  const isHigh = high.length >= 3, isLow = low.length >= 3, kind = isHigh && isLow ? 'mixed' : isHigh ? 'high' : isLow ? 'low' : 'even';
  const title = {
    mixed: T('최근 7일은 들뜬 모습과 가라앉은 모습이 함께 보여요.'),
    high: psyDays ? T('최근 7일은 경조증·조증 때 흔히 보이는 모습과 겹치는 점이 많고, 정신병적 증상도 함께 적혀 있어요.') : T('최근 7일은 경조증 때 흔히 보이는 모습과 겹치는 점이 많아요.'),
    low: psyDays ? T('최근 7일은 우울 삽화 때 흔히 보이는 모습과 겹치는 점이 많고, 정신병적 증상도 함께 적혀 있어요.') : T('최근 7일은 우울 삽화 때 흔히 보이는 모습과 겹치는 점이 많아요.'),
    even: psyDays ? T('최근 7일은 기분이 한쪽으로 뚜렷하게 기울지는 않았지만, 정신병적 증상이 적혀 있어요.') : T('최근 7일은 한쪽으로 뚜렷하게 기운 모습이 보이지 않아요.'),
  }[kind];
  const groups = [[T('들뜬 쪽'), high], [T('가라앉은 쪽'), low], [T('함께 보이는 것'), also]].filter(([, list]) => list.length);

  // 언제부터인지, 요 사흘 방향은 어떤지, 그리고 시작되기 전 사흘
  let flow = '', lead = null;
  if (kind === 'high' || kind === 'low') {
    const all = runs(entries, kind === 'high' ? upDay : downDay), cur = all[all.length - 1];
    if (cur && dayGap(cur.end, t) <= 2) {
      const moods = vals(now, 'mood'), late = moods.slice(-3), early = moods.slice(0, -3);
      const turn = late.length === 3 && early.length >= 2 ? avg(late) - avg(early) : 0;
      const dir = turn >= 1 ? T(' 요 사흘은 기분이 더 올라가는 중이에요.') : turn <= -1 ? T(' 요 사흘은 기분이 더 내려가는 중이에요.') : '';
      flow = F('{0}쯤부터 {1}일째 이어지고 있어요.', md(parse(cur.start)), dayGap(cur.start, t) + 1) + dir;
      const b = before(entries, cur.start, mine), past = all.slice(0, -1);
      const pastLess = past.filter((r) => before(entries, r.start, mine).lessSleep).length;
      const pastText = past.length >= 2 ? F(kind === 'high' ? '지금까지 들뜬 시기 {0}번 중 {1}번은 시작 전에 잠이 줄었어요.' : '지금까지 가라앉은 시기 {0}번 중 {1}번은 시작 전에 잠이 줄었어요.', past.length, pastLess) : '';
      if (b.points.length || pastText) lead = { title: kind === 'high' ? T('들뜬 흐름이 시작되기 전 사흘') : T('가라앉은 흐름이 시작되기 전 사흘'), points: b.points, past: pastText };
    }
  }
  return { kind, title, flow, groups, lead };
}

// 인사이트: 두 묶음의 평균을 견준 관찰들. 차이가 큰 것부터 나온다.
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
  const compare = (key, a, b, labels, { min = 3, gap, fmt, unit }, say) => {
    if (a.length < min || b.length < min) return;
    const x = mean(a, key), y = mean(b, key), d = Math.abs(x - y);
    if (d < gap) return;
    out.push({ text: F(say[x < y ? 0 : 1], fmt(d)), a: [labels[0], fmt(x), a.length], b: [labels[1], fmt(y), b.length], weight: d / unit });
  };
  const sleep = { gap: 20, fmt: dur, unit: 60 }, score = { gap: 0.8, fmt: num, unit: 1 }, days = [T('그런 날'), T('다른 날')];
  // 항목을 따로따로 적을 수 있어서 빈 값(null)이 섞여 있다. null은 비교에서 0처럼 굴기 때문에, 값이 있는 날만 골라서 나눈다.
  const has = (key) => (e) => e[key] != null;
  const sl = all.filter(has('sleepMin')), slE = sl.filter(has('energy')), slM = sl.filter(has('mood')), withMood = all.filter(has('mood'));
  const night = (e) => entries[addDays(e.date, 1)];   // 그날 밤의 잠과 다음 날 기분은 다음 날 기록에 있다

  // 잠과 에너지·기분
  compare('energy', slE.filter((e) => e.sleepMin < 360), slE.filter((e) => e.sleepMin >= 360), [T('적게 잔 날'), T('다른 날')], score,
    ['6시간보다 적게 잔 날은 에너지가 {0} 낮았어요.', '6시간보다 적게 잔 날은 에너지가 {0} 높았어요.']);
  compare('sleepMin', slE.filter((e) => e.energy >= 7), slE.filter((e) => e.energy < 7), days, sleep,
    ['에너지가 높았던 날은 전날 밤에 {0} 덜 잤어요.', '에너지가 높았던 날은 전날 밤에 {0} 더 잤어요.']);
  compare('sleepMin', slM.filter((e) => e.mood <= 3), slM.filter((e) => e.mood > 3), days, sleep,
    ['기분이 가라앉은 날은 전날 밤에 {0} 덜 잤어요.', '기분이 가라앉은 날은 전날 밤에 {0} 더 잤어요.']);
  compare('sleepMin', sl.filter((e) => e.tired), sl.filter((e) => !e.tired), days, sleep,
    ['일어났을 때 피곤했던 날은 {0} 덜 잤어요.', '일어났을 때 피곤했던 날은 {0} 더 잤어요.']);
  // 약
  if (mine && db.meds.length) {
    compare('mood', withMood.filter((e) => !medsFor(e.date).length), withMood.filter((e) => medsFor(e.date).length), [T('안 먹은 날'), T('먹은 날')], score,
      ['약을 안 먹은 날은 기분이 {0} 낮았어요.', '약을 안 먹은 날은 기분이 {0} 높았어요.']);
    compare('sleepMin', sl.filter(aided), sl.filter((e) => !aided(e)), [T('먹은 날'), T('안 먹은 날')], { ...sleep, min: 2 },
      ['안정제·수면제를 먹은 날 밤에는 {0} 덜 잤어요.', '안정제·수면제를 먹은 날 밤에는 {0} 더 잤어요.']);
  }
  // 카페인 · 술 · 운동 · 생리
  const caf = all.filter((e) => e.caffeine != null && night(e) && night(e).sleepMin != null);
  compare('sleepMin', caf.filter((e) => e.caffeine >= 7).map(night), caf.filter((e) => e.caffeine < 7).map(night), days, sleep,
    ['카페인을 많이 마신 날 밤에는 {0} 덜 잤어요.', '카페인을 많이 마신 날 밤에는 {0} 더 잤어요.']);
  const ap = all.filter((e) => e.caffeine != null && e.appetite != null);
  compare('appetite', ap.filter((e) => e.caffeine >= 7), ap.filter((e) => e.caffeine < 7), days, { ...score, gap: 1 },
    ['카페인을 많이 마신 날은 식욕이 {0} 낮았어요.', '카페인을 많이 마신 날은 식욕이 {0} 높았어요.']);
  const tagged = (k) => (e) => !!(e.tags && e.tags[k]);
  const nextMood = all.filter((e) => night(e) && night(e).mood != null);
  compare('mood', nextMood.filter(tagged('alcohol')).map(night), nextMood.filter((e) => !tagged('alcohol')(e)).map(night), days, score,
    ['술 마신 다음 날은 기분이 {0} 낮았어요.', '술 마신 다음 날은 기분이 {0} 높았어요.']);
  const nextSleep = all.filter((e) => night(e) && night(e).sleepMin != null);
  compare('sleepMin', nextSleep.filter(tagged('exercise')).map(night), nextSleep.filter((e) => !tagged('exercise')(e)).map(night), days, sleep,
    ['운동한 날 밤에는 {0} 덜 잤어요.', '운동한 날 밤에는 {0} 더 잤어요.']);
  compare('mood', withMood.filter((e) => e.period), withMood.filter((e) => !e.period), [T('생리 중'), T('다른 날')], score,
    ['생리 중인 날은 기분이 {0} 낮았어요.', '생리 중인 날은 기분이 {0} 높았어요.']);
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
  compare('sleepMin', ...split(sl.filter(has('dep')), isDep), days, sleep, ['우울이 보통 이상인 날은 전날 밤에 {0} 덜 잤어요.', '우울이 보통 이상인 날은 전날 밤에 {0} 더 잤어요.']);
  compare('sleepMin', ...split(sl.filter(has('anx')), isAnx), days, sleep, ['불안이 보통 이상인 날은 전날 밤에 {0} 덜 잤어요.', '불안이 보통 이상인 날은 전날 밤에 {0} 더 잤어요.']);
  compare('sleepMin', ...split(sl, isPsy), days, sleep, ['정신병적 증상이 있던 날은 전날 밤에 {0} 덜 잤어요.', '정신병적 증상이 있던 날은 전날 밤에 {0} 더 잤어요.']);
  compare('sleepMin', ...split(sl.filter(has('si')), isSi), days, sleep, ['죽고 싶은 생각이 있던 날은 전날 밤에 {0} 덜 잤어요.', '죽고 싶은 생각이 있던 날은 전날 밤에 {0} 더 잤어요.']);
  const both = (a, b) => all.filter((e) => e[a] != null && e[b] != null);
  compare('energy', ...split(all.filter(has('energy')), isPsy), days, score, ['정신병적 증상이 있던 날은 에너지가 {0} 낮았어요.', '정신병적 증상이 있던 날은 에너지가 {0} 높았어요.']);
  compare('mood', ...split(withMood, isPsy), days, score, ['정신병적 증상이 있던 날은 기분이 {0} 낮았어요.', '정신병적 증상이 있던 날은 기분이 {0} 높았어요.']);
  compare('dep', ...split(both('anx', 'dep'), isAnx), days, level, ['불안이 보통 이상인 날은 우울이 {0}단계 낮았어요.', '불안이 보통 이상인 날은 우울이 {0}단계 높았어요.']);
  compare('anx', ...split(all.filter(has('anx')), isPsy), days, level, ['정신병적 증상이 있던 날은 불안이 {0}단계 낮았어요.', '정신병적 증상이 있던 날은 불안이 {0}단계 높았어요.']);
  compare('caffeine', ...split(both('anx', 'caffeine'), isAnx), days, { ...score, gap: 1 }, ['불안이 보통 이상인 날은 카페인이 {0} 적었어요.', '불안이 보통 이상인 날은 카페인이 {0} 많았어요.']);
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
    const named = (label, list, on) => { const got = list.filter(([k]) => on && on[k]).map(([, l]) => l).join(', '); return got ? `${label}: ${got}` : ''; };
    lines.push([d, val('기분', e.mood), val('에너지', e.energy), val('자신감', e.conf), val('우울', e.dep, '/4'), val('불안', e.anx, '/4'), psyNames(e.psych).length ? `정신병적 증상: ${psyNames(e.psych).join(', ')}` : val('정신병적 증상', e.psy, '/4'), val('죽고 싶은 생각', e.si, '/4'),
      e.sleepMin != null ? `수면 ${Math.floor(e.sleepMin / 60)}시간 ${e.sleepMin % 60}분${aided(e) ? '(전날 안정제·수면제 복용)' : ''}` : '', e.tired ? '기상 시 피곤' : '', e.period ? '생리 중' : '',
      e.appetite != null ? `식욕 ${e.appetite}` : '', e.drinks ? `카페인 약 ${cafMg(e.drinks)}mg(${drinkText(e.drinks) || '없음'})` : e.caffeine != null ? `카페인 ${e.caffeine}/10` : '', `약: ${meds || '없음'}`, fxNames(e.fx).length ? `부작용: ${fxNames(e.fx).join(', ')}` : '', named('한 것', TAGS, e.tags), signs ? `체크: ${signs}` : '', e.note ? `메모: ${e.note}` : '']
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
    tags: TAGS.map(([k, label]) => [label, got.filter((e) => e.tags && e.tags[k]).length]).filter(([, c]) => c),
    meds: db.meds.map((m) => [m, dates.filter((d) => medsFor(d).some((x) => x.name === m.name && (x.dose || '') === (m.dose || ''))).length]),
    period: got.filter((e) => e.period).map((e) => e.date),
    notes: got.filter((e) => e.note).map((e) => [e.date, e.note]),
    signals: signals(),
  };
}
