// 비서: Claude Haiku 5.5 로 말 걸기 + 앱 안에서 이어지는 대화.
// 키가 없으면 정시 체크는 규칙 기반 문장으로 대신함.
'use strict';
const Anthropic = require('@anthropic-ai/sdk').default;

const MODEL = 'claude-haiku-5-5';
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
    `진행 중 퀘스트 전체: ${ctx.quests.length ? ctx.quests.join(' / ') : '없음'}`,
  ].join('\n');
}

function fallbackMessage(ctx, persona) {
  const name = persona.name || '비서';
  const parts = [];
  if (ctx.done.length) parts.push(`벌써 ${ctx.done.length}개나 끝냈네요, 잘하고 있어요!`);
  if (ctx.left.length) parts.push(`지금은 "${ctx.left[0]}"부터 해 볼까요?`);
  if (ctx.urgent.length) parts.push(`"${ctx.urgent[0].name}" 마감이 ${ctx.urgent[0].dday}예요, 잊지 마세요.`);
  if (!ctx.left.length) parts.push('오늘 할 일은 다 끝났어요. 퇴근까지 힘내요!');
  return { text: parts.slice(0, 4).join(' '), source: 'local', name };
}

function systemPrompt(persona, ctx) {
  return [
    `너는 사용자의 업무 비서 "${persona.name || '비서'}"야.`,
    `말투/성격: ${persona.tone || '다정하고 씩씩한 반말'}`,
    persona.instructions ? `\n[사용자가 정해 둔 업무비서 지침]\n${persona.instructions}\n` : '',
    '사용자는 데스크탑 업무 다이어리 앱 안에서 너와 이야기해. 아래는 노션에서 방금 읽어 온 오늘 업무 상황이야. 업무 질문에는 이걸 근거로 답해.',
    `[오늘 업무 상황]\n${contextText(ctx)}`,
    '대화할 때는 짧고 자연스럽게, 보통 2~5문장으로 답해. 표나 긴 목록은 꼭 필요할 때만.',
  ].filter(Boolean).join('\n');
}

const CHECK_PROMPT = [
  '[자동 정시 체크] 지금 오늘 업무 상황을 보고 나에게 먼저 말 걸어 줘.',
  '- 2~4문장, 목록 없이 말 걸듯이.',
  '- 끝낸 일이 있으면 짧게 칭찬.',
  '- 남은 일 중 지금 먼저 할 일 하나를 콕 집기.',
  '- 마감 3일 이내(또는 지난) 업무가 있으면 꼭 이름과 D-day를 언급.',
  '- 남은 일이 없으면 퇴근 응원.',
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

async function ask(apiKey, persona, ctx, history, userText) {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  const messages = toMessages([...history, { role: 'user', text: userText }]);
  const res = await client.messages.create({
    model: MODEL,
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
  if (!apiKey) return fallbackMessage(ctx, persona);
  const text = await ask(apiKey, persona, ctx, history, CHECK_PROMPT);
  return text ? { text, source: 'claude', name: persona.name } : fallbackMessage(ctx, persona);
}

// 사용자가 직접 말 걸기
async function chat(apiKey, persona, ctx, history, userText) {
  if (!apiKey) {
    return { text: '대화하려면 ⚙ 설정 > 연결에서 Anthropic API 키를 넣어 줘. 키가 없을 땐 정시 체크만 기본 문장으로 해 줄 수 있어.', source: 'local', name: persona.name };
  }
  const text = await ask(apiKey, persona, ctx, history, userText);
  return { text: text || '음, 그건 답하기 어려워. 다른 걸 물어봐 줄래?', source: 'claude', name: persona.name };
}

function friendlyError(e) {
  const s = e && e.status;
  if (s === 401) return 'Anthropic API 키가 올바르지 않아요. 설정에서 다시 넣어 주세요.';
  if (s === 402 || (e && /credit/i.test(e.message || ''))) return 'Anthropic 크레딧이 부족해요. 콘솔에서 충전해 주세요.';
  if (s === 429) return '요청이 많아 잠시 후 다시 해볼게요.';
  return '비서가 잠깐 자리를 비웠어요. (연결 오류)';
}

module.exports = { generate, chat, buildContext, fallbackMessage, friendlyError, toMessages, CHECK_PROMPT, MODEL };
