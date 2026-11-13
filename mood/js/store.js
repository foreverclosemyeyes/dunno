// 저장소: 기록은 이 기기의 localStorage에만 둔다
import { KEY, OLD_KEY } from './config.js';
import { toast } from './dom.js';
import { T } from './i18n.js';

// ---------- 저장소 (이 기기 안에만 저장) ----------
const blank = () => ({ version: 2, entries: {}, meds: [], taken: {}, settings: {} });
// 예전 기록(식욕·카페인 3단계)을 0~10 숫자로 옮긴다
export function migrate(data) {
  if ((data.version || 1) < 2) {
    Object.values(data.entries || {}).forEach((e) => {
      if (e.appetite != null) e.appetite = [2, 5, 8][e.appetite];
      if (e.caffeine != null) e.caffeine = [0, 4, 8][e.caffeine];
    });
    data.version = 2;
  }
  return data;
}
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY));
    if (raw && typeof raw === 'object' && raw.entries) return migrate(Object.assign(blank(), raw, { version: raw.version || 1 }));
  } catch (e) { /* 처음 실행이거나 읽기 실패 */ }
  return blank();
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
  catch (e) { toast(T('저장하지 못했어요. 저장 공간을 확인해 주세요.')); return false; }
}
export const db = load();

// 설정에서 꺼 둔 기록 항목인지 (settings.off에 열쇠가 있으면 꺼진 것. 없으면 전부 켜짐)
export const itemOn = (key) => !(db.settings.off || []).includes(key);
