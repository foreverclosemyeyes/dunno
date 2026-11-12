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

// ---------- 시트 열고 닫기 ----------
export function showSheet() { sheet.hidden = false; sheet.scrollTop = 0; document.body.classList.add('locked'); }
export function closeSheet() { ui.addingMed = false; sheet.hidden = true; sheet.innerHTML = ''; ui.draft = null; document.body.classList.remove('locked'); }
