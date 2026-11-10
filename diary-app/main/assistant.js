// 비서: Claude Haiku 5.5 로 2~4문장 말 걸기. 키가 없으면 규칙 기반 문장으로 대신함.
'use strict';
const Anthropic = require('@anthropic-ai/sdk').default;

const MODEL = 'claude-haiku-5-5';

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

function buildContext({ todayISO, now, todayItems, quests }) {
  const flat = flatten(todayItems);
  const done = flat.filter((i) => i.checked).map((i) => i.text);
  const left = flat.filter((i) => !i.checked).map((i) => i.text);
  const urgent = (quests || [])
    .map((q) => ({ ...q, d: daysLeft(q.end, todayISO) }))
    .filter((q) => q.d !== null && q.d <= 3)
    .map((q) => ({ name: q.name, status: q.status, end: q.end, dday: q.d < 0 ? `D+${-q.d}(지남)` : q.d === 0 ? 'D-DAY' : `D-${q.d}` }));
  return { time: now, done, left, urgent };
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

async function generate(apiKey, persona, ctx) {
  if (!apiKey) return fallbackMessage(ctx, persona);
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  const system = [
    `너는 사용자의 업무 비서 "${persona.name || '비서'}"야.`,
    `말투/성격: ${persona.tone || '다정하고 씩씩한 반말'}`,
    '규칙:',
    '- 한국어로 2~4문장만 말해. 목록·제목·이모지 남발 없이 말 걸듯이.',
    '- 끝낸 일이 있으면 짧게 칭찬해.',
    '- 남은 일 중 지금 먼저 할 일 하나를 콕 집어 말해.',
    '- 마감 3일 이내(또는 지난) 업무가 있으면 꼭 이름과 D-day를 언급해.',
    '- 남은 일이 없으면 퇴근을 응원해.',
  ].join('\n');
  const user = `현재 시각: ${ctx.time}\n끝낸 일: ${JSON.stringify(ctx.done)}\n남은 일: ${JSON.stringify(ctx.left)}\n마감 임박 업무: ${JSON.stringify(ctx.urgent)}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: 'low' },
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (res.stop_reason === 'refusal') return fallbackMessage(ctx, persona);
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return { text: text || fallbackMessage(ctx, persona).text, source: 'claude', name: persona.name };
}

function friendlyError(e) {
  const s = e && e.status;
  if (s === 401) return 'Anthropic API 키가 올바르지 않아요. 설정에서 다시 넣어 주세요.';
  if (s === 402 || (e && /credit/i.test(e.message || ''))) return 'Anthropic 크레딧이 부족해요. 콘솔에서 충전해 주세요.';
  if (s === 429) return '요청이 많아 잠시 후 다시 해볼게요.';
  return '비서가 잠깐 자리를 비웠어요. (연결 오류)';
}

module.exports = { generate, buildContext, fallbackMessage, friendlyError, MODEL };
