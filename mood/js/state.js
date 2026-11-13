// 화면 상태
import { today } from './dates.js';

// ---------- 화면 상태 ----------
export const ui = { tab: 'today', selected: today(), draft: null, addingMed: false };
export const standalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

// ---------- 흐름 화면 (주 / 월) ----------
export const trend = { mode: 'week', anchor: today(), pick: null };

// ---------- 진료 화면 (요약 기간: 2주 / 4주, 큰 그래프에 켜 둔 선) ----------
export const clinicView = { weeks: 2, lines: ['mood', 'dep', 'elev'] };
