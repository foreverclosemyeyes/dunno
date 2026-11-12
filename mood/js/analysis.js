// 초기 신호 · 인사이트 계산 (전부 이 폰 안에서)
import { SIGNS, cafMg, drinkText } from './constants.js';
import { addDays, durText, today } from './dates.js';
import { F, T } from './i18n.js';
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
  return out;
}

export function insights() {
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
export function aiSummary() {
  const t = today(), lines = [];
  for (let i = 27; i >= 0; i--) {
    const d = addDays(t, -i), e = db.entries[d], meds = medsText(medsFor(d));
    if (!e) { if (meds) lines.push(`${d} | (기록 없음) | 약: ${meds}`); continue; }
    const signs = SIGNS.filter(([k]) => e.signs && e.signs[k]).map(([, l]) => l).join(', ');
    lines.push([d, `기분 ${e.mood}`, `에너지 ${e.energy}`, e.conf != null ? `자신감 ${e.conf}` : '', `우울 ${e.dep}/4`, `고조 ${e.elev}/4`, `불안 ${e.anx}/4`,
      e.sleepMin != null ? `수면 ${Math.floor(e.sleepMin / 60)}시간 ${e.sleepMin % 60}분${aided(e) ? '(전날 안정제·수면제 복용)' : ''}` : '', e.tired ? '기상 시 피곤' : '', e.period ? '생리 중' : '',
      e.appetite != null ? `식욕 ${e.appetite}` : '', e.drinks ? `카페인 약 ${cafMg(e.drinks)}mg(${drinkText(e.drinks) || '없음'})` : e.caffeine != null ? `카페인 ${e.caffeine}/10` : '', `약: ${meds || '없음'}`, signs ? `체크: ${signs}` : '', e.note ? `메모: ${e.note}` : '']
      .filter(Boolean).join(' | '));
  }
  return `아래는 내가 직접 적은 최근 4주 기분·수면·복약 기록이야 (기분·에너지·자신감·식욕·카페인은 0~10, 우울·고조·불안은 0~4).
진단은 하지 말고, 눈에 띄는 패턴과 진료 때 의사에게 이야기하거나 물어볼 만한 점을 쉬운 말로 정리해 줘.

${lines.join('\n') || '(기록 없음)'}`;
}
