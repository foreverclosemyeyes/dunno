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
  const doneIds = new Set(doneItems.map((i) => i.id));
  const changes = [];
  // 체크가 풀린 항목은 되돌리기 (지금 불러온 주에 있는 날짜만 판단)
  for (const [id, a] of Object.entries(awards)) {
    if (!doneIds.has(id) && loadedDates.has(a.date)) {
      const d = stats[a.date] || {};
      d[a.stat] = Math.max(0, (d[a.stat] || 0) - 1);
      stats[a.date] = d;
      delete awards[id];
      changes.push({ ...a, delta: -1 });
    }
  }
  const fresh = doneItems.filter((i) => !awards[i.id]);
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
