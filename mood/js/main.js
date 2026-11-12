// 시작점: 누르기·입력 처리와 앱 시작
import { aiSummary } from './analysis.js';
import { addDays, today } from './dates.js';
import { $, app, closeSheet, enterApp, sheet, sheetOpen, toast } from './dom.js';
import { exportData, giveFile, importData, makeIcs, remind } from './files.js';
import { T } from './i18n.js';
import { addDose, medKey, medsFor, normDose, setMeds, sugHtml, toggleDoseTime } from './meds.js';
import { render } from './render.js';
import { onSwipe } from './swipe.js';
import { standalone, trend, ui } from './state.js';
import { db, save } from './store.js';
import { applyFont, applyTheme, themeQuery } from './theme.js';
import { SLIDERS, cafHead, medsHtml, openRecord, saveEntry, syncForm } from './views/record.js';
import { openSettings } from './views/settings.js';
import { shiftAnchor, shiftTrend, trendRange } from './views/trend.js';

themeQuery.addEventListener('change', () => { applyTheme(); if (!sheetOpen()) render(); });

// 약 먹은 기록을 고칠 목록: 기록 화면이 열려 있으면 그 초안, 아니면 보고 있는 날짜의 저장된 목록
const doseList = () => (ui.draft ? ui.draft.meds : medsFor(ui.selected).map((m) => ({ ...m })));
function commitDoses(list) {
  if (ui.draft) { $('#meds').innerHTML = medsHtml(); return; }
  setMeds(ui.selected, list);
  render();
}

// ---------- 이벤트 ----------
const actions = {
  tab: (el) => { if (ui.tab === el.dataset.tab) return; ui.tab = el.dataset.tab; window.scrollTo(0, 0); render(); enterApp(); },
  color: (el) => { db.settings.color = el.dataset.colorPick; save(); applyTheme(); render(); openSettings(); },
  theme: (el) => { db.settings.theme = el.dataset.themePick; save(); applyTheme(); render(); openSettings(); },
  doseAdd: (el) => { const list = doseList(); addDose(list, el.dataset.med); commitDoses(list); },
  doseTime: (el) => { const list = doseList(); toggleDoseTime(list[Number(el.dataset.i)]); commitDoses(list); },
  doseDel: (el) => { const list = doseList(); list.splice(Number(el.dataset.i), 1); commitDoses(list); },
  ics: async () => {
    const r = remind();
    if (!r.log && !r.med1 && !r.med2) { toast(T('알림 시간을 먼저 정해 주세요')); return; }
    await giveFile('tide-reminders.ics', makeIcs(), 'text/calendar');
  },
  copyAi: async () => {
    const text = aiSummary();
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (err) { /* 복사 불가 */ }
      ta.remove();
    }
    toast(T('복사했어요. AI 앱에 붙여 넣으세요'));
  },
  lang: (el) => { db.settings.lang = el.dataset.lang; if (save()) location.reload(); },
  size: (el) => { db.settings.size = el.dataset.size; save(); applyFont(); render(); openSettings(); },
  font: (el) => { db.settings.font = el.dataset.font; save(); applyFont(); openSettings(); },
  mode: (el) => { trend.mode = el.dataset.mode; trend.pick = null; if (trend.anchor > today()) trend.anchor = today(); render(); },
  shift: (el) => { shiftTrend(Number(el.dataset.step)); render(); },
  pickDay: (el) => { const i = Number(el.dataset.i); trend.pick = trend.pick === i ? null : i; render(); },
  openDay: (el) => { ui.selected = el.dataset.date; ui.tab = 'today'; window.scrollTo(0, 0); render(); enterApp(); },
  pick: (el) => { ui.selected = el.dataset.date; render(); },
  week: (el) => {
    const next = addDays(ui.selected, 7 * Number(el.dataset.step));
    ui.selected = next > today() ? today() : next;
    render();
  },
  goToday: () => { ui.selected = today(); render(); },
  closeHint: () => { db.settings.hintClosed = true; save(); render(); },
  record: () => openRecord(ui.selected),
  settings: openSettings,
  close: closeSheet,
  save: saveEntry,
  deleteEntry: () => {
    if (!confirm(T('이 날 기록을 삭제할까요?'))) return;
    delete db.entries[ui.draft.date];
    save(); closeSheet(); render(); toast(T('삭제했어요'));
  },
  addMed: () => {
    ui.addingMed = !ui.addingMed;
    if (ui.draft) $('#meds').innerHTML = medsHtml(); else { const y = sheet.scrollTop; openSettings(); sheet.scrollTop = y; }
    if (ui.addingMed) $('#med-name').focus();
  },
  pickSug: (el) => { $('#med-name').value = el.dataset.name; $('#med-sug').innerHTML = ''; $('#med-dose').focus(); },
  medSetup: () => { ui.addingMed = true; openSettings(); $('#sec-meds').scrollIntoView(); },
  saveMed: () => {
    const name = $('#med-name').value.trim(), dose = normDose($('#med-dose').value);
    if (!name) { toast(T('약 이름을 적어 주세요')); return; }
    const m = { name, dose };
    if (!db.meds.some((x) => medKey(x) === medKey(m))) { db.meds.push(m); save(); }
    ui.addingMed = false;
    if (ui.draft) $('#meds').innerHTML = medsHtml();
    else { const y = sheet.scrollTop; render(); openSettings(); sheet.scrollTop = y; }
  },
  delMed: (el) => {
    db.meds = db.meds.filter((m) => medKey(m) !== el.dataset.med);
    save(); openSettings();
  },
  export: exportData,
  import: () => $('#importFile').click(),
};

document.addEventListener('click', (ev) => {
  const t = ev.target.closest('button');
  if (!t) return;
  if (t.dataset.act) { actions[t.dataset.act](t); return; }
  const d = ui.draft;
  if (!d) return;
  const segEl = t.closest('.seg');
  if (segEl) {                                   // 단계 버튼
    const f = segEl.dataset.field, v = Number(t.dataset.v);
    const required = f === 'dep' || f === 'elev' || f === 'anx';
    const cur = f === 'tired' ? (d.tired == null ? null : +d.tired) : d[f];
    const next = (cur === v && !required) ? null : v;   // 선택 항목은 다시 누르면 해제
    d[f] = f === 'tired' ? (next == null ? null : !!next) : next;
    segEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === next)));
  } else if (t.dataset.drink) {                  // 카페인 음료 개수
    const k = t.dataset.drink, n = Math.max(0, Math.min(9, (d.drinks[k] || 0) + Number(t.dataset.d)));
    if (n) d.drinks[k] = n; else delete d.drinks[k];
    $(`#c-${k}`).textContent = n;
    $('#v-caf').textContent = cafHead(d.drinks);
  } else if (t.dataset.flag) {                   // 스위치 (생리 중, 피곤함, 수면 안 적기)
    d[t.dataset.flag] = !d[t.dataset.flag];
    t.setAttribute('aria-pressed', String(!!d[t.dataset.flag]));
    syncForm();
  } else if (t.dataset.sign) {                   // 조건부 체크리스트
    d.signs[t.dataset.sign] = !d.signs[t.dataset.sign];
    t.setAttribute('aria-pressed', String(!!d.signs[t.dataset.sign]));
  }
});

sheet.addEventListener('input', (ev) => {
  const d = ui.draft, el = ev.target;
  if (el.id === 'med-name') { $('#med-sug').innerHTML = sugHtml(el.value.trim()); return; }
  if (el.id.startsWith('r-')) { remind()[el.id.slice(2)] = el.value; save(); return; }
  if (!d) return;
  const k = el.id.slice(2);
  if (SLIDERS.includes(k)) d[k] = Number(el.value);
  else if (el.id === 'f-bed') d.bed = el.value;
  else if (el.id === 'f-wake') d.wake = el.value;
  else if (el.id === 'f-note') d.note = el.value;
  else return;
  syncForm();
});

// 옆으로 밀면 날짜가 넘어간다: 오늘 탭은 하루씩, 흐름 탭은 한 주(한 달)씩. 미래로는 못 간다.
onSwipe(app, (step) => {
  if (ui.tab === 'today') {
    const next = addDays(ui.selected, step);
    if (next > today()) return;
    ui.selected = next;
  } else if (ui.tab === 'trend') {
    if (trendRange(shiftAnchor(trend.anchor, step)).start > today()) return;
    shiftTrend(step);
  } else return;
  render();
  enterApp(step > 0 ? 'next' : 'prev');
});

// 흐름 그래프에서 날짜 칸을 누르면 그날 값을 보여 준다
app.addEventListener('click', (ev) => {
  const plot = ev.target.closest('.plot');
  if (!plot) return;
  const box = plot.querySelector('svg').getBoundingClientRect(), n = Number(plot.dataset.n);
  const i = Math.floor((ev.clientX - box.left) / (Number(plot.dataset.w) / n));
  if (i < 0 || i >= n || addDays(trendRange(trend.anchor).start, i) > today()) return;
  trend.pick = trend.pick === i ? null : i;
  render();
});
window.addEventListener('resize', () => { if (ui.tab === 'trend' && !sheetOpen()) render(); });

$('#importFile').addEventListener('change', (ev) => {
  const f = ev.target.files[0];
  ev.target.value = '';
  if (f) importData(f);
});

// 자정을 넘긴 뒤 앱으로 돌아오면 '오늘'을 새로 계산
let lastDay = today();
document.addEventListener('visibilitychange', () => {
  if (document.hidden || today() === lastDay) return;
  if (ui.selected === lastDay) ui.selected = today();
  lastDay = today();
  if (!sheetOpen()) render();
});

// ---------- 시작 ----------
// 홈 화면 앱이면 아래 고정 요소(탭바·저장 버튼)를 기기 화면 높이 기준으로 놓는다 (이유는 app.css의 .standalone 설명)
if (standalone()) {
  document.documentElement.classList.add('standalone');
  document.documentElement.style.setProperty('--screen-h', `${Math.max(screen.height, screen.width)}px`);
}
applyTheme();
applyFont();
render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
