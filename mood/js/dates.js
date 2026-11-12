// 날짜·시간 도우미
import { EN } from './i18n.js';

export const WD = () => (EN ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['일', '월', '화', '수', '목', '금', '토']);

// ---------- 날짜·시간 도우미 ----------
export const pad = (n) => String(n).padStart(2, '0');
export const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ds(d); };
export const today = () => ds(new Date());
export const weekStart = (s) => { const d = parse(s); return addDays(s, -((d.getDay() + 6) % 7)); }; // 월요일 시작
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const md = (d) => (EN ? `${MON[d.getMonth()]} ${d.getDate()}` : `${d.getMonth() + 1}월 ${d.getDate()}일`);
export const monthTitle = (d) => (EN ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : `${d.getFullYear()}년 ${d.getMonth() + 1}월`);
export const longDate = (s) => { const d = parse(s); return EN ? `${WD()[d.getDay()]}, ${md(d)}` : `${md(d)} ${WD()[d.getDay()]}요일`; };
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export function sleepMinutes(bed, wake) {
  if (!bed || !wake) return null;
  const diff = (toMin(wake) - toMin(bed) + 1440) % 1440;
  return diff || null;
}
export const durText = (min) => {
  if (min == null) return '–';
  const h = Math.floor(min / 60), m = min % 60;
  if (EN) return [h ? `${h}h` : '', m || !h ? `${m}m` : ''].filter(Boolean).join(' ');
  return [h ? `${h}시간` : '', m || !h ? `${m}분` : ''].filter(Boolean).join(' ');
};
export const ampm = (t) => {
  if (!t) return '–';
  const [h, m] = t.split(':').map(Number);
  return EN ? `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}` : `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(m)}`;
};
