// 아이콘

// ---------- 아이콘 (선 그림) ----------
// 아이콘: 선으로 그린 모양의 안쪽을 같은 색으로 채운다. FILL은 테두리까지 채운 도형, SOLID는 테두리 없이 채운 도형.
const svg = (inner) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const FILL = 'fill="currentColor" stroke-width="1.2"', SOLID = 'fill="currentColor" stroke="none"';
let maskId = 0;
export const IC = {
  // 기분: 값에 따라 입꼬리가 바뀌는 얼굴 (눈·입은 뚫어서 표현)
  face: (v) => { const e = 15 - (v - 5) * 0.3, c = 15 + (v - 5) * 0.8, id = `fm${++maskId}`;
    return svg(`<mask id="${id}"><rect width="24" height="24" fill="#fff" stroke="none"/><path d="M9 9.3v1M15 9.3v1" stroke="#000" stroke-width="2"/><path d="M8 ${e}Q12 ${c} 16 ${e}" stroke="#000" stroke-width="1.7" fill="none"/></mask><circle cx="12" cy="12" r="9.6" ${SOLID} mask="url(#${id})"/>`); },
  // 에너지: 값만큼 차는 배터리
  battery: (v) => svg(`<rect x="2.5" y="7.5" width="17" height="9" rx="2.5"/><path d="M22 10.5v3"/>${v > 0 ? `<rect x="4.5" y="9.5" width="${(13 * v / 10).toFixed(1)}" height="5" rx="1" ${SOLID}/>` : ''}`),
  moon: svg(`<path ${FILL} d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>`),
  drop: svg(`<path ${FILL} d="M12 3.5c3 4 5.5 6.8 5.5 10a5.5 5.5 0 0 1-11 0c0-3.2 2.5-6 5.5-10z"/>`),
  pill: svg(`<g transform="rotate(-45 12 12)" ${SOLID}><path d="M7 8h4.3v8H7a4 4 0 0 1 0-8z"/><path d="M12.7 8H17a4 4 0 0 1 0 8h-4.3z"/></g>`),
  coffee: svg(`<path ${FILL} d="M5 9.5h11v4.5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 10.5h1.5a2.25 2.25 0 0 1 0 4.5H16M8.5 3.5v2.5M12.5 3.5v2.5"/>`),
  fork: svg(`<path ${FILL} d="M6.6 3.2h4.8v6.3a2.4 2.4 0 0 1-4.8 0z"/><path d="M9 11v10M17.5 11v10"/><path ${FILL} d="M17.5 3.2c-2.1 2-2.6 4.9-2.6 7.8h2.6z"/>`),
  note: svg(`<path ${FILL} d="M4 20h4L19 9l-4-4L4 16z"/>`),
  wave: svg('<path d="M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/>'),
  star: svg(`<path ${FILL} d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>`),
  spark: svg(`<path ${FILL} d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>`),
  today: svg(`<path ${SOLID} d="M3.5 10.6h17V17a3.6 3.6 0 0 1-3.6 3.6H7.1A3.6 3.6 0 0 1 3.5 17zM7.1 4.6h9.8a3.6 3.6 0 0 1 3.6 3.6v.8h-17v-.8a3.6 3.6 0 0 1 3.6-3.6z"/><path d="M8.5 2.8v3M15.5 2.8v3"/>`),
  chart: svg(`<path ${FILL} d="M5.5 15.5l4.5-5.5 3.5 3L19 6.5V18H5.5z"/><path d="M3.5 20.5h17"/>`),
  sliders: svg(`<path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.7" ${SOLID}/><circle cx="9" cy="17" r="2.7" ${SOLID}/>`),
};
