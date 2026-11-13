// 진료 화면: 다음 진료일, 진료 때 말할 것, 진료용 요약 (최근 2주/4주를 한 장으로)
import { summary } from '../analysis.js';
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

// 큰 그래프에 켜고 끌 수 있는 선들: [열쇠, 이름, 가장 높은 값]. 증상(0~4)은 그래프 높이에 맞춰 늘려 그린다.
const lineDefs = () => [
  ['mood', T('기분'), 10], ['energy', T('에너지'), 10], ['conf', T('자신감'), 10],
  ['dep', T('우울'), 4], ['elev', T('고조'), 4], ['anx', T('불안'), 4], ['si', T('죽고 싶은 생각'), 4],
];

// 한눈에 보는 그림: 날짜를 가로로 맞춰 놓고
//   큰 그래프 하나(켜 둔 선들, 선 끝에 이름) → 수면(곡선) → 약(먹은 날 ○, 안 먹은 날 ×) → 생리(○)
// 를 위에서 아래로 쌓는다. 선은 전부 부드러운 실선이다. 색은 CSS 변수를 따라가서 다크·라이트·인쇄에서 그대로 읽힌다.
function figure(s, width) {
  // 오른쪽에는 선 끝 이름이 들어갈 자리를 둔다 (이름이 긴 "죽고 싶은 생각"을 켰을 때만 넓게)
  const n = s.dates.length, L = 18, R = clinicView.lines.includes('si') ? 80 : 44, pw = width - L - R, col = pw / n;
  const cx = (i) => L + col * (i + 0.5);
  const ink = 'style="fill:var(--ink)"', mutedText = 'style="fill:var(--muted)"';
  const accent = tone('mood', 10) || 'var(--ink)';
  const marks = s.dates.map((d, i) => (i === 0 || parse(d).getDay() === 1 ? i : -1)).filter((i) => i >= 0);
  let out = '', y = 6;

  const head = (left, right) => {
    out += `<text x="${L}" y="${y}" font-size="12.5" font-weight="600" ${ink}>${left}</text>`;
    if (right) out += `<text x="${width}" y="${y}" font-size="11.5" text-anchor="end" ${mutedText}>${right}</text>`;
  };
  // 주마다(월요일) 세로줄: 그림이 있는 칸 안에만 긋는다
  const weekLines = (y1, y2) => marks.filter(Boolean).forEach((i) => {
    out += `<line x1="${(L + col * i).toFixed(1)}" x2="${(L + col * i).toFixed(1)}" y1="${y1}" y2="${y2}" style="stroke:var(--line)"/>`;
  });
  const dateLabels = (at) => marks.forEach((i) => {
    out += `<text x="${(L + col * i + 2).toFixed(1)}" y="${at}" font-size="10" ${mutedText}>${shortDate(s.dates[i])}</text>`;
  });
  const points = (key, yOf) => s.days.map((e, i) => (e && e[key] != null ? [cx(i), yOf(e[key])] : null)).filter(Boolean);
  // 값이 있는 날들을 부드러운 곡선으로 잇는다 (하루뿐이면 점 하나). area가 있으면 곡선 아래를 옅게 채운다.
  const curve = (pts, yMin, yMax, color, w, area) => {
    if (pts.length < 2) { pts.forEach((p) => { out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" style="fill:${color}"/>`; }); return; }
    const d = smoothPath(pts, yMin, yMax);
    if (area) out += `<path d="${d}L${pts[pts.length - 1][0].toFixed(1)},${yMax}L${pts[0][0].toFixed(1)},${yMax}Z" style="fill:var(--fill)" stroke="none"/>`;
    out += `<path d="${d}" fill="none" stroke-linejoin="round" stroke-linecap="round" style="stroke:${color}" stroke-width="${w}"/>`;
  };
  const floor = (at) => { out += `<line x1="${L}" x2="${L + pw}" y1="${at}" y2="${at}" style="stroke:var(--line)"/>`; };

  // 1. 큰 그래프: 켜 둔 선들을 한 축 위에. 선 끝에 이름을 적는다 (겹치면 아래로 민다).
  const SH = 150, top = y, sy = (v) => top + (1 - v / 10) * SH;
  [0, 5, 10].forEach((v) => { floor(sy(v)); out += `<text x="${L - 6}" y="${sy(v) + 3.5}" font-size="10" text-anchor="end" ${mutedText}>${v}</text>`; });
  weekLines(top, top + SH);
  const ends = [];
  lineDefs().filter(([key]) => clinicView.lines.includes(key)).reverse().forEach(([key, name, max]) => {
    const pts = points(key, (v) => sy(v / max * 10));
    if (!pts.length) return;
    const color = key === 'mood' ? accent : max === 10 ? 'var(--muted)' : 'var(--ink)';
    curve(pts, top, top + SH, color, key === 'mood' ? 3 : 1.8);
    ends.push({ name, color, x: pts[pts.length - 1][0] + 7, y: pts[pts.length - 1][1] + 3.5, bold: key === 'mood' });
  });
  ends.sort((a, b) => a.y - b.y).forEach((e, i) => {
    if (i && e.y < ends[i - 1].y + 12) e.y = ends[i - 1].y + 12;
    out += `<text x="${e.x.toFixed(1)}" y="${e.y.toFixed(1)}" font-size="10.5" font-weight="${e.bold ? 700 : 500}" style="fill:${e.color}">${e.name}</text>`;
  });
  dateLabels(top + SH + 13);
  y = top + SH + 42;

  // 2. 수면 (0~12시간)
  head(`${T('수면')}${s.sleep ? ` ${durText(Math.round(s.sleep.avg))}` : ''}`, s.shortSleep.length ? F('5시간 미만 {0}일', s.shortSleep.length) : '');
  const BH = 44, sTop = y + 10, base = sTop + BH;
  weekLines(sTop, base);
  curve(points('sleepMin', (m) => base - Math.min(m, 720) / 720 * BH), sTop, base, 'var(--ink)', 2, true);
  floor(base);
  y = base + 28;

  // 3. 약 · 생리: 얇은 선으로 먹은 날 ○, 안 먹은 날 ×
  const r = Math.max(2, Math.min(col / 2 - 1.5, 4.2));
  const marksRow = (has, cross) => {
    s.dates.forEach((d, i) => {
      const x = cx(i), my = y + 14;
      if (has(d, s.days[i])) out += `<circle cx="${x.toFixed(1)}" cy="${my}" r="${r.toFixed(1)}" fill="none" stroke-width="1.2" style="stroke:var(--ink)"/>`;
      else if (cross) {
        const k = r * 0.75;
        out += `<path d="M${(x - k).toFixed(1)},${(my - k).toFixed(1)}L${(x + k).toFixed(1)},${(my + k).toFixed(1)}M${(x + k).toFixed(1)},${(my - k).toFixed(1)}L${(x - k).toFixed(1)},${(my + k).toFixed(1)}" fill="none" stroke-width="1" stroke-linecap="round" style="stroke:var(--faint)"/>`;
      }
    });
    y += 44;
  };
  s.meds.forEach(([m, count]) => {
    head(esc(`${m.name}${m.dose ? ` ${m.dose}` : ''}`), F('{0}일 중 {1}일', n, count));
    marksRow((d) => medsFor(d).some((x) => medKey(x) === medKey(m)), true);
  });
  if (s.period.length) {
    head(T('생리'), F('{0}일', s.period.length));
    marksRow((d, e) => e && e.period, false);
  }
  dateLabels(y - 6);
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
  // 큰 그래프의 선을 켜고 끄는 단추: 기분·에너지·자신감은 평균을 옆에 적는다
  const toggles = lineDefs().map(([key, name, max]) => `<button class="sum-tog" data-act="clinicLine" data-k="${key}" aria-pressed="${clinicView.lines.includes(key)}">${name}${max === 10 && s[key] ? ` <b>${one(s[key].avg)}</b>` : ''}</button>`).join('');
  // 눈에 띄는 것은 짧은 딱지로: 며칠인지만 적는다
  const chips = [
    [T('우울 높음 이상'), s.high.dep.length], [T('고조 높음 이상'), s.high.elev.length], [T('불안 높음 이상'), s.high.anx.length],
    [T('죽고 싶은 생각'), s.high.si.length], ...s.signs,
  ].filter(([, c]) => c).map(([name, c]) => `<span class="sum-chip">${esc(name)} <b>${F('{0}일', c)}</b></span>`).join('');
  return `
    <div class="sum-top"><b>${T('진료용 요약')}</b><span>${md(parse(s.dates[0]))} – ${md(parse(s.dates[s.dates.length - 1]))} · ${F('기록 {0}일 / {1}일', s.got.length, s.dates.length)}</span></div>
    ${talk.length ? `<div class="sum-h">${T('진료 때 말할 것')}</div>${talk.map((x) => `<div class="li say">${esc(x)}</div>`).join('')}` : ''}
    <div class="sum-togs">${toggles}</div>
    <div class="sum-fig">${figure(s, width)}</div>
    <p class="sum-key">${T('위 이름을 누르면 선이 켜지고 꺼져요 · 이름 옆 숫자는 평균 · 증상은 맨 아래가 없음, 맨 위가 매우 높음 · 약은 먹은 날 ○, 안 먹은 날 ×')}</p>
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
