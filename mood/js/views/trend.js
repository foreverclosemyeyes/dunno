// 흐름 화면 (주 / 월)
import { DISCLAIMER, LEVELS, nameOf } from '../constants.js';
import { WD, addDays, ds, durText, longDate, md, monthTitle, parse, today, weekStart } from '../dates.js';
import { app } from '../dom.js';
import { EN, F, T } from '../i18n.js';
import { IC } from '../icons.js';
import { trend } from '../state.js';
import { db } from '../store.js';
import { fontScale, moodFill, tone } from '../theme.js';

export function trendRange(anchor) {
  if (trend.mode === 'week') return { start: weekStart(anchor), n: 7 };
  const d = parse(anchor);
  return { start: ds(new Date(d.getFullYear(), d.getMonth(), 1)), n: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() };
}
export function shiftAnchor(anchor, step) {
  if (trend.mode === 'week') return addDays(anchor, 7 * step);
  const d = parse(anchor);
  return ds(new Date(d.getFullYear(), d.getMonth() + step, 1));
}
export function shiftTrend(step) { trend.anchor = shiftAnchor(trend.anchor, step); trend.pick = null; }
export const mean = (list, key) => {
  const v = list.map((e) => e[key]).filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
export const rangeEntries = (r) => Array.from({ length: r.n }, (_, i) => db.entries[addDays(r.start, i)] || null);

// 점들을 부드러운 곡선으로 잇는다
export function smoothPath(pts, yMin, yMax) {
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

export function viewTrend() {
  const C = document.documentElement.dataset.theme === 'light'
    ? { ink: '#3a3a3c', ring: '#fff', grid: 'rgba(60,60,67,.1)', muted: '#7c7c82', faint: '#b0b0b6' }
    : { ink: '#fff', ring: '#1c1c1e', grid: 'rgba(255,255,255,.1)', muted: '#9a9aa0', faint: '#6a6a70' };
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
  const xLabelsAt = (y) => days.map((_, i) => {
    const d = addDays(r.start, i), dt = parse(d);
    if (!isWeek && (dt.getDate() - 1) % 7 !== 0) return '';
    return `<text x="${cx(i).toFixed(1)}" y="${y}" text-anchor="middle" font-size="${(10 * FS).toFixed(1)}" fill="${d === t ? C.ink : C.muted}">${isWeek ? WD()[dt.getDay()] : dt.getDate()}</text>`;
  }).join('');
  const grid = (ticks, y) => ticks.map(([v, label]) => `<line x1="0" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${C.grid}"/>
    <text x="${W + 6}" y="${(y(v) + 3.5).toFixed(1)}" font-size="${(10 * FS).toFixed(1)}" fill="${C.faint}">${label}</text>`).join('');
  const plot = (inner) => `<div class="plot" data-n="${r.n}" data-w="${W}"><svg width="${W + AX}" height="${H}">${inner}${xLabelsAt(H - 4)}</svg></div>`;

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

  const lineCard = (key, name, max, ticks, headHtml) => {
    const y = (v) => TOP + (1 - v / max) * (BOT - TOP), ink = tone(key, 10) || C.ink;
    const pts = [];
    days.forEach((e, i) => { if (e && e[key] != null) pts.push([cx(i), y(e[key]), i]); });
    let out = `<defs><linearGradient id="g-${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ink}" stop-opacity=".26"/><stop offset="1" stop-color="${ink}" stop-opacity="0"/></linearGradient></defs>`;
    out += grid(ticks, y);
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
    return `<section class="card mcard">${headHtml}${plot(out)}</section>`;
  };
  // 기분·에너지·자신감 (0~10)
  const scoreCard = (key, icon, name) => lineCard(key, name, 10, [[0, '0'], [5, '5'], [10, '10']], head(key, icon, name));

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

  // 증상(우울·고조·불안)은 기분과 같은 선 그래프로, 0(없음)~4(매우 높음)
  const symCard = (key, name) => {
    const high = got.filter((e) => e[key] >= 3).length;
    const big = pickDate ? (pickE ? LEVELS[pickE[key] || 0] : '–') : F('{0}일', high);
    return lineCard(key, name, 4, [[0, ''], [2, ''], [4, '']], `<div class="mt">${name}</div><div class="mv"><b>${big}</b><span>${pickDate ? pickLabel : T('높음 이상인 날')}</span></div>`);
  };

  // 생리: 이어진 날들을 하나의 띠로
  const guide = (h) => (pick == null ? '' : `<line x1="${cx(pick).toFixed(1)}" x2="${cx(pick).toFixed(1)}" y1="0" y2="${h}" stroke="${C.muted}"/>`);
  const srow = (name, right, h, inner) => `<div class="srow"><div class="sh"><span>${name}</span><span>${right}</span></div><svg width="${W}" height="${h}">${inner}${guide(h)}</svg></div>`;
  const periodRow = () => {
    let out = '', n = 0;
    for (let i = 0; i < r.n; i++) {
      if (!(days[i] && days[i].period)) continue;
      let j = i;
      while (j + 1 < r.n && days[j + 1] && days[j + 1].period) j++;
      out += `<rect x="${(col * i + 2).toFixed(1)}" y="4" width="${(col * (j - i + 1) - 4).toFixed(1)}" height="8" rx="4" fill="${C.ink}"/>`;
      n += j - i + 1;
      i = j;
    }
    return srow(T('생리'), pickDate ? (pickE && pickE.period ? T('생리 중') : '–') : n ? F('{0}일', n) : T('없음'), 16, out);
  };
  const marks = `<section class="card mcard"><div class="plot strips" data-n="${r.n}" data-w="${W}">
      ${periodRow()}
      <svg width="${W}" height="18">${xLabelsAt(13)}</svg>
    </div></section>`;

  app.innerHTML = `
    <header class="top"><div><div class="over">${F('기록 {0}일 / {1}일', got.length, r.n)}</div><h1>${T('흐름')}</h1></div>
      <div class="segc"><button data-act="mode" data-mode="week" aria-pressed="${isWeek}">${EN ? 'Week' : T('주')}</button>
        <button data-act="mode" data-mode="month" aria-pressed="${!isWeek}">${EN ? 'Month' : T('월')}</button></div></header>
    <div class="pnav">
      <button data-act="shift" data-step="-1" aria-label="${T('이전')}">‹</button><span>${title}</span>
      <button data-act="shift" data-step="1" aria-label="${T('다음')}" ${shiftAnchor(r.start, 1) > t ? 'disabled' : ''}>›</button></div>
    ${pickDate ? `<div class="pickbar"><span>${pickLabel}${pickE ? '' : T(' · 기록 없음')}</span><button class="mini" data-act="openDay" data-date="${pickDate}">${pickE ? T('기록 열기') : T('기록하기')}</button></div>` : ''}
    ${isWeek ? '' : calendar()}
    ${scoreCard('mood', IC.face(5), T('기분'))}${scoreCard('energy', IC.battery(6), T('에너지'))}${scoreCard('conf', IC.star, T('자신감'))}
    ${sleepCard()}
    ${symCard('dep', T('우울'))}${symCard('elev', T('고조'))}${symCard('anx', T('불안'))}
    ${marks}
    <p class="foot">${T('그래프나 달력에서 날짜를 누르면 그날 값을 볼 수 있어요.')}<br>${DISCLAIMER}</p>`;
}
