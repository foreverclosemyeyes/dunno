// 기록 화면
// 한 번에 다 적지 않아도 된다: 만진 항목만 저장되고, 안 만진 항목은 빈 값(null)으로 남는다.
// 아침에 수면만 적고 밤에 기분을 적는 식으로 같은 날을 여러 번 열어 이어 적을 수 있다.
import { DRINKS, LEVELS, SIGNS, SYMPTOMS, cafMg, cafScore, isHigh, nameOf } from '../constants.js';
import { durText, longDate, sleepMinutes } from '../dates.js';
import { $, closeSheet, esc, sheet, showSheet, toast } from '../dom.js';
import { F, T } from '../i18n.js';
import { IC } from '../icons.js';
import { doseRowsHtml, medAddHtml } from '../meds.js';
import { render } from '../render.js';
import { ui } from '../state.js';
import { db, save } from '../store.js';
import { tone } from '../theme.js';

// 0~10 슬라이더 항목. 처음에는 비어 있고(null), 슬라이더를 만지면 값이 생긴다.
export const SLIDERS = ['mood', 'energy', 'conf', 'appetite'];
const SLIDER_START = 5;   // 빈 항목의 손잡이가 놓여 있는 자리

// ---------- 초안 ----------
export function newDraft(date) {
  const old = db.entries[date];
  // 잠든·깬 시각은 가장 최근 기록을 기본값으로 보여 준다 (대부분 비슷하니까 덜 만져도 되게). 수면을 적겠다고 해야 저장된다.
  const last = Object.keys(db.entries).sort().reverse().map((k) => db.entries[k]).find((x) => x.bed && x.wake);
  const blank = {
    date, mood: null, energy: null, conf: null, appetite: null, dep: null, elev: null, anx: null,
    sleepSet: false, bed: last ? last.bed : '23:30', wake: last ? last.wake : '07:00', tired: false,
    period: false, drinks: {}, meds: (db.taken[date] || []).slice(), note: '', signs: {},
  };
  if (!old) return blank;
  const d = Object.assign(blank, JSON.parse(JSON.stringify(old)));
  d.sleepSet = !!(old.bed && old.wake);
  if (!d.sleepSet) { d.bed = blank.bed; d.wake = blank.wake; }
  d.drinks = d.drinks || {};
  d.signs = d.signs || {};
  d.meds = d.meds || [];
  return d;
}

// ---------- 조각들 ----------
export const seg = (field, labels, value) => `<div class="seg" data-field="${field}">${
  labels.map((l, i) => `<button type="button" data-v="${i}" aria-pressed="${value === i}">${l}</button>`).join('')}</div>`;
export const cafHead = (dr) => (cafMg(dr) ? `${nameOf('caffeine', cafScore(dr))} · ${F('약 {0}mg', cafMg(dr))}` : '');
export const drinksHtml = (d) => `<div class="li col"><div class="slh"><span class="lk">${IC.coffee}${T('카페인')}</span><span class="nm" id="v-caf">${cafHead(d.drinks)}</span></div>
  <div class="steps">${DRINKS.map(([k, name]) => `<div class="step"><span>${name}</span>
    <button type="button" data-drink="${k}" data-d="-1" aria-label="${name} −">−</button><b id="c-${k}">${d.drinks[k] || 0}</b>
    <button type="button" data-drink="${k}" data-d="1" aria-label="${name} +">+</button></div>`).join('')}</div></div>`;
// 값 자리를 누르면 그 항목을 다시 비운다
export const slider = (id, icon, label, v, lo, hi) => `<div class="li sl" id="row-${id}">
  <div class="slh"><span class="lk"><span id="i-${id}">${icon}</span>${label}</span>
    <button type="button" class="slv" data-act="clearField" data-k="${id}" aria-label="${T('지우기')}"><span class="nm" id="n-${id}"></span><b id="v-${id}"></b></button></div>
  <input type="range" id="f-${id}" min="0" max="10" step="1" value="${v == null ? SLIDER_START : v}" aria-label="${label}">
  <div class="ends"><span>${lo}</span><span>${hi}</span></div></div>`;
export const sw = (attr, on, label, icon) => `<button type="button" class="li sw" ${attr} aria-pressed="${!!on}"><span class="lk">${icon || ''}${label}</span><i></i></button>`;

export const medsHtml = () => doseRowsHtml(ui.draft.meds) + medAddHtml();
export const signsHtml = () => SIGNS.map(([k, label]) => sw(`data-sign="${k}"`, ui.draft.signs[k], label)).join('');

// 수면: 적겠다고 누르기 전에는 한 줄짜리 버튼만 보인다
export function sleepHtml() {
  const d = ui.draft;
  if (!d.sleepSet) return `<button type="button" class="li add" data-act="sleepOn">${IC.moon}&nbsp; ${T('지난밤 수면 적기')}</button>`;
  return `<label class="li"><span class="lk">${T('잠든 시각')}</span><input type="time" id="f-bed" value="${esc(d.bed || '')}"></label>
    <label class="li"><span class="lk">${T('깬 시각')}</span><input type="time" id="f-wake" value="${esc(d.wake || '')}"></label>
    <div class="li"><span class="lk">${T('수면 시간')}</span><span class="lv" id="v-sleep"></span></div>
    ${sw('data-flag="tired"', d.tired, T('일어났을 때 피곤함'))}
    <button type="button" class="li add dim" data-act="sleepOff">${T('수면 기록 지우기')}</button>`;
}

// ---------- 화면 ----------
// focus: 오늘 화면에서 누른 항목 (mood, energy, conf, sleep). 그 자리로 바로 내려간다.
export function openRecord(date, focus) {
  ui.draft = newDraft(date);
  ui.addingMed = false;
  const d = ui.draft, isEdit = !!db.entries[date];
  if (focus === 'sleep') d.sleepSet = true;
  sheet.innerHTML = `<div class="sheet-in">
    <div class="sheet-top">
      <button class="txt" data-act="close">${T('취소')}</button>
      <div class="st"><b>${isEdit ? T('기록 수정') : T('기록하기')}</b><span>${longDate(date)}</span></div>
      <button class="txt strong" data-act="save">${T('저장')}</button>
    </div>
    <p class="secnote top-note">${T('적고 싶은 것만 적으면 돼요. 나머지는 나중에 이어서 적을 수 있어요.')}</p>

    <section class="card list">
      ${slider('mood', '', T('기분'), d.mood, T('가라앉음'), T('들뜸'))}
      ${slider('energy', '', T('에너지'), d.energy, T('바닥'), T('넘침'))}
      ${slider('conf', IC.star, T('자신감'), d.conf, T('위축'), T('넘침'))}
    </section>

    <div id="signs" hidden>
      <div class="sec">${T('오늘 이런 점이 있었나요?')}</div>
      <section class="card list">${signsHtml()}</section>
    </div>

    <div class="sec">${T('증상')}</div>
    <section class="card list">
      ${SYMPTOMS.map(([k, label]) => `<div class="li col"><span class="lk">${label}</span>${seg(k, LEVELS, d[k])}</div>`).join('')}
    </section>

    <div class="sec">${T('지난밤 수면')}</div>
    <section class="card list" id="sleep">${sleepHtml()}</section>

    <div class="sec">${T('몸')}</div>
    <section class="card list">
      ${sw('data-flag="period"', d.period, T('생리 중'), IC.drop)}
      ${slider('appetite', IC.fork, T('식욕'), d.appetite, T('없음'), T('많음'))}
      ${drinksHtml(d)}
    </section>

    <div class="sec">${T('오늘 먹은 약')}</div>
    <section class="card list" id="meds">${medsHtml()}</section>

    <div class="sec">${T('메모')}</div>
    <section class="card list">
      <div class="li"><textarea id="f-note" rows="4" maxlength="1000" placeholder="${T('오늘 있었던 일이나 느낀 점')}">${esc(d.note || '')}</textarea></div>
    </section>

    ${isEdit ? `<button class="btn plain danger" data-act="deleteEntry">${T('이 날 기록 삭제')}</button>` : ''}
    <div class="savebar"><button class="btn" data-act="save">${T('저장')}</button></div>
  </div>`;
  showSheet();
  syncForm();
  const target = focus && $(focus === 'sleep' ? '#sleep' : `#row-${focus}`);
  if (target) target.scrollIntoView({ block: 'center' });
}

// 값에 따라 숫자·이름·아이콘·체크리스트·수면 시간을 바로 갱신
export function syncForm() {
  const d = ui.draft;
  if (!d) return;
  SLIDERS.forEach((k) => {
    const v = d[k], input = $(`#f-${k}`), col = tone(k, v);
    $(`#v-${k}`).textContent = v == null ? '–' : v;
    $(`#n-${k}`).textContent = nameOf(k, v);
    input.classList.toggle('unset', v == null);
    input.style.setProperty('--v', (v == null ? SLIDER_START : v) / 10);
    if (col) input.style.setProperty('--tone', col); else input.style.removeProperty('--tone');
  });
  $('#i-mood').innerHTML = IC.face(d.mood == null ? SLIDER_START : d.mood);
  $('#i-energy').innerHTML = IC.battery(d.energy == null ? SLIDER_START : d.energy);
  $('#signs').hidden = !isHigh(d);
  if (d.sleepSet) $('#v-sleep').textContent = durText(sleepMinutes(d.bed, d.wake));
}

// 적은 것이 하나라도 있는지
const hasContent = (d) => SLIDERS.some((k) => d[k] != null) || SYMPTOMS.some(([k]) => d[k] != null) || d.sleepSet || d.period
  || cafMg(d.drinks) > 0 || d.meds.length > 0 || !!(d.note || '').trim();

export function saveEntry() {
  const d = ui.draft, prev = db.entries[d.date];
  if (!prev && !hasContent(d)) { toast(T('적은 내용이 없어요')); return; }
  const signs = {};
  if (isHigh(d)) SIGNS.forEach(([k]) => { if (d.signs[k]) signs[k] = true; });
  const hasDrinks = Object.keys(d.drinks).length > 0;
  // 음료를 안 적었으면 카페인은 빈 값. 다만 예전(슬라이더) 방식으로 적어 둔 값은 그대로 둔다.
  const keepOldCaf = !!prev && !prev.drinks && !hasDrinks;
  // 수면을 안 적었으면 빈 값. 다만 시각 없이 수면 시간만 있던 예전 기록은 그대로 둔다.
  const keepOldSleep = !d.sleepSet && !!prev && !prev.bed && prev.sleepMin != null;
  db.entries[d.date] = {
    date: d.date, mood: d.mood, energy: d.energy, conf: d.conf, dep: d.dep, elev: d.elev, anx: d.anx,
    bed: d.sleepSet ? d.bed || null : null, wake: d.sleepSet ? d.wake || null : null,
    sleepMin: d.sleepSet ? sleepMinutes(d.bed, d.wake) : keepOldSleep ? prev.sleepMin : null,
    tired: d.sleepSet && !!d.tired, period: !!d.period, appetite: d.appetite,
    caffeine: keepOldCaf ? prev.caffeine : hasDrinks ? cafScore(d.drinks) : null, drinks: hasDrinks ? d.drinks : undefined,
    meds: d.meds, note: (d.note || '').trim(), signs, updatedAt: new Date().toISOString(),
  };
  delete db.taken[d.date];
  if (!save()) return;
  closeSheet();
  render();
  toast(T('저장했어요'));
}
