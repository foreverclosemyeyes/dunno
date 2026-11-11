// 실제 "11월 2주차 운영성 업무" 페이지 구조를 본뜬 노션 API 블록으로 파싱을 검사
'use strict';
const assert = require('assert');
const { parseChecklist, countItems } = require('../main/notion');

let n = 0;
const rt = (t) => [{ type: 'text', plain_text: t, text: { content: t } }];
const todo = (t, checked, children = []) => ({ id: 'b' + n++, type: 'to_do', has_children: children.length > 0, to_do: { rich_text: rt(t), checked }, children });
const h4 = (t) => ({ id: 'b' + n++, type: 'heading_4', heading_4: { rich_text: rt(t) }, children: [] });
const h3 = (t) => ({ id: 'b' + n++, type: 'heading_3', heading_3: { rich_text: rt(t) }, children: [] });
const p = (t = '') => ({ id: 'b' + n++, type: 'paragraph', paragraph: { rich_text: rt(t) }, children: [] });
const col = (...c) => ({ id: 'b' + n++, type: 'column', column: {}, has_children: true, children: c });
const cols = (...c) => ({ id: 'b' + n++, type: 'column_list', column_list: {}, has_children: true, children: c });
const unsupported = () => ({ id: 'b' + n++, type: 'unsupported', unsupported: {}, children: [] });

function page(H) {
  return [
    { id: 'c', type: 'callout', callout: { rich_text: [] }, has_children: true, children: [{ id: 'db', type: 'child_database', child_database: { title: '' }, children: [] }] },
    cols(
      col(H('11/9 (월)'), todo('뉴스기사 큐레이션', true), todo('온보딩', true), p()),
      col(H('11/10 (화)'), todo('커피 주문', true),
        todo('신진연구인력 400만원 분할 이체 줄리께 요청', true, [todo('신진연구인력에 제출', true)]),
        todo('이단께 daniel 비번 요청', true, [todo('계정 백업', false)]), p()),
      col(H('11/11 (수)'), todo('정부지원사업 리서치 일주일 치', false),
        todo('찰리께 정기행사 문의', false, [todo('근로계약서 작성하셨는지 확인', false), todo('드라이브 권한 요청', false)]), p())
    ),
    cols(
      col(H('11/12 (목)'), todo('뉴스기사 큐레이션', false), todo('', false), p()),
      col(H('11/13 (금)'), todo('뉴스기사 큐레이션', false), todo('', false), p())
    ),
  ];
}

for (const H of [h4, h3]) {
  const days = parseChecklist(page(H), '2026-11-09');
  assert.deepStrictEqual(Object.keys(days), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
  assert.strictEqual(days['2026-11-10'].length, 3);
  assert.strictEqual(days['2026-11-10'][2].children[0].text, '계정 백업');
  assert.strictEqual(days['2026-11-10'][2].children[0].checked, false);
  assert.strictEqual(days['2026-11-12'].length, 1, '빈 체크박스는 빠져야 함');
  assert.deepStrictEqual(countItems(days['2026-11-10']), { total: 5, done: 4 });
  assert.deepStrictEqual(countItems(days['2026-11-11']), { total: 4, done: 0 });
}

// 날짜 제목을 API가 못 읽는 경우(unsupported) → 칼럼 순서로 평일 배정
const fb = page(() => unsupported());
const days2 = parseChecklist(fb, '2026-11-09');
assert.deepStrictEqual(Object.keys(days2), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
assert.strictEqual(days2['2026-11-11'][0].text, '정부지원사업 리서치 일주일 치');

// 연말 → 연초 넘어가는 주
const ny = parseChecklist([cols(col(h4('12/31 (목)'), todo('a', false)), col(h4('1/1 (금)'), todo('b', true)))], '2026-12-28');
assert.deepStrictEqual(Object.keys(ny), ['2026-12-31', '2027-01-01']);

console.log('✓ 체크리스트 파싱 테스트 통과');

// 능력치 자동 분류 (키 없을 때 규칙)
(async () => {
  const st = require('../main/stats');
  assert.strictEqual(st.ruleClassify('뉴스기사 큐레이션'), '지식');
  assert.strictEqual(st.ruleClassify('커피 주문'), '매력');
  const stats = {}, awards = {};
  const items = [{ id: 'a', text: '조직도 수정', date: '2026-11-09' }, { id: 'b', text: '커피 주문', date: '2026-11-10' }];
  let ch = await st.award({ doneItems: items, awards, stats, apiKey: '', loadedDates: new Set(['2026-11-09', '2026-11-10']) });
  assert.strictEqual(ch.length, 2);
  assert.strictEqual(stats['2026-11-09']['손재주'], 1);
  ch = await st.award({ doneItems: items, awards, stats, apiKey: '', loadedDates: new Set(['2026-11-09', '2026-11-10']) });
  assert.strictEqual(ch.length, 0, '같은 항목은 한 번만');
  ch = await st.award({ doneItems: [items[0]], awards, stats, apiKey: '', loadedDates: new Set(['2026-11-09', '2026-11-10']) });
  assert.strictEqual(stats['2026-11-10']['매력'], 0, '체크 풀면 되돌림');
  console.log('✓ 능력치 자동 올리기 테스트 통과');
})().catch((e) => { console.error(e); process.exit(1); });
