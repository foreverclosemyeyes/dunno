// 인사이트 화면: 지금 떠 있는 신호, 기록에서 보이는 비교(숫자 두 개씩), 메모·AI로 가는 줄
// 기록이 아직 적으면 예시 기록으로 어떤 것이 나오는지 미리 볼 수 있다 (ui.insightDemo).
import { INSIGHT_MIN_DAYS, insights, signals } from '../analysis.js';
import { app } from '../dom.js';
import { F, T } from '../i18n.js';
import { IC } from '../icons.js';
import { sampleEntries } from '../sample.js';
import { ui } from '../state.js';
import { db } from '../store.js';

// 관찰 한 줄: 위에 결론 문장, 아래에 그 근거인 두 평균과 며칠을 견준 것인지
const side = ([name, value, n]) => `<div><b>${value}</b><span>${name} · ${F('{0}일', n)}</span></div>`;
const compareRow = ({ text, a, b }) => `<div class="li cmp"><div class="cmp-t">${text}</div><div class="cmp-v">${side(a)}${side(b)}</div></div>`;

export function viewInsight() {
  const n = Object.keys(db.entries).length, mine = insights(), sig = signals();
  const demo = ui.insightDemo && !mine.length, list = demo ? insights(sampleEntries()) : mine;
  const empty = `<div class="li say mut">${n < INSIGHT_MIN_DAYS ? F('기록이 {0}일 이상 쌓이면 패턴을 찾아 보여 드려요. 지금은 {1}일이에요.', INSIGHT_MIN_DAYS, n) : T('아직 뚜렷한 패턴이 보이지 않아요. 기록이 더 쌓이면 다시 살펴볼게요.')}</div>
    <button class="li add" data-act="insightDemo">${IC.spark}&nbsp; ${T('예시로 미리 보기')}</button>`;
  app.innerHTML = `
    <header class="top"><div><div class="over">${F('기록 {0}일', n)}</div><h1>${T('인사이트')}</h1></div></header>
    ${sig.map((m) => `<div class="card signal"><i></i><span>${m}</span></div>`).join('')}
    <div class="sec">${demo ? T('예시 기록에서 보이는 것') : T('기록에서 보이는 것')}</div>
    <section class="card list">${list.length ? list.map(compareRow).join('') : empty}
      ${demo ? `<button class="li add dim" data-act="insightDemo">${T('예시 닫기')}</button>` : ''}</section>
    ${demo ? `<p class="secnote">${T('만들어 낸 예시 기록이에요. 내 기록이 아니고 저장되지 않아요. 내 기록이 쌓이면 이 자리에 내 숫자가 나와요.')}</p>`
    : list.length ? `<p class="secnote">${T('차이가 큰 것부터 나와요. 내 기록의 평균을 견준 것이고, 원인이나 진단을 뜻하지 않아요.')}</p>` : ''}
    <div class="sec">${T('더 보기')}</div>
    <section class="card list">
      <button class="li add" data-act="notes">${IC.note}&nbsp; ${T('메모 모아 보기')}</button>
      <button class="li add" data-act="copyAi">${IC.spark}&nbsp; ${T('AI에게 물어볼 글 복사 (최근 4주)')}</button>
    </section>
    <p class="secnote">${T('복사한 글을 Claude나 ChatGPT 같은 AI 앱에 붙여 넣으면 기록 전체를 읽고 패턴을 정리해 줘요. 붙여 넣는 순간 그 기록은 해당 AI 서비스로 전송돼요.')}</p>`;
}
