// 앱 안 업데이트: GitHub Releases 에서 새 버전을 찾아 받아서 스스로 바꿔 끼우고 다시 켬.
// (Mac 은 애플 인증서 없이도 되도록 직접 교체하는 방식)
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const OWNER = 'foreverclosemyeyes';
const REPO = 'dunno';
const TAG_PREFIX = 'diary-v';

function parseVer(v) {
  return String(v || '').replace(/^[^\d]*/, '').split('.').map((n) => parseInt(n, 10) || 0);
}
function newer(a, b) { // a > b ?
  const x = parseVer(a), y = parseVer(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

function headers(token, extra = {}) {
  const h = { 'User-Agent': 'work-diary-updater', Accept: 'application/vnd.github+json', ...extra };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function friendly(status) {
  if (status === 401) return 'GitHub 열쇠(토큰)가 올바르지 않아요. SETTING > 연결에서 다시 넣어 주세요.';
  if (status === 404) return '업데이트를 찾을 수 없어요. 저장소가 비공개라면 SETTING > 연결에 GitHub 열쇠(토큰)를 넣어 주세요.';
  if (status === 403) return 'GitHub 요청이 잠시 막혔어요. 조금 뒤에 다시 해 주세요.';
  return '업데이트 확인에 실패했어요. 인터넷 연결을 확인해 주세요.';
}

async function latest(token) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=20`, { headers: headers(token) });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { friendly: friendly(res.status) });
  const list = await res.json();
  const rel = list.filter((r) => r.tag_name && r.tag_name.startsWith(TAG_PREFIX) && !r.draft)
    .sort((a, b) => (newer(a.tag_name, b.tag_name) ? -1 : 1))[0];
  if (!rel) return null;
  return { version: rel.tag_name.slice(TAG_PREFIX.length).split('-')[0], tag: rel.tag_name, assets: rel.assets, notes: rel.body || '', url: rel.html_url };
}

function pickAsset(rel) {
  if (process.platform === 'darwin') {
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    return rel.assets.find((a) => a.name.endsWith(`mac-${arch}.zip`));
  }
  if (process.platform === 'win32') return rel.assets.find((a) => a.name.endsWith('.exe'));
  return null;
}

async function download(asset, token, dest, onProgress) {
  // 비공개 저장소: API 주소로 요청 → 실제 파일 주소로 넘겨줌 (그 주소에는 열쇠를 보내지 않음)
  let res = await fetch(asset.url, { headers: headers(token, { Accept: 'application/octet-stream' }), redirect: 'manual' });
  if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
    res = await fetch(res.headers.get('location'));
  }
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { friendly: friendly(res.status) });
  const total = Number(res.headers.get('content-length')) || asset.size || 0;
  const out = fs.createWriteStream(dest);
  let got = 0;
  for await (const chunk of res.body) {
    out.write(chunk);
    got += chunk.length;
    if (total) onProgress && onProgress(Math.round((got / total) * 100));
  }
  await new Promise((r) => out.end(r));
}

function appBundlePath() {
  // .../WorkDiary.app/Contents/MacOS/WorkDiary → .../WorkDiary.app
  return path.resolve(process.execPath, '..', '..', '..');
}

async function install({ app, token, workDir, onProgress }) {
  const rel = await latest(token);
  if (!rel) throw Object.assign(new Error('no release'), { friendly: '받을 수 있는 새 버전이 없어요.' });
  const asset = pickAsset(rel);
  if (!asset) throw Object.assign(new Error('no asset'), { friendly: '이 컴퓨터에 맞는 업데이트 파일이 아직 없어요.' });
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  const file = path.join(workDir, asset.name);
  await download(asset, token, file, onProgress);

  if (process.platform === 'win32') {
    spawn(file, [], { detached: true, stdio: 'ignore' }).unref();
    return { quit: true };
  }

  // Mac: 압축 풀기 → 앱이 꺼지면 교체 → 다시 켜기
  const target = appBundlePath();
  if (!target.endsWith('.app')) throw Object.assign(new Error('not a bundle'), { friendly: '개발용 실행에서는 업데이트할 수 없어요.' });
  if (target.startsWith('/Volumes/')) throw Object.assign(new Error('dmg'), { friendly: '앱을 응용 프로그램 폴더로 옮긴 뒤에 업데이트해 주세요.' });
  try { fs.accessSync(path.dirname(target), fs.constants.W_OK); } catch {
    throw Object.assign(new Error('no write'), { friendly: '앱이 있는 폴더에 쓸 수 없어요. 응용 프로그램 폴더에 있는지 확인해 주세요.' });
  }
  const unz = path.join(workDir, 'new');
  await new Promise((res, rej) => execFile('/usr/bin/ditto', ['-x', '-k', file, unz], (e) => (e ? rej(e) : res())));
  const newApp = fs.readdirSync(unz).find((n) => n.endsWith('.app'));
  if (!newApp) throw Object.assign(new Error('no app in zip'), { friendly: '받은 파일이 이상해요. 잠시 뒤 다시 해 주세요.' });
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  const script = path.join(workDir, 'swap.sh');
  fs.writeFileSync(script, [
    '#!/bin/bash',
    `while kill -0 ${process.pid} 2>/dev/null; do sleep 0.3; done`,
    `T=${q(target)}; N=${q(path.join(unz, newApp))}`,
    'rm -rf "$T.old"',
    'if mv "$T" "$T.old" && /usr/bin/ditto "$N" "$T"; then rm -rf "$T.old"; else rm -rf "$T"; mv "$T.old" "$T"; fi',
    '/usr/bin/xattr -cr "$T" 2>/dev/null',
    'open "$T"',
  ].join('\n'), { mode: 0o755 });
  spawn('/bin/bash', [script], { detached: true, stdio: 'ignore' }).unref();
  return { quit: true, version: rel.version };
}

async function check({ app, token }) {
  const current = app.getVersion();
  const rel = await latest(token);
  return { current, latest: rel ? rel.version : null, available: !!(rel && newer(rel.version, current) && pickAsset(rel)), url: rel && rel.url };
}

module.exports = { check, install, newer };
