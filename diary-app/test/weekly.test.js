// 주간 운영성 업무 페이지 만들기: 주 이름·날짜 규칙과 양식 테스트
const assert = require('assert');
const weekly = require('../main/weekly');
const { parseMarkdown } = require('../main/notionMcp');

// 주 이름: 월요일이 그 달의 몇 번째 월요일인지 (실제 노션 페이지들과 같은 규칙)
for (const [date, name, mon, fri] of [
  ['2026-11-11', '11월 2주차 운영성 업무', '2026-11-09', '2026-11-13'],
  ['2026-11-02', '11월 1주차 운영성 업무', '2026-11-02', '2026-11-06'],
  ['2026-10-30', '10월 4주차 운영성 업무', '2026-10-26', '2026-10-30'],
  ['2026-10-08', '10월 1주차 운영성 업무', '2026-10-05', '2026-10-09'],
  ['2026-11-18', '11월 3주차 운영성 업무', '2026-11-16', '2026-11-20'],
  ['2026-12-02', '11월 5주차 운영성 업무', '2026-11-30', '2026-12-04'], // 월요일이 11월이면 11월로
  ['2027-01-01', '12월 4주차 운영성 업무', '2026-12-28', '2027-01-01'], // 해가 바뀌는 주
]) {
  const w = weekly.weekOf(date);
  assert.strictEqual(w.name, name, date);
  assert.strictEqual(w.monday, mon); assert.strictEqual(w.friday, fri);
}
assert.deepStrictEqual(weekly.weekOf('2026-11-18').days.map((d) => d.label), ['11/16 (월)', '11/17 (화)', '11/18 (수)', '11/19 (목)', '11/20 (금)']);

// 만들 수 있는 날: 평일, 이번 주부터 4주 뒤까지
const today = '2026-11-13';
assert.strictEqual(weekly.canCreate('2026-11-16', today), true);  // 다음 주
assert.strictEqual(weekly.canCreate('2026-11-27', today), true);  // 다다음 주
assert.strictEqual(weekly.canCreate('2026-11-12', today), true);  // 이번 주
assert.strictEqual(weekly.canCreate('2026-12-11', today), true);  // 4주 뒤
assert.strictEqual(weekly.canCreate('2026-12-14', today), false); // 5주 뒤
assert.strictEqual(weekly.canCreate('2026-11-06', today), false); // 지난주
assert.strictEqual(weekly.canCreate('2026-11-21', today), false); // 토요일
assert.strictEqual(weekly.canCreate('bad', today), false);

// 실제 페이지와 같은 모양의 마크다운에서 칼럼만 새 주의 빈 양식으로
const md = [
  '<callout icon="👉" color="yellow_bg">', '<database url="https://app.notion.com/p/8380" inline="true"></database>', '</callout>', '',
  '<columns>', '<column ratio="33.33">', '#### 11/9 (월)', '', '- [x] 뉴스기사 큐레이션', '- [x] 온보딩', '', '<p />', '</column>',
  '<column ratio="33.33">', '#### 11/10 (화)', '', '- [x] 커피 주문', '  - [ ] 계정 백업', '', '<p />', '</column>',
  '<column ratio="33.33">', '#### 11/11 (수)', '', '<p />', '</column>', '</columns>', '',
  '<columns>', '<column ratio="50">', '#### 11/12 (목)', '', '- [x] 인수인계', '', '<p />', '</column>',
  '<column ratio="50">', '#### 11/13 (금)', '', '- [ ] KoEF', '', '<p />', '</column>', '</columns>',
].join('\n');
const week = weekly.weekOf('2026-11-18');
const t = weekly.retemplate(md, week);
assert.ok(t.old.startsWith('<columns>') && t.old.endsWith('</columns>'));
assert.ok(md.includes(t.old), '바꿀 부분은 원문에 그대로 있어야 함');
assert.ok(!t.neu.includes('- ['), '체크리스트는 비어 있어야 함');
assert.ok(t.full.startsWith('<callout icon="👉" color="yellow_bg">\n<database url="https://app.notion.com/p/8380" inline="true"></database>\n</callout>'), '안내 칸과 그 안의 표는 그대로');
assert.strictEqual((t.neu.match(/<column ratio="33.33">/g) || []).length, 3);
assert.strictEqual((t.neu.match(/<column ratio="50">/g) || []).length, 2);
// 새 양식을 앱이 다시 읽으면: 다섯 날짜 모두 '할 일 추가' 자리가 잡히고 항목은 없음
const parsed = parseMarkdown(t.full, 'page', week.monday);
assert.deepStrictEqual(Object.keys(parsed.adders).sort(), week.days.map((d) => d.iso));
assert.strictEqual(Object.keys(parsed.days).length, 0);
assert.strictEqual(weekly.retemplate('칼럼이 없는 글', week), null);

// 복제 결과에서 새 페이지 id 찾기 (원본 id 는 건너뜀)
const src = 'eec043ff-dcdb-4e1f-869b-a22cb5af5e92';
assert.strictEqual(weekly.newPageId({ page_id: '1234abcd-0000-4e1f-869b-a22cb5af5e92', url: 'https://app.notion.com/p/1234abcd00004e1f869ba22cb5af5e92' }, src), '1234abcd00004e1f869ba22cb5af5e92');
assert.strictEqual(weekly.newPageId(`복제함: https://www.notion.so/${src.replace(/-/g, '')} → https://www.notion.so/aaaabbbbccccddddeeeeffff00001111`, src), 'aaaabbbbccccddddeeeeffff00001111');
assert.strictEqual(weekly.newPageId({ ok: true }, src), null);

// API 키 쪽 블록: 안내 칸 + 칼럼 3개 + 칼럼 2개, 체크박스 없음
const b = weekly.blocks(week);
assert.deepStrictEqual(b.map((x) => x.type), ['callout', 'column_list', 'column_list']);
assert.deepStrictEqual(b.slice(1).map((x) => x.column_list.children.length), [3, 2]);
assert.ok(!JSON.stringify(b).includes('to_do'));
assert.strictEqual(b[2].column_list.children[1].column.children[0].heading_3.rich_text[0].text.content, '11/20 (금)');

console.log('✓ 주간 운영성 업무 페이지 만들기 테스트 통과');
