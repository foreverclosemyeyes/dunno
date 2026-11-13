// 비서: Claude Haiku 5.5 로 말 걸기 + 앱 안에서 이어지는 대화.
// 키가 없으면 정시 체크는 규칙 기반 문장으로 대신함.
'use strict';
const Anthropic = require('@anthropic-ai/sdk').default;

const MODEL = 'claude-haiku-5-5'; // 능력치 분류처럼 가벼운 일
// 렌 대화용 모델 (설정 > 비서에서 고름). 기본: Opus 5.5
const CHAT_MODELS = { opus: { cli: 'opus', api: 'claude-opus-5-5' }, sonnet: { cli: 'sonnet', api: 'claude-sonnet-5-5' }, haiku: { cli: 'haiku', api: 'claude-haiku-5-5' } };
const chatModel = (persona) => CHAT_MODELS[persona.model] || CHAT_MODELS.opus;
const HISTORY_TURNS = 30; // 대화 기억: 최근 30개 메시지

function flatten(items, out = [], parent = null) {
  for (const i of items || []) {
    out.push({ text: parent ? `${parent} > ${i.text}` : i.text, checked: i.checked });
    flatten(i.children, out, i.text);
  }
  return out;
}

function daysLeft(iso, todayISO) {
  if (!iso) return null;
  return Math.round((new Date(iso + 'T00:00:00') - new Date(todayISO + 'T00:00:00')) / 86400000);
}

function ddayText(d) {
  return d < 0 ? `D+${-d}(지남)` : d === 0 ? 'D-DAY' : `D-${d}`;
}

function buildContext({ todayISO, now, todayItems, quests }) {
  const flat = flatten(todayItems);
  const done = flat.filter((i) => i.checked).map((i) => i.text);
  const left = flat.filter((i) => !i.checked).map((i) => i.text);
  const all = (quests || []).map((q) => ({ ...q, d: daysLeft(q.end, todayISO) }));
  const urgent = all.filter((q) => q.d !== null && q.d <= 3)
    .map((q) => ({ name: q.name, status: q.status, end: q.end, dday: ddayText(q.d) }));
  const questList = all.map((q) => `${q.name} (${q.status}${q.end ? `, 마감 ${q.end} ${ddayText(q.d)}` : ', 마감일 없음'})`);
  return { time: now, done, left, urgent, quests: questList };
}

function contextText(ctx) {
  return [
    `현재 시각: ${ctx.time}`,
    `오늘 끝낸 일: ${ctx.done.length ? ctx.done.join(' / ') : '없음'}`,
    `오늘 남은 일: ${ctx.left.length ? ctx.left.join(' / ') : '없음'}`,
    `마감 3일 이내(또는 지난) 업무: ${ctx.urgent.length ? ctx.urgent.map((u) => `${u.name} ${u.dday}`).join(' / ') : '없음'}`,
    `진행 중 업무 전체: ${ctx.quests.length ? ctx.quests.join(' / ') : '없음'}`,
  ].join('\n');
}

// 무료 모드: AI 없이 상황에 맞춰 고르는 문장 (말투 설정에 '반말'이 있으면 반말)
function fallbackMessage(ctx, persona) {
  const name = persona.name || '비서';
  const casual = /반말/.test(persona.tone || '');
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const T = casual ? {
    done: (n) => pick([`오늘 ${n}개 끝냈네.`, `벌써 ${n}개 처리했구나.`, `${n}개 끝. 나쁘지 않아.`]),
    next: (t) => pick([`다음은 "${t}".`, `"${t}"부터 하자.`, `지금은 "${t}" 차례야.`]),
    over: (q) => `"${q.name}" 마감 ${q.dday}… 이건 먼저 챙기자.`,
    soon: (q) => `"${q.name}" 마감이 ${q.dday}야. 잊지 마.`,
    clear: () => pick(['오늘 할 일은 끝. 수고했어.', '전부 끝냈네. 오늘은 여기까지 하자.']),
    none: () => '오늘 체크리스트는 아직 없네.',
  } : {
    done: (n) => pick([`오늘 ${n}건 완료하셨습니다.`, `벌써 ${n}건 처리하셨네요.`]),
    next: (t) => pick([`다음은 "${t}"부터 하시면 됩니다.`, `지금은 "${t}" 차례입니다.`]),
    over: (q) => `"${q.name}" 마감이 ${q.dday}입니다. 먼저 확인해 주세요.`,
    soon: (q) => `"${q.name}" 마감이 ${q.dday}입니다.`,
    clear: () => pick(['오늘 체크리스트는 모두 끝났습니다. 수고하셨습니다.', '오늘 할 일은 다 끝났습니다.']),
    none: () => '오늘 체크리스트는 아직 없습니다.',
  };
  const parts = [];
  let mood = '기본';
  const urgent = ctx.urgent[0];
  if (ctx.done.length) { parts.push(T.done(ctx.done.length)); mood = '웃음'; }
  if (urgent) { parts.push(/지남/.test(urgent.dday) ? T.over(urgent) : T.soon(urgent)); mood = '진지'; }
  if (ctx.left.length) parts.push(T.next(ctx.left[0]));
  else if (ctx.done.length) { parts.push(T.clear()); if (!urgent) mood = '눈감음'; }
  else parts.push(T.none());
  return { text: parts.slice(0, 3).join(' '), mood, source: 'local', name };
}

function systemPrompt(persona, ctx) {
  return [
    `당신은 사용자의 업무 비서 "${persona.name || '업무비서'}"입니다.`,
    `말투: ${persona.tone || '차분하고 간결한 존댓말'}. 과장된 칭찬, 감탄사, 이모지, 억지 응원은 쓰지 않는다. 사람 비서처럼 자연스럽게.`,
    persona.instructions ? `\n[사용자가 정해 둔 업무비서 지침]\n${persona.instructions}\n` : '',
    '사용자는 데스크탑 업무 다이어리 앱 안에서 너와 이야기해. 아래는 노션에서 방금 읽어 온 오늘 업무 상황이야. 업무 질문에는 이걸 근거로 답해.',
    `[오늘 업무 상황]\n${contextText(ctx)}`,
    '대화할 때는 짧고 자연스럽게, 보통 2~5문장으로 답해. 표나 긴 목록은 꼭 필요할 때만.',
    '답변 맨 앞에 지금 표정 하나를 [표정:기본] 처럼 붙인다. 고를 수 있는 표정: 기본, 웃음, 윙크, 진지, 눈감음. (끝낸 일을 인정하거나 좋은 소식이면 웃음, 가벼운 농담·격려면 윙크, 마감 임박·지난 일 경고면 진지, 다 끝나서 마무리할 때는 눈감음, 그 외 기본)',
  ].filter(Boolean).join('\n');
}

const CHECK_PROMPT = [
  '[자동 정시 체크] 지금 오늘 업무 상황을 보고 나에게 먼저 말 걸어 줘.',
  '- 2~4문장, 목록 없이 자연스럽게.',
  '- 끝낸 일이 있으면 한마디로만 언급(과한 칭찬 금지).',
  '- 남은 일 중 지금 먼저 할 일 하나를 콕 집기.',
  '- 마감 3일 이내(또는 지난) 업무가 있으면 꼭 이름과 D-day를 언급.',
  '- 남은 일이 없으면 마무리해도 된다고 짧게.',
].join('\n');

// 저장된 대화를 API 형식으로 (user/assistant 번갈아, user 로 시작)
function toMessages(history) {
  const out = [];
  for (const m of history.slice(-HISTORY_TURNS)) {
    if (!m.text || m.local) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + m.text;
    else out.push({ role: m.role, content: m.text });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

// 답변 앞의 [표정:…] 을 떼어 냄
function splitMood(text) {
  const m = String(text || '').match(/^\s*\[\s*표정\s*[:：]\s*([^\]]+?)\s*\]\s*/);
  return m ? { text: text.slice(m[0].length).trim(), mood: m[1].trim() } : { text: String(text || '').trim(), mood: null };
}

// ---------- Claude 구독(클로드 앱 로그인)으로 답하기: 내 맥의 Claude Code 를 사용 ----------
const { execFile } = require('child_process');
const fsx = require('fs');
const pathx = require('path');
const osx = require('os');
const gmail = require('./gmail');
let cliPath; // undefined = 아직 안 찾음, null = 없음
function findClaudeCli() {
  if (cliPath !== undefined) return Promise.resolve(cliPath);
  const home = osx.homedir();
  const cands = [
    pathx.join(home, '.local/bin/claude'), pathx.join(home, '.claude/local/claude'),
    '/opt/homebrew/bin/claude', '/usr/local/bin/claude', pathx.join(home, '.npm-global/bin/claude'),
  ];
  for (const c of cands) { try { fsx.accessSync(c, fsx.constants.X_OK); cliPath = c; return Promise.resolve(c); } catch { /* 없음 */ } }
  return new Promise((resolve) => {
    const shell = process.env.SHELL || '/bin/zsh';
    execFile(shell, ['-lc', 'command -v claude'], { timeout: 8000 }, (err, out) => {
      cliPath = !err && out.trim() ? out.trim().split('\n').pop() : null;
      resolve(cliPath);
    });
  });
}
function resetCli() { cliPath = undefined; }
const cliEnv = (bin) => ({ ...process.env, PATH: `${pathx.dirname(bin)}:${process.env.PATH || ''}` });

// opts.gmail = { server } 이면 Gmail 커넥터의 읽기·초안 도구만 허용해서 부름 (그 외에는 도구 없이)
function askViaCli(persona, ctx, history, userText, opts = {}) {
  return findClaudeCli().then((bin) => new Promise((resolve, reject) => {
    if (!bin) return reject(Object.assign(new Error('no cli'), { friendly: 'Claude Code가 설치돼 있지 않아요. 사용설명서 4장을 보고 설치해 주세요.' }));
    const past = toMessages(history).slice(-12).map((m) => `${m.role === 'user' ? '사용자' : '나'}: ${m.content}`).join('\n');
    const prompt = (past ? `[지난 대화]\n${past}\n\n` : '') + `사용자: ${userText}`;
    const cwd = pathx.join(osx.tmpdir(), 'work-diary-assistant');
    try { fsx.mkdirSync(cwd, { recursive: true }); } catch { /* 이미 있음 */ }
    const g = opts.gmail;
    const args = ['-p', prompt, '--system-prompt', systemPrompt(persona, ctx) + (g ? '\n' + gmail.PROMPT : ''), '--tools', '', '--output-format', 'json',
      '--model', chatModel(persona).cli, '--no-session-persistence', ...(g ? gmail.cliArgs(g.server) : ['--strict-mcp-config'])];
    const env = cliEnv(bin);
    execFile(bin, args, { cwd, timeout: g ? 300_000 : 180_000, maxBuffer: 4 * 1024 * 1024, env: g ? gmail.childEnv(env) : env }, (err, out, errOut) => {
      let j = null;
      try { j = JSON.parse(out); } catch { /* 아래에서 처리 */ }
      if (j && !j.is_error && typeof j.result === 'string') return resolve(j.result.trim());
      const msg = (j && j.result) || errOut || (err && err.message) || '';
      if (/log ?in|auth|credential|401/i.test(msg)) return reject(Object.assign(new Error(msg), { friendly: 'Claude Code에 로그인이 필요해요. 터미널에서 claude 를 한 번 실행해 로그인해 주세요.' }));
      if (/limit|usage|rate/i.test(msg)) return reject(Object.assign(new Error(msg), { friendly: 'Claude 사용 한도에 걸렸어요. 조금 뒤에 다시 해 주세요.' }));
      reject(Object.assign(new Error(msg || 'cli failed'), { friendly: 'Claude가 대답하지 못했어요. 잠시 뒤 다시 해 주세요.' }));
    });
  }));
}

async function ask(apiKey, persona, ctx, history, userText) {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  const messages = toMessages([...history, { role: 'user', text: userText }]);
  const res = await client.messages.create({
    model: chatModel(persona).api,
    max_tokens: 3000,
    output_config: { effort: 'low' },
    system: systemPrompt(persona, ctx),
    messages,
  });
  if (res.stop_reason === 'refusal') return null;
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim() || null;
}

// 정시 체크 / "지금 확인해줘"
async function generate(apiKey, persona, ctx, history = []) {
  let raw;
  if (apiKey) raw = await ask(apiKey, persona, ctx, history, CHECK_PROMPT);
  else if (await findClaudeCli()) raw = await askViaCli(persona, ctx, history, CHECK_PROMPT);
  else return fallbackMessage(ctx, persona);
  if (!raw) return fallbackMessage(ctx, persona);
  const { text, mood } = splitMood(raw);
  return { text, mood, source: 'claude', name: persona.name };
}

// 사용자가 직접 말 걸기
// opts.gmail 이 켜져 있으면 API 키가 있어도 Claude Code 로 답함 (Gmail 커넥터는 구독 로그인에서만 쓸 수 있음)
async function chat(apiKey, persona, ctx, history, userText, opts = {}) {
  let raw;
  if (opts.gmail && await findClaudeCli()) raw = await askViaCli(persona, ctx, history, userText, opts);
  else if (apiKey) raw = await ask(apiKey, persona, ctx, history, userText);
  else if (await findClaudeCli()) raw = await askViaCli(persona, ctx, history, userText);
  else return { text: '대화하려면 Claude Code 설치(구독 그대로 사용) 또는 Anthropic API 키가 필요해요. 사용설명서 4장을 봐 주세요.', source: 'local', name: persona.name };
  const { text, mood } = splitMood(raw);
  return { text: text || '그 질문에는 답하기 어렵습니다. 다른 걸 물어봐 주세요.', mood, source: 'claude', name: persona.name };
}

function friendlyError(e) {
  const s = e && e.status;
  if (s === 401) return 'Anthropic API 키가 올바르지 않아요. 설정에서 다시 넣어 주세요.';
  if (s === 402 || (e && /credit/i.test(e.message || ''))) return 'Anthropic 크레딧이 부족해요. 콘솔에서 충전해 주세요.';
  if (s === 429) return '요청이 많아 잠시 후 다시 해볼게요.';
  return '비서가 잠깐 자리를 비웠어요. (연결 오류)';
}

// 설정창의 "Gmail 연결 확인"
async function checkGmail(persona, server) {
  const bin = await findClaudeCli();
  if (!bin) return { ok: false, reason: 'nocli', message: 'Claude Code가 설치돼 있지 않아요. 사용설명서 4장을 보고 설치해 주세요.', server };
  return gmail.probe(bin, chatModel(persona).cli, server, cliEnv(bin));
}

module.exports = { checkGmail, findClaudeCli, resetCli, splitMood, generate, chat, buildContext, fallbackMessage, friendlyError, toMessages, CHECK_PROMPT, MODEL };
