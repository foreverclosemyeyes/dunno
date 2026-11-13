// 진료 화면: 다음 진료일, 진료 때 말할 것, 진료용 요약 (최근 2주/4주를 한 장으로)
import { SHORT_SLEEP, summary } from '../analysis.js';
import { DISCLAIMER, LEVELS } from '../constants.js';
import { durText, md, parse, today } from '../dates.js';
import { app, esc } from '../dom.js';
import { F, T } from '../i18n.js';
import { medKey, medsFor } from '../meds.js';
import { clinicView } from '../state.js';
import { db } from '../store.js';
import { tone } from '../theme.js';
import { smoothPath } from './trend.js';

// 다음 진료일과 말할 것 목록. { next: 'YYYY-MM-DD' 또는 '', notes: ['…', …] }
export const clinicData = () => (db.clinic || (db.clinic = { next: '', notes: [] }));

const shortDate = (s) => { const d = parse(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const dateList = (list) => list.map(shortDate).join(', ');
const daysUntil = (date) => Math.round((parse(date) - parse(today())) / 86400000);
const one = (x) => (Math.round(x * 10) / 10).toFixed(1);

function nextText() {
  const { next } = clinicData();
  if (!next) return '';
  const left = daysUntil(next);
  return left > 0 ? F('진료까지 {0}일', left) : left === 0 ? T('오늘 진료') : '';
}

// 한눈에 보는 그림: 날짜를 가로로 맞춰 놓고 항목마다 한 칸씩 위에서 아래로 쌓는다.
// 칸마다 왼쪽 위에 이름(과 평균), 오른쪽 위에 한 줄 요약, 그 아래에 그림이 온다.
//   기분·에너지(곡선) → 수면(곡선, 5시간 미만인 밤에 점) → 증상(곡선, 높을수록 심함) → 약·생리(그날에 점)
// 선은 전부 부드러운 실선, 표시는 전부 동그라미다. 색은 CSS 변수를 따라가서 다크·라이트·인쇄에서 그대로 읽힌다.
function figure(s, width) {
  const n = s.dates.length, pw = width - 20, col = pw / n;
  const cx = (i) => col * (i + 0.5);
  const ink = 'style="fill:var(--ink)"', mutedText = 'style="fill:var(--muted)"';
  const accent = tone('mood', 10) || 'var(--ink)';
  const marks = s.dates.map((d, i) => (i === 0 || parse(d).getDay() === 1 ? i : -1)).filter((i) => i >= 0);
  let out = '', y = 12;

  const head = (left, right) => {
    out += `<text x="0" y="${y}" font-size="12.5" font-weight="600" ${ink}>${left}</text>`;
    if (right) out += `<text x="${width}" y="${y}" font-size="11.5" text-anchor="end" ${mutedText}>${right}</text>`;
  };
  // 주마다(월요일) 세로줄: 그림이 있는 칸 안에만 긋는다
  const weekLines = (y1, y2) => marks.filter(Boolean).forEach((i) => {
    out += `<line x1="${(col * i).toFixed(1)}" x2="${(col * i).toFixed(1)}" y1="${y1}" y2="${y2}" style="stroke:var(--line)"/>`;
  });
  const dateLabels = (at) => marks.forEach((i) => {
    out += `<text x="${(col * i + 2).toFixed(1)}" y="${at}" font-size="10" ${mutedText}>${shortDate(s.dates[i])}</text>`;
  });
  const points = (key, yOf) => s.days.map((e, i) => (e && e[key] != null ? [cx(i), yOf(e[key]), e[key]] : null)).filter(Boolean);
  // 값이 있는 날들을 부드러운 곡선으로 잇는다 (하루뿐이면 점 하나). area가 있으면 곡선 아래를 옅게 채운다.
  const curve = (pts, yMin, yMax, color, w, area) => {
    if (pts.length < 2) { pts.forEach((p) => { out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" style="fill:${color}"/>`; }); return; }
    const d = smoothPath(pts, yMin, yMax);
    if (area) out += `<path d="${d}L${pts[pts.length - 1][0].toFixed(1)},${yMax}L${pts[0][0].toFixed(1)},${yMax}Z" style="fill:var(--fill)" stroke="none"/>`;
    out += `<path d="${d}" fill="none" stroke-linejoin="round" stroke-linecap="round" style="stroke:${color}" stroke-width="${w}"/>`;
  };
  const floor = (at) => { out += `<line x1="0" x2="${pw}" y1="${at}" y2="${at}" style="stroke:var(--line)"/>`; };
  const dots = (has) => {
    const r = Math.max(2, Math.min(col / 2 - 1, 4));
    s.dates.forEach((d, i) => { if (has(d, s.days[i])) out += `<circle cx="${cx(i).toFixed(1)}" cy="${y + 13}" r="${r.toFixed(1)}" ${ink}/>`; });
    weekLines(y + 5, y + 21);
  };
  const avgOf = (st) => (st ? ` ${one(st.avg)}` : '');

  // 1. 기분 · 에너지 (0~10)
  head(`<tspan style="fill:${accent}">${T('기분')}</tspan>${avgOf(s.mood)}<tspan dx="12" ${mutedText}>${T('에너지')}${avgOf(s.energy)}</tspan>`);
  const SH = 96, top = y + 12, sy = (v) => top + (1 - v / 10) * SH;
  [0, 5, 10].forEach((v) => { floor(sy(v)); out += `<text x="${pw + 6}" y="${sy(v) + 3.5}" font-size="10" ${mutedText}>${v}</text>`; });
  weekLines(top, top + SH);
  curve(points('energy', sy), top, top + SH, 'var(--muted)', 1.6);
  curve(points('mood', sy), top, top + SH, accent, 3);
  dateLabels(top + SH + 13);
  y = top + SH + 40;

  // 2. 수면 (0~12시간): 5시간 미만인 밤에는 점을 찍는다
  head(`${T('수면')}${s.sleep ? ` ${durText(Math.round(s.sleep.avg))}` : ''}`, s.shortSleep.length ? F('5시간 미만 {0}일', s.shortSleep.length) : '');
  const BH = 44, sTop = y + 10, base = sTop + BH, sleepPts = points('sleepMin', (m) => base - Math.min(m, 720) / 720 * BH);
  weekLines(sTop, base);
  curve(sleepPts, sTop, base, 'var(--ink)', 2, true);
  sleepPts.filter((p) => p[2] < SHORT_SLEEP).forEach((p) => { out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.4" ${ink}/>`; });
  floor(base);
  y = base + 28;

  // 3. 증상 (없음~매우 높음): 선이 높을수록 심한 날. 한 번도 없었으면 그림 없이 "없음"만 적는다.
  [['dep', T('우울')], ['elev', T('고조')], ['anx', T('불안')], ['si', T('죽고 싶은 생각')]].forEach(([key, name]) => {
    const any = s.days.some((e) => e && e[key]), high = s.high[key].length;
    head(name, high ? F(key === 'si' ? '{0}일' : '높음 이상 {0}일', high) : any ? '' : T('없음'));
    if (!any) { y += 24; return; }
    const H = 26, t = y + 9, b = t + H;
    weekLines(t, b);
    curve(points(key, (v) => b - v / 4 * H), t, b, 'var(--ink)', 1.8, true);
    floor(b);
    y = b + 26;
  });

  // 4. 약 · 생리: 그날에 점
  s.meds.forEach(([m, count]) => {
    head(esc(`${m.name}${m.dose ? ` ${m.dose}` : ''}`), F('{0}일 중 {1}일', n, count));
    if (count) dots((d) => medsFor(d).some((x) => medKey(x) === medKey(m)));
    y += count ? 44 : 24;
  });
  if (s.period.length) {
    head(T('생리'), F('{0}일', s.period.length));
    dots((d, e) => e && e.period);
    y += 44;
  }
  dateLabels(y);
  y += 8;
  return `<svg id="sum-fig" width="${width}" height="${y}" role="img" aria-label="${T('진료용 요약')}">${out}</svg>`;
}

// 요약에 들어갈 줄들: [이름, 내용]. 화면과 복사용 글이 같은 줄을 쓴다.
function summaryRows(s) {
  const range = (st, fmt) => (st ? `${fmt(st.avg)} (${fmt(st.min)}–${fmt(st.max)})` : T('기록 없음'));
  const num = (x) => (Number.isInteger(x) ? String(x) : one(x));
  const dur = (m) => durText(Math.round(m));
  const flags = [
    [T('우울 높음 이상'), s.high.dep], [T('고조 높음 이상'), s.high.elev], [T('불안 높음 이상'), s.high.anx],
    [T('죽고 싶은 생각'), s.high.si], [T('5시간 미만 수면'), s.shortSleep], [T('생리'), s.period],
  ].filter(([, list]) => list.length).map(([name, list]) => [name, `${F('{0}일', list.length)} · ${dateList(list)}`]);
  return {
    averages: [[T('기분'), range(s.mood, num)], [T('에너지'), range(s.energy, num)], [T('자신감'), range(s.conf, num)], [T('수면'), range(s.sleep, dur)]],
    flags,
    signs: s.signs.map(([label, c]) => [label, F('{0}일', c)]),
    meds: s.meds.map(([m, c]) => [`${m.name}${m.dose ? ` ${m.dose}` : ''}`, F('{0}일 중 {1}일', s.dates.length, c)]),
  };
}

export function summaryHtml(weeks) {
  const s = summary(weeks), talk = clinicData().notes;
  const width = Math.max(240, Math.min(app.clientWidth, 480) - 32 - 32);
  // 그림에 안 나오는 것만 짧은 딱지로: 자신감 평균, 기분이 높았던 날 체크한 항목
  const chips = [
    ...(s.conf ? [[T('자신감 평균'), one(s.conf.avg)]] : []), ...s.signs.map(([name, c]) => [name, F('{0}일', c)]),
  ].map(([name, value]) => `<span class="sum-chip">${esc(name)} <b>${value}</b></span>`).join('');
  return `
    <div class="sum-top"><b>${T('진료용 요약')}</b><span>${md(parse(s.dates[0]))} – ${md(parse(s.dates[s.dates.length - 1]))} · ${F('기록 {0}일 / {1}일', s.got.length, s.dates.length)}</span></div>
    ${talk.length ? `<div class="sum-h">${T('진료 때 말할 것')}</div>${talk.map((x) => `<div class="li say">${esc(x)}</div>`).join('')}` : ''}
    <div class="sum-fig">${figure(s, width)}</div>
    <p class="sum-key">${T('이름 옆 숫자는 평균 · 수면 선의 점은 5시간 미만인 밤 · 증상은 선이 높을수록 심한 날')}</p>
    ${chips ? `<div class="sum-chips">${chips}</div>` : ''}
    ${s.signals.length ? `<div class="sum-h">${T('지금 떠 있는 신호')}</div>${s.signals.map((x) => `<div class="li say">${esc(x)}</div>`).join('')}` : ''}
    ${s.notes.length ? `<div class="sum-h">${T('메모')}</div>${s.notes.map(([d, note]) => `<div class="li say note"><small>${shortDate(d)}</small> ${esc(note)}</div>`).join('')}` : ''}
    <p class="sum-foot">${DISCLAIMER}</p>`;
}

// 메신저나 메모 앱에 붙여 넣을 수 있는 글
export function summaryText(weeks) {
  const s = summary(weeks), r = summaryRows(s), talk = clinicData().notes;
  const part = (title, rows) => (rows.length ? [`\n[${title}]`, ...rows.map(([k, v]) => `${k}: ${v}`)] : []);
  return [
    `${T('진료용 요약')} · ${md(parse(s.dates[0]))} – ${md(parse(s.dates[s.dates.length - 1]))} · ${F('기록 {0}일 / {1}일', s.got.length, s.dates.length)}`,
    ...(talk.length ? [`\n[${T('진료 때 말할 것')}]`, ...talk.map((x) => `- ${x}`)] : []),
    ...part(T('평균 (가장 낮은 날–가장 높은 날)'), r.averages), ...part(T('눈에 띄는 날'), r.flags),
    ...(s.signals.length ? [`\n[${T('지금 떠 있는 신호')}]`, ...s.signals.map((x) => `- ${x}`)] : []),
    ...part(T('기분이 높았던 날 체크한 항목'), r.signs), ...part(T('약 먹은 날'), r.meds),
    ...(s.notes.length ? [`\n[${T('메모')}]`, ...s.notes.map(([d, note]) => `${shortDate(d)} ${note}`)] : []),
    `\n${F('증상은 {0}~{1} 다섯 단계로 적은 것', LEVELS[0], LEVELS[4])}. ${DISCLAIMER}`,
  ].join('\n');
}

export function viewClinic() {
  const c = clinicData(), weeks = clinicView.weeks;
  app.innerHTML = `
    <header class="top"><div><div class="over">${nextText() || T('의사에게 보여 줄 것들')}</div><h1>${T('진료')}</h1></div>
      <div class="segc"><button data-act="clinicWeeks" data-w="2" aria-pressed="${weeks === 2}">${T('2주')}</button>
        <button data-act="clinicWeeks" data-w="4" aria-pressed="${weeks === 4}">${T('4주')}</button></div></header>

    <section class="card list">
      <label class="li"><span class="lk">${T('다음 진료일')}</span><input type="date" id="c-next" value="${esc(c.next || '')}"></label>
    </section>

    <div class="sec">${T('진료 때 말할 것')}</div>
    <section class="card list">
      ${c.notes.map((x, i) => `<div class="li"><span class="lk talk">${esc(x)}</span><button class="txt dim" data-act="clinicNoteDel" data-i="${i}" aria-label="${T('삭제')}">✕</button></div>`).join('')}
      <div class="li"><input type="text" id="c-note" maxlength="200" placeholder="${T('생각날 때 한 줄씩 적어 두기')}" autocomplete="off">
        <button class="mini" data-act="clinicNoteAdd">${T('추가')}</button></div>
    </section>

    <section class="card list" id="summary">${summaryHtml(weeks)}</section>
    <button class="btn" data-act="printSummary">${T('PDF로 저장 · 인쇄')}</button>
    <button class="btn gray" data-act="copySummary">${T('글로 복사')}</button>
    <p class="secnote" style="margin-top:12px">${T('“PDF로 저장 · 인쇄”를 누르면 아이폰 인쇄 화면이 떠요. 미리보기를 두 손가락으로 벌린 뒤 공유 버튼을 누르면 PDF로 저장하거나 보낼 수 있어요.')}</p>`;
}
