// 화면 모드, 색, 글씨체·글씨 크기
import { FONTS, SIZES } from './constants.js';
import { $ } from './dom.js';
import { db } from './store.js';

export const fontScale = () => (SIZES[db.settings.size] || SIZES.m)[1];
export const isLight = () => document.documentElement.dataset.theme === 'light';

// ---------- 색 ----------
// 색은 하나만 쓴다. 기분·에너지·자신감 모두 같은 색이고, 수면은 색을 안 쓴다.
// [이름, 다크 모드 색, 라이트 모드 색]
export const ACCENTS = {
  green: ['초록', [48, 209, 88], [36, 178, 72]],
  yellow: ['노랑', [255, 214, 10], [240, 176, 0]],
  blue: ['파랑', [90, 165, 255], [0, 122, 255]],
  purple: ['보라', [150, 130, 255], [110, 90, 220]],
  pink: ['분홍', [255, 110, 150], [235, 70, 120]],
};
export const accentKey = () => (db.settings.color === 'off' ? null : ACCENTS[db.settings.color] ? db.settings.color : 'green');

const TINTED = ['mood', 'energy', 'conf'];
const GRAYS = { dark: [[70, 70, 74], [118, 118, 124]], light: [[158, 158, 164], [206, 206, 212]] };   // [값 0일 때, 값 5일 때]
const HUE_FROM = 4;   // 이 값까지는 회색만, 넘으면 색이 섞이기 시작해서 10에서 완전한 색

const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// 값(0~10)에 맞는 색. 4 이하는 회색(낮을수록 어둡게), 그 위로는 고른 색 쪽으로 빠르게 물든다.
export function toneRgb(key, v) {
  const k = accentKey();
  if (!k || v == null || !TINTED.includes(key)) return null;
  const light = isLight(), [lo, hi] = GRAYS[light ? 'light' : 'dark'];
  const gray = mix(lo, hi, clamp01(v / 5));
  return mix(gray, ACCENTS[k][light ? 2 : 1], clamp01((v - HUE_FROM) / (10 - HUE_FROM)));
}
export const tone = (key, v) => { const c = toneRgb(key, v); return c ? `rgb(${c})` : ''; };

// 날짜 동그라미 칠하기. 색을 끄면 흑백(낮을수록 어둡게).
export function moodFill(v) {
  const c = toneRgb('mood', v) ||Array(3).fill(Math.round(isLight() ? 135 + v * 10 : 55 + v * 20));
  return `background:rgb(${c});color:${(c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 140 ? (isLight() ? '#1d1d1f' : '#000') : '#fff'}`;
}

// ---------- 화면 모드 · 글씨 ----------
export const themeQuery = matchMedia('(prefers-color-scheme: light)');
export function applyTheme() {
  const pref = db.settings.theme || 'auto', light = pref === 'light' || (pref === 'auto' && themeQuery.matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  const meta = $('meta[name=theme-color]');
  if (meta) meta.content = light ? '#eef0f3' : '#000000';
}

export function applyFont() {
  const st = document.documentElement.style, key = FONTS[db.settings.font] ? db.settings.font : 'system';
  st.setProperty('--font', FONTS[key][1]);
  // 큰 숫자는 기본 글씨체일 때만 아이폰의 둥근 숫자를 쓰고, 다른 글씨체를 고르면 그 글씨체를 따른다
  if (key === 'system') st.removeProperty('--round'); else st.setProperty('--round', FONTS[key][1]);
  document.documentElement.style.setProperty('--fs', fontScale());
}
