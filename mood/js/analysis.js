// 초기 신호 · 인사이트 · 진료용 요약 계산 (전부 이 폰 안에서)
import { SIGNS, cafMg, drinkText } from './constants.js';
import { addDays, durText, today } from './dates.js';
import { T } from './i18n.js';
import { aided, medsFor, medsText } from './meds.js';
import { db } from './store.js';

// ---------- 초기 신호 · 인사이트 (전부 이 폰 안에서 계산) ----------
export const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
export const sortedEntries = () => Object.keys(db.entries).sort().map((k) => db.entries[k]);

export function signals() {
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
  if (count((e) => e.si >= 1) >= 3) out.push(T('죽고 싶은 생각이 며칠째 이어지고 있어요. 진료 때 꼭 이야기해 보세요.'));
  return out;
}

// 인사이트: 두 묶음의 평균을 나란히 놓은 비교들. { title, a: [이름, 값], b: [이름, 값] }
// 화면은 문장 대신 두 숫자를 크게 보여 준다. 차이가 뚜렷할 때만 넣는다.
export function insights() {
  const all = sortedEntries(), out = [];
  if (all.length < 7) return out;
  const mean = (list, key) => avg(list.map((e) => e[key]));
  const dur = (m) => durText(Math.round(m)), num = (x) => x.toFixed(1);
  // 두 묶음(각 min일 이상)의 평균이 gap 이상 차이 나면 넣는다
  const compare = (title, key, a, b, labels, { min = 3, gap, fmt }) => {
    if (a.length < min || b.length < min) return;
    const x = mean(a, key), y = mean(b, key);
    if (Math.abs(x - y) >= gap) out.push({ title, a: [labels[0], fmt(x)], b: [labels[1], fmt(y)] });
  };
  const sleep = { gap: 20, fmt: dur }, days = [T('그런 날'), T('다른 날')];
  // 항목을 따로따로 적을 수 있어서 빈 값(null)이 섞여 있다. null은 비교에서 0처럼 굴기 때문에, 값이 있는 날만 골라서 나눈다.
  const has = (key) => (e) => e[key] != null;
  const sl = all.filter(has('sleepMin')), slE = sl.filter(has('energy')), slM = sl.filter(has('mood'));
  compare(T('에너지가 높았던 날, 전날 밤 잠'), 'sleepMin', slE.filter((e) => e.energy >= 7), slE.filter((e) => e.energy < 7), days, sleep);
  compare(T('기분이 가라앉은 날, 전날 밤 잠'), 'sleepMin', slM.filter((e) => e.mood <= 3), slM.filter((e) => e.mood > 3), days, sleep);
  compare(T('일어났을 때 피곤했던 날의 잠'), 'sleepMin', sl.filter((e) => e.tired), sl.filter((e) => !e.tired), days, sleep);
  // 카페인 많이 마신 날 → 그날 밤 잠 (다음 날 기록의 수면)
  const night = (e) => db.entries[addDays(e.date, 1)];
  const caf = all.filter((e) => e.caffeine != null && night(e) && night(e).sleepMin != null);
  compare(T('카페인을 많이 마신 날 밤의 잠'), 'sleepMin', caf.filter((e) => e.caffeine >= 7).map(night), caf.filter((e) => e.caffeine < 7).map(night), days, sleep);
  const ap = all.filter((e) => e.caffeine != null && e.appetite != null);
  compare(T('카페인을 많이 마신 날의 식욕'), 'appetite', ap.filter((e) => e.caffeine >= 7), ap.filter((e) => e.caffeine < 7), days, { gap: 1, fmt: num });
  const withMood = all.filter(has('mood'));
  compare(T('생리 중인 날의 기분'), 'mood', withMood.filter((e) => e.period), withMood.filter((e) => !e.period), [T('생리 중'), T('다른 날')], { gap: 0.8, fmt: num });
  compare(T('안정제·수면제를 먹은 날 밤의 잠'), 'sleepMin', sl.filter(aided), sl.filter((e) => !aided(e)), [T('먹은 날'), T('안 먹은 날')], { min: 2, gap: 0, fmt: dur });
  // 최근 7일과 그 전 7일
  const t = today(), span = (from, to) => all.filter((e) => e.date > addDays(t, -from) && e.date <= addDays(t, -to));
  const now = span(7, 0), was = span(14, 7), weeks = [T('최근 7일'), T('그 전 7일')];
  compare(T('기분 평균'), 'mood', now.filter(has('mood')), was.filter(has('mood')), weeks, { gap: 1, fmt: num });
  compare(T('하루 평균 잠'), 'sleepMin', now.filter(has('sleepMin')), was.filter(has('sleepMin')), weeks, { gap: 30, fmt: dur });
  return out;
}

// AI 앱에 붙여 넣을 수 있는 최근 4주 요약 글
export function aiSummary() {
  const t = today(), lines = [];
  for (let i = 27; i >= 0; i--) {
    const d = addDays(t, -i), e = db.entries[d], meds = medsText(medsFor(d));
    if (!e) { if (meds) lines.push(`${d} | (기록 없음) | 약: ${meds}`); continue; }
    const signs = SIGNS.filter(([k]) => e.signs && e.signs[k]).map(([, l]) => l).join(', ');
    const val = (label, v, unit) => (v == null ? '' : `${label} ${v}${unit || ''}`);   // 안 적은 항목은 줄에서 뺀다
    lines.push([d, val('기분', e.mood), val('에너지', e.energy), val('자신감', e.conf), val('우울', e.dep, '/4'), val('고조', e.elev, '/4'), val('불안', e.anx, '/4'), val('죽고 싶은 생각', e.si, '/4'),
      e.sleepMin != null ? `수면 ${Math.floor(e.sleepMin / 60)}시간 ${e.sleepMin % 60}분${aided(e) ? '(전날 안정제·수면제 복용)' : ''}` : '', e.tired ? '기상 시 피곤' : '', e.period ? '생리 중' : '',
      e.appetite != null ? `식욕 ${e.appetite}` : '', e.drinks ? `카페인 약 ${cafMg(e.drinks)}mg(${drinkText(e.drinks) || '없음'})` : e.caffeine != null ? `카페인 ${e.caffeine}/10` : '', `약: ${meds || '없음'}`, signs ? `체크: ${signs}` : '', e.note ? `메모: ${e.note}` : '']
      .filter(Boolean).join(' | '));
  }
  return `아래는 내가 직접 적은 최근 4주 기분·수면·복약 기록이야 (기분·에너지·자신감·식욕·카페인은 0~10, 우울·고조·불안은 0~4).
진단은 하지 말고, 눈에 띄는 패턴과 진료 때 의사에게 이야기하거나 물어볼 만한 점을 쉬운 말로 정리해 줘.

${lines.join('\n') || '(기록 없음)'}`;
}

// ---------- 진료용 요약: 최근 n주를 숫자로 정리 (화면·글·인쇄가 같이 쓴다) ----------
export const SHORT_SLEEP = 300;   // 이 분(5시간)보다 짧게 잔 날을 따로 적는다
export function summary(weeks) {
  const n = weeks * 7, t = today();
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
    high: { dep: when('dep', 3), elev: when('elev', 3), anx: when('anx', 3), si: when('si', 1) },
    shortSleep: got.filter((e) => e.sleepMin != null && e.sleepMin < SHORT_SLEEP).map((e) => e.date),
    signs: SIGNS.map(([k, label]) => [label, got.filter((e) => e.signs && e.signs[k]).length]).filter(([, c]) => c),
    meds: db.meds.map((m) => [m, dates.filter((d) => medsFor(d).some((x) => x.name === m.name && (x.dose || '') === (m.dose || ''))).length]),
    period: got.filter((e) => e.period).map((e) => e.date),
    notes: got.filter((e) => e.note).map((e) => [e.date, e.note]),
    signals: signals(),
  };
}
