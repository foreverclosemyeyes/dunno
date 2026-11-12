// 기록 화면
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

// ---------- 기록 화면 ----------
export function newDraft(date) {
  const old = db.entries[date];
  if (old) return JSON.parse(JSON.stringify(Object.assign({ signs: {}, meds: [], period: false }, old, {
    conf: old.conf == null ? 5 : old.conf, appetite: old.appetite == null ? 5 : old.appetite, caffeine: old.caffeine == null ? 0 : old.caffeine,
    drinks: Object.assign({}, old.drinks), sleepOff: !old.bed && !old.wake && old.sleepMin == null })));
  // 잠든·깬 시각은 가장 최근 기록을 기본값으로 (대부분 비슷하니까 덜 만져도 되게).
  // 바로 전 기록에서 수면을 안 적었으면 이번에도 꺼 둔 채로 시작한다.
  const recent = Object.keys(db.entries).sort().reverse().map((k) => db.entries[k]);
  const last = recent.find((x) => x.bed && x.wake);
  return {
    date, mood: 5, energy: 5, conf: 5, dep: 0, elev: 0, anx: 0,
    bed: last ? last.bed : '23:30', wake: last ? last.wake : '07:00',
    sleepOff: !!recent[0] && !recent[0].bed && !recent[0].wake && recent[0].sleepMin == null,
    tired: false, period: false, appetite: 5, caffeine: 0, drinks: {}, meds: (db.taken[date] || []).slice(), note: '', signs: {},
  };
}

export const seg = (field, labels, value) => `<div class="seg" data-field="${field}">${
  labels.map((l, i) => `<button type="button" data-v="${i}" aria-pressed="${value === i}">${l}</button>`).join('')}</div>`;
export const SLIDERS = ['mood', 'energy', 'conf', 'appetite'];
export const cafHead = (dr) => (cafMg(dr) ? `${nameOf('caffeine', cafScore(dr))} · ${F('약 {0}mg', cafMg(dr))}` : nameOf('caffeine', 0));
export const drinksHtml = (d) => `<div class="li col"><div class="slh"><span class="lk">${IC.coffee}${T('카페인')}</span><span class="nm" id="v-caf">${cafHead(d.drinks)}</span></div>
  <div class="steps">${DRINKS.map(([k, name]) => `<div class="step"><span>${name}</span>
    <button type="button" data-drink="${k}" data-d="-1" aria-label="${name} −">−</button><b id="c-${k}">${d.drinks[k] || 0}</b>
    <button type="button" data-drink="${k}" data-d="1" aria-label="${name} +">+</button></div>`).join('')}</div></div>`;
export const slider = (id, icon, label, v, lo, hi) => `<div class="li sl">
  <div class="slh"><span class="lk"><span id="i-${id}">${icon}</span>${label}</span><span class="slv"><span class="nm" id="n-${id}"></span><b id="v-${id}">${v}</b></span></div>
  <input type="range" id="f-${id}" min="0" max="10" step="1" value="${v}" style="--v:${v / 10}" aria-label="${label}">
  <div class="ends"><span>${lo}</span><span>${hi}</span></div></div>`;
export const sw = (attr, on, label, icon) => `<button type="button" class="li sw" ${attr} aria-pressed="${!!on}"><span class="lk">${icon || ''}${label}</span><i></i></button>`;

export const medsHtml = () => doseRowsHtml(ui.draft.meds) + medAddHtml();

export function signsHtml() {
  const d = ui.draft;
  return SIGNS.map(([k, label]) => sw(`data-sign="${k}"`, d.signs[k], label)).join('');
}

export function openRecord(date) {
  ui.draft = newDraft(date);
  ui.addingMed = false;
  const d = ui.draft, isEdit = !!db.entries[date];
  sheet.innerHTML = `<div class="sheet-in">
    <div class="sheet-top">
      <button class="txt" data-act="close">${T('취소')}</button>
      <div class="st"><b>${isEdit ? T('기록 수정') : T('기록하기')}</b><span>${longDate(date)}</span></div>
      <button class="txt strong" data-act="save">${T('저장')}</button>
    </div>

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
    <section class="card list">
      ${sw('data-flag="sleepOff"', d.sleepOff, T('수면은 적지 않기'))}
      <label class="li sleep-row"><span class="lk">${T('잠든 시각')}</span><input type="time" id="f-bed" value="${esc(d.bed || '')}"></label>
      <label class="li sleep-row"><span class="lk">${T('깬 시각')}</span><input type="time" id="f-wake" value="${esc(d.wake || '')}"></label>
      <div class="li sleep-row"><span class="lk">${T('수면 시간')}</span><span class="lv" id="v-sleep"></span></div>
      ${sw('data-flag="tired" data-sleep-row', d.tired, T('일어났을 때 피곤함'))}
    </section>

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
}

// 슬라이더 값에 따라 숫자·아이콘·체크리스트·수면 시간을 바로 갱신
export function syncForm() {
  const d = ui.draft;
  if (!d) return;
  SLIDERS.forEach((k) => {
    $(`#v-${k}`).textContent = d[k];
    $(`#n-${k}`).textContent = nameOf(k, d[k]);
    const col = tone(k, d[k]);
    if (col) $(`#f-${k}`).style.setProperty('--tone', col); else $(`#f-${k}`).style.removeProperty('--tone');
    $(`#f-${k}`).style.setProperty('--v', d[k] / 10);
  });
  $('#i-mood').innerHTML = IC.face(d.mood);
  $('#i-energy').innerHTML = IC.battery(d.energy);
  $('#signs').hidden = !isHigh(d);
  $('#v-sleep').textContent = durText(sleepMinutes(d.bed, d.wake));
  sheet.querySelectorAll('.sleep-row, [data-sleep-row]').forEach((el) => { el.hidden = !!d.sleepOff; });
}

export function saveEntry() {
  const d = ui.draft;
  const showSigns = isHigh(d);
  const prev = db.entries[d.date];
  const keepOldCaf = !!prev && !prev.drinks && !Object.keys(d.drinks).length;
  const signs = {};
  if (showSigns) SIGNS.forEach(([k]) => { if (d.signs[k]) signs[k] = true; });
  db.entries[d.date] = {
    date: d.date, mood: d.mood, energy: d.energy, conf: d.conf, dep: d.dep, elev: d.elev, anx: d.anx,
    bed: d.sleepOff ? null : d.bed || null, wake: d.sleepOff ? null : d.wake || null, sleepMin: d.sleepOff ? null : sleepMinutes(d.bed, d.wake),
    tired: !d.sleepOff && !!d.tired, period: !!d.period, appetite: d.appetite,
    // 예전(슬라이더) 기록을 음료 입력 없이 수정하면 예전 카페인 값을 그대로 둔다
    caffeine: keepOldCaf ? d.caffeine : cafScore(d.drinks), drinks: keepOldCaf ? undefined : d.drinks,
    meds: d.meds, note: (d.note || '').trim(), signs, updatedAt: new Date().toISOString(),
  };
  delete db.taken[d.date];
  if (!save()) return;
  closeSheet();
  render();
  toast(T('저장했어요'));
}
