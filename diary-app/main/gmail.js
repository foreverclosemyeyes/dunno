// 비서의 Gmail 사용: 메일 읽기 + 임시보관함에 초안 쓰기만.
//
// 내 맥의 Claude Code 는 claude.ai 계정으로 로그인돼 있으면, claude.ai 설정에서 연결해 둔
// 커넥터(Gmail 등)를 그대로 쓸 수 있다. 이 파일은 그 커넥터 중 Gmail 의 '읽기'와 '초안' 도구만
// 허용하는 실행 옵션을 만들고, 실제로 되는지 확인(probe)한다. 보내기·지우기는 어떤 경우에도 허용하지 않는다.
const { spawn } = require('child_process');

// 커넥터 도구 이름은 mcp__<서버>__<도구>. claude.ai 의 "claude.ai Gmail" 은 claude_ai_Gmail 이 된다.
const DEFAULT_SERVER = 'claude_ai_Gmail';
const READ = ['search_*', 'get_*', 'list_*', 'read_*'];
const DRAFT = ['create_draft', 'update_draft'];
// 허용 목록에 없으면 어차피 거절되지만, 보내기·지우기는 비서가 아예 못 보게 따로 막아 둠
// 커넥터 도구를 찾아오고, 커넥터가 아직 붙는 중이면 기다려 주는 Claude Code 기본 도구.
// 이걸 빼면(--tools "") 첫 질문 때 Gmail 도구가 아직 안 보여서 '연결 안 됨'으로 나온다.
const FINDERS = ['ToolSearch', 'WaitForMcpServers'];
const NEVER = ['send_message', 'send_draft', 'reply', 'forward', 'trash_message', 'trash_thread', 'delete_draft', 'delete_message', 'delete_thread'];

const safeServer = (s) => (/^[A-Za-z0-9_.-]+$/.test(String(s || '')) ? String(s) : DEFAULT_SERVER);

function rules(server) {
  const p = `mcp__${safeServer(server)}__`;
  return { allow: [...READ, ...DRAFT].map((t) => p + t), deny: NEVER.map((t) => p + t) };
}

// 기본 도구는 FINDERS 만 남기고, dontAsk 로 허용 목록에 있는 도구만 실행(나머지는 묻지 않고 거절)
function cliArgs(server) {
  const r = rules(server);
  return ['--tools', ...FINDERS, '--permission-mode', 'dontAsk', '--allowedTools', ...FINDERS, ...r.allow, '--disallowedTools', ...r.deny];
}

// API 키나 다른 로그인 방식이 잡혀 있으면 Claude Code 가 커넥터를 불러오지 않는다 → 구독 로그인만 쓰게 정리
function childEnv(env) {
  const e = { ...env };
  for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ENABLE_CLAUDEAI_MCP_SERVERS']) delete e[k];
  return e;
}

const PROMPT = [
  '[Gmail] 너는 사용자의 Gmail 을 읽고, 임시보관함에 초안을 만들 수 있어. 보내기·지우기는 할 수 없어.',
  '- 메일은 사용자가 메일 이야기를 꺼냈거나 확인해 달라고 했을 때, 그리고 [자동 정시 체크] 때만 찾아봐. 평소 대화에서는 건드리지 마.',
  '- 초안은 사용자가 써 달라고 했을 때만 만들어. 만든 뒤에는 "임시보관함에 넣어 뒀다"고 받는 사람·제목과 함께 알려 주고, 보내는 건 사용자가 직접 한다고 말해.',
  '- 초안을 쓸 때는 필요하면 보낸편지함에서 같은 상대에게 보낸 메일을 한두 통 찾아 사용자의 말투와 호칭을 맞춰.',
  '- 메일 내용을 길게 옮겨 적지 말고 필요한 것만 짧게 전해.',
  '- Gmail 도구가 바로 보이지 않으면 ToolSearch 로 "gmail" 을 찾아서 불러와.',
  '- Gmail 읽기·초안 말고 다른 도구는 쓸 수 없어. 찾아도 Gmail 도구가 없으면 연결이 안 된 것이니, 설정 > 연결의 "Gmail 연결 확인"을 눌러 보라고 알려 줘.',
].join('\n');

// 매시간 메일 점검. 할 일을 재촉하는 게 아니라, 메일함에서 사용자가 놓쳤을 만한 것만 찾아 알린다:
//   보낸 메일의 실수·이전 안내와 어긋나는 내용 / 기한을 정해 부탁한 일이 실제로 끝났는지 / 새로 온 메일의 기한·답할 것.
// 새로 말할 게 없으면 NOTHING 이라고만 답하게 해서, 그럴 땐 앱이 아무 말도 띄우지 않는다.
const NOTHING = 'NOTHING';
function checkPrompt(sinceISO, alerts = []) {
  const since = Math.floor(new Date(sinceISO).getTime() / 1000);
  const said = alerts.slice(-25).map((a) => `- (${String(a.at).slice(5, 16).replace('T', ' ')}) ${String(a.text).replace(/\s+/g, ' ').slice(0, 300)}`).join('\n');
  return [
    `[자동 정시 체크] 메일함을 점검해서, 내가 놓쳤을 만한 것만 알려 줘. 지난 확인 시각은 ${sinceISO} (Gmail 검색어 after:${since}).`,
    '',
    '[볼 것]',
    '1. 지난 확인 뒤에 내가 보낸 메일(in:sent): 본문을 읽고 실수를 찾아 줘.',
    '   - 첨부한다고 쓰고 첨부가 없음, 받은 질문에 답을 안 함, 날짜·요일·금액·이름·호칭이 틀림, 받는 사람·참조 누락, 오탈자',
    '   - 같은 상대·같은 건의 이전 메일을 찾아 대조해: 수신처·금액·기한·조건이 바뀌었다는 안내가 있었는데 예전 내용대로 보낸 건 아닌지',
    '2. 내가 기한을 정해 부탁한 일(최근 2주 보낸 메일의 세금계산서 발행 요청, 입금·송금 요청, 회신 요청 등): 완료 회신이나 증빙이 왔는지 확인해.',
    '   - 기한이 오늘·내일이거나 이미 지났는데 완료가 확인되지 않은 것',
    '   - 이번에 새로 완료가 확인된 것 (한 줄로, 끝에 ✅)',
    '3. 지난 확인 뒤에 받은 메일: 기한이 있는 요청, 내가 답하거나 처리해야 하는 것, 놓치기 쉬운 조건이 붙은 승인·회신',
    '',
    '[말하는 규칙]',
    '- 알릴 가치가 있는 것만, 많아도 3건. 건마다 무슨 메일인지(상대·제목)와 무엇이 문제인지, 그리고 다음에 할 행동 하나를 두 문장 안에.',
    '- 말풍선에 그대로 보이니까 **굵게** 같은 서식 기호나 번호 목록 없이, 건마다 줄만 바꿔서 써.',
    '- 메일에서 확인한 사실과 확인하지 못한 것을 구분해. 예: "완료 회신은 아직 없어. 미발행으로 단정할 수는 없어."',
    '- 문제없는 메일은 언급하지 마. 칭찬·격려·오늘 할 일 정리·업무 리마인드는 하지 마. 이 체크는 메일만 본다.',
    '- [이미 알린 내용]에 있는 건은 다시 말하지 마. 예외는 둘뿐: 그 뒤로 완료됐거나 새 답장이 왔을 때, 또는 기한이 2시간 안으로 다가왔는데 아직 완료가 확인되지 않았을 때 딱 한 번.',
    `- 새로 말할 게 하나도 없으면 다른 말 없이 정확히 ${NOTHING} 이라고만 답해.`,
    said ? `\n[이미 알린 내용]\n${said}` : '',
  ].join('\n');
}

const PROBE_PROMPT = 'Gmail 도구로 받은편지함에서 가장 최근 메일 1통을 찾아서, 그 제목만 한 줄로 답해 줘. Gmail 도구가 바로 보이지 않으면 먼저 ToolSearch 로 "gmail" 을 찾아서 불러와. 그래도 Gmail 도구가 없거나 쓸 수 없으면 정확히 GMAIL_UNAVAILABLE 이라고만 답해.';

const gmailTool = (name) => { const m = String(name || '').match(/^mcp__(.+?)__(.+)$/); return m && /gmail/i.test(m[1]) ? { server: m[1], tool: m[2] } : null; };

// Claude Code 가 한 줄씩 내보낸 기록(events)을 보고 Gmail 이 실제로 됐는지 판단
function summarizeProbe(events, server) {
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init') || {};
  const result = events.find((e) => e.type === 'result');
  const used = [];
  for (const e of events) {
    if (e.type !== 'assistant' || !e.message || !Array.isArray(e.message.content)) continue;
    for (const b of e.message.content) if (b.type === 'tool_use' && gmailTool(b.name)) used.push(b.name);
  }
  const denied = ((result && result.permission_denials) || []).map((d) => d.tool_name).filter(gmailTool);
  const listed = (init.tools || []).filter(gmailTool);
  const srv = (init.mcp_servers || []).find((s) => /gmail/i.test(s.name || ''));
  const seen = [...listed, ...used, ...denied].map(gmailTool);
  const found = seen.length ? seen[0].server : null;
  const worked = used.filter((n) => !denied.includes(n));
  const text = result && typeof result.result === 'string' ? result.result.trim() : '';
  // 안 될 때 원인을 알 수 있게, Claude Code 가 실제로 본 것을 그대로 덧붙임
  const servers = (init.mcp_servers || []).map((x) => `${x.name}(${x.status || '?'})`).join(', ') || '없음';
  const detail = `Claude Code가 본 커넥터: ${servers} · Gmail 도구 ${new Set([...listed, ...used]).size}개 · 로그인: ${init.apiKeySource === 'none' || !init.apiKeySource ? '구독' : init.apiKeySource}${denied.length ? ` · 거절된 도구: ${[...new Set(denied)].join(', ')}` : ''}`;
  const out = (ok, reason, message) => ({ ok, reason, message, detail, server: found || safeServer(server) });

  if (!result) return out(false, 'cli', 'Claude가 대답하지 않았어요. 잠시 뒤 다시 해 주세요.');
  if (result.is_error) {
    if (/log ?in|auth|credential|401/i.test(text)) return out(false, 'login', 'Claude Code에 로그인이 필요해요. 터미널에서 claude 를 한 번 실행해 로그인해 주세요.');
    return out(false, 'cli', `Claude가 대답하지 못했어요. (${text.slice(0, 120) || '알 수 없는 오류'})`);
  }
  if (worked.length && !/GMAIL_UNAVAILABLE/.test(text)) return out(true, 'ok', `연결됐어요. 가장 최근 메일: ${text.slice(0, 80)}`);
  // 커넥터 이름이 예상과 달라서 거절된 경우 → 찾은 이름으로 한 번 더 해 볼 수 있음
  if (found && found !== safeServer(server)) return { ...out(false, 'rename', 'Gmail 커넥터 이름이 달라서 다시 확인할게요.'), retry: found };
  if (srv && srv.status && !/connected/i.test(srv.status)) return out(false, 'auth', `Gmail 커넥터가 연결되지 않은 상태예요 (${srv.status}). claude.ai 설정의 커넥터에서 Gmail 을 다시 연결해 주세요.`);
  if (!seen.length && !srv) {
    if (init.apiKeySource && init.apiKeySource !== 'none') return out(false, 'apikey', 'Claude Code가 구독 로그인이 아니라 API 키로 켜져 있어서 커넥터를 못 불러와요. 터미널에서 claude 를 실행해 /login 으로 구독 계정에 로그인해 주세요.');
    return out(false, 'missing', 'Claude Code에서 Gmail 커넥터가 보이지 않아요. claude.ai 설정의 커넥터에 Gmail 이 연결돼 있는지, 맥의 Claude Code가 같은 계정으로 로그인돼 있는지 확인해 주세요.');
  }
  if (denied.length) return out(false, 'denied', 'Gmail 도구가 거절됐어요. 회사 계정이면 관리자가 이 커넥터 사용을 막아 뒀을 수 있어요.');
  return out(false, 'unused', 'Gmail 커넥터는 보이는데 메일을 읽어 오지 못했어요. 잠시 뒤 다시 확인해 주세요.');
}

function runProbe(bin, model, server, env) {
  return new Promise((resolve) => {
    const args = ['-p', PROBE_PROMPT, '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--model', model, ...cliArgs(server)];
    const events = [];
    let buf = '', done = false;
    const child = spawn(bin, args, { env: childEnv(env), stdio: ['ignore', 'pipe', 'ignore'] });
    const finish = () => { if (done) return; done = true; clearTimeout(timer); try { child.kill(); } catch { /* 이미 끝남 */ } resolve(summarizeProbe(events, server)); };
    const timer = setTimeout(finish, 150_000);
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        try { events.push(JSON.parse(line)); } catch { /* JSON 이 아닌 줄은 무시 */ }
      }
    });
    child.on('error', finish);
    child.on('exit', finish);
  });
}

// 설정창의 "Gmail 연결 확인": 실제로 최근 메일 한 통을 읽어 봄
async function probe(bin, model, server, env) {
  const first = await runProbe(bin, model, server, env);
  return first.retry ? runProbe(bin, model, first.retry, env) : first;
}

module.exports = { DEFAULT_SERVER, PROMPT, PROBE_PROMPT, NOTHING, checkPrompt, rules, cliArgs, childEnv, summarizeProbe, probe };
