// 진료용 요약을 종이 한 장(A4)에 맞춰 짠 것. "PDF · 인쇄"를 누르거나 브라우저에서 인쇄할 때만 쓰인다.
// 휴대폰 화면을 그대로 찍어 내면 좁은 그림이 종이 한쪽에 몰려서, 종이 너비에 맞는 배치를 따로 둔다.
import { summary } from '../analysis.js';
import { DISCLAIMER, LEVELS, customLevel } from '../constants.js';
import { durText, longDate, md, parse, today } from '../dates.js';
import { esc } from '../dom.js';
import { F, T } from '../i18n.js';
import { clinicView } from '../state.js';
import { customDefs, itemOn } from '../store.js';
import { clinicData, clinicDemo, figures, kindName, lineDefs, lineSample, shortDate, summaryRows } from './clinic.js';

const PAGE = 680;   // 그림 너비 (A4에서 여백을 뺀 너비쯤). 그림은 종이 너비에 맞춰 늘거나 준다.
const one = (x) => (Math.round(x * 10) / 10).toFixed(1);

export function printoutHtml(weeks) {
  const demo = clinicDemo(), s = summary(weeks, demo), r = summaryRows(s), c = demo || clinicData();
  const show = { fx: s.fx.length > 0, custom: customDefs().filter((d) => s.got.some((e) => customLevel(d, (e.custom || {})[d.id]))) };
  const fig = figures(s, PAGE, 130, show, true);
  const lines = lineDefs().filter(([key]) => clinicView.lines.includes(key));
  // 맨 위 숫자 네 칸: 평균을 크게, 가장 낮은 날–높은 날을 작게
  const stat = (name, st, fmt) => `<div class="po-stat"><span>${name}</span><b>${st ? fmt(st.avg) : '–'}</b><small>${st ? `${fmt(st.min)} – ${fmt(st.max)}` : T('기록 없음')}</small></div>`;
  const num = (x) => (Number.isInteger(x) ? String(x) : one(x)), dur = (m) => durText(Math.round(m));
  const stats = [['mood', T('기분')], ['energy', T('에너지')], ['conf', T('자신감')]].filter(([k]) => itemOn(k)).map(([k, name]) => stat(name, s[k], num)).join('')
    + (itemOn('sleep') ? stat(T('수면'), s.sleep, dur) : '');
  // 글로 된 부분: 제목과 줄들. 줄은 [왼쪽, 오른쪽] 또는 글 한 줄
  const block = (title, rows) => (rows.length ? `<section class="po-block"><h3>${title}</h3>${rows.map((x) => (Array.isArray(x)
    ? `<div class="po-row"><span>${x[0]}</span><span>${x[1]}</span></div>` : `<div class="po-line">${x}</div>`)).join('')}</section>` : '');
  const count = ([name, n]) => [esc(name), F('{0}일', n)];
  const log = c.log.filter((x) => x.date >= s.dates[0]);
  return `
    <header class="po-head"><div><h1>${T('진료용 요약')}${demo ? ` · ${T('예시')}` : ''}</h1>
      <p>${md(parse(s.dates[0]))} – ${md(parse(s.dates[s.dates.length - 1]))} · ${F('기록 {0}일 / {1}일', s.got.length, s.dates.length)}</p></div>
      <div class="po-brand">Tidemark<small>${longDate(today())}</small></div></header>
    ${stats ? `<div class="po-stats">${stats}</div>` : ''}
    <div class="po-figs">
      ${lines.length ? `<div class="po-legend">${lines.map(([key, name]) => `<span>${lineSample(key)}${name}</span>`).join('')}</div>${fig.chart}` : ''}
      ${itemOn('sleep') ? fig.sleep : ''}${fig.rows}
    </div>
    <div class="po-cols">
      ${block(T('진료 때 말할 것'), c.notes.map((x) => esc(x)))}
      ${block(T('진료 · 약 변경 기록'), log.map((x) => `<small>${shortDate(x.date)} · ${kindName(x.kind)}</small>${esc(x.text || '')}`))}
      ${block(T('눈에 띄는 날'), r.flags)}
      ${block(T('기분이 높았던 날 체크한 항목'), s.signs.map(count))}
      ${itemOn('psy') ? block(T('정신병적 증상'), s.psych.map(count)) : ''}
      ${itemOn('fx') ? block(T('부작용'), s.fx.map(count)) : ''}
      ${block(T('지금 떠 있는 신호'), s.signals.map((x) => esc(x)))}
      ${block(T('메모'), s.notes.map(([d, note]) => `<small>${shortDate(d)}</small>${esc(note)}`))}
    </div>
    <footer class="po-foot">${T('위아래로 같은 자리가 같은 날이에요 · 증상 네모는 진할수록 심한 날 · 약은 먹은 날만 칠해져요')}<br>
      ${F('증상은 {0}~{1} 다섯 단계로 적은 것', LEVELS[0], LEVELS[4])}. ${DISCLAIMER}</footer>`;
}
