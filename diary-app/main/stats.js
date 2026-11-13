// 능력치 자동 올리기: 완료한 체크리스트 항목을 보고 지식/배짱/손재주/친절/매력 중 하나에 +1
'use strict';
const Anthropic = require('@anthropic-ai/sdk').default;
const { MODEL } = require('./assistant');

const STATS = ['지식', '배짱', '손재주', '친절', '매력'];

const RULES = {
  지식: ['리서치', '조사', '큐레이션', '공부', '교육', '학습', '분석', '검토', '기사', '스터디', '확인', '파악', '정리'],
  배짱: ['문의', '요청', '협상', '발표', '미팅', '회의', '전화', '계약', '대출', '올핸즈', '진행', '결정', '보고', '청구'],
  손재주: ['수정', '작성', '기입', '업데이트', '세팅', '설정', '백업', '제작', '디자인', '엑셀', '등록', '발행', '정산', '이체', '문서', '출석부'],
  친절: ['전달', '드리기', '께', '안내', '응대', '온보딩', '지원', '도움', '공지', '답변', '조율', '챙기'],
  매력: ['점심', '커피', '행사', '이벤트', '동의서', '데모데이', '네트워킹', '홍보', 'sns', '선물', '파티', '축하'],
};

function hashPick(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return STATS[Math.abs(h) % STATS.length];
}

function ruleClassify(text) {
  const t = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const s of STATS) {
    const score = RULES[s].reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { best = s; bestScore = score; }
  }
  return best || hashPick(text);
}

async function claudeClassify(apiKey, texts) {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 45_000 });
  const list = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: 'low' },
    system: `업무 항목마다 어울리는 능력치를 하나씩 골라. 능력치: 지식(조사·공부·검토), 배짱(요청·협상·발표·어려운 연락), 손재주(문서 작성·수정·세팅·처리), 친절(전달·안내·도와주기·조율), 매력(사람 챙기기·행사·분위기). 답은 "번호:능력치" 형식으로 한 줄에 하나씩만.`,
    messages: [{ role: 'user', content: list }],
  });
  if (res.stop_reason === 'refusal') return null;
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const out = new Array(texts.length).fill(null);
  for (const line of text.split('\n')) {
    const m = line.match(/(\d+)\s*[:.)]\s*(지식|배짱|손재주|친절|매력)/);
    if (m && +m[1] >= 1 && +m[1] <= texts.length) out[+m[1] - 1] = m[2];
  }
  return out;
}

// 완료된 항목 목록 [{id, text, date}] 를 보고 stats/awards 를 갱신. 바뀐 내용을 돌려줌.
async function award({ doneItems, awards, stats, apiKey, loadedDates }) {
  const changes = [];
  // 지금 불러온 날짜의 점수 기록을 지금 목록에 다시 짝지음. 노션 로그인 쪽은 항목 id 가 '그 날짜의 몇 번째'라서
  // 위 항목을 지우거나 넘기면 번호가 밀린다 → id 만 보면 점수를 뺐다가 다시 주게 됨(포인트업이 또 뜸).
  // ① id 와 글이 모두 같은 것 ② 같은 날짜·같은 글 ③ id 만 같은 것(글을 고친 경우) 순서로 찾는다.
  const left = new Map(Object.entries(awards).filter(([, a]) => loadedDates.has(a.date)));
  for (const id of left.keys()) delete awards[id];
  const take = (item, id, a) => { awards[item.id] = { ...a, text: item.text }; left.delete(id); };
  let rest = doneItems.filter((i) => { const a = left.get(i.id); return a && a.text === i.text ? (take(i, i.id, a), false) : true; });
  rest = rest.filter((i) => { const hit = [...left].find(([, a]) => a.date === i.date && a.text === i.text); return hit ? (take(i, hit[0], hit[1]), false) : true; });
  const fresh = rest.filter((i) => { const a = left.get(i.id); return a && a.date === i.date ? (take(i, i.id, a), false) : true; });
  // 짝을 못 찾은 기록 = 체크가 풀렸거나 없어진 항목 → 되돌리기
  for (const a of left.values()) {
    const d = stats[a.date] || {};
    d[a.stat] = Math.max(0, (d[a.stat] || 0) - 1);
    stats[a.date] = d;
    changes.push({ ...a, delta: -1 });
  }
  if (fresh.length) {
    let picks = null;
    if (apiKey) {
      try { picks = await claudeClassify(apiKey, fresh.map((i) => i.text)); } catch (e) { console.error('[stats]', e.message); }
    }
    fresh.forEach((item, idx) => {
      const stat = (picks && picks[idx]) || ruleClassify(item.text);
      const d = stats[item.date] || {};
      d[stat] = (d[stat] || 0) + 1;
      stats[item.date] = d;
      awards[item.id] = { stat, date: item.date, text: item.text };
      changes.push({ stat, date: item.date, text: item.text, delta: 1 });
    });
  }
  return changes;
}

module.exports = { award, ruleClassify, STATS };
