// "노션으로 로그인": 관리자 권한 없이 Notion MCP(mcp.notion.com)에 OAuth 로 접속해서
// 업무 DB를 읽고 체크박스를 체크함. (Claude 가 노션에 연결할 때와 같은 방식)
'use strict';
const http = require('http');
const { URL } = require('url');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { auth } = require('@modelcontextprotocol/sdk/client/auth.js');

const SERVER = 'https://mcp.notion.com/mcp';
const PORT = 47823;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;

class NotionMcp {
  /** @param {{load:()=>object, save:(o:object)=>void, open:(url:string)=>void}} io */
  constructor(io) {
    this.io = io;
    this.client = null;
    this.tools = null;
    this.verifier = null;
    const self = this;
    this.provider = {
      get redirectUrl() { return REDIRECT; },
      get clientMetadata() {
        return {
          client_name: '업무다이어리 (WorkDiary)',
          redirect_uris: [REDIRECT],
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        };
      },
      clientInformation: () => self.io.load().client,
      saveClientInformation: (c) => self.io.save({ ...self.io.load(), client: c }),
      tokens: () => self.io.load().tokens,
      saveTokens: (t) => self.io.save({ ...self.io.load(), tokens: t }),
      redirectToAuthorization: (url) => self.io.open(url.toString()),
      saveCodeVerifier: (v) => { self.verifier = v; },
      codeVerifier: () => self.verifier,
      invalidateCredentials: (scope) => {
        const d = self.io.load();
        if (scope === 'all' || scope === 'client') delete d.client;
        if (scope === 'all' || scope === 'tokens') delete d.tokens;
        self.io.save(d);
      },
    };
  }

  loggedIn() { return !!(this.io.load().tokens); }

  // 브라우저로 노션 로그인 → 127.0.0.1 로 돌아온 code 를 받아 토큰으로 바꿈
  async login() {
    let server;
    const codePromise = new Promise((resolve, reject) => {
      server = http.createServer((req, res) => {
        const u = new URL(req.url, REDIRECT);
        if (u.pathname !== '/callback') { res.writeHead(404); res.end(); return; }
        const code = u.searchParams.get('code');
        const err = u.searchParams.get('error');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<html><body style="font-family:sans-serif;background:#111;color:#fff;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h2>${code ? '노션 연결 완료!' : '연결하지 못했어요'}</h2><p>이 창은 닫고 업무다이어리로 돌아가세요.</p></div></body></html>`);
        if (code) resolve(code); else reject(new Error(err || 'no code'));
      });
      server.on('error', reject);
      server.listen(PORT, '127.0.0.1');
      setTimeout(() => reject(Object.assign(new Error('timeout'), { friendly: '5분 안에 로그인이 끝나지 않았어요. 다시 해 주세요.' })), 5 * 60 * 1000);
    });
    try {
      const first = await auth(this.provider, { serverUrl: SERVER });
      if (first === 'AUTHORIZED') return true;
      const code = await codePromise;
      const r = await auth(this.provider, { serverUrl: SERVER, authorizationCode: code });
      this.client = null;
      return r === 'AUTHORIZED';
    } finally {
      try { server && server.close(); } catch { /* 이미 닫힘 */ }
    }
  }

  logout() { this.io.save({}); this.client = null; this.tools = null; }

  async connect() {
    if (this.client) return this.client;
    const transport = new StreamableHTTPClientTransport(new URL(SERVER), { authProvider: this.provider });
    const client = new Client({ name: 'work-diary', version: '1.0.0' });
    await client.connect(transport);
    const { tools } = await client.listTools();
    this.tools = tools.map((t) => t.name);
    this.client = client;
    return client;
  }

  tool(suffix) {
    const name = (this.tools || []).find((n) => n === suffix || n.endsWith(suffix) || n.endsWith(suffix.replace(/^notion-/, '')));
    if (!name) throw Object.assign(new Error(`tool ${suffix} not found`), { friendly: '노션 연결 도구를 찾지 못했어요. 다시 로그인해 주세요.' });
    return name;
  }

  async call(suffix, args) {
    let client;
    try { client = await this.connect(); } catch (e) { throw wrap(e); }
    let res;
    try { res = await client.callTool({ name: this.tool(suffix), arguments: args }); } catch (e) {
      this.client = null; // 다음에 다시 연결
      throw wrap(e);
    }
    const text = (res.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    if (res.isError) throw Object.assign(new Error(text), { friendly: `노션 오류: ${text.slice(0, 120)}` });
    try { return JSON.parse(text); } catch { return text; }
  }

  async sql(dataSourceId, query) {
    const url = `collection://${dataSourceId}`;
    const r = await this.call('notion-query-data-sources', { data: { data_source_urls: [url], query: query.replaceAll('{T}', `"${url}"`) } });
    return (r && r.results) || [];
  }

  async fetchPage(id) {
    const r = await this.call('notion-fetch', { id });
    const text = typeof r === 'string' ? r : (r && r.text) || '';
    const m = text.match(/<content>\n?([\s\S]*?)\n?<\/content>/);
    return m ? m[1] : text;
  }

  async replaceText(pageId, oldStr, newStr) {
    return this.call('notion-update-page', { page_id: pageId, command: 'update_content', content_updates: [{ old_str: oldStr, new_str: newStr }], allow_async: false });
  }
}

function wrap(e) {
  if (e && e.friendly) return e;
  const msg = String((e && e.message) || e);
  if (/401|unauthor|invalid_token|invalid_grant/i.test(msg)) return Object.assign(new Error(msg), { friendly: '노션 로그인이 풀렸어요. SETTING > 연결에서 "노션으로 로그인"을 다시 눌러 주세요.', relogin: true });
  if (/fetch failed|ENOTFOUND|ECONN/i.test(msg)) return Object.assign(new Error(msg), { friendly: '인터넷 연결을 확인해 주세요.' });
  return Object.assign(new Error(msg), { friendly: `노션 연결 오류: ${msg.slice(0, 120)}` });
}

// ---------- 마크다운 체크리스트 파싱 ----------
const DATE_RE = /^\s*#{1,6}\s*(\d{1,2})\s*[/.월]\s*(\d{1,2})/;
const TODO_RE = /^(\s*)- \[( |x|X)\]\s?(.*)$/;
const pad = (n) => String(n).padStart(2, '0');

function cleanText(s) {
  return String(s || '')
    .replace(/<mention-[^>]*>([^<]*)<\/mention-[^>]*>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*|__|~~|`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
}

function resolveYear(month, refISO) {
  const [ry, rm] = refISO.split('-').map(Number);
  if (rm === 12 && month === 1) return ry + 1;
  if (rm === 1 && month === 12) return ry - 1;
  return ry;
}

function workdaysFrom(startISO, count) {
  const out = [];
  const d = new Date(startISO + 'T00:00:00');
  while (out.length < count) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/**
 * 노션 마크다운 → { days: {'YYYY-MM-DD': [item]}, anchors: Map(id → {pageId, oldStr, newStr}) }
 * item: {id, text, checked, children}
 */
function parseMarkdown(md, pageId, startISO) {
  const lines = md.split('\n');
  const days = {};
  const anchors = new Map();
  const fallback = startISO ? workdaysFrom(startISO, 10) : [];
  let col = -1, date = null, secStart = 0, stack = [], counter = {};
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*<column\b/.test(ln)) { col++; date = null; secStart = i; stack = []; continue; }
    const dm = ln.match(DATE_RE);
    if (dm) {
      const y = resolveYear(+dm[1], startISO || `${new Date().getFullYear()}-01-01`);
      date = `${y}-${pad(+dm[1])}-${pad(+dm[2])}`;
      secStart = i; stack = [];
      continue;
    }
    const tm = ln.match(TODO_RE);
    if (!tm) continue;
    const d = date || (col >= 0 ? fallback[col] : null);
    if (!d) continue;
    const indent = tm[1].replace(/\t/g, '  ').length;
    const text = cleanText(tm[3]);
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (!text) continue; // 빈 체크박스는 숨김
    counter[d] = (counter[d] || 0) + 1;
    const id = `${pageId}:${d}:${counter[d]}`;
    const item = { id, text, checked: tm[2] !== ' ', children: [] };
    const block = lines.slice(secStart, i + 1);
    const toggled = ln.replace(/- \[( |x|X)\]/, tm[2] === ' ' ? '- [x]' : '- [ ]');
    anchors.set(id, { pageId, line: i, oldStr: block.join('\n'), newStr: [...block.slice(0, -1), toggled].join('\n') });
    if (stack.length) stack[stack.length - 1].item.children.push(item);
    else (days[d] = days[d] || []).push(item);
    stack.push({ indent, item });
  }
  return { days, anchors };
}

module.exports = { NotionMcp, parseMarkdown, cleanText, REDIRECT };
