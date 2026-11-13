// 인사이트 화면: 지금 떠 있는 신호, 기록에서 보이는 비교(숫자 두 개씩), 메모·AI로 가는 줄
import { insights, signals } from '../analysis.js';
import { app } from '../dom.js';
import { F, T } from '../i18n.js';
import { IC } from '../icons.js';
import { db } from '../store.js';

// 비교 한 줄: 위에 무엇을 견준 것인지, 아래에 두 숫자를 나란히 (앞쪽이 눈에 띄게)
const compareRow = ({ title, a, b }) => `<div class="li cmp"><div class="cmp-t">${title}</div>
  <div class="cmp-v"><div><b>${a[1]}</b><span>${a[0]}</span></div><div class="other"><b>${b[1]}</b><span>${b[0]}</span></div></div></div>`;

export function viewInsight() {
  const n = Object.keys(db.entries).length, list = insights(), sig = signals();
  app.innerHTML = `
    <header class="top"><div><div class="over">${F('기록 {0}일', n)}</div><h1>${T('인사이트')}</h1></div></header>
    ${sig.map((m) => `<div class="card signal"><i></i><span>${m}</span></div>`).join('')}
    <div class="sec">${T('기록에서 보이는 것')}</div>
    <section class="card list">${list.length ? list.map(compareRow).join('')
      : `<div class="li say mut">${n < 7 ? F('기록이 7일 이상 쌓이면 패턴을 찾아 보여 드려요. 지금은 {0}일이에요.', n) : T('아직 뚜렷한 패턴이 보이지 않아요. 기록이 더 쌓이면 다시 살펴볼게요.')}</div>`}</section>
    ${list.length ? `<p class="secnote">${T('내 기록의 평균을 견준 숫자예요. 원인이나 진단을 뜻하지 않아요.')}</p>` : ''}
    <div class="sec">${T('더 보기')}</div>
    <section class="card list">
      <button class="li add" data-act="notes">${IC.note}&nbsp; ${T('메모 모아 보기')}</button>
      <button class="li add" data-act="copyAi">${IC.spark}&nbsp; ${T('AI에게 물어볼 글 복사 (최근 4주)')}</button>
    </section>
    <p class="secnote">${T('복사한 글을 Claude나 ChatGPT 같은 AI 앱에 붙여 넣으면 기록 전체를 읽고 패턴을 정리해 줘요. 붙여 넣는 순간 그 기록은 해당 AI 서비스로 전송돼요.')}</p>`;
}
