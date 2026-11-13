// 꾸밈 묶음: 그림까지 한 파일에 담기고, 개인 설정은 빠지며, 받는 쪽 개인 설정은 지켜지는지
const assert = require('assert');
const pack = require('../main/pack');

const mine = {
  colors: { accent: '#d00' },
  layout: { skin: { bubble: 'diary-asset://local/aaa.png', mask: 'diary-asset://local/bbb.png' } },
  castActive: 'ren',
  assistant: { name: '렌', tone: '과묵', faces: { base: { url: 'diary-asset://local/ren.png', name: 'ren.png' } }, instructions: '내 업무 지침', claudeUrl: 'https://claude.ai/chat/mine', docs: [{ id: 'd1', name: '인수인계.md', chars: 10 }], model: 'opus' },
  cast: { morgana: { name: '모르가나', tone: '반말', faces: { base: { url: 'diary-asset://local/mona.png', name: 'mona.png' } }, instructions: '다른 지침', docs: [{ id: 'd2' }] } },
};
const files = { 'aaa.png': 'QUFB', 'bbb.png': 'QkJC', 'ren.png': 'UkVO', 'mona.png': 'TU9OQQ==' };
const p = pack.build(mine, (id) => files[id] || null);

// 그림 네 장이 모두 담기고, 개인 설정은 어디에도 없음
assert.deepStrictEqual(Object.keys(p.assets).sort(), ['aaa.png', 'bbb.png', 'mona.png', 'ren.png']);
const dumped = JSON.stringify(p);
for (const secret of ['내 업무 지침', 'claude.ai/chat/mine', '인수인계.md', '다른 지침']) assert.ok(!dumped.includes(secret), secret);
assert.strictEqual(p.theme.assistant.name, '렌'); assert.strictEqual(p.theme.assistant.model, 'opus');
assert.strictEqual(mine.assistant.instructions, '내 업무 지침', '원본은 건드리지 않음');

// 받는 쪽: 그림은 새 주소로 바뀌고, 받는 사람이 넣어 둔 지침·문서는 그대로 남음
const friend = { castActive: 'morgana', assistant: { name: '모르가나', instructions: '친구의 지침', docs: [{ id: 'f1' }] }, cast: { ren: { name: '렌', claudeUrl: 'https://claude.ai/chat/friend' } } };
const written = {};
const t = pack.apply(JSON.parse(dumped), friend, (id, data) => { written[id] = data; return `diary-asset://local/new-${id}`; });
assert.deepStrictEqual(written, files);
assert.strictEqual(t.layout.skin.bubble, 'diary-asset://local/new-aaa.png');
assert.strictEqual(t.assistant.faces.base.url, 'diary-asset://local/new-ren.png');
assert.strictEqual(t.assistant.claudeUrl, 'https://claude.ai/chat/friend', '받는 사람의 렌 설정이 유지됨');
assert.strictEqual(t.assistant.instructions, undefined);
assert.strictEqual(t.cast.morgana.instructions, '친구의 지침');
assert.deepStrictEqual(t.cast.morgana.docs, [{ id: 'f1' }]);
assert.strictEqual(t.colors.accent, '#d00');

// 다른 파일은 거절
assert.throws(() => pack.apply({ format: 'x' }, friend, () => ''), /꾸밈 파일이 아니에요/);

console.log('✓ 꾸밈 묶음 내보내기·가져오기 테스트 통과');
