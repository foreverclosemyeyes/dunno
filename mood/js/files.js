// 파일: 캘린더 알림, 백업 내보내기·불러오기
import { today } from './dates.js';
import { toast } from './dom.js';
import { F, T } from './i18n.js';
import { medKey } from './meds.js';
import { render } from './render.js';
import { db, migrate, save } from './store.js';
import { openSettings } from './views/settings.js';

// 기록 알림 시각은 설정에, 약 알람 시각은 약마다(db.meds[i].alarms = ['09:00', ...]) 둔다
export const remind = () => (db.settings.remind || (db.settings.remind = { log: '21:30' }));
export const hasAlarms = () => !!remind().log || db.meds.some((m) => (m.alarms || []).some(Boolean));
// 매일 반복되는 캘린더 알림 파일(.ics)을 만든다
export function makeIcs() {
  const r = remind(), day = today().replace(/-/g, '');
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const url = location.href.split('#')[0];
  const ev = (uid, time, title) => (time ? ['BEGIN:VEVENT', `UID:${uid}@tide-app`, `DTSTAMP:${stamp}`, `DTSTART:${day}T${time.replace(':', '')}00`,
    'DURATION:PT5M', 'RRULE:FREQ=DAILY', `SUMMARY:${title}`, `URL:${url}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'] : []);
  const medEvents = db.meds.flatMap((m, i) => [...new Set((m.alarms || []).filter(Boolean))].flatMap((time) =>
    ev(`med${i}-${time.replace(':', '')}`, time, F('{0} 먹을 시간', `${m.name}${m.dose ? ` ${m.dose}` : ''}`))));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tide//Reminders//KO', 'CALSCALE:GREGORIAN',
    ...ev('log', r.log, T('Tide 기록하기')), ...medEvents, 'END:VCALENDAR'].join('\r\n');
}

// 파일 건네기: 아이폰에서는 공유 창, 그 밖에는 내려받기
export async function giveFile(name, text, type) {
  try {
    const file = new File([text], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return true; }
  } catch (e) {
    if (e && e.name === 'AbortError') return false;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}

export async function exportData() {
  const name = `tide-backup-${today()}.json`;
  const text = JSON.stringify(Object.assign({ app: 'tide', exportedAt: new Date().toISOString() }, db), null, 2);
  if (await giveFile(name, text, 'application/json')) toast(T('백업 파일을 만들었어요'));
}

export function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let inc;
    try { inc = JSON.parse(reader.result); } catch (e) { inc = null; }
    const ok = inc && typeof inc.entries === 'object' && inc.entries &&
      Object.values(inc.entries).every((e) => e && typeof e.mood === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''));
    if (!ok) { toast(T('이 앱의 백업 파일이 아니에요')); return; }
    migrate(inc);
    const n = Object.keys(inc.entries).length;
    if (!confirm(F('백업 파일에 {0}일치 기록이 있어요.\n지금 기록과 합칠까요? (같은 날짜는 더 최근에 수정한 쪽을 남겨요)', n))) return;
    Object.values(inc.entries).forEach((e) => {
      const cur = db.entries[e.date];
      if (!cur || (e.updatedAt || '') >= (cur.updatedAt || '')) db.entries[e.date] = e;
    });
    (Array.isArray(inc.meds) ? inc.meds : []).forEach((m) => {
      if (m && m.name && !db.meds.some((s) => medKey(s) === medKey(m))) db.meds.push({ name: String(m.name), dose: String(m.dose || ''), alarms: (Array.isArray(m.alarms) ? m.alarms : []).filter((t) => /^\d\d:\d\d$/.test(t)) });
    });
    Object.keys(inc.taken || {}).forEach((k) => { if (!db.taken[k] && !db.entries[k] && Array.isArray(inc.taken[k])) db.taken[k] = inc.taken[k]; });
    if (!save()) return;
    render();
    openSettings();
    toast(F('{0}일치 기록을 불러왔어요', n));
  };
  reader.readAsText(file);
}
