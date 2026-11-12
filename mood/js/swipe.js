// 옆으로 밀기: 손가락을 가로로 충분히 밀었을 때만 알려 준다 (세로 스크롤과 헷갈리지 않게)
const MIN_X = 56;   // 이만큼은 밀어야 넘어간다
const RATIO = 1.8;  // 가로가 세로보다 이 배수 이상 커야 한다

// handler(step): 왼쪽으로 밀면 +1(다음), 오른쪽으로 밀면 -1(이전)
export function onSwipe(el, handler) {
  let start = null;
  el.addEventListener('touchstart', (ev) => {
    // 슬라이더·시각 입력을 만지는 중에는 넘기지 않는다
    start = ev.touches.length === 1 && !ev.target.closest('input, textarea') ? ev.touches[0] : null;
  }, { passive: true });
  el.addEventListener('touchend', (ev) => {
    if (!start) return;
    const end = ev.changedTouches[0], dx = end.clientX - start.clientX, dy = end.clientY - start.clientY;
    start = null;
    if (Math.abs(dx) >= MIN_X && Math.abs(dx) >= Math.abs(dy) * RATIO) handler(dx < 0 ? 1 : -1);
  }, { passive: true });
  el.addEventListener('touchcancel', () => { start = null; }, { passive: true });
}
