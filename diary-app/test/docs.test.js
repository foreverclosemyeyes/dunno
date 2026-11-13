// 비서 참고 문서(인수인계 파일): 저장·읽기·길이 제한 테스트
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const docs = require('../main/docs');
const { systemPrompt } = require('../main/assistant');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-docs-'));
const src = (name, body) => { const f = path.join(tmp, name); fs.writeFileSync(f, body); return f; };
const store = path.join(tmp, 'store');

// 저장: 이름·글자 수를 돌려주고, 줄바꿈·BOM 을 정리함
const a = docs.save(store, src('인수인계.md', '﻿# GMEP 인수인계\r\n담당: 찰리\r\n'));
assert.strictEqual(a.name, '인수인계.md'); assert.strictEqual(a.chars, '# GMEP 인수인계\n담당: 찰리'.length);
const b = docs.save(store, src('메모.txt', '유연근무 신청은 매달 25일까지'));
assert.notStrictEqual(a.id, b.id);

// 비서에게 넘길 글: 문서마다 이름표
const t = docs.text(store, [a, b]);
assert.ok(t.includes('<문서 이름="인수인계.md">') && t.includes('담당: 찰리') && t.includes('유연근무 신청은 매달 25일까지'));

// 너무 길면 앞에서부터 정해진 글자 수까지만
const long = docs.save(store, src('긴문서.md', '가'.repeat(120)));
const cut = docs.text(store, [long, b], 100);
assert.ok(cut.includes('가'.repeat(100)) && !cut.includes('가'.repeat(101)) && cut.includes('생략됨'));
assert.ok(!cut.includes('유연근무'), '한도를 다 쓰면 뒤 문서는 넘기지 않음');

// 글 파일이 아니면 받지 않음 (PDF·워드 등)
assert.throws(() => docs.save(store, src('문서.pdf', Buffer.from([0x25, 0x50, 0x44, 0x46, 0, 1, 2]))), /글 파일이 아니에요/);
assert.throws(() => docs.save(store, src('빈.txt', '  \n ')), /내용이 없어요/);

// 빼면 더 이상 읽히지 않고, 지워진 문서가 목록에 남아 있어도 오류 없이 건너뜀
docs.remove(store, a.id);
assert.ok(!docs.text(store, [a, b]).includes('담당: 찰리'));
assert.strictEqual(docs.text(store, []), '');
assert.strictEqual(docs.text(store, undefined), '');

// 비서에게 주는 안내문에 문서가 들어감 (없으면 그 구역 자체가 없음)
const ctx = { time: '11/13 14:00', done: [], left: [], urgent: [], quests: [] };
const withDocs = systemPrompt({ name: '렌', tone: '', instructions: '', docs: docs.text(store, [b]) }, ctx);
assert.ok(withDocs.includes('[참고 문서]') && withDocs.includes('유연근무 신청은 매달 25일까지'));
assert.ok(!systemPrompt({ name: '렌', tone: '', instructions: '', docs: '' }, ctx).includes('[참고 문서]'));

fs.rmSync(tmp, { recursive: true, force: true });
console.log('✓ 비서 참고 문서 테스트 통과');
