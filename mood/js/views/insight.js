// 인사이트 화면: 최근 7일을 종합해서 읽은 것, 그 흐름이 시작되기 전 사흘, 내 시기들, 시기별 내 평균, 약을 바꾼 앞뒤,
// 흔한 예상과 다르게 나온 비교, 메모·AI로 가는 줄. 누구에게나 해당하는 뻔한 말은 넣지 않는다 (사용자가 지적, 2026-11-13).
// 기록이 아직 적으면 예시 기록으로 어떤 것이 나오는지 미리 볼 수 있다 (ui.insightDemo).
import { INSIGHT_MIN_DAYS, baseline, episodes, insights, medChanges, recentState } from '../analysis.js';
import { md, parse } from '../dates.js';
import { app, esc } from '../dom.js';
import { F, T } from '../i18n.js';
import { IC } from '../icons.js';
import { sampleEntries } from '../sample.js';
import { ui } from '../state.js';
import { db } from '../store.js';

// 관찰 한 줄: 위에 결론 문장, 아래에 그 근거인 두 평균과 며칠을 견준 것인지
const side = ([name, value, n]) => `<div><b>${value}</b><span>${name} · ${F('{0}일', n)}</span></div>`;
const compareRow = ({ text, a, b }) => `<div class="li cmp"><div class="cmp-t">${text}</div><div class="cmp-v">${side(a)}${side(b)}</div></div>`;

const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${x}</li>`).join('')}</ul>` : '');

export function viewInsight() {
  const n = Object.keys(db.entries).length, mine = insights();
  const demo = ui.insightDemo && !mine.length, list = demo ? insights(sampleEntries()) : mine;
  const src = demo ? sampleEntries() : db.entries, state = recentState(src), ep = episodes(src), base = baseline(src), changes = demo ? [] : medChanges();
  const span = (r) => `${md(parse(r.start))} – ${md(parse(r.end))}`;
  const epStat = [ep.high && F('들뜬 시기 {0}번 · 평균 {1}일', ep.high.n, ep.high.avg), ep.low && F('가라앉은 시기 {0}번 · 평균 {1}일', ep.low.n, ep.low.avg)].filter(Boolean).join(' / ');
  // 표 한 줄: 첫 칸은 이름, 나머지는 값
  const tr = (cells, head) => `<div class="tr${head ? ' th' : ''}">${cells.map((c) => `<span>${c}</span>`).join('')}</div>`;
  const empty = `<div class="li say mut">${n < INSIGHT_MIN_DAYS ? F('기록이 {0}일 이상 쌓이면 패턴을 찾아 보여 드려요. 지금은 {1}일이에요.', INSIGHT_MIN_DAYS, n) : T('아직 뚜렷한 패턴이 보이지 않아요. 기록이 더 쌓이면 다시 살펴볼게요.')}</div>
    <button class="li add" data-act="insightDemo">${IC.spark}&nbsp; ${T('예시로 미리 보기')}</button>`;
  app.innerHTML = `
    <header class="top"><div><div class="over">${F('기록 {0}일', n)}</div><h1>${T('인사이트')}</h1></div></header>
    ${state ? `<div class="sec">${demo ? T('예시 기록의 최근 7일') : T('최근 7일')}</div>
    <section class="card state"><b>${state.title}</b>
      ${state.flow ? `<div class="flow">${state.flow}</div>` : ''}
      ${state.groups.map(([name, list]) => `<h3>${name}</h3>${bullets(list)}`).join('')}
      <p>${T('진단이 아니에요. 기록에서 겹쳐 보이는 점을 모은 것이니, 진료 때 보여 주며 이야기해 보세요.')}</p></section>
    ${state.lead ? `<div class="sec">${state.lead.title}</div>
    <section class="card state">${bullets(state.lead.points)}${state.lead.past ? `<div class="flow">${state.lead.past}</div>` : ''}
      <p>${T('그 전 4주의 내 평소와 견준 것이에요. 원인이라는 뜻은 아니에요.')}</p></section>` : ''}` : ''}
    ${ep.list.length ? `<div class="sec">${T('지금까지의 시기')}</div>
    <section class="card list">${ep.list.slice(0, 6).map((r) => `<div class="li"><span class="lk">${r.kind === 'high' ? T('들뜬 시기') : T('가라앉은 시기')}</span><span class="lv">${span(r)} · ${F('{0}일', r.days)}</span></div>`).join('')}</section>
    <p class="secnote">${epStat}</p>` : ''}
    ${base ? `<div class="sec">${T('시기별 내 평균')}</div>
    <section class="card tbl">${tr(['', ...base.cols.map(([name, days]) => `${name}<small>${F('{0}일', days)}</small>`)], true)}${base.rows.map(([name, cells]) => tr([name, ...cells])).join('')}</section>` : ''}
    ${changes.map((c) => `<div class="sec">${F('약을 바꾼 뒤 · {0}', md(parse(c.date)))}</div>
    <section class="card tbl">${c.text ? `<div class="tbl-t">${esc(c.text)}</div>` : ''}${tr(['', T('앞 2주'), F('뒤 {0}일', c.after)], true)}${c.rows.map((r) => tr(r)).join('')}</section>`).join('')}
    ${changes.length ? `<p class="secnote">${T('약 때문이라는 뜻은 아니에요. 바꾼 날 앞뒤로 기록이 어땠는지만 나란히 놓은 거예요.')}</p>` : ''}
    <div class="sec">${demo ? T('예시 기록에서 흔한 예상과 다르게 나온 것') : T('흔한 예상과 다르게 나온 것')}</div>
    <section class="card list">${list.length ? list.map(compareRow).join('') : n < INSIGHT_MIN_DAYS && !demo ? empty : `<div class="li say mut">${T('아직 없어요. 흔한 예상대로 나온 것은 새로운 정보가 아니라서 여기에 넣지 않아요.')}</div>`}
      ${demo ? `<button class="li add dim" data-act="insightDemo">${T('예시 닫기')}</button>` : ''}</section>
    ${demo ? `<p class="secnote">${T('만들어 낸 예시 기록이에요. 내 기록이 아니고 저장되지 않아요. 내 기록이 쌓이면 이 자리에 내 숫자가 나와요.')}</p>`
    : list.length ? `<p class="secnote">${T('“카페인을 많이 마시면 덜 잔다”처럼 누구에게나 흔한 것은 뺐어요. 내 기록의 평균을 견준 것이고, 원인이나 진단을 뜻하지 않아요.')}</p>` : ''}
    <div class="sec">${T('더 보기')}</div>
    <section class="card list">
      <button class="li add" data-act="notes">${IC.note}&nbsp; ${T('메모 모아 보기')}</button>
      <button class="li add" data-act="copyAi">${IC.spark}&nbsp; ${T('AI에게 물어볼 글 복사 (최근 4주)')}</button>
    </section>
    <p class="secnote">${T('복사한 글을 Claude나 ChatGPT 같은 AI 앱에 붙여 넣으면 기록 전체를 읽고 패턴을 정리해 줘요. 붙여 넣는 순간 그 기록은 해당 AI 서비스로 전송돼요.')}</p>`;
}
