// 오늘 화면
import { signals } from '../analysis.js';
import { DISCLAIMER, LEVELS, SIGNS, cafMg, drinkText, nameOf } from '../constants.js';
import { WD, addDays, durText, longDate, parse, today, weekStart } from '../dates.js';
import { app, esc } from '../dom.js';
import { F, T } from '../i18n.js';
import { IC } from '../icons.js';
import { medKey, medsFor } from '../meds.js';
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
      aria-label="${longDate(d)}, ${en ? `${T('기분')} ${en.mood}` : T('기록 없음')}">
      <span class="cw">${WD()[dt.getDay()]}</span><span class="cdot" ${en ? `style="${moodFill(en.mood)}"` : ''}>${dt.getDate()}</span></button>`;
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
    ${e ? tilesHtml(e) : emptyCard(sel === t)}
    ${medCard(sel)}
    ${e ? detailHtml(e) : ''}
    ${sel !== t ? `<button class="btn plain" data-act="goToday">${T('오늘로 돌아가기')}</button>` : ''}
          <p class="foot">${DISCLAIMER}</p>`;
}

export function emptyCard(isToday) {
  return `<section class="card empty"><div class="e1">${isToday ? T('오늘 기록이 아직 없어요') : T('이 날은 기록이 없어요')}</div>
    <div>${T('10초면 끝나요.')}</div>
    <button class="btn" data-act="record">${T('기록하기')}</button></section>`;
}

// 가운데(보통)에서 얼마나 위·아래인지 보여 주는 막대. pos는 0~1, 0.5가 가운데
export const level = (pos) => {
  const p = Math.max(0, Math.min(1, pos)) * 100, lo = Math.min(50, p), w = Math.abs(p - 50);
  return `<div class="lvl" aria-hidden="true"><i style="left:${lo.toFixed(1)}%;width:${w.toFixed(1)}%"></i><b style="left:${p.toFixed(1)}%"></b></div>`;
};
export const tile = (label, word, num, pos, sub, color) => `<div class="tile"${color ? ` style="--tone:${color}"` : ''}><div class="tl"><span>${label}</span><span>${num == null ? '' : num}</span></div>
  <div class="word">${word}</div>${pos == null ? '' : level(pos)}${sub ? `<div class="ts">${sub}</div>` : ''}</div>`;
export const bars = (v) => `<span class="bars">${[1, 2, 3, 4].map((i) => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span>`;

export function medCard(date) {
  if (!db.meds.length) return `<section class="card list"><button class="li add" data-act="medSetup">${IC.pill}&nbsp; ${T('먹는 약 등록하기')}</button></section>`;
  const taken = new Set(medsFor(date).map(medKey));
  return `<section class="card list">${db.meds.map((m) => `<button class="li med" data-act="takeMed" data-med="${esc(medKey(m))}" aria-pressed="${taken.has(medKey(m))}">
    <span class="lk">${IC.pill}${esc(m.name)}${m.dose ? `<small>${esc(m.dose)}</small>` : ''}</span><span class="chk">${taken.has(medKey(m)) ? T('먹었어요') : T('먹으면 누르기')}</span></button>`).join('')}</section>`;
}

export function tilesHtml(e) {
  const sleepBig = e.sleepMin == null ? '–'
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
      ${tile(T('기분'), nameOf('mood', e.mood), e.mood, e.mood / 10, '', tone('mood', e.mood))}
      ${tile(T('에너지'), nameOf('energy', e.energy), e.energy, e.energy / 10, '', tone('energy', e.energy))}
      ${e.conf == null ? tile(T('자신감'), '–') : tile(T('자신감'), nameOf('conf', e.conf), e.conf, e.conf / 10, '', tone('conf', e.conf))}
      ${tile(T('수면'), sleepBig, null, pos, sub)}
    </div>`;
}

export function detailHtml(e) {
  const signs = SIGNS.filter(([k]) => e.signs && e.signs[k]).map(([, label]) => label);
  const extra = (e.meds || []).filter((m) => !db.meds.some((x) => medKey(x) === medKey(m))).map((x) => esc(x.name) + (x.dose ? ` ${esc(x.dose)}` : '')).join(', ');
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
      ${e.note ? li(`${IC.note}${T('메모')}`, esc(e.note)) : ''}
    </section>
    <button class="btn gray" data-act="record">${T('수정하기')}</button>`;
}
