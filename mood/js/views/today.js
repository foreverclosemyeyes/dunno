// 오늘 화면
import { signals } from '../analysis.js';
import { DISCLAIMER, LEVELS, SIGNS, cafMg, drinkText, nameOf } from '../constants.js';
import { WD, addDays, durText, longDate, parse, today, weekStart } from '../dates.js';
import { app, esc } from '../dom.js';
import { F, T } from '../i18n.js';
import { IC } from '../icons.js';
import { doseRowsHtml, medsFor, medsText } from '../meds.js';
import { standalone, ui } from '../state.js';
import { db } from '../store.js';
import { moodFill, tone } from '../theme.js';

// ---------- 오늘 화면 ----------
export const li = (left, right) => `<div class="li"><span class="lk">${left}</span><span class="lv">${right}</span></div>`;

export function viewToday() {
  const t = today(), sel = ui.selected, ws = weekStart(sel), e = db.entries[sel];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i), en = db.entries[d], dt = parse(d);
    return `<button class="cday${d === sel ? ' sel' : ''}${d === t ? ' now' : ''}" data-act="pick" data-date="${d}" ${d > t ? 'disabled' : ''}
      aria-label="${longDate(d)}, ${en ? `${T('기분')} ${en.mood == null ? '–' : en.mood}` : T('기록 없음')}">
      <span class="cw">${WD()[dt.getDay()]}</span><span class="cdot${en && en.mood == null ? ' part' : ''}" ${en && en.mood != null ? `style="${moodFill(en.mood)}"` : ''}>${dt.getDate()}</span></button>`;
  }).join('');

  const hint = (!standalone() && !db.settings.hintClosed)
    ? `<div class="card hint"><div><b>${T('홈 화면에 추가해서 쓰세요.')}</b><br>${T('사파리 아래쪽 공유 버튼(네모에 화살표) → “홈 화면에 추가”를 누르면 앱처럼 열려요.')}</div>
       <button class="x" data-act="closeHint" aria-label="${T('닫기')}">✕</button></div>` : '';

  app.innerHTML = `
    <header class="top">
      <div><div class="over">${sel === t ? longDate(sel) : T('지난 기록')}</div><h1>${sel === t ? T('오늘') : longDate(sel)}</h1></div>
      <button class="icon-btn" data-act="settings" aria-label="${T('설정과 백업')}">${IC.sliders}</button>
    </header>
    ${hint}
    ${sel === t ? signals().map((m) => `<div class="card signal"><i></i><span>${m}</span></div>`).join('') : ''}
    <div class="weekbar">
      <button class="nav" data-act="week" data-step="-1" aria-label="${T('이전 주')}">‹</button>
      <div class="days">${days}</div>
      <button class="nav" data-act="week" data-step="1" aria-label="${T('다음 주')}" ${addDays(ws, 7) > t ? 'disabled' : ''}>›</button>
    </div>
    ${tilesHtml(e || {})}
    ${medCard(sel)}
    ${e ? detailHtml(e) : ''}
    <button class="btn${e ? ' gray' : ''}" data-act="record">${e ? T('이어서 적기') : T('기록하기')}</button>
    ${sel !== t ? `<button class="btn plain" data-act="goToday">${T('오늘로 돌아가기')}</button>` : ''}
    <p class="foot">${DISCLAIMER}</p>`;
}

// 가운데(보통)에서 얼마나 위·아래인지 보여 주는 막대. pos는 0~1, 0.5가 가운데
export const level = (pos) => {
  const p = Math.max(0, Math.min(1, pos)) * 100, lo = Math.min(50, p), w = Math.abs(p - 50);
  return `<div class="lvl" aria-hidden="true"><i style="left:${lo.toFixed(1)}%;width:${w.toFixed(1)}%"></i><b style="left:${p.toFixed(1)}%"></b></div>`;
};
// 타일을 누르면 기록 화면의 그 항목으로 바로 간다. 아직 안 적은 항목은 '–'로 보인다.
export const tile = (focus, label, word, num, pos, sub, color) => `<button class="tile" data-act="record" data-focus="${focus}"${color ? ` style="--tone:${color}"` : ''}>
  <div class="tl"><span>${label}</span><span>${num == null ? '' : num}</span></div>
  <div class="word${word ? '' : ' unset'}">${word || '–'}</div>${pos == null ? '' : level(pos)}${sub ? `<div class="ts">${sub}</div>` : ''}</button>`;
const scoreTile = (key, label, v) => tile(key, label, nameOf(key, v), v, v == null ? null : v / 10, '', tone(key, v));
export const bars = (v) => `<span class="bars">${[1, 2, 3, 4].map((i) => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span>`;

export function medCard(date) {
  if (!db.meds.length) return `<section class="card list"><button class="li add" data-act="medSetup">${IC.pill}&nbsp; ${T('먹는 약 등록하기')}</button></section>`;
  return `<section class="card list">${doseRowsHtml(medsFor(date))}</section>`;
}

export function tilesHtml(e) {
  const sleepBig = e.sleepMin == null ? ''
    : `${Math.floor(e.sleepMin / 60)}<small>${T('시간')}</small>${e.sleepMin % 60 ? ` ${e.sleepMin % 60}<small>${T('분')}</small>` : ''}`;
  // 수면은 내 평균과 비교 (기록이 3일 이상 쌓였을 때)
  const sleeps = Object.values(db.entries).map((x) => x.sleepMin).filter((x) => x != null);
  let pos = null, sub = '';
  if (e.sleepMin != null && sleeps.length >= 3) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length, diff = Math.round(e.sleepMin - avg);
    pos = 0.5 + diff / 360;   // 막대 끝에서 끝이 ±3시간
    sub = Math.abs(diff) < 10 ? T('평소와 비슷') : F(diff > 0 ? '평소보다 {0} 김' : '평소보다 {0} 짧음', durText(Math.abs(diff)));
  }
  return `<div class="tiles">
      ${scoreTile('mood', T('기분'), e.mood)}${scoreTile('energy', T('에너지'), e.energy)}${scoreTile('conf', T('자신감'), e.conf)}
      ${tile('sleep', T('수면'), sleepBig, null, pos, sub)}
    </div>`;
}

export function detailHtml(e) {
  const signs = SIGNS.filter(([k]) => e.signs && e.signs[k]).map(([, label]) => label);
  // 저장된 약 목록에 없는 약(목록에서 지운 약)만 여기 글로 보여 준다. 나머지는 위 약 카드에 있다.
  const extra = db.meds.length ? '' : esc(medsText(e.meds || []));
  const ten = (key, v) => `${nameOf(key, v)}<span class="of"> ${v}</span>`;
  const sym = (label, v) => (v ? li(label, `${LEVELS[v]}${bars(v)}`) : '');
  return `<section class="card list">
      ${sym(T('우울'), e.dep)}${sym(T('고조'), e.elev)}${sym(T('불안'), e.anx)}
      ${e.tired ? li(`${IC.moon}${T('일어났을 때')}`, T('피곤')) : ''}
      ${e.period ? li(`${IC.drop}${T('생리')}`, T('생리 중')) : ''}
      ${e.appetite != null ? li(`${IC.fork}${T('식욕')}`, ten('appetite', e.appetite)) : ''}
      ${e.drinks ? li(`${IC.coffee}${T('카페인')}`, cafMg(e.drinks) ? `${drinkText(e.drinks)}<span class="of"> · ${F('약 {0}mg', cafMg(e.drinks))}</span>` : nameOf('caffeine', 0))
        : e.caffeine != null ? li(`${IC.coffee}${T('카페인')}`, ten('caffeine', e.caffeine)) : ''}
      ${extra ? li(`${IC.pill}${T('약')}`, extra) : ''}
      ${signs.length ? li(T('체크'), signs.map(esc).join('<br>')) : ''}
      ${e.note ? `<div class="li say note">${esc(e.note)}</div>` : ''}
    </section>`;
}
