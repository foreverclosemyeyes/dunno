// Gmail 연동: 허용 규칙과 "연결 확인" 판정 테스트
const assert = require('assert');
const gmail = require('../main/gmail');

// 허용은 읽기·초안뿐, 보내기·지우기는 금지 목록에
const r = gmail.rules('claude_ai_Gmail');
assert.ok(r.allow.includes('mcp__claude_ai_Gmail__search_*'));
assert.ok(r.allow.includes('mcp__claude_ai_Gmail__create_draft'));
assert.ok(!r.allow.some((t) => /send|trash|delete|reply|forward/.test(t)), '보내기·지우기는 허용 목록에 없어야 함');
assert.ok(r.deny.includes('mcp__claude_ai_Gmail__send_message'));
assert.ok(r.deny.includes('mcp__claude_ai_Gmail__trash_thread'));
// 이상한 서버 이름이 들어와도 실행 옵션이 깨지지 않게 기본값으로
assert.ok(gmail.rules('x --dangerously-skip-permissions').allow[0].startsWith('mcp__claude_ai_Gmail__'));
const args = gmail.cliArgs();
assert.deepStrictEqual(args.slice(0, 5), ['--tools', 'ToolSearch', 'WaitForMcpServers', '--permission-mode', 'dontAsk']);
assert.ok(!args.includes(''), '기본 도구를 전부 끄면 커넥터 도구를 못 찾아옴');
assert.ok(!args.includes('bypassPermissions'));
// API 키가 잡혀 있으면 커넥터를 못 쓰므로 지워서 넘김
assert.deepStrictEqual(gmail.childEnv({ ANTHROPIC_API_KEY: 'k', PATH: '/bin' }), { PATH: '/bin' });

const init = (o = {}) => ({ type: 'system', subtype: 'init', tools: [], mcp_servers: [], apiKeySource: 'none', ...o });
const use = (name) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name }] } });
const res = (o = {}) => ({ type: 'result', is_error: false, result: '', permission_denials: [], ...o });
const S = (ev, server) => gmail.summarizeProbe(ev, server || 'claude_ai_Gmail');

// 됨: Gmail 도구를 실제로 썼고 거절되지 않음
let s = S([init({ mcp_servers: [{ name: 'claude.ai Gmail', status: 'connected' }] }), use('mcp__claude_ai_Gmail__search_threads'), res({ result: '주간 회의 안내' })]);
assert.strictEqual(s.ok, true); assert.ok(s.message.includes('주간 회의 안내'));

// 커넥터가 아예 안 보임
s = S([init(), res({ result: 'GMAIL_UNAVAILABLE' })]);
assert.strictEqual(s.ok, false); assert.strictEqual(s.reason, 'missing'); assert.ok(s.detail.includes('커넥터: 없음'));

// API 키로 로그인돼 있어서 커넥터를 못 불러옴
s = S([init({ apiKeySource: 'ANTHROPIC_API_KEY' }), res({ result: 'GMAIL_UNAVAILABLE' })]);
assert.strictEqual(s.reason, 'apikey');

// 커넥터 이름이 예상과 다름 → 찾은 이름으로 다시 해 보라고 알려 줌
s = S([init(), use('mcp__Gmail__search_threads'), res({ result: 'GMAIL_UNAVAILABLE', permission_denials: [{ tool_name: 'mcp__Gmail__search_threads' }] })]);
assert.strictEqual(s.ok, false); assert.strictEqual(s.retry, 'Gmail');
// 그 이름으로 다시 했더니 됨
s = S([init(), use('mcp__Gmail__search_threads'), res({ result: '견적서 보냅니다' })], 'Gmail');
assert.strictEqual(s.ok, true); assert.strictEqual(s.server, 'Gmail');

// 커넥터는 있는데 인증이 풀림
s = S([init({ mcp_servers: [{ name: 'claude.ai Gmail', status: 'needs-auth' }] }), res({ result: 'GMAIL_UNAVAILABLE' })]);
assert.strictEqual(s.reason, 'auth');

// 이름은 맞는데 거절됨(회사 정책 등)
s = S([init(), use('mcp__claude_ai_Gmail__search_threads'), res({ result: 'GMAIL_UNAVAILABLE', permission_denials: [{ tool_name: 'mcp__claude_ai_Gmail__search_threads' }] })]);
assert.strictEqual(s.reason, 'denied');

// 로그인이 풀렸거나 대답이 없음
assert.strictEqual(S([init(), res({ is_error: true, result: 'Please log in' })]).reason, 'login');
assert.strictEqual(S([init()]).reason, 'cli');

// 매시간 메일 점검 안내문: 지난 확인 시각과 이미 알린 내용이 들어가고, 할 일 재촉은 하지 말라고 적혀 있음
const cp = gmail.checkPrompt('2026-11-13T07:00:00.000Z', [{ at: '2026-11-13T06:00:00.000Z', text: 'MBC 세금계산서 완료 회신 아직 없음' }]);
assert.ok(cp.includes('after:1794553200') && cp.includes('MBC 세금계산서 완료 회신 아직 없음') && cp.includes(gmail.NOTHING));
assert.ok(cp.includes('업무 리마인드는 하지 마'));
assert.ok(!gmail.checkPrompt('2026-11-13T07:00:00.000Z').includes('[이미 알린 내용]\n-'), '알린 게 없으면 목록도 없음');

// 답변 끝의 [기억: …] 줄은 떼어서 따로 저장
const { splitMemory } = require('../main/assistant');
assert.deepStrictEqual(splitMemory('알겠어. 앞으로 그렇게 할게.\n[기억: 세금계산서 발행 요청 뒤에는 기한까지 완료됐는지 확인한다]'), { text: '알겠어. 앞으로 그렇게 할게.', notes: ['세금계산서 발행 요청 뒤에는 기한까지 완료됐는지 확인한다'] });
assert.deepStrictEqual(splitMemory('그냥 답변'), { text: '그냥 답변', notes: [] });

console.log('✓ Gmail 연동 규칙·연결 확인 판정 테스트 통과');
