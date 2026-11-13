// 메모 모아 보기: 날짜별 메모를 최근 것부터 훑어보고, 낱말로 찾는다. 누르면 그날로 간다.
import { longDate } from '../dates.js';
import { esc, sheet, showSheet } from '../dom.js';
import { F, T } from '../i18n.js';
import { db } from '../store.js';

const noted = () => Object.keys(db.entries).sort().reverse().map((k) => db.entries[k]).filter((e) => e.note);

export function notesListHtml(query) {
  const q = (query || '').trim().toLowerCase();
  const list = noted().filter((e) => !q || e.note.toLowerCase().includes(q));
  if (!list.length) return `<div class="li say mut">${q ? T('찾는 낱말이 들어간 메모가 없어요.') : T('아직 적은 메모가 없어요.')}</div>`;
  return list.map((e) => `<button class="li say note" data-act="openDay" data-date="${e.date}"><small>${longDate(e.date)}</small>${esc(e.note)}</button>`).join('');
}

export function openNotes() {
  sheet.innerHTML = `<div class="sheet-in" style="padding-bottom:calc(var(--safe-b) + 30px)">
    <div class="sheet-top">
      <span class="txt"></span>
      <div class="st"><b>${T('메모 모아 보기')}</b><span>${F('{0}일', noted().length)}</span></div>
      <button class="txt strong" data-act="close">${T('완료')}</button>
    </div>
    <section class="card list"><div class="li"><input type="text" id="q-notes" placeholder="${T('낱말로 찾기')}" autocomplete="off"></div></section>
    <section class="card list" id="notes-list">${notesListHtml('')}</section>
  </div>`;
  showSheet();
}
