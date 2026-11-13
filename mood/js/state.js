// 화면 상태
import { today } from './dates.js';

// ---------- 화면 상태 ----------
// insightDemo: 인사이트 화면에서 예시 기록을 보고 있는지
export const ui = { tab: 'today', selected: today(), draft: null, addingMed: false, insightDemo: false };
export const standalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

// ---------- 흐름 화면 (주 / 월) ----------
export const trend = { mode: 'week', anchor: today(), pick: null };

// ---------- 진료 화면 (요약 기간: 1 / 2 / 4주 또는 'since' = 지난 진료 후, 큰 그래프에 켜 둔 선) ----------
export const clinicView = { weeks: 2, lines: ['mood', 'energy'] };
