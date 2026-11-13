// 업무다이어리 — 메인 프로세스
// 창/트레이/자동 실행/알림/노션 동기화/정시 비서/자정 날짜 넘김을 담당
'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const {
  app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell, dialog, globalShortcut,
  nativeImage, protocol, net, session, powerMonitor, clipboard,
} = require('electron');

const { JsonStore } = require('./store');
const { Secrets } = require('./secrets');
const notion = require('./notion');
const assistant = require('./assistant');
const statsAuto = require('./stats');
const weekly = require('./weekly');
const updater = require('./updater');
const { NotionMcp, parseMarkdown, cleanText } = require('./notionMcp');

// ---------- 오류 기록 (문제가 생기면 원인을 알 수 있게) ----------
let logFile = null;
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map((a) => (a && a.stack) || (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`;
  try { if (logFile) fs.appendFileSync(logFile, line); } catch { /* 기록 실패는 무시 */ }
}
const origError = console.error.bind(console);
console.error = (...a) => { origError(...a); log('ERROR', ...a); };
// 메인 프로세스 오류로 앱 전체가 꺼지지 않도록
process.on('uncaughtException', (e) => { log('uncaughtException', e); });
process.on('unhandledRejection', (e) => { log('unhandledRejection', e); });

const SYNC_MS = 2 * 60 * 1000;
const DEFAULT_CFG = {
  databaseId: 'ca74544b319f4aef888b8302b527232f',
  dataSourceId: '77d1be1a-43f1-4944-9e21-79f2de3301f0',
  userId: '387d872b-594c-813c-9970-0002e617b3d5',
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'diary-asset', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
]);

if (process.env.DIARY_USER_DATA) app.setPath('userData', process.env.DIARY_USER_DATA);
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let win = null;
let tray = null;
let quitting = false;
let store, cache, secrets, assetsDir;

// ---------- 날짜 도우미 ----------
const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());

// ---------- 상태 ----------
const state = {
  today: todayISO(),
  viewMonth: todayISO().slice(0, 7), // 렌더러가 보고 있는 달
  selected: todayISO(),
  quests: [],
  events: [],
  weeks: [], // [{id,url,name,start,end,lastEdited,days}]
  lastSync: null,
  syncing: false,
  error: null,
  needsSetup: false,
};

function snapshot() {
  const days = {};
  for (const w of state.weeks) {
    for (const [date, items] of Object.entries(w.days || {})) {
      days[date] = { items, pageId: w.id, url: w.url, pageName: w.name };
    }
  }
  return {
    today: state.today,
    quests: (() => { const hid = new Set((store.get('settings', {}).hiddenQuests) || []); return state.quests.filter((q) => !hid.has(String(q.id).replace(/-/g, ''))); })(),
    events: state.events,
    weeks: state.weeks.map(({ days: _d, meta: _m, adders: _a, ...rest }) => rest),
    days,
    lastSync: state.lastSync,
    syncing: state.syncing,
    error: state.error,
    needsSetup: state.needsSetup,
  };
}

function push(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}
const pushData = () => push('data', snapshot());

// ---------- 노션 동기화 ----------
function cfg() {
  return { ...DEFAULT_CFG, ...store.get('notionCfg', {}) };
}

function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return [isoOf(first), isoOf(last)];
}

let syncPromise = null;
let lastSyncAt = 0;
function sync(force = false) {
  if (syncPromise) return syncPromise;
  syncPromise = doSync(force).finally(() => { syncPromise = null; });
  return syncPromise;
}

async function doSync(force) {
  if (process.env.DIARY_DEMO) { // 화면 확인용 가짜 데이터
    Object.assign(state, require('../test/demo-data.js')(state.today), { lastSync: new Date().toISOString(), error: null });
    lastSyncAt = Date.now();
    pushData();
    updateStats();
    return;
  }
  const token = secrets.get('notion');
  if (!token && mcp && mcp.loggedIn()) return syncViaMcp();
  if (!token) {
    state.needsSetup = true;
    state.error = '노션이 아직 연결되지 않았어요. 오른쪽 위 SETTING > 연결에서 "노션으로 로그인"을 눌러 주세요.';
    pushData();
    return;
  }
  state.needsSetup = false;
  state.syncing = true;
  pushData();
  lastSyncAt = Date.now();
  const client = new notion.NotionClient(token);
  const c = cfg();
  try {
    // 보고 있는 달 + 오늘이 있는 달을 모두 포함
    const months = new Set([state.viewMonth, state.today.slice(0, 7), ...extraMonths]);
    let start = '9999', end = '0000';
    for (const ym of months) {
      const [s, e] = monthRange(ym);
      if (s < start) start = s;
      if (e > end) end = e;
    }
    const [quests, pages, events] = await Promise.all([
      notion.fetchQuests(client, c),
      notion.fetchWeeklyPages(client, c, start, end),
      notion.fetchEvents(client, c, start, end, store.get('settings', {}).eventMode || 'all').catch((e) => { console.error('[events]', e); return state.events; }),
    ]);
    state.quests = quests;
    state.events = events;

    const prev = new Map(state.weeks.map((w) => [w.id, w]));
    const weeks = [];
    for (const p of pages) {
      const old = prev.get(p.id);
      const active = (p.start <= state.today && (p.end || p.start) >= state.today) ||
        (p.start <= state.selected && (p.end || p.start) >= state.selected);
      // 오늘/보고 있는 주는 매번 새로 읽고, 나머지는 노션에서 바뀌었을 때만 다시 읽음
      if (!force && !active && old && old.lastEdited === p.lastEdited && old.days) {
        weeks.push({ ...p, days: old.days, meta: old.meta });
        continue;
      }
      const tree = await client.getBlockTree(p.id);
      const meta = {};
      weeks.push({ ...p, days: notion.parseChecklist(tree, p.start, meta), meta });
    }
    state.weeks = weeks;
    applyPending();
    state.lastSync = new Date().toISOString();
    state.error = null;
    updateStats();
    cache.set('snapshot', { quests: state.quests, events: state.events, weeks: state.weeks, lastSync: state.lastSync });
  } catch (e) {
    state.error = e.friendly || e.message;
    console.error('[sync]', e);
  } finally {
    state.syncing = false;
    pushData();
  }
}

// ---------- 노션으로 로그인 (MCP) 경로 ----------
let mcp = null;
const extraMonths = new Set(); // 보고 있는 달이 아니어도 같이 불러올 달 (새로 만든 주 페이지가 든 달)
const mcpPages = new Map(); // pageId → { md, lastEdited, start }
let mcpAnchors = new Map();
const idOf = (url) => { const m = String(url || '').replace(/-/g, '').match(/([0-9a-f]{32})(?:[?#].*)?$/i); return m ? m[1] : url; };
const isoDay = (v) => (v ? String(v).slice(0, 10) : null);
const sqlStr = (v) => `'${String(v).replace(/'/g, "''")}'`;
function rowToPage(r) {
  return {
    id: idOf(r.url), url: r.url, name: cleanText(r.Name) || '(제목 없음)', status: r['상태'] || null,
    start: isoDay(r['date:기간:start']), end: isoDay(r['date:기간:end']) || isoDay(r['date:기간:start']),
    lastEdited: r['Last edited time'], tags: (() => { try { return JSON.parse(r.Tags || '[]'); } catch { return []; } })(),
  };
}

async function syncViaMcp() {
  state.needsSetup = false;
  state.syncing = true;
  pushData();
  lastSyncAt = Date.now();
  const c = cfg();
  try {
    const months = new Set([state.viewMonth, state.today.slice(0, 7), ...extraMonths]);
    let start = '9999', end = '0000';
    for (const ym of months) { const [s0, e0] = monthRange(ym); if (s0 < start) start = s0; if (e0 > end) end = e0; }
    const me = sqlStr(`%${c.userId}%`);
    const cols = 'url, Name, "상태", Tags, "date:기간:start", "date:기간:end", "Last edited time"';
    const T = '{T}';
    const questRows = await mcp.sql(c.dataSourceId, `SELECT ${cols} FROM ${T} WHERE "담당자" LIKE ${me} AND "상태" IN ('진행중','시작 전')`);
    state.quests = questRows.map(rowToPage).filter((p) => !p.name.includes('운영성 업무'))
      .sort((a, b) => (a.end || '9999').localeCompare(b.end || '9999'));
    const weekRows = await mcp.sql(c.dataSourceId, `SELECT ${cols} FROM ${T} WHERE Name LIKE '%운영성 업무%' AND "date:기간:start" <= ${sqlStr(end)} AND "date:기간:start" >= ${sqlStr(notion.shiftISO(start, -14))}`);
    const pages = weekRows.map(rowToPage).filter((p) => p.start && (p.end || p.start) >= start && p.start <= end).sort((a, b) => a.start.localeCompare(b.start));
    try {
      const evMode = store.get('settings', {}).eventMode || 'all';
      const evRows = await mcp.sql(c.dataSourceId, `SELECT ${cols} FROM ${T} WHERE "담당자" LIKE ${me} AND "date:기간:start" <= ${sqlStr(end)} AND "date:기간:start" >= ${sqlStr(notion.shiftISO(start, -90))}`);
      state.events = evRows.map(rowToPage)
        .filter((p) => p.start && (p.end || p.start) >= start && !p.name.includes('운영성 업무') && (evMode === 'all' || p.tags.some((t) => /meeting|seminar/i.test(t))))
        .map(({ id, url, name, status, start: s0, end: e0, tags }) => ({ id, url, name, status, start: s0, end: e0 || s0, tags }))
        .sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end));
    } catch (e) { console.error('[mcp events]', e); }

    const weeks = [];
    const anchors = new Map();
    for (const p of pages) {
      const active = (p.start <= state.today && (p.end || p.start) >= state.today) || (p.start <= state.selected && (p.end || p.start) >= state.selected);
      let cached = mcpPages.get(p.id);
      if (!cached || active || cached.lastEdited !== p.lastEdited) {
        cached = { md: await mcp.fetchPage(p.id), lastEdited: p.lastEdited, start: p.start };
        mcpPages.set(p.id, cached);
      }
      const parsed = parseMarkdown(cached.md, p.id, p.start);
      parsed.anchors.forEach((v, k) => anchors.set(k, v));
      weeks.push({ ...p, days: parsed.days, adders: parsed.adders });
    }
    mcpAnchors = anchors;
    state.weeks = weeks;
    applyPending();
    state.lastSync = new Date().toISOString();
    state.error = null;
    updateStats();
    cache.set('snapshot', { quests: state.quests, events: state.events, weeks: state.weeks, lastSync: state.lastSync });
  } catch (e) {
    state.error = e.friendly || e.message;
    console.error('[mcp sync]', e);
  } finally {
    state.syncing = false;
    pushData();
  }
}

async function toggleViaMcp(id, checked) {
  const a = mcpAnchors.get(id);
  if (!a) throw Object.assign(new Error('no anchor'), { friendly: '잠시 후 다시 눌러 주세요. (노션 내용을 다시 불러오는 중)' });
  const cur = mcpPages.get(a.pageId);
  const wantChecked = /- \[x\]/i.test(a.newStr.split('\n').pop());
  if (wantChecked !== checked) return; // 이미 원하는 상태
  await mcp.replaceText(a.pageId, a.oldStr, a.newStr);
  if (cur) {
    cur.md = cur.md.replace(a.oldStr, a.newStr);
    const parsed = parseMarkdown(cur.md, a.pageId, cur.start);
    parsed.anchors.forEach((v, k) => mcpAnchors.set(k, v));
  }
}

// ---------- 비서 ----------
function persona() {
  const t = store.get('theme', null);
  const a = (t && t.assistant) || {};
  const st = store.get('settings', {});
  // 지침·Claude 채팅 주소·모델은 비서마다 따로. 그 비서에 정한 게 없으면 예전에 정해 둔 공통 값을 씀
  return {
    id: (t && t.castActive) || 'ren',
    name: a.name || '업무비서', tone: a.tone || '차분하고 간결한 존댓말',
    instructions: a.instructions != null ? a.instructions : st.assistantInstructions || '',
    claudeUrl: a.claudeUrl != null ? a.claudeUrl : st.claudeUrl || '',
    model: a.model || st.aiModel || 'opus',
  };
}

function currentContext() {
  const snap = snapshot();
  const day = snap.days[state.today];
  return assistant.buildContext({
    todayISO: state.today,
    now: new Date().toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', hour: 'numeric', minute: '2-digit' }),
    todayItems: day ? day.items : [],
    quests: snap.quests,
  });
}

// 대화 기록 (앱 안의 비서 대화. 정시 체크도 같은 대화에 이어서 쌓임)
function chatHistory() { return store.get('chat', []); }
// 지금 비서와 나눈 대화만 (비서마다 맡은 일이 달라서 서로의 대화가 섞이지 않게). 예전 기록(비서 표시 없음)은 모두에게 보임
function chatHistoryFor(id) { return chatHistory().filter((m) => !m.cast || m.cast === id); }
function addChat(...msgs) {
  const list = [...chatHistory(), ...msgs].slice(-200);
  store.set('chat', list);
  push('chat', list);
}

async function runAssistant({ notify }) {
  // 키가 없으면 무료 모드(정해진 문장)로 말함
  const ctx = currentContext();
  const who = persona(); // 묻는 순간의 비서 (대답을 기다리는 동안 비서를 바꿔도 이 비서의 대화로 남음)
  push('assistant', { thinking: true });
  let msg;
  try {
    msg = await assistant.generate(secrets.get('anthropic'), who, ctx, chatHistoryFor(who.id));
  } catch (e) {
    console.error('[assistant]', e);
    msg = { ...assistant.fallbackMessage(ctx, who), note: assistant.friendlyError(e) };
  }
  msg.at = new Date().toISOString();
  store.set('lastAssistant', msg);
  push('assistant', msg);
  if (msg.source === 'claude') addChat({ role: 'user', text: assistant.CHECK_PROMPT, auto: true, at: msg.at, cast: who.id }, { role: 'assistant', text: msg.text, at: msg.at, name: msg.name, cast: who.id });
  if (notify && Notification.isSupported()) {
    const n = new Notification({ title: msg.name || who.name, body: msg.text, silent: false });
    n.on('click', showWindow);
    n.show();
  }
  return msg;
}

async function chatWithAssistant(text) {
  text = String(text || '').trim().slice(0, 4000);
  if (!text) return null;
  const at = new Date().toISOString();
  const who = persona();
  const history = chatHistoryFor(who.id);
  addChat({ role: 'user', text, at, cast: who.id });
  push('assistant', { thinking: true });
  let msg;
  try {
    const st = store.get('settings', {});
    msg = await assistant.chat(secrets.get('anthropic'), who, currentContext(), history, text, st.gmail ? { gmail: { server: st.gmailServer } } : {});
  } catch (e) {
    console.error('[chat]', e);
    msg = { text: assistant.friendlyError(e), source: 'local', name: who.name, error: true };
  }
  msg.at = new Date().toISOString();
  addChat({ role: 'assistant', text: msg.text, at: msg.at, name: msg.name, cast: who.id, ...(msg.source === 'claude' && !msg.error ? {} : { local: true }) });
  store.set('lastAssistant', msg);
  push('assistant', msg);
  return msg;
}

// ---------- 능력치 자동 올리기 ----------
let statsBusy = Promise.resolve();
function updateStats() {
  statsBusy = statsBusy.then(async () => {
    if (store.get('settings', {}).autoStats === false) return;
    const doneItems = [];
    const loadedDates = new Set();
    const walk = (items, date) => (items || []).forEach((i) => {
      if (i.checked && i.text) doneItems.push({ id: i.id, text: i.text, date });
      walk(i.children, date);
    });
    if (!store.get('statsStart')) store.set('statsStart', state.today); // 이 날부터 끝낸 일만 점수
    const since = store.get('statsStart');
    for (const w of state.weeks) for (const [date, items] of Object.entries(w.days || {})) { if (date < since) continue; loadedDates.add(date); walk(items, date); }
    const stats = store.get('stats', {});
    const awards = store.get('statAwards', {});
    const changes = await statsAuto.award({ doneItems, awards, stats, apiKey: secrets.get('anthropic'), loadedDates });
    if (!changes.length) return;
    store.set('stats', stats);
    store.set('statAwards', awards);
    push('stats', { stats, changes: changes.slice(-5) });
  }).catch((e) => console.error('[stats]', e));
  return statsBusy;
}

// ---------- 체크박스 → 노션 ----------
const pendingTodos = new Map(); // blockId → checked (노션에 쓰는 중)
function setLocalTodo(blockId, checked) {
  const walk = (items) => {
    for (const i of items || []) {
      if (i.id === blockId) { i.checked = checked; return true; }
      if (walk(i.children)) return true;
    }
    return false;
  };
  for (const w of state.weeks) for (const items of Object.values(w.days || {})) if (walk(items)) return true;
  return false;
}
function applyPending() { for (const [id, c] of pendingTodos) setLocalTodo(id, c); }

// ---------- 체크박스 지우기 ----------
async function deleteTodo(id) {
  const removeLocal = () => {
    const walk = (items) => { const k = (items || []).findIndex((x) => x.id === id); if (k >= 0) { items.splice(k, 1); return true; } return (items || []).some((x) => walk(x.children)); };
    for (const w of state.weeks) for (const items of Object.values(w.days || {})) if (walk(items)) return;
  };
  if (process.env.DIARY_DEMO) { removeLocal(); pushData(); return { ok: true }; }
  try {
    const token = secrets.get('notion');
    if (token) await new notion.NotionClient(token).deleteBlock(id);
    else if (mcp && mcp.loggedIn()) {
      const a = mcpAnchors.get(id);
      if (!a) throw Object.assign(new Error('no anchor'), { friendly: '잠시 후 다시 해 주세요.' });
      await mcp.replaceText(a.pageId, a.delOld, a.delNew);
      const cur = mcpPages.get(a.pageId); if (cur) cur.md = cur.md.replace(a.delOld, a.delNew);
    } else throw Object.assign(new Error('no notion'), { friendly: '노션이 연결되지 않았어요.' });
    removeLocal(); pushData();
    sync(true);
    return { ok: true };
  } catch (e) {
    console.error('[delete todo]', e);
    return { ok: false, message: e.friendly || '노션에서 지우지 못했어요.' };
  }
}

// ---------- 체크리스트 글 고치기 ----------
async function editTodo(id, text) {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!text) return { ok: false, message: '내용을 적어 주세요.' };
  const setLocal = () => {
    const walk = (items) => (items || []).some((x) => (x.id === id ? ((x.text = text), true) : walk(x.children)));
    for (const w of state.weeks) for (const items of Object.values(w.days || {})) if (walk(items)) return true;
    return false;
  };
  if (process.env.DIARY_DEMO) { setLocal(); pushData(); return { ok: true }; }
  try {
    const token = secrets.get('notion');
    if (token) await new notion.NotionClient(token).setTodoText(id, text);
    else if (mcp && mcp.loggedIn()) {
      const a = mcpAnchors.get(id);
      if (!a) throw Object.assign(new Error('no anchor'), { friendly: '잠시 후 다시 해 주세요.' });
      const lines = a.oldStr.split('\n');
      const last = lines[lines.length - 1];
      const md = text.replace(/([\\*_`~\[\]])/g, '\\$1');
      const m = last.match(/^(\s*- \[(?: |x|X)\]\s*)/);
      if (!m) throw Object.assign(new Error('bad line'), { friendly: '이 항목은 앱에서 고칠 수 없어요. 노션에서 고쳐 주세요.' });
      const neu = [...lines.slice(0, -1), m[1] + md].join('\n');
      await mcp.replaceText(a.pageId, a.oldStr, neu);
      const cur = mcpPages.get(a.pageId); if (cur) cur.md = cur.md.replace(a.oldStr, neu);
    } else throw Object.assign(new Error('no notion'), { friendly: '노션이 연결되지 않았어요.' });
    setLocal(); pushData();
    sync(true);
    return { ok: true };
  } catch (e) {
    console.error('[edit todo]', e);
    return { ok: false, message: e.friendly || '노션에서 고치지 못했어요.' };
  }
}

// ---------- 체크리스트를 다른 날짜로 넘기기 ----------
// 넘길 날짜에 먼저 적고(하위 항목 중 안 끝난 것도 같이), 다 적힌 뒤에 원래 것을 지움 → 중간에 실패해도 사라지지 않음
async function moveTodo(id, toDate) {
  let found = null, fromDate = null;
  const walk = (items, date) => { for (const x of items || []) { if (x.id === id) { found = x; fromDate = date; return true; } if (walk(x.children, date)) return true; } return false; };
  for (const w of state.weeks) { for (const [date, items] of Object.entries(w.days || {})) if (walk(items, date)) break; if (found) break; }
  if (!found) return { ok: false, message: '항목을 못 찾았어요. 새로고침 후 다시 해 주세요.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate) || toDate === fromDate) return { ok: false, message: '넘길 날짜를 다시 골라 주세요.' };
  const texts = [found.text, ...(found.children || []).filter((c) => !c.checked).map((c) => c.text)];
  let created;
  for (const t of texts) {
    const r = await addTodo(toDate, t);
    if (!r.ok) return { ok: false, message: r.message };
    created = created || r.created; // 넘길 주의 페이지가 없어서 새로 만든 경우
  }
  const d = await deleteTodo(id);
  if (!d.ok) return { ok: false, message: `${toDate.slice(5).replace('-', '/')}에 적었지만 원래 항목은 못 지웠어요. 직접 지워 주세요.` };
  return { ok: true, count: texts.length, created };
}

// ---------- 주간 운영성 업무 페이지가 없으면 새로 만들기 ----------
// 이번 주~앞으로 4주 안의 평일인데 그 주 페이지가 아직 없을 때만. 같은 주를 동시에 두 번 만들지 않게 줄을 세움
const creatingWeeks = new Map(); // 월요일 날짜 → 진행 중인 작업
function ensureWeekPage(date) {
  if (!weekly.canCreate(date, state.today)) return Promise.resolve({ created: false });
  const week = weekly.weekOf(date);
  if (state.weeks.some((x) => x.start <= week.friday && (x.end || x.start) >= week.monday)) return Promise.resolve({ created: false });
  if (!creatingWeeks.has(week.monday)) {
    const job = (async () => {
      const token = secrets.get('notion');
      const r = token ? await weekly.createViaApi(new notion.NotionClient(token), cfg(), week)
        : mcp && mcp.loggedIn() ? await weekly.createViaMcp(mcp, cfg(), week)
          : { created: false };
      extraMonths.add(week.monday.slice(0, 7)); extraMonths.add(week.friday.slice(0, 7));
      await sync(true);
      return { ...r, name: week.name };
    })().finally(() => creatingWeeks.delete(week.monday));
    creatingWeeks.set(week.monday, job);
  }
  return creatingWeeks.get(week.monday);
}

// ---------- 새 체크박스 추가 ----------
async function addTodo(date, text) {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!text) return { ok: false, message: '내용을 적어 주세요.' };
  const find = () => state.weeks.find((x) => x.days && (x.days[date] || (x.meta && x.meta[date]) || (x.adders && x.adders[date])));
  if (process.env.DIARY_DEMO) {
    let wk = state.weeks.find((x) => x.start <= date && (x.end || x.start) >= date), created;
    if (!wk && weekly.canCreate(date, state.today)) { // 데모: 노션 대신 화면 안에서만 새 주를 만듦
      const week = weekly.weekOf(date);
      wk = { id: 'demo-' + week.monday, url: '', name: week.name, status: '시작 전', start: week.monday, end: week.friday, days: {} };
      state.weeks.push(wk); created = week.name;
    }
    if (!wk) return { ok: false, message: '이 날짜의 운영성 업무 페이지가 없어요.' };
    (wk.days[date] = wk.days[date] || []).push({ id: 'n' + Date.now(), text, checked: false, children: [] });
    pushData();
    return { ok: true, created };
  }
  let w = find(), created;
  try {
    if (!w) { const r = await ensureWeekPage(date); if (r.created) created = r.name; w = find(); }
  } catch (e) {
    console.error('[week page]', e);
    return { ok: false, message: e.friendly || '노션에 이 주의 운영성 업무 페이지를 만들지 못했어요.' };
  }
  if (!w) return { ok: false, message: created ? `노션에 "${created}" 페이지는 만들었는데 아직 불러오지 못했어요. 잠시 뒤 다시 적어 주세요.` : '이 날짜가 있는 운영성 업무 페이지를 못 찾았어요. 노션 페이지에 날짜 제목(예: 11/12 (목))이 있는지 확인해 주세요.' };
  try {
    const token = secrets.get('notion');
    if (token && w.meta && w.meta[date]) {
      await new notion.NotionClient(token).addTodo(w.meta[date].parentId, w.meta[date].afterId, text);
    } else if (!token && mcp && mcp.loggedIn() && w.adders && w.adders[date]) {
      const old = w.adders[date];
      const lines = old.split('\n');
      const last = lines[lines.length - 1];
      const md = text.replace(/([\\*_`~\[\]])/g, '\\$1');
      const neu = /^\s*- \[ \]\s*$/.test(last)
        ? [...lines.slice(0, -1), last.replace(/- \[ \]\s*$/, `- [ ] ${md}`)].join('\n') // 비어 있는 체크박스 채우기
        : `${old}${/^\s*#/.test(last) ? '\n' : ''}\n- [ ] ${md}`;
      await mcp.replaceText(w.id, old, neu);
      const cur = mcpPages.get(w.id);
      if (cur) cur.md = cur.md.replace(old, neu);
    } else {
      return { ok: false, message: '노션이 연결되지 않았어요.' };
    }
    await sync(true);
    return { ok: true, created };
  } catch (e) {
    console.error('[add todo]', e);
    return { ok: false, message: e.friendly || '노션에 추가하지 못했어요.' };
  }
}

async function toggleTodo(blockId, checked) {
  setLocalTodo(blockId, checked);
  pendingTodos.set(blockId, checked);
  pushData();
  if (process.env.DIARY_DEMO) { pendingTodos.delete(blockId); updateStats(); return { ok: true }; }
  try {
    const token = secrets.get('notion');
    if (!token && mcp && mcp.loggedIn()) await toggleViaMcp(blockId, checked);
    else if (!token) throw Object.assign(new Error('no key'), { friendly: '노션이 연결되지 않았어요.' });
    else await new notion.NotionClient(token).setTodo(blockId, checked);
    pendingTodos.delete(blockId);
    updateStats();
    cache.set('snapshot', { quests: state.quests, events: state.events, weeks: state.weeks, lastSync: state.lastSync });
    return { ok: true };
  } catch (e) {
    console.error('[todo]', e);
    pendingTodos.delete(blockId);
    setLocalTodo(blockId, !checked); // 되돌리기
    pushData();
    const msg = e.status === 403 || e.status === 404
      ? '노션에 체크하지 못했어요. 노션 통합 설정 > 기능에서 "콘텐츠 업데이트"를 켜 주세요.'
      : (e.friendly || '노션에 체크하지 못했어요.');
    return { ok: false, message: msg };
  }
}

// ---------- 시계 (자정 넘김 / 2분 새로고침 / 정시 체크) ----------
function tick() {
  const now = new Date();
  const t = isoOf(now);
  if (t !== state.today) {
    const wasViewingToday = state.selected === state.today;
    state.today = t;
    if (wasViewingToday) state.selected = t;
    state.viewMonth = t.slice(0, 7);
    push('day-changed', { today: t });
    sync(true); // 월요일이면 여기서 새 주차 페이지를 다시 찾음
  } else if (Date.now() - lastSyncAt >= SYNC_MS) {
    sync(false);
  }

  if (store.get('settings', {}).hourly) {
    const wd = now.getDay();
    const h = now.getHours();
    const key = `${t}-${h}`;
    if (wd >= 1 && wd <= 5 && h >= 9 && h <= 19 && now.getMinutes() < 3 && store.get('lastHourly') !== key) {
      store.set('lastHourly', key);
      sync(true).then(() => runAssistant({ notify: true }));
    }
  }
}

// ---------- 창 / 트레이 ----------
function showWindow() {
  if (!win || win.isDestroyed()) createWindow(true);
  else { win.show(); win.focus(); }
  if (process.platform === 'darwin') app.dock && app.dock.show();
}

function createWindow(show) {
  const bounds = store.get('bounds', { width: 1180, height: 800 });
  const settings = store.get('settings', {});
  win = new BrowserWindow({
    ...bounds,
    minWidth: 760,
    minHeight: 480,
    show: false,
    title: '업무다이어리',
    backgroundColor: '#121212',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    alwaysOnTop: !!settings.alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => { if (show) win.show(); });
  const saveBounds = () => { if (!win.isMinimized() && !win.isMaximized()) store.set('bounds', win.getBounds()); };
  win.on('resize', saveBounds);
  win.on('resize', fitZoom);
  win.webContents.on('did-finish-load', fitZoom);
  win.on('move', saveBounds);
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
      if (process.platform === 'darwin' && app.dock) app.dock.hide();
      if (!store.get('closeHintShown')) {
        store.set('closeHintShown', true);
        new Notification({ title: '업무다이어리', body: '창을 닫아도 메뉴 막대(트레이)에서 계속 실행돼요. 정시 알림도 그대로 와요.' }).show();
      }
    }
  });
  // 화면이 죽으면 다시 그리기
  win.webContents.on('render-process-gone', (_e, d) => {
    log('render-process-gone', d);
    if (d.reason !== 'clean-exit' && !quitting) setTimeout(() => { if (win && !win.isDestroyed()) win.reload(); }, 1000);
  });
  win.webContents.on('unresponsive', () => log('renderer unresponsive'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
}

function createTray() {
  const iconName = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png';
  let img = nativeImage.createFromPath(path.join(__dirname, '..', 'build', iconName));
  if (process.platform === 'darwin') img.setTemplateImage(true);
  tray = new Tray(img);
  tray.setToolTip('업무다이어리');
  const menu = () => Menu.buildFromTemplate([
    { label: '다이어리 열기', click: showWindow },
    { label: '지금 확인해줘', click: () => runAssistant({ notify: true }) },
    { label: '노션 새로고침', click: () => sync(true) },
    ...(persona().claudeUrl ? [{ label: `Claude 채팅 열기 (${persona().name})`, click: () => shell.openExternal(persona().claudeUrl) }] : []),
    { type: 'separator' },
    {
      label: '매시간 체크', type: 'checkbox', checked: !!store.get('settings', {}).hourly,
      click: (item) => { setSettings({ hourly: item.checked }); },
    },
    { type: 'separator' },
    { label: '완전히 종료', click: () => { quitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu());
  tray.on('click', () => { if (process.platform !== 'darwin') showWindow(); });
  tray.refreshMenu = () => tray.setContextMenu(menu());
}

// 앱 아이콘을 내 그림으로: 스킨 그림 중 'app-icon' 이 있으면 실행 중 독(Dock)/작업 표시줄 아이콘으로 씀
let appIconUrl = null;
function applyAppIcon() {
  try {
    const t = store.get('theme', null);
    const url = t && t.layout && t.layout.skin && t.layout.skin['app-icon'];
    if (url === appIconUrl) return;
    appIconUrl = url || null;
    const file = url ? path.join(assetsDir, path.basename(String(url))) : path.join(__dirname, '..', 'build', 'icon.png');
    const img = nativeImage.createFromPath(file);
    if (img.isEmpty()) return;
    if (process.platform === 'darwin') { if (app.dock) app.dock.setIcon(img); }
    else if (win && !win.isDestroyed()) win.setIcon(img);
  } catch (e) { console.error('[app icon]', e); }
}

// 작은 창: 큰 창(1360x820 기준) 화면을 그대로 축소해서 보여 줌 → 캐릭터·말풍선·달력·노트가 같은 비율로 같이 작아짐
const ZOOM_BASE = { w: 1360, h: 820 };
function fitZoom() {
  if (!win || win.isDestroyed()) return;
  const [w, h] = win.getContentSize();
  const on = store.get('settings', {}).autoZoom !== false;
  const f = on ? Math.max(0.5, Math.min(1, w / ZOOM_BASE.w, h / ZOOM_BASE.h)) : 1;
  if (Math.abs(win.webContents.getZoomFactor() - f) > 0.004) win.webContents.setZoomFactor(f);
  // 설정 창은 줄이지 않음 (글씨가 작아지면 안 읽힘): 줄인 만큼 되키우는 배율을 화면에 알려 줌
  win.webContents.executeJavaScript(`document.documentElement.style.setProperty('--unzoom', '${(1 / f).toFixed(4)}')`).catch(() => {});
}

function setSettings(partial) {
  const s = { ...store.get('settings', {}), ...partial };
  store.set('settings', s);
  if ('autoLaunch' in partial) applyAutoLaunch(!!partial.autoLaunch);
  if ('alwaysOnTop' in partial && win) win.setAlwaysOnTop(!!partial.alwaysOnTop);
  if ('eventMode' in partial) sync(true);
  if ('bossKey' in partial) applyBossKey(partial.bossKey);
  if ('autoZoom' in partial) fitZoom();
  if (tray && tray.refreshMenu) tray.refreshMenu();
  push('settings', s);
  return s;
}

// 회사용 숨기기 단축키: 어디서든 누르면 창을 숨기고, 다시 누르면 보여 줌
let bossKey = null;
function applyBossKey(key) {
  try { if (bossKey) globalShortcut.unregister(bossKey); } catch { /* 없음 */ }
  bossKey = null;
  if (!key) return;
  try {
    const ok = globalShortcut.register(key, () => {
      if (win && !win.isDestroyed() && win.isVisible() && !win.isMinimized()) {
        win.hide();
        if (process.platform === 'darwin' && app.dock) app.dock.hide();
      } else showWindow();
    });
    if (ok) bossKey = key; else log('bossKey register failed', key);
  } catch (e) { log('bossKey', e); }
}

function applyAutoLaunch(on) {
  if (!app.isPackaged) return; // 개발 중에는 등록하지 않음
  try {
    if (process.platform === 'darwin') app.setLoginItemSettings({ openAtLogin: on });
    else app.setLoginItemSettings({ openAtLogin: on, args: ['--hidden'] });
  } catch (e) { log('autoLaunch', e); }
}

// ---------- 파일(글씨체/그림/동영상) ----------
const KIND_FILTERS = {
  image: [{ name: '그림', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
  video: [{ name: '동영상', extensions: ['mp4', 'webm'] }],
  media: [{ name: '그림/동영상', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm'] }],
};

function saveAsset(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
  const id = hash + ext;
  const file = path.join(assetsDir, id);
  if (!fs.existsSync(file)) fs.writeFileSync(file, buffer);
  return { id, name: originalName, url: `diary-asset://local/${id}` };
}

function registerIpc() {
  ipcMain.handle('init', async () => { await claudeReady.catch(() => null); return ({
    platform: process.platform,
    settings: store.get('settings', {}),
    notionCfg: cfg(),
    notionLogin: !!(mcp && mcp.loggedIn()),
    hasKeys: { notion: secrets.has('notion') || !!process.env.DIARY_DEMO || !!(mcp && mcp.loggedIn()), anthropic: secrets.has('anthropic') || !!claudeCli, github: secrets.has('github') },
    version: app.getVersion(),
    update: updateState,
    theme: store.get('theme', null),
    stats: store.get('stats', {}),
    lastAssistant: store.get('lastAssistant', null),
    chat: store.get('chat', []),
    data: snapshot(),
    isPackaged: app.isPackaged,
  }); });
  ipcMain.handle('settings:set', (_e, partial) => setSettings(partial));
  ipcMain.handle('notionCfg:set', (_e, partial) => {
    store.set('notionCfg', { ...store.get('notionCfg', {}), ...partial });
    state.weeks = [];
    sync(true);
    return cfg();
  });
  ipcMain.handle('secret:set', (_e, name, value) => {
    if (!['notion', 'anthropic', 'github'].includes(name)) return false;
    secrets.set(name, (value || '').trim());
    if (name === 'notion') sync(true);
    if (name === 'github') setTimeout(checkUpdate, 500);
    return { notion: secrets.has('notion') || !!(mcp && mcp.loggedIn()), anthropic: secrets.has('anthropic') || !!claudeCli, github: secrets.has('github') };
  });
  ipcMain.handle('notion:test', async () => {
    const token = secrets.get('notion');
    if (!token && mcp && mcp.loggedIn()) {
      try { await mcp.connect(); const r = await mcp.sql(cfg().dataSourceId, 'SELECT Name FROM {T} LIMIT 1'); return { ok: true, message: `연결 성공! (노션 로그인 · 업무 DB 읽기 확인${r.length ? '' : ' — 비어 있음'})` }; }
      catch (e) { return { ok: false, message: e.friendly || e.message }; }
    }
    if (!token) return { ok: false, message: '먼저 "노션으로 로그인"을 누르거나 노션 키를 저장해 주세요.' };
    const client = new notion.NotionClient(token);
    try {
      const me = await client.me();
      await client.request('GET', `/data_sources/${cfg().dataSourceId}`);
      return { ok: true, message: `연결 성공! (통합 이름: ${me.name || me.bot?.workspace_name || '확인됨'})` };
    } catch (e) {
      return { ok: false, message: e.friendly || e.message };
    }
  });
  ipcMain.handle('sync', (_e, force) => sync(!!force).then(snapshot));
  ipcMain.handle('view', (_e, { month, selected }) => {
    const before = state.viewMonth;
    if (month) state.viewMonth = month;
    if (selected) state.selected = selected;
    if (month && month !== before) sync(false);
    return true;
  });
  ipcMain.handle('update:check', () => checkUpdate());
  ipcMain.handle('claude:detect', async () => ({ path: await detectClaude() }));
  ipcMain.handle('notion:login', async () => {
    try { await mcp.login(); sync(true); return { ok: true, loggedIn: true }; }
    catch (e) { log('notion login', e); return { ok: false, message: e.friendly || '노션 로그인에 실패했어요. 다시 해 주세요.' }; }
  });
  ipcMain.handle('notion:logout', () => { mcp.logout(); mcpPages.clear(); mcpAnchors = new Map(); state.weeks = []; state.quests = []; state.events = []; sync(true); return { loggedIn: false }; });
  ipcMain.handle('update:install', () => installUpdate());
  ipcMain.handle('assistant:ask', () => runAssistant({ notify: false }));
  ipcMain.handle('assistant:chat', (_e, text) => chatWithAssistant(text));
  // Gmail 연결 확인: 되면 찾은 커넥터 이름을 기억해 둠
  ipcMain.handle('gmail:check', async () => {
    const r = await assistant.checkGmail(persona(), store.get('settings', {}).gmailServer);
    if (r.ok) setSettings({ gmailServer: r.server });
    return r;
  });
  ipcMain.handle('clipboard:write', (_e, text) => { clipboard.writeText(String(text || '')); return true; });
  ipcMain.handle('chat:clear', () => { store.set('chat', []); push('chat', []); return []; });
  ipcMain.handle('todo:delete', (_e, id) => deleteTodo(String(id)));
  ipcMain.handle('todo:add', (_e, date, text) => addTodo(String(date), String(text)));
  ipcMain.handle('todo:move', (_e, id, date) => moveTodo(String(id), String(date)));
  ipcMain.handle('todo:edit', (_e, id, text) => editTodo(String(id), String(text)));
  ipcMain.handle('todo:toggle', (_e, id, checked) => toggleTodo(String(id), !!checked));
  ipcMain.handle('theme:save', (_e, theme) => { store.set('theme', theme); applyAppIcon(); return true; });
  ipcMain.handle('stats:save', (_e, stats) => { store.set('stats', stats); return true; });
  ipcMain.handle('stats:reset', () => { store.set('stats', {}); store.set('statAwards', {}); store.set('statsStart', state.today); return {}; });
  ipcMain.handle('open', (_e, url) => {
    url = String(url || '');
    // 노션 페이지 주소는 어디서나 열리는 www.notion.so/<id> 로 통일 (app.notion.com/<id> 는 '페이지 없음'이 뜸)
    if (/^https:\/\/([a-z0-9-]+\.)?notion\.(so|com|site)\//.test(url)) {
      const m = url.replace(/[?#].*$/, '').replace(/-/g, '').match(/([0-9a-f]{32})\/?$/i);
      if (m) url = `https://www.notion.so/${m[1]}`;
      return shell.openExternal(url);
    }
    if (/^https:\/\/(console\.anthropic\.com|platform\.claude\.com|claude\.ai|github\.com)\//.test(url)) shell.openExternal(url);
  });

  ipcMain.handle('asset:pick', async (_e, kind) => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'], filters: KIND_FILTERS[kind] || KIND_FILTERS.media });
    if (r.canceled) return [];
    return r.filePaths.map((p) => ({ ...saveAsset(fs.readFileSync(p), path.basename(p)), kind }));
  });
  // 캐릭터 zip 하나로 표정 그림 6칸 채우기
  ipcMain.handle('cast:importZip', async () => {
    const { readZip, pickFaces, labelFromFile } = require('./zip');
    const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'], filters: [{ name: '캐릭터 zip', extensions: ['zip'] }] });
    if (r.canceled) return [];
    const out = [];
    for (const file of r.filePaths) {
      try {
        const z = readZip(fs.readFileSync(file));
        if (z.entries.filter((e) => /\.png$/i.test(e.name)).every((e) => /(^|\/)cutin/i.test(e.name))) throw new Error('이 zip은 대화 컷인 그림이라 캐릭터 그림으로 쓸 수 없어요. 모드 그림(look-….png)을 써 주세요.');
        const picked = pickFaces(z.entries);
        const faces = {};
        for (const [mood, e] of Object.entries(picked)) { const a = saveAsset(z.read(e), path.basename(e.name)); faces[mood] = { url: a.url, name: a.name }; }
        out.push({ label: labelFromFile(path.basename(file)), faces, count: Object.keys(faces).length, royal: /royal/i.test(path.basename(file)) });
      } catch (err) { out.push({ label: path.basename(file), error: String(err.message || err) }); }
    }
    return out;
  });
  ipcMain.handle('asset:read', (_e, id) => {
    const file = path.join(assetsDir, path.basename(id));
    return fs.existsSync(file) ? fs.readFileSync(file).toString('base64') : null;
  });
  ipcMain.handle('asset:write', (_e, name, b64) => saveAsset(Buffer.from(b64, 'base64'), name));
}

let claudeCli = null;
let claudeReady = Promise.resolve(null);
async function detectClaude() {
  if (process.env.DIARY_DEMO) return null;
  assistant.resetCli();
  claudeCli = await assistant.findClaudeCli().catch(() => null);
  return claudeCli;
}

// ---------- 업데이트 ----------
let updateState = { current: app.getVersion(), available: false };
async function checkUpdate() {
  if (!app.isPackaged) { updateState = { current: app.getVersion(), available: false, note: '개발용 실행' }; push('update', updateState); return updateState; }
  try {
    updateState = { ...(await updater.check({ app, token: secrets.get('github') })), checkedAt: new Date().toISOString() };
  } catch (e) {
    log('update check', e);
    updateState = { current: app.getVersion(), available: false, error: e.friendly || e.message };
  }
  push('update', updateState);
  return updateState;
}
async function installUpdate() {
  try {
    push('update', { ...updateState, installing: true, progress: 0 });
    const r = await updater.install({ app, token: secrets.get('github'), workDir: path.join(app.getPath('userData'), 'update'),
      onProgress: (p) => push('update', { ...updateState, installing: true, progress: p }) });
    if (r.quit) { store.saveNow(); cache.saveNow(); quitting = true; setTimeout(() => app.quit(), 300); }
    return { ok: true };
  } catch (e) {
    log('update install', e);
    updateState = { ...updateState, installing: false, error: e.friendly || e.message };
    push('update', updateState);
    return { ok: false, message: updateState.error };
  }
}

// ---------- 시작 ----------
app.on('second-instance', showWindow);
app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch { /* 없음 */ } });
app.on('before-quit', () => { quitting = true; store && store.saveNow(); cache && cache.saveNow(); });
app.on('activate', showWindow);
app.on('window-all-closed', () => { /* 트레이에 남아 있음 */ });

app.whenReady().then(() => {
  try {
    fs.mkdirSync(app.getPath('logs'), { recursive: true });
    logFile = path.join(app.getPath('logs'), 'main.log');
    try { if (fs.statSync(logFile).size > 2e6) fs.renameSync(logFile, logFile + '.old'); } catch { /* 처음 */ }
  } catch { /* 기록 폴더 없음 */ }
  log('start', app.getVersion(), process.platform, process.arch, `electron ${process.versions.electron}`, require('os').release());
  app.on('child-process-gone', (_e, d) => log('child-process-gone', d));
  if (process.platform === 'win32') app.setAppUserModelId('com.workdiary.app');
  const ud = app.getPath('userData');
  store = new JsonStore(path.join(ud, 'diary-data.json'));
  cache = new JsonStore(path.join(ud, 'notion-cache.json'));
  secrets = new Secrets(path.join(ud, 'secrets.json'));
  mcp = new NotionMcp({
    load: () => { try { return JSON.parse(secrets.get('notionMcp') || '{}'); } catch { return {}; } },
    save: (o) => secrets.set('notionMcp', JSON.stringify(o || {})),
    open: (url) => shell.openExternal(url),
  });
  assetsDir = path.join(ud, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  applyAppIcon();

  // 지난번 동기화 결과로 먼저 화면을 채움 (인터넷이 없어도 보임)
  const snap = cache.get('snapshot');
  if (snap) { state.quests = snap.quests || []; state.events = snap.events || []; state.weeks = snap.weeks || []; state.lastSync = snap.lastSync; }

  protocol.handle('diary-asset', (req) => {
    const id = path.basename(decodeURIComponent(new URL(req.url).pathname));
    const file = path.join(assetsDir, id);
    return net.fetch(pathToFileURL(file).toString(), { headers: req.headers });
  });

  const allowed = ['notifications'];
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(allowed.includes(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => allowed.includes(perm));

  registerIpc();
  claudeReady = detectClaude();
  createTray();

  const settings = store.get('settings', null);
  if (!settings) setSettings({ autoLaunch: true, hourly: true, alwaysOnTop: false });
  else if (app.isPackaged) applyAutoLaunch(!!settings.autoLaunch);

  applyBossKey(store.get('settings', {}).bossKey ?? 'CommandOrControl+Shift+X');
  const startHidden = process.argv.includes('--hidden');
  createWindow(!startHidden);
  if (startHidden && process.platform === 'darwin' && app.dock) app.dock.hide();

  sync(true);
  setInterval(tick, 15 * 1000);
  setTimeout(checkUpdate, 8000);
  setInterval(checkUpdate, 6 * 60 * 60 * 1000);
  powerMonitor.on('resume', () => setTimeout(tick, 3000));
  powerMonitor.on('unlock-screen', () => setTimeout(tick, 3000));
});
