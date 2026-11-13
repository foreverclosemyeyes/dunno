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

// 한눈에 보는 그림: 날짜를 가로로 맞춰 놓고 위에서부터
//   기분(굵은 선)·에너지(가는 선) → 수면(선, 5시간 미만인 밤에 점) → 증상(동그라미가 클수록 심함) → 약(먹은 날에 점) → 생리(점)
// 를 한 장에 쌓는다. 선은 전부 부드러운 곡선(점선 없음), 표시는 전부 동그라미로 통일한다.
// 색은 CSS 변수를 따라가서 다크·라이트·인쇄에서 그대로 읽힌다.
function figure(s, width) {
  const n = s.dates.length, L = 60, R = 22, pw = width - L - R, col = pw / n;
  const cx = (i) => L + col * (i + 0.5);
  const ink = 'style="fill:var(--ink)"', mutedText = 'style="fill:var(--muted)"';
  const accent = tone('mood', 10) || 'var(--ink)';
  const label = (y, text, style) => `<text x="0" y="${y}" font-size="10.5" ${style || mutedText}>${text}</text>`;
  let out = '', y = 4;

  // 1. 기분 · 에너지 (0~10)
  const SH = 84, top = y, sy = (v) => top + (1 - v / 10) * SH;
  [0, 5, 10].forEach((v) => {
    out += `<line x1="${L}" x2="${L + pw}" y1="${sy(v)}" y2="${sy(v)}" style="stroke:var(--line)"/><text x="${L + pw + 5}" y="${sy(v) + 3.5}" font-size="9" ${mutedText}>${v}</text>`;
  });
  // 값이 있는 날들을 부드러운 곡선으로 잇는다 (하루뿐이면 점 하나)
  const curve = (pts, yMin, yMax, style) => (pts.length > 1
    ? `<path d="${smoothPath(pts, yMin, yMax)}" fill="none" stroke-linejoin="round" stroke-linecap="round" ${style}/>`
    : pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" ${style.replace('stroke:', 'fill:')}/>`).join(''));
  const points = (key, yOf) => s.days.map((e, i) => (e && e[key] != null ? [cx(i), yOf(e[key]), e[key]] : null)).filter(Boolean);
  out += curve(points('energy', sy), top, top + SH, 'style="stroke:var(--muted)" stroke-width="1.4"');
  out += curve(points('mood', sy), top, top + SH, `style="stroke:${accent}" stroke-width="2.6"`);
  out += `<text x="0" y="${top + 11}" font-size="10.5" font-weight="700" style="fill:${accent}">${T('기분')}</text>${label(top + 27, T('에너지'))}`;
  y = top + SH + 14;

  // 2. 수면 (0~12시간): 곡선 아래를 옅게 채우고, 5시간 미만인 밤에는 점을 찍는다
  const BH = 40, base = y + BH, slY = (m) => base - Math.min(m, 720) / 720 * BH;
  const sleepPts = points('sleepMin', slY);
  if (sleepPts.length > 1) {
    out += `<path d="${smoothPath(sleepPts, y, base)}L${sleepPts[sleepPts.length - 1][0].toFixed(1)},${base}L${sleepPts[0][0].toFixed(1)},${base}Z" style="fill:var(--fill)" stroke="none"/>`;
  }
  out += curve(sleepPts, y, base, 'style="stroke:var(--ink)" stroke-width="1.8"');
  sleepPts.filter((p) => p[2] < SHORT_SLEEP).forEach((p) => { out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" ${ink}/>`; });
  out += `<line x1="${L}" x2="${L + pw}" y1="${base}" y2="${base}" style="stroke:var(--line)"/>`;
  out += label(y + 24, T('수면'));
  y = base + 16;

  // 3. 증상: 동그라미 크기가 정도 (없음은 안 그린다)
  const rmax = Math.max(2, Math.min(col / 2 - 0.5, 7.5));
  [['dep', T('우울')], ['elev', T('고조')], ['anx', T('불안')], ['si', T('죽고 싶은 생각')]].forEach(([key, name]) => {
    out += label(y + 4, name);
    s.days.forEach((e, i) => { if (e && e[key]) out += `<circle cx="${cx(i).toFixed(1)}" cy="${y}" r="${(rmax * e[key] / 4).toFixed(1)}" ${ink}/>`; });
    y += 19;
  });
  y += 3;

  // 4. 약: 먹은 날에 점, 오른쪽 끝에 먹은 날 수
  const mr = Math.max(1.6, Math.min(col / 2 - 1, 3.4));
  s.meds.forEach(([m, count]) => {
    out += label(y + 4, esc(m.name.length > 5 ? `${m.name.slice(0, 5)}…` : m.name));
    s.dates.forEach((d, i) => {
      if (medsFor(d).some((x) => medKey(x) === medKey(m))) out += `<circle cx="${cx(i).toFixed(1)}" cy="${y}" r="${mr.toFixed(1)}" ${ink}/>`;
    });
    out += `<text x="${L + pw + 5}" y="${y + 3.5}" font-size="9" ${mutedText}>${count}</text>`;
    y += 16;
  });

  // 5. 생리: 그날에 점
  if (s.period.length) {
    out += label(y + 4, T('생리'));
    s.days.forEach((e, i) => { if (e && e.period) out += `<circle cx="${cx(i).toFixed(1)}" cy="${y}" r="${mr.toFixed(1)}" ${ink}/>`; });
    y += 16;
  }

  // 날짜 눈금: 주마다(월요일) 세로줄과 날짜
  let weeks = '';
  s.dates.forEach((d, i) => {
    if (parse(d).getDay() !== 1 && i !== 0) return;
    if (i) weeks += `<line x1="${(L + col * i).toFixed(1)}" x2="${(L + col * i).toFixed(1)}" y1="0" y2="${y - 6}" style="stroke:var(--line)"/>`;
    weeks += `<text x="${(L + col * i + 2).toFixed(1)}" y="${y + 6}" font-size="9" ${mutedText}>${shortDate(d)}</text>`;
  });
  return `<svg id="sum-fig" width="${width}" height="${y + 10}" role="img" aria-label="${T('진료용 요약')}">${weeks}${out}</svg>`;
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
  const stat = (name, st, fmt) => `<div class="sum-stat"><span>${name}</span><b>${st ? fmt(st.avg) : '–'}</b></div>`;
  // 눈에 띄는 것은 짧은 딱지로: 날짜는 그림에서 보이니 며칠인지만 적는다
  const chips = [
    [T('우울 높음 이상'), s.high.dep.length], [T('고조 높음 이상'), s.high.elev.length], [T('불안 높음 이상'), s.high.anx.length],
    [T('죽고 싶은 생각'), s.high.si.length], [T('5시간 미만 수면'), s.shortSleep.length], ...s.signs,
  ].filter(([, c]) => c).map(([name, c]) => `<span class="sum-chip">${esc(name)} <b>${F('{0}일', c)}</b></span>`).join('');
  return `
    <div class="sum-top"><b>${T('진료용 요약')}</b><span>${md(parse(s.dates[0]))} – ${md(parse(s.dates[s.dates.length - 1]))} · ${F('기록 {0}일 / {1}일', s.got.length, s.dates.length)}</span></div>
    ${talk.length ? `<div class="sum-h">${T('진료 때 말할 것')}</div>${talk.map((x) => `<div class="li say">${esc(x)}</div>`).join('')}` : ''}
    <div class="sum-h">${T('평균')}</div>
    <div class="sum-stats">
      ${stat(T('기분'), s.mood, one)}${stat(T('에너지'), s.energy, one)}${stat(T('자신감'), s.conf, one)}${stat(T('수면'), s.sleep, (m) => durText(Math.round(m)))}
    </div>
    <div class="sum-fig">${figure(s, width)}</div>
    <p class="sum-key">${T('기분은 굵은 선, 에너지는 가는 선 · 수면 선의 점은 5시간 미만인 밤 · 증상은 동그라미가 클수록 심한 날')}</p>
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
