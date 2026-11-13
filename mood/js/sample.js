// 예시 기록: 인사이트를 미리 구경할 때만 쓴다. 저장하지 않고, 내 기록과 섞이지 않는다.
import { addDays, today } from './dates.js';

// 오늘까지 4주치. 일부러 눈에 보이는 패턴을 넣었다:
// 가라앉은 3주 뒤에 들뜬 6일(마지막 이틀은 정신병적 증상도), 카페인이 많은 날은 불안이 높고 그날 밤은 덜 잔다.
export function sampleEntries() {
  const t = today(), out = {};
  for (let i = 27; i >= 0; i--) {
    const date = addDays(t, -i), high = i < 6;
    const cafYesterday = (i + 1) % 5 === 2, movedYesterday = (i + 1) % 4 === 1;
    const period = i >= 16 && i <= 20, caf = i % 5 === 2;
    // 들뜨기 직전 사흘(i 6~8)은 잠이 먼저 줄어 있다
    const sleepMin = high ? 290 : i <= 8 ? 345 : 440 - (cafYesterday ? 70 : 0) + (movedYesterday ? 40 : 0);
    out[date] = {
      date, mood: high ? 8 : 5 - (period ? 1 : 0), energy: high ? 9 : 4 + (i % 2), conf: high ? 8 : 5,
      sleepMin, tired: !high && sleepMin < 400, period, caffeine: caf ? 8 : 3, appetite: caf ? 3 : 6,
      dep: high ? 0 : i >= 20 ? 3 : 1, anx: caf ? 3 : 1, psy: i < 3 ? 1 : null, psych: i < 3 ? { voices: true } : undefined, si: 0, signs: high ? { racing: true, projects: i % 2 === 0 } : {},
    };
  }
  return out;
}
