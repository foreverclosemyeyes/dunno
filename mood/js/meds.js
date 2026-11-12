// 약: 그날 먹은 약, 약 추가 입력
import { CATALOG, SEDATIVES } from './constants.js';
import { addDays } from './dates.js';
import { esc } from './dom.js';
import { T } from './i18n.js';
import { ui } from './state.js';
import { db, save } from './store.js';

// 그날 먹은 약: 기록이 있으면 기록 안에, 아직 없으면 따로 적어 둔다
export const medsFor = (date) => (db.entries[date] ? db.entries[date].meds || [] : db.taken[date] || []);
export function toggleMed(date, key) {
  const list = medsFor(date).slice(), i = list.findIndex((m) => medKey(m) === key);
  if (i >= 0) list.splice(i, 1);
  else { const m = db.meds.find((x) => medKey(x) === key); if (m) list.push({ name: m.name, dose: m.dose }); }
  if (db.entries[date]) { db.entries[date].meds = list; db.entries[date].updatedAt = new Date().toISOString(); } else db.taken[date] = list;
  save();
}
export const aided = (e) => medsFor(addDays(e.date, -1)).some((m) => SEDATIVES.includes(m.name));

export const medKey = (m) => `${m.name}|${m.dose || ''}`;

// 약 추가: 이름을 치면 목록에서 골라 넣을 수 있다
export function sugHtml(q) {
  const have = new Set(db.meds.map((m) => m.name));
  const hit = CATALOG.filter(([b, g]) => !have.has(b) && (!q || b.includes(q) || g.includes(q))).slice(0, q ? 12 : 10);
  return hit.map(([b, g]) => `<button type="button" class="sug" data-act="pickSug" data-name="${esc(b)}">${esc(b)}<small>${esc(g)}</small></button>`).join('');
}
export function medAddHtml() {
  return ui.addingMed
    ? `<div class="li med-new">
         <input type="text" id="med-name" placeholder="${T('약 이름')}" autocomplete="off" maxlength="30">
         <input type="text" id="med-dose" placeholder="${T('용량 (예: 300mg)')}" autocomplete="off" maxlength="20">
         <div class="sugs" id="med-sug">${sugHtml('')}</div>
         <button type="button" class="btn gray" data-act="saveMed">${T('약 저장')}</button>
       </div>`
    : `<button type="button" class="li add" data-act="addMed">${T('+ 약 추가')}</button>`;
}
