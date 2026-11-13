// 진료 화면: 다음 진료일, 진료 때 말할 것, 진료용 요약 (최근 2주/4주를 한 장으로)
import { SHORT_SLEEP, summary } from '../analysis.js';
import { DISCLAIMER, LEVELS, SYMPTOMS } from '../constants.js';
import { WD, durText, md, parse, today } from '../dates.js';
import { app, esc } from '../dom.js';
import { F, T } from '../i18n.js';
import { medKey, medsFor } from '../meds.js';
import { clinicView } from '../state.js';
import { db, itemOn } from '../store.js';
import { tone } from '../theme.js';
import { li } from './today.js';
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
// 설정에서 꺼 둔 항목은 뺀다.
const lineDefs = () => [
  ['mood', T('기분'), 10], ['energy', T('에너지'), 10], ['conf', T('자신감'), 10],
  ['dep', T('우울'), 4], ['anx', T('불안'), 4], ['si', T('죽고 싶은 생각'), 4],
].filter(([key]) => itemOn(key));

// 선마다 색이 다르다 (한 그래프에 여러 선을 겹쳐도 구분되도록, 이 그래프에서만). 기분은 설정에서 고른 색.
const lineColor = (key) => (key === 'mood' ? tone('mood', 10) || 'var(--ink)' : `var(--l-${key})`);

// 이어진 날짜는 묶어서 적는다: 11/9–11/13, 11/20
function dateRanges(list) {
  const runs = [];
  list.forEach((d) => {
    const last = runs[runs.length - 1];
    if (last && Math.round((parse(d) - parse(last[1])) / 86400000) === 1) last[1] = d; else runs.push([d, d]);
  });
  return runs.map(([a, b]) => (a === b ? shortDate(a) : `${shortDate(a)}–${shortDate(b)}`)).join(', ');
}

// 요약에 들어가는 그림 세 장: 큰 그래프(켜 둔 선들, 선 끝에 이름) · 수면(곡선) · 줄들(증상 네모, 약 ○×, 생리 ○).
// 셋 다 같은 너비와 여백으로 그려서, 위아래로 같은 자리가 같은 날이다 (약을 안 먹은 날의 기분·증상이 한 줄로 이어져 보인다).
// 선은 전부 부드러운 실선이다. 색은 CSS 변수를 따라가서 다크·라이트·인쇄에서 그대로 읽힌다.
function figures(s, width) {
  // 오른쪽에는 선 끝 이름이 들어갈 자리를 둔다 (이름이 긴 "죽고 싶은 생각"을 켰을 때만 넓게)
  const n = s.dates.length, L = 18, R = clinicView.lines.includes('si') ? 80 : 44, pw = width - L - R, col = pw / n;
  const cx = (i) => L + col * (i + 0.5);
  const ink = 'style="fill:var(--ink)"', mutedText = 'style="fill:var(--muted)"';
  const marks = s.dates.map((d, i) => (i === 0 || parse(d).getDay() === 1 ? i : -1)).filter((i) => i >= 0);
  let out = '', y = 6;

  // 지금까지 그린 것을 그림 한 장으로 마무리하고 다음 장을 시작한다
  const take = (id, height) => {
    const svg = `<svg id="${id}" width="${width}" height="${height}" role="img">${out}</svg>`;
    out = ''; y = 12;
    return svg;
  };
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
  const curve = (pts, color, w, areaTo) => {
    if (pts.length < 2) { pts.forEach((p) => { out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" style="fill:${color}"/>`; }); return; }
    const d = smoothPath(pts);
    if (areaTo) out += `<path d="${d}L${pts[pts.length - 1][0].toFixed(1)},${areaTo}L${pts[0][0].toFixed(1)},${areaTo}Z" style="fill:var(--fill)" stroke="none"/>`;
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
    curve(pts, lineColor(key), key === 'mood' ? 3 : 2);
    ends.push({ name, color: lineColor(key), x: pts[pts.length - 1][0] + 7, y: pts[pts.length - 1][1] + 3.5, bold: key === 'mood' });
  });
  ends.sort((a, b) => a.y - b.y).forEach((e, i) => {
    if (i && e.y < ends[i - 1].y + 12) e.y = ends[i - 1].y + 12;
    out += `<text x="${e.x.toFixed(1)}" y="${e.y.toFixed(1)}" font-size="10.5" font-weight="${e.bold ? 700 : 500}" style="fill:${e.color}">${e.name}</text>`;
  });
  dateLabels(top + SH + 13);
  const chart = take('sum-fig', top + SH + 18);

  // 2. 수면 (0~12시간): 5시간 높이에 기준선을 그어서 그 아래로 내려간 밤이 보이게 하고, 그 날짜를 글로도 적는다
  head(`${T('수면')}${s.sleep ? ` ${durText(Math.round(s.sleep.avg))}` : ''}`, s.shortSleep.length ? F('5시간 미만 {0}일', s.shortSleep.length) : '');
  const BH = 64, sTop = y + 12, base = sTop + BH, slY = (m) => base - Math.min(m, 720) / 720 * BH;
  [0, 6, 12].forEach((h) => { floor(slY(h * 60)); out += `<text x="${L - 6}" y="${slY(h * 60) + 3.5}" font-size="10" text-anchor="end" ${mutedText}>${h}</text>`; });
  weekLines(sTop, base);
  curve(points('sleepMin', slY), 'var(--ink)', 2, base);
  out += `<line x1="${L}" x2="${L + pw}" y1="${slY(SHORT_SLEEP)}" y2="${slY(SHORT_SLEEP)}" style="stroke:var(--muted)"/><text x="${L + pw + 7}" y="${slY(SHORT_SLEEP) + 3.5}" font-size="10.5" ${mutedText}>${T('5시간')}</text>`;
  y = base + 6;
  if (s.shortSleep.length) {
    y += 12;
    out += `<text x="${L}" y="${y}" font-size="11" ${mutedText}>${T('5시간 미만인 밤')} ${dateRanges(s.shortSleep)}</text>`;
    y += 4;
  }
  const sleep = take('sum-sleep', y);

  // 3. 증상: 날마다 요일이 적힌 네모 한 칸, 그런 날은 색칠 (단계가 높을수록 진하게). 위 그래프와 같은 날짜 자리에 놓인다.
  //    칸이 좁으면(4주) 요일 글자는 뺀다.
  const sq = Math.max(4, Math.min(col - 2, 19)), wd = WD();
  SYMPTOMS.filter(([k]) => itemOn(k)).forEach(([k, name]) => {
    const count = s.days.filter((e) => e && e[k]).length;
    head(name, count ? F('{0}일', count) : T('없음'));
    s.dates.forEach((d, i) => {
      const v = (s.days[i] && s.days[i][k]) || 0, x = cx(i) - sq / 2, top = y + 8;
      out += `<rect x="${x.toFixed(1)}" y="${top}" width="${sq.toFixed(1)}" height="${sq.toFixed(1)}" rx="${(sq * 0.28).toFixed(1)}" ${v ? `style="fill:var(--l-${k})" fill-opacity="${[0, 0.4, 0.6, 0.8, 1][v]}"` : 'class="c0"'}/>`;
      if (sq >= 13) out += `<text x="${cx(i).toFixed(1)}" y="${(top + sq / 2 + 3.2).toFixed(1)}" text-anchor="middle" font-size="9" style="fill:${v >= 3 ? '#fff' : v ? 'var(--text)' : 'var(--faint)'}">${wd[parse(d).getDay()][0]}</text>`;
    });
    y += 8 + sq + 22;
  });

  // 4. 약 · 생리: 얇은 선으로 먹은 날 ○, 안 먹은 날 ×
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
  const meds = itemOn('meds') ? s.meds : [], period = itemOn('period') && s.period.length > 0;
  meds.forEach(([m, count]) => {
    head(esc(`${m.name}${m.dose ? ` ${m.dose}` : ''}`), F('{0}일 중 {1}일', n, count));
    marksRow((d) => medsFor(d).some((x) => medKey(x) === medKey(m)), true);
  });
  if (period) {
    head(T('생리'), F('{0}일', s.period.length));
    marksRow((d, e) => e && e.period, false);
  }
  if (!out) return { chart, sleep, rows: '' };
  dateLabels(y - 10);
  return { chart, sleep, rows: take('sum-rows', y - 4) };
}

// 요약에 들어갈 줄들: [이름, 내용]. 화면과 복사용 글이 같은 줄을 쓴다.
function summaryRows(s) {
  const range = (st, fmt) => (st ? `${fmt(st.avg)} (${fmt(st.min)}–${fmt(st.max)})` : T('기록 없음'));
  const num = (x) => (Number.isInteger(x) ? String(x) : one(x));
  const dur = (m) => durText(Math.round(m));
  const flags = [
    [T('우울 높음 이상'), s.high.dep], [T('불안 높음 이상'), s.high.anx],
    [T('죽고 싶은 생각'), s.high.si], [T('5시간 미만 수면'), s.shortSleep], [T('생리'), s.period],
  ].filter(([, list]) => list.length).map(([name, list]) => [name, `${F('{0}일', list.length)} · ${dateList(list)}`]);
  return {
    averages: [[T('기분'), range(s.mood, num)], [T('에너지'), range(s.energy, num)], [T('자신감'), range(s.conf, num)], [T('수면'), range(s.sleep, dur)]],
    flags,
    signs: s.signs.map(([label, c]) => [label, F('{0}일', c)]),
    meds: s.meds.map(([m, c]) => [`${m.name}${m.dose ? ` ${m.dose}` : ''}`, F('{0}일 중 {1}일', s.dates.length, c)]),
  };
}

// 요약 본문: 그림 세 장을 한 카드에 쌓고, 체크 항목·신호·메모를 카드로 나눠 놓는다 (인쇄하면 이 부분이 한 장으로 나간다)
function summaryHtml(weeks) {
  const s = summary(weeks);
  const width = Math.max(240, Math.min(app.clientWidth, 480) - 32 - 32);
  const fig = figures(s, width);
  // 큰 그래프의 선을 켜고 끄는 단추: 기분·에너지·자신감은 평균을 옆에 적는다
  const toggles = lineDefs().map(([key, name, max]) => `<button class="sum-tog" data-act="clinicLine" data-k="${key}" aria-pressed="${clinicView.lines.includes(key)}"><i style="background:${lineColor(key)}"></i>${name}${max === 10 && s[key] ? ` <b>${one(s[key].avg)}</b>` : ''}</button>`).join('');
  const signs = s.signs.map(([name, c]) => li(esc(name), F('{0}일', c)));
  const says = (title, rows) => (rows.length ? `<div class="sec">${title}</div><section class="card list">${rows.join('')}</section>` : '');
  return `
    <div class="sec">${md(parse(s.dates[0]))} – ${md(parse(s.dates[s.dates.length - 1]))} · ${F('기록 {0}일 / {1}일', s.got.length, s.dates.length)}</div>
    <section class="card sum-stack">
      ${toggles ? `<div class="sum-togs">${toggles}</div>${fig.chart}` : ''}
      ${itemOn('sleep') ? fig.sleep : ''}
      ${fig.rows}
      <p class="sum-key">${T('위아래로 같은 자리가 같은 날이에요 · 네모는 색이 진할수록 심한 날 · 약은 먹은 날 ○, 안 먹은 날 ×')}</p>
    </section>
    ${says(T('기분이 높았던 날 체크한 항목'), signs)}
    ${says(T('지금 떠 있는 신호'), s.signals.map((x) => `<div class="li say">${esc(x)}</div>`))}
    ${says(T('메모'), s.notes.map(([d, note]) => `<div class="li say note"><small>${shortDate(d)}</small> ${esc(note)}</div>`))}
    <p class="foot">${DISCLAIMER}</p>`;
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
      <div class="segc"><button data-act="clinicWeeks" data-w="1" aria-pressed="${weeks === 1}">${T('1주')}</button>
        <button data-act="clinicWeeks" data-w="2" aria-pressed="${weeks === 2}">${T('2주')}</button>
        <button data-act="clinicWeeks" data-w="4" aria-pressed="${weeks === 4}">${T('4주')}</button></div></header>

    <section class="card list">
      <label class="li"><span class="lk">${T('다음 진료일')}</span><input type="date" id="c-next" value="${esc(c.next || '')}"></label>
    </section>

    <div id="summary">
      <div class="sum-top">${T('진료용 요약')}</div>
      <div class="sec">${T('진료 때 말할 것')}</div>
      <section class="card list">
        ${c.notes.map((x, i) => `<div class="li"><span class="lk talk">${esc(x)}</span><button class="txt dim noprint" data-act="clinicNoteDel" data-i="${i}" aria-label="${T('삭제')}">✕</button></div>`).join('')}
        <div class="li noprint"><input type="text" id="c-note" maxlength="200" placeholder="${T('생각날 때 한 줄씩 적어 두기')}" autocomplete="off">
          <button class="mini" data-act="clinicNoteAdd">${T('추가')}</button></div>
      </section>
      ${summaryHtml(weeks)}
    </div>

    <div class="pair">
      <button class="btn" data-act="printSummary">${T('PDF · 인쇄')}</button>
      <button class="btn gray" data-act="copySummary">${T('글로 복사')}</button>
    </div>
    <p class="secnote" style="margin-top:12px">${T('“PDF · 인쇄”를 누르면 아이폰 인쇄 화면이 떠요. 미리보기를 두 손가락으로 벌린 뒤 공유 버튼을 누르면 PDF로 저장하거나 보낼 수 있어요.')}</p>`;
}
