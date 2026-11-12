// 화면 요소 도우미와 시트 열고 닫기
import { ui } from './state.js';

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root) => (root || document).querySelector(sel);
export const app = $('#app'), sheet = $('#sheet');

let toastTimer;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// 클래스를 뗐다 붙여서 CSS 애니메이션을 처음부터 다시 돌린다
function replay(el, cls, ms) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
// 탭을 바꿨을 때 내용이 살짝 떠오르게
export const enterApp = () => replay(app, 'enter', 320);

// ---------- 시트 열고 닫기 ----------
const SHEET_OUT = 240;   // app.css의 sheet-out 시간과 같아야 한다
let closing;
// 닫혀 있다가 열릴 때만 아래에서 올라온다. 열린 채 다시 그릴 때는 그대로 둔다.
export function showSheet() {
  const wasClosed = sheet.hidden || sheet.classList.contains('leaving');
  clearTimeout(closing);
  sheet.classList.remove('leaving');
  sheet.hidden = false;
  sheet.scrollTop = 0;
  document.body.classList.add('locked');
  if (wasClosed) replay(sheet, 'entering', 360);
}
export function closeSheet() {
  ui.addingMed = false;
  ui.draft = null;
  document.body.classList.remove('locked');
  sheet.classList.add('leaving');
  clearTimeout(closing);
  closing = setTimeout(() => { sheet.hidden = true; sheet.innerHTML = ''; sheet.classList.remove('leaving'); }, SHEET_OUT);
}
// 시트가 떠 있는지 (닫히는 중은 닫힌 것으로 본다)
export const sheetOpen = () => !sheet.hidden && !sheet.classList.contains('leaving');
