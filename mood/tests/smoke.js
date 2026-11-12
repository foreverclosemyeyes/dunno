// 앱 전체를 아이폰 크기 화면으로 띄워서 주요 흐름이 깨지지 않았는지 확인한다.
// 실행: node mood/tests/smoke.js   (playwright가 설치된 환경에서)
// 고칠 때마다 돌리고, 기능을 더하면 여기에 확인을 한 줄 더한다.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const KEY = 'tide.v1';
const HANGUL = /[가-힣]/;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || detail == null ? '' : ` — ${detail}`}`); };

// 오늘 기준 n일 전 날짜 (앱과 같은 방식: 기기 시각)
const dayAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// 최근 5일은 들뜨고 잠이 준 30일치 연습 기록
function seed() {
  const entries = {};
  for (let i = 1; i < 30; i++) {
    const hot = i < 6, date = dayAgo(i);
    entries[date] = { date, mood: hot ? 8 : (i % 7 < 2 ? 3 : 5), energy: hot ? 9 : i % 5, conf: hot ? 9 : 5, dep: hot ? 0 : (i % 7 < 2 ? 3 : 1), elev: hot ? 3 : 0, anx: 1,
      sleepMin: hot ? 270 : 430 + (i % 4) * 15, tired: !hot && i % 3 === 0, period: i >= 18 && i < 23, appetite: i % 4 === 0 ? 3 : 6, caffeine: i % 4 === 0 ? 8 : 3,
      meds: i % 5 ? [{ name: '브린텔릭스', dose: '10mg' }] : [], note: '', signs: {} };
  }
  return { version: 2, entries, meds: [{ name: '브린텔릭스', dose: '10mg' }], taken: {}, settings: { hintClosed: true } };
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 14'], deviceScaleFactor: 1, colorScheme: 'dark' })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('dialog', (d) => d.accept());
  const store = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  const put = async (data) => { await page.evaluate(([k, d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY, data]); await page.reload(); };
  const text = (sel) => page.textContent(sel);
  const today = dayAgo(0);

  // 1. 처음 열기
  await page.goto(url);
  check('처음 열면 오늘 화면', (await text('h1')) === '오늘');
  check('빈 날에 기록하기 버튼', await page.isVisible('[data-act=record]'));

  // 2. 기록하기
  await page.click('[data-act=record]');
  check('보통 값에서는 체크리스트 숨김', await page.isHidden('#signs'));
  await page.fill('#f-mood', '8');
  check('기분 7 이상이면 체크리스트 표시', await page.isVisible('#signs'));
  check('기분 값에 이름이 붙음', (await text('#n-mood')) === '신남');
  await page.click('[data-sign=racing]');
  await page.click('[data-field=elev] [data-v="3"]');
  await page.fill('#f-bed', '01:20'); await page.fill('#f-wake', '06:45');
  check('수면 시간 자동 계산', (await text('#v-sleep')) === '5시간 25분');
  await page.click('[data-drink=monster][data-d="1"]'); await page.click('[data-drink=coffee][data-d="1"]');
  check('카페인 합계', (await text('#v-caf')).includes('250mg'));
  await page.click('#meds [data-act=addMed]'); await page.fill('#med-name', '알');
  check('약 이름 후보', (await text('#med-sug')).includes('알프람'));
  await page.click('.sug[data-name="알프람"]'); await page.fill('#med-dose', '0.25'); await page.click('[data-act=saveMed]');
  check('용량에 숫자만 적으면 mg가 붙음', (await store()).meds[0].dose === '0.25mg');
  await page.click('#meds [data-act=doseAdd]');
  await page.fill('#f-note', '<b>메모</b>\n둘째 줄');
  await page.click('.savebar [data-act=save]');
  let e = (await store()).entries[today];
  check('기록 저장', e && e.mood === 8 && e.elev === 3 && e.sleepMin === 325 && e.signs.racing === true && e.caffeine === 6 && e.meds[0].name === '알프람', JSON.stringify(e));
  check('약을 체크하면 시각이 찍힘', /^\d\d:\d\d$/.test(e.meds[0].at), JSON.stringify(e.meds));
  check('메모는 여러 줄, 글자 그대로 표시', e.note === '<b>메모</b>\n둘째 줄' && (await page.$$('#app b >> text=메모')).length === 0 && (await text('#app .note')).includes('<b>메모</b>'));
  check('오늘 타일에 이름 표시', (await text('.tile .word')) === '신남');

  // 3. 오늘 화면에서 약 체크: 하루에 여러 번, 시각만 지우기, 기록 지우기
  await page.click('#app [data-act=doseAdd]');
  check('한 번 더 먹은 것 추가', (await store()).entries[today].meds.length === 2);
  await page.click('#app [data-act=doseTime] >> nth=1');
  e = (await store()).entries[today];
  check('시각을 누르면 시각만 지워짐', e.meds.length === 2 && e.meds[1].at === '' && e.meds[0].at !== '', JSON.stringify(e.meds));
  await page.click('#app [data-act=doseDel] >> nth=0');
  e = (await store()).entries[today];
  check('먹은 기록 지우기', e.meds.length === 1 && e.meds[0].at === '', JSON.stringify(e.meds));

  // 4. 수정: 값을 낮추면 체크리스트 내용은 버림
  await page.click('[data-act=record]'); await page.fill('#f-mood', '3'); await page.click('.savebar [data-act=save]');
  e = (await store()).entries[today];
  check('낮춘 뒤 체크리스트 비움', e.mood === 3 && Object.keys(e.signs).length === 0);

  // 4-1. 수면은 안 적을 수 있다
  await page.click('[data-act=record]'); await page.click('[data-flag=sleepOff]');
  check('수면을 끄면 시각 칸이 숨음', await page.isHidden('#f-bed'));
  await page.click('.savebar [data-act=save]');
  e = (await store()).entries[today];
  check('수면 없이 저장', e.bed === null && e.wake === null && e.sleepMin === null, JSON.stringify([e.bed, e.wake, e.sleepMin]));
  await page.click('[data-act=record]');
  check('다시 열면 수면이 꺼진 채', (await page.getAttribute('[data-flag=sleepOff]', 'aria-pressed')) === 'true');
  await page.click('.sheet-top [data-act=close]');

  // 4-2. 기록을 쓰기 전에도 약을 체크할 수 있고, 기록할 때 이어진다
  await put({ version: 2, entries: {}, meds: [{ name: '콘서타', dose: '27mg' }], taken: {}, settings: { hintClosed: true } });
  await page.click('#app [data-act=doseAdd]'); await page.click('#app [data-act=doseAdd]');
  check('기록 전 약 체크는 따로 저장', (await store()).taken[today].length === 2);
  await page.click('[data-act=record]'); await page.click('.savebar [data-act=save]');
  const after = await store();
  check('기록하면 약 체크가 기록으로 옮겨짐', after.entries[today].meds.length === 2 && !after.taken[today]);

  // 4-3. 처음엔 시각이 찍히고, 누를 때마다 시각이 사라졌다 들어왔다 한다
  await put({ version: 2, entries: {}, meds: [{ name: '브린텔릭스', dose: '15mg' }], taken: {}, settings: { hintClosed: true } });
  await page.click('#app [data-act=doseAdd]');
  check('처음 누르면 시각이 찍힘', /^\d\d:\d\d$/.test((await store()).taken[today][0].at));
  await page.click('#app [data-act=doseTime]');
  check('한 번 더 누르면 시각이 사라지고 먹음만 남음', (await store()).taken[today][0].at === '' && (await text('#app .dose')).includes('먹음'));
  await page.click('#app [data-act=doseTime]');
  check('또 누르면 시각이 다시 들어감', /^\d\d:\d\d$/.test((await store()).taken[today][0].at));

  // 5. 쌓인 기록: 신호 · 인사이트 · 흐름
  await put(seed());
  check('오늘 화면에 초기 신호 배너', (await page.$$('.signal')).length >= 1);
  await page.click('[data-tab=insight]');
  const says = await page.$$eval('.li.say', (x) => x.map((el) => el.textContent));
  check('인사이트 문장', says.some((s) => s.includes('에너지가 높았던 날')), says.join(' / '));
  check('약 체크 집계', (await text('#app')).includes('14일 중'));
  await page.click('[data-tab=trend]');
  check('주 그래프', (await page.$$('.plot svg')).length >= 4);
  await page.click('[data-mode=month]');
  check('월 달력', (await page.$$('.cal .cday')).length >= 28);
  await page.click('.cal .cday:not([disabled])');
  check('날짜를 누르면 그날 표시', await page.isVisible('.pickbar'));

  // 5-1. 옆으로 밀어서 날짜 넘기기
  const swipe = (dx) => page.evaluate((d) => {
    const el = document.querySelector('#app'), mk = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(200)], changedTouches: [mk(200)], bubbles: true }));
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(200 + d)], bubbles: true }));
  }, dx);
  const monthBefore = await text('.pnav span');
  await swipe(120);
  check('흐름: 오른쪽으로 밀면 이전 달', (await text('.pnav span')) !== monthBefore);
  await swipe(-120); await swipe(-120);
  check('흐름: 미래로는 안 넘어감', (await text('.pnav span')) === monthBefore);
  await page.click('[data-tab=today]');
  await swipe(120);
  check('오늘: 오른쪽으로 밀면 어제', (await text('h1')) !== '오늘');
  await swipe(-120); await swipe(-120);
  check('오늘: 왼쪽으로 밀면 다시 오늘, 미래로는 안 감', (await text('h1')) === '오늘');
  await swipe(30);
  check('조금만 밀면 안 넘어감', (await text('h1')) === '오늘');

  // 6. 설정: 언어 · 화면 모드 · 색 · 글씨 크기
  await page.click('[data-tab=today]');
  await page.click('[data-act=settings]'); await page.click('[data-lang=en]'); await page.waitForLoadState('load'); await page.waitForSelector('h1');
  check('영어로 전환', (await text('h1')) === 'Today');
  const left = (await page.evaluate(() => document.querySelector('#app').innerText)).split('\n').filter((s) => HANGUL.test(s) &&!s.includes('브린텔릭스'));
  check('영어 화면에 한글이 남지 않음', left.length === 0, left.join(' | '));
  await page.click('[data-act=settings]'); await page.click('[data-lang=ko]'); await page.waitForLoadState('load'); await page.waitForSelector('h1');
  await page.click('[data-act=settings]'); await page.click('[data-theme-pick=light]');
  check('라이트 모드', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');
  await page.click('[data-font=batang]');
  await page.waitForFunction(() => document.fonts.check('16px "Gowun Batang"', '가1'));
  check('글씨체를 고르면 본문과 큰 숫자에 적용', await page.evaluate(() => getComputedStyle(document.body).fontFamily.includes('Gowun Batang')
    && getComputedStyle(document.documentElement).getPropertyValue('--round').includes('Gowun Batang')));
  await page.click('[data-font=system]');
  await page.click('[data-color-pick=off]'); await page.click('[data-size=xl]'); await page.click('[data-act=close]');
  check('아주 큰 글씨에서도 옆으로 안 넘침', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));

  // 6-1. 홈 화면 앱 배치: 화면 높이 기준으로 놓아도 탭바와 저장 버튼이 정확히 바닥에 붙는다
  const edges = await page.evaluate(async () => {
    const root = document.documentElement;
    root.classList.add('standalone');
    root.style.setProperty('--screen-h', `${innerHeight}px`);
    const tab = document.querySelector('.tabbar').getBoundingClientRect().bottom;
    document.querySelector('[data-act=record]').click();
    await new Promise((r) => setTimeout(r, 450));
    const saveBar = document.querySelector('.savebar').getBoundingClientRect().bottom;
    document.querySelector('.sheet-top [data-act=close]').click();
    await new Promise((r) => setTimeout(r, 300));
    // 내용이 긴 화면에서도 페이지는 안 움직이고 #app 안에서만 스크롤된다
    const app = document.querySelector('#app');
    app.scrollTop = 200;
    const inner = [app.scrollHeight > app.clientHeight, document.documentElement.scrollHeight <= innerHeight, Math.round(document.querySelector('.tabbar').getBoundingClientRect().bottom)];
    app.scrollTop = 0;
    root.classList.remove('standalone');
    return [Math.round(tab), Math.round(saveBar), innerHeight, ...inner];
  });
  check('홈 화면 앱: 탭바·저장 줄이 화면 바닥에 맞음', edges[0] === edges[2] && edges[1] === edges[2], edges.join(', '));
  check('홈 화면 앱: 내용만 스크롤되고 탭바는 그대로', edges[3] && edges[4] && edges[5] === edges[2], edges.join(', '));

  // 7. 백업 내보내기 → 지우기 → 불러오기
  await page.click('[data-act=settings]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=export]')]);
  const backup = fs.readFileSync(await dl.path());
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.setInputFiles('#importFile', { name: 'backup.json', mimeType: 'application/json', buffer: backup });
  await page.waitForFunction((k) => localStorage.getItem(k) && Object.keys(JSON.parse(localStorage.getItem(k)).entries).length > 20, KEY);
  check('백업 불러오기', Object.keys((await store()).entries).length === 29);

  // 8. 예전(3단계) 기록 옮기기
  await put({ version: 1, entries: { [today]: { date: today, mood: 5, energy: 5, dep: 0, elev: 0, anx: 0, appetite: 2, caffeine: 1, meds: [], signs: {} } }, meds: [], settings: {} });
  await page.click('[data-act=record]'); await page.click('.savebar [data-act=save]');
  const moved = await store();
  check('예전 기록 변환', moved.version === 2 && moved.entries[today].appetite === 8 && moved.entries[today].caffeine === 4, JSON.stringify(moved.entries[today]));

  check('화면 오류 없음', errors.length === 0, errors.join(' | '));
  await browser.close();
  server.close();
  console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
