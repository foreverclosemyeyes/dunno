// "노션으로 로그인" 경로: 실제 11월 2주차 운영성 업무 페이지의 노션 마크다운(fetch 결과)으로 파싱 검사
'use strict';
const assert = require('assert');
const { parseMarkdown } = require('../main/notionMcp');

const md = `<callout icon="👉" color="yellow_bg">
<database url="https://app.notion.com/p/8380894281da82cc83d3812710b4319e" inline="true"></database>
</callout>

<columns>
<column ratio="33.33">
#### 11/9 (월)

- [x] 뉴스기사 큐레이션
- [x] 온보딩

<p />
</column>
<column ratio="33.33">
#### 11/10 (화)

- [x] 커피 주문
- [x] 뉴스기사 큐레이션
- [x] 지원금 분할 이체 요청
  - [x] 증빙 제출
- [x] 계정 비밀번호 요청
  - [ ] 계정 백업
- [x] 근로계약서 기본 정보 전달

<p />
</column>
<column ratio="33.33">
#### 11/11 (수)

- [ ] 지원사업 리서치
- [ ] 뉴스기사 큐레이션
- [ ] 정기 행사 문의
  - [ ] 근로계약서 작성하셨는지 확인
  - [ ] 드라이브 권한 요청

<p />
</column>
</columns>

<columns>
<column ratio="50">
#### 11/12 (목)

- [ ] 뉴스기사 큐레이션
- [ ] 

<p />
</column>
<column ratio="50">
#### 11/13 (금)

- [ ] 뉴스기사 큐레이션
- [ ] 

<p />
</column>
</columns>`;

const { days, anchors } = parseMarkdown(md, 'P', '2026-11-09');
assert.deepStrictEqual(Object.keys(days), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
assert.strictEqual(days['2026-11-10'].length, 5);
assert.strictEqual(days['2026-11-10'][3].children[0].text, '계정 백업');
assert.strictEqual(days['2026-11-10'][3].children[0].checked, false);
assert.strictEqual(days['2026-11-12'].length, 1, '빈 체크박스 숨김');
assert.strictEqual(days['2026-11-11'][2].children.length, 2);

// 체크 토글용 교체 문자열: 같은 이름(뉴스기사 큐레이션)이 여러 날에 있어도 그 날짜 제목부터 포함해서 하나만 맞음
const id = days['2026-11-11'][1].id;
const a = anchors.get(id);
assert.ok(a.oldStr.startsWith('#### 11/11 (수)'));
assert.ok(a.oldStr.endsWith('- [ ] 뉴스기사 큐레이션'));
assert.ok(a.newStr.endsWith('- [x] 뉴스기사 큐레이션'));
assert.strictEqual(md.split(a.oldStr).length - 1, 1, 'old_str 이 페이지에서 딱 한 번 나와야 함');
// 하위 항목
const child = anchors.get(days['2026-11-10'][3].children[0].id);
assert.ok(child.newStr.endsWith('  - [x] 계정 백업'));
assert.strictEqual(md.split(child.oldStr).length - 1, 1);
// 토글 결과를 반영한 뒤 다시 파싱해도 같은 id
const md2 = md.replace(a.oldStr, a.newStr);
const again = parseMarkdown(md2, 'P', '2026-11-09');
assert.strictEqual(again.days['2026-11-11'][1].id, id);
assert.strictEqual(again.days['2026-11-11'][1].checked, true);
console.log('✓ 노션 로그인(MCP) 마크다운 파싱 테스트 통과');

// 지우기: 하위 항목까지 함께, 다른 날 같은 이름은 그대로
{
  const { days: d2, anchors: a2 } = parseMarkdown(md, 'P', '2026-11-09');
  const parent = d2['2026-11-11'][2]; // 정기 행사 문의 (+ 하위 2개)
  const x = a2.get(parent.id);
  const after = md.replace(x.delOld, x.delNew);
  const r = parseMarkdown(after, 'P', '2026-11-09');
  assert.strictEqual(r.days['2026-11-11'].length, 2);
  assert.ok(!after.includes('드라이브 권한 요청'));
  assert.strictEqual(r.days['2026-11-12'][0].text, '뉴스기사 큐레이션');
  console.log('✓ 체크리스트 지우기 테스트 통과');
}

// 역슬래시: 노션이 붙여 준 건 떼고 보여 주고, 앱에서 적은 글은 붙여서 보냄 → 오가도 글자가 그대로
{
  const { cleanText, escapeText } = require('../main/notionMcp');
  assert.strictEqual(cleanText('유연근무 7\\~9월분 정산'), '유연근무 7~9월분 정산');
  assert.strictEqual(cleanText('\\[중요\\] **굵게** 3\\*4 a\\_b'), '[중요] 굵게 3*4 a_b');
  assert.strictEqual(cleanText('C:\\\\temp'), 'C:\\temp');
  for (const t of ['유연근무 7~9월분', '[중요] 3*4 = 12', 'a_b `c` <태그>', 'C:\\temp\\~x']) assert.strictEqual(cleanText(escapeText(t)), t);
  const r = parseMarkdown('#### 11/16 (월)\n- [ ] 유연근무 7\\~9월분', 'P', '2026-11-16');
  assert.strictEqual(r.days['2026-11-16'][0].text, '유연근무 7~9월분');
  console.log('✓ 역슬래시 오가기 테스트 통과');
}

// 번호가 밀려도 같은 줄을 다시 찾음: 3번째 항목을 누른 직후, 먼저 줄 서 있던 '1번째 지우기'가 끝난 경우
{
  const { markOf, locateMark, lastLine } = require('../main/notionMcp');
  const page = ['#### 11/16 (월)', '- [ ] 가', '- [ ] 나', '- [ ] 다 $& 100$', '- [ ] 나'].join('\n');
  const p1 = parseMarkdown(page, 'P', '2026-11-16');
  const ids = p1.days['2026-11-16'].map((x) => x.id);
  const mark = markOf(p1.anchors, ids[2]);                       // '다' 를 누름
  const del = p1.anchors.get(ids[0]);                             // 그 전에 '가' 지우기가 먼저 실행됨
  const after = page.replace(del.delOld, () => del.delNew);
  const p2 = parseMarkdown(after, 'P', '2026-11-16');
  assert.strictEqual(p2.days['2026-11-16'][2].text, '나', '같은 번호는 이제 다른 항목');
  const a = locateMark(p2.anchors, mark);
  assert.strictEqual(lastLine(a.oldStr), '- [ ] 다 $& 100$', '번호가 아니라 그 줄을 찾음');
  // 바꾼 결과를 캐시에 반영할 때 글 속의 $ 가 특수문자로 먹히지 않아야 함
  const toggled = after.replace(a.oldStr, () => a.newStr);
  assert.ok(toggled.includes('- [x] 다 $& 100$'));
  // 같은 줄이 둘('나')이고 번호도 어긋나면 엉뚱한 줄을 건드리지 않고 그만둠
  const dup = markOf(p1.anchors, ids[3]);
  assert.throws(() => locateMark(parseMarkdown(after.replace('- [ ] 다 $& 100$\n', ''), 'P', '2026-11-16').anchors, { ...dup, id: 'P:2026-11-16:9' }), /anchor moved/);
  assert.throws(() => markOf(p1.anchors, 'P:2026-11-16:99'), /no anchor/);
  console.log('✓ 번호가 밀려도 같은 줄 찾기 테스트 통과');
}
