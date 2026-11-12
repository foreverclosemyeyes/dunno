// 인사이트 화면
import { insights, signals } from '../analysis.js';
import { addDays, today } from '../dates.js';
import { app, esc } from '../dom.js';
import { F, T } from '../i18n.js';
import { IC } from '../icons.js';
import { medKey, medsFor } from '../meds.js';
import { db } from '../store.js';
import { li } from './today.js';

export function viewInsight() {
  const n = Object.keys(db.entries).length, list = insights(), sig = signals(), t = today();
  const adher = db.meds.map((m) => {
    let c = 0;
    for (let i = 0; i < 14; i++) if (medsFor(addDays(t, -i)).some((x) => medKey(x) === medKey(m))) c++;
    return li(`${IC.pill}${esc(m.name)}${m.dose ? `<small>${esc(m.dose)}</small>` : ''}`, F('14일 중 {0}일', c));
  }).join('');
  app.innerHTML = `
    <header class="top"><div><div class="over">${F('기록 {0}일', n)}</div><h1>${T('인사이트')}</h1></div></header>
    ${sig.map((m) => `<div class="card signal"><i></i><span>${m}</span></div>`).join('')}
    <div class="sec">${T('기록에서 보이는 것')}</div>
    <section class="card list">${list.length ? list.map((x) => `<div class="li say">${x}</div>`).join('')
      : `<div class="li say mut">${n < 7 ? F('기록이 7일 이상 쌓이면 패턴을 찾아 보여 드려요. 지금은 {0}일이에요.', n) : T('아직 뚜렷한 패턴이 보이지 않아요. 기록이 더 쌓이면 다시 살펴볼게요.')}</div>`}</section>
    ${adher ? `<div class="sec">${T('약 체크 (최근 14일)')}</div><section class="card list">${adher}</section>` : ''}
    <div class="sec">${T('AI에게 물어보기')}</div>
    <section class="card list"><button class="li add" data-act="copyAi">${IC.spark}&nbsp; ${T('최근 4주 기록을 글로 복사')}</button></section>
    <p class="secnote">${T('복사한 글을 Claude나 ChatGPT 같은 AI 앱에 붙여 넣으면 기록 전체를 읽고 패턴을 정리해 줘요. 붙여 넣는 순간 그 기록은 해당 AI 서비스로 전송돼요.')}</p>
    <p class="foot">${T('위 문장들은 내 기록을 계산한 관찰이에요. 원인이나 진단을 뜻하지 않아요.')}</p>`;
}
