// 진료 화면: 다음 진료일, 진료 때 말할 것, 진료용 요약 (최근 2주/4주를 한 장으로)
import { summary } from '../analysis.js';
import { DISCLAIMER, LEVELS } from '../constants.js';
import { durText, md, parse, today } from '../dates.js';
import { app, esc } from '../dom.js';
import { F, T } from '../i18n.js';
import { clinicView } from '../state.js';
import { db } from '../store.js';
import { li } from './today.js';

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

// 작은 선 그래프. 값이 없는 날은 건너뛰고 잇는다. 색은 글자색을 따라가서 인쇄할 때도 그대로 나온다.
function spark(values, max, w) {
  const H = 34, step = w / values.length;
  const pts = values.map((v, i) => (v == null ? null : `${(step * (i + 0.5)).toFixed(1)},${(3 + (1 - Math.min(v, max) / max) * (H - 6)).toFixed(1)}`)).filter(Boolean);
  return `<svg width="${w}" height="${H}" aria-hidden="true"><line x1="0" x2="${w}" y1="${H - 0.5}" y2="${H - 0.5}" stroke="currentColor" opacity=".15"/>
    ${pts.length > 1 ? `<polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`
    : pts.length ? `<circle cx="${pts[0].split(',')[0]}" cy="${pts[0].split(',')[1]}" r="2.5" fill="currentColor"/>` : ''}</svg>`;
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
  const s = summary(weeks), r = summaryRows(s), talk = clinicData().notes;
  const w = Math.max(120, Math.min(app.clientWidth, 480) - 32 - 32 - 62);
  const block = (title, rows) => (rows.length ? `<div class="sum-h">${title}</div>${rows.map(([k, v]) => li(esc(k), esc(v))).join('')}` : '');
  const chart = (name, key, max) => `<div class="sp"><span>${name}</span>${spark(s.days.map((e) => (e ? e[key] : null)), max, w)}</div>`;
  return `
    <div class="sum-top"><b>${T('진료용 요약')}</b><span>${md(parse(s.dates[0]))} – ${md(parse(s.dates[s.dates.length - 1]))} · ${F('기록 {0}일 / {1}일', s.got.length, s.dates.length)}</span></div>
    ${talk.length ? `<div class="sum-h">${T('진료 때 말할 것')}</div>${talk.map((x) => `<div class="li say">${esc(x)}</div>`).join('')}` : ''}
    ${block(T('평균 (가장 낮은 날–가장 높은 날)'), r.averages)}
    <div class="sum-h">${T('흐름')}</div>
    ${chart(T('기분'), 'mood', 10)}${chart(T('에너지'), 'energy', 10)}${chart(T('수면'), 'sleepMin', 720)}
    ${block(T('눈에 띄는 날'), r.flags)}
    ${s.signals.length ? `<div class="sum-h">${T('지금 떠 있는 신호')}</div>${s.signals.map((x) => `<div class="li say">${esc(x)}</div>`).join('')}` : ''}
    ${block(T('기분이 높았던 날 체크한 항목'), r.signs)}
    ${block(T('약 먹은 날'), r.meds)}
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
