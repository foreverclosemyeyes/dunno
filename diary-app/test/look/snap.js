// 화면 모양 회귀 검사: 여러 화면 상태에서 모든 요소의 '계산된 모양'을 기록한다.
// 모양을 바꾸지 않아야 하는 정리(리팩터링) 전후에 한 번씩 찍고 diff.js 로 비교한다.
//
//   node test/look/snap.js before.json      (고치기 전)
//   node test/look/snap.js after.json       (고친 뒤)
//   node test/look/diff.js before.json after.json   → "TOTAL DIFFS 0" 이면 화면이 그대로
//
// 화면이 없는 서버에서는 앞에 xvfb-run -a 를 붙인다. playwright 는 따로 깔려 있어야 한다.
// DIARY_LOOK_ASSETS=<폴더> 를 주면 그 안의 skin/*.png, renmodes/look-*.png, base.jpg 를 스킨·표정으로 넣고 찍는다
// (게임 그림은 저장소에 올리지 않으므로 없으면 기본 모양만 검사).
const { _electron } = require('playwright'); const fs = require('fs'); const path = require('path');
const os = require('os');
const appDir = path.resolve(__dirname, '..', '..'); const S = process.env.DIARY_LOOK_ASSETS || '';
const out = process.argv[2];
if (!out) { console.error('쓰는 법: node test/look/snap.js <결과.json>'); process.exit(1); }
(async () => {
  const app = await _electron.launch({ executablePath: appDir + '/node_modules/electron/dist/electron', args: [appDir, '--no-sandbox'], env: { ...process.env, DIARY_DEMO: '1', DIARY_USER_DATA: fs.mkdtempSync(path.join(os.tmpdir(), 'diary-look-')) } });
  const win = await app.firstWindow(); const errs = []; win.on('pageerror', (e) => errs.push(e.message));
  await win.setViewportSize({ width: 1440, height: 860 }); await win.waitForTimeout(1500);
  await win.evaluate(() => { const c = document.querySelector('.cut'); if (c) c.click(); }); await win.waitForTimeout(6500);
  const rd = (d) => (S && fs.existsSync(path.join(S, d)) ? fs.readdirSync(path.join(S, d)) : []).filter((f) => f.endsWith('.png')).map((f) => [f, fs.readFileSync(path.join(S, d, f)).toString('base64')]);
  const base = S && fs.existsSync(path.join(S, 'base.jpg')) ? fs.readFileSync(path.join(S, 'base.jpg')).toString('base64') : null;
  await win.evaluate(async ({ skin, looks, base }) => {
    window.__skin = {}; for (const [f, b] of skin) { const a = await window.diary.writeAsset(f, b); window.__skin[f.replace('.png', '')] = a.url; }
    window.__looks = {}; for (const [f, b] of looks) { const a = await window.diary.writeAsset(f, b); window.__looks[f.match(/look-(\w+)\./)[1]] = { url: a.url, name: f }; }
    if (base) { const a = await window.diary.writeAsset('ren-base.png', base); window.__base = { url: a.url, name: 'ren-base.png' }; }
    const old = Date.now() - 600000;
    // 앱이 스스로 보내는 비서 말·대화 기록이 검사 도중 끼어들지 않게 고정
    let la = D.state.lastAssistant, ch = D.state.chat; window.__allow = false;
    Object.defineProperty(D.state, 'lastAssistant', { get: () => la, set: (v) => { if (window.__allow) la = v; }, configurable: true });
    Object.defineProperty(D.state, 'chat', { get: () => ch, set: (v) => { if (window.__allow) ch = v; }, configurable: true });
    window.__set = (k, v) => { window.__allow = true; D.state[k] = v; window.__allow = false; };
    window.__say = (text, mood) => { window.__set('lastAssistant', { text, mood, at: old }); D.renderAll(); D.bubble.update(); };
    D.state.stats = { [D.state.today]: { 지식: 140, 배짱: 30, 손재주: 70, 친절: 5, 매력: 260 } }; D.state.settings.statsStart = '2000-01-01';
    window.__set('chat', [{ role: 'assistant', name: '렌', text: '가', at: old - 90000000 }, { role: 'user', text: '나', at: old - 100000 }, { role: 'assistant', name: '렌', text: '다\n라', at: old }]);
  }, { skin: rd('skin'), looks: rd('renmodes'), base });
  const snaps = {};
  const settle = () => win.evaluate(() => document.getAnimations().forEach((a) => { try { const t = a.effect.getComputedTiming(); if (t.iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish(); } catch (e) {} }));
  const snap = async (name) => {
    await win.waitForTimeout(700); await settle(); await win.waitForTimeout(150);
    snaps[name] = await win.evaluate(() => {
      const res = {};
      const key = (el) => { const p = []; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const i = [...e.parentElement.children].indexOf(e); p.unshift(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}:${i}`); } return p.join('>'); };
      const dump = (cs) => { const o = {}; for (let i = 0; i < cs.length; i++) { const k = cs[i]; o[k] = cs.getPropertyValue(k); } return o; };
      for (const el of document.querySelectorAll('body, body *')) {
        if (el.closest('svg') && el.tagName !== 'svg' && !el.getAttribute('class')) continue;
        const k = key(el);
        res[k] = dump(getComputedStyle(el));
        for (const ps of ['::before', '::after']) { const cs = getComputedStyle(el, ps); if (cs.content && cs.content !== 'none' && cs.content !== 'normal') res[k + ps] = dump(cs); }
      }
      return res;
    });
  };
  const E = (fn, arg) => win.evaluate(fn, arg);
  await E(() => window.__say('짧은 말.')); await snap('main-noskin');
  await E(() => { D.state.hasKeys.anthropic = true; if (window.__base) D.state.theme.assistant.faces.base = window.__base; window.__say('오늘 체크리스트 5개 중 2개 남았어. 스마일샤크 gws부터 잡자. 내일 마감이라 오후 첫 일로 하는 게 맞아.'); }); await snap('main-char-noskin');
  await E(() => { D.state.theme.layout.skin = window.__skin; window.__say('짧은 말.'); }); await snap('main-skin');
  await E(() => window.__say('1시야, 점심은 먹었지? 제임스 구글 계정 권한 요청은 끝났고, 이제 아까 말한 대로 스마일샤크 gws부터 잡자. 내일(13일) 마감, D-1이라 오후 첫 일로 하는 게 맞아. 찰리께 문의는 답이 오면 이어서 하자.')); await snap('main-skin-long');
  await E(() => { D.state.theme.assistant.looks = window.__looks; D.state.theme.assistant.look = 'joker'; D.renderAll(); }); await snap('look');
  await E(() => { window.__set('lastAssistant', { thinking: true, at: Date.now() - 600000 }); D.state.theme.assistant.look = 'auto'; D.renderAll(); D.bubble.update(); }); await snap('thinking');
  await E(() => window.__say('짧은 말.'));
  const row = win.locator('#record-list .todo:not(.done)').first(); await row.hover(); await row.locator('.todo-mv').click(); await snap('move-menu');
  await win.mouse.click(700, 14); await win.waitForTimeout(300);
  await row.hover(); await row.locator('.todo-ed').click(); await snap('edit'); await win.keyboard.press('Escape');
  await E(() => document.querySelector('#btn-chatlog').click()); await snap('log'); await win.keyboard.press('Escape');
  await E(() => D.openParams()); await snap('params'); await win.keyboard.press('Escape'); await E(() => document.querySelector('.ps2')?.remove());
  await E(() => D.pointUp([{ stat: '지식', delta: 1, text: '보고서' }], true)); await win.waitForTimeout(2200); await snap('pointup'); await E(() => document.querySelector('.pu')?.remove());
  await E(() => { D.cutscene.play({ force: true }); }); await win.waitForTimeout(3600); await snap('cutscene'); await E(() => document.querySelector('.cut')?.click()); await win.waitForTimeout(1200);
  await E(() => { D.city.isTownHall = () => true; D.cutscene.play({ force: true }); }); await win.waitForTimeout(3600); await snap('cutscene-hall'); await E(() => document.querySelector('.cut')?.click()); await win.waitForTimeout(1200);
  await win.click('#btn-hidechar'); await snap('hide'); await win.click('#btn-hidechar'); await win.waitForTimeout(500);
  await win.click('#btn-settings'); await snap('settings-connect');
  for (const t of ['꾸미기', '비서']) { await E((t) => [...document.querySelectorAll('#settings button')].find((b) => b.textContent.trim() === t)?.click(), t); await snap('settings-' + t); }
  await E(() => document.querySelector('#settings .icon-btn:last-child, #settings button[title*="닫"]')?.click()); await win.keyboard.press('Escape'); await win.waitForTimeout(400);
  await E(() => { document.body.classList.remove('settings-open'); D.state.selected = D.state.today.slice(0, 8) + '24'; D.renderAll(); }); await snap('other-day');
  await E(() => { D.goToday(); for (const el of document.querySelectorAll('#record-list .todo:not(.done)')) el.click(); }); await win.waitForTimeout(5200); await E(() => document.querySelectorAll('.pu,.pup').forEach((e) => e.remove())); await snap('all-done');
  await win.setViewportSize({ width: 940, height: 600 }); await snap('small');
  await win.setViewportSize({ width: 1440, height: 860 });
  await E(() => { D.state.theme.layout.mode = 'classic'; D.theme.apply(D.state.theme); D.renderAll(); }); await snap('classic');
  fs.writeFileSync(out, JSON.stringify(snaps));
  console.log('states', Object.keys(snaps).length, 'elements', Object.values(snaps).reduce((n, s) => n + Object.keys(s).length, 0), 'errors', errs);
  await app.evaluate(({ app }) => app.exit(0));
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
