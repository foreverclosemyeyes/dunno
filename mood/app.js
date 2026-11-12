(() => {
  'use strict';

  // ---------- 고정 값 ----------
  const KEY = 'harugyeol.v1';
  const LEVELS = ['없음', '약간', '보통', '높음', '매우 높음'];
  const APPETITE = ['낮음', '보통', '높음'];
  const CAFFEINE = ['없음', '조금', '많음'];
  const SYMPTOMS = [['dep', '우울'], ['elev', '고조 (들뜸)'], ['anx', '불안']];
  const SIGNS = [
    ['confidence', '자신감이 부풀어 오름'],
    ['lessSleep', '적게 자도 안 피곤함'],
    ['talkative', '말이 많아짐'],
    ['racing', '생각이 빠르게 튐'],
    ['distract', '주의가 쉽게 흩어짐'],
    ['projects', '새로운 일·프로젝트에 몰두'],
    ['impulsive', '충동적인 지출이나 결정'],
  ];
  const SIGN_THRESHOLD = 7;
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const DISCLAIMER = '이 앱은 진단 도구가 아니에요. 내 상태를 기록해 두는 참고용이에요.';

  // ---------- 저장소 (이 기기 안에만 저장) ----------
  const blank = () => ({ version: 1, entries: {}, meds: [], settings: {} });
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === 'object' && raw.entries) return Object.assign(blank(), raw);
    } catch (e) { /* 처음 실행이거나 읽기 실패 */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { toast('저장하지 못했어요. 저장 공간을 확인해 주세요.'); return false; }
  }
  let db = load();

  // ---------- 날짜·시간 도우미 ----------
  const pad = (n) => String(n).padStart(2, '0');
  const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ds(d); };
  const today = () => ds(new Date());
  const weekStart = (s) => { const d = parse(s); return addDays(s, -((d.getDay() + 6) % 7)); }; // 월요일 시작
  const longDate = (s) => { const d = parse(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`; };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  function sleepMinutes(bed, wake) {
    if (!bed || !wake) return null;
    const diff = (toMin(wake) - toMin(bed) + 1440) % 1440;
    return diff || null;
  }
  const durText = (min) => (min == null ? '–' : `${Math.floor(min / 60)}시간${min % 60 ? ` ${min % 60}분` : ''}`);
  const ampm = (t) => {
    if (!t) return '–';
    const [h, m] = t.split(':').map(Number);
    return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(m)}`;
  };

  // 기분 색: 낮으면 파랑, 가운데는 회색, 높으면 주황
  function moodColor(v) {
    const lo = [79, 132, 224], mid = [150, 160, 178], hi = [240, 146, 74];
    const t = Math.abs(v - 5) / 5, to = v < 5 ? lo : hi;
    return `rgb(${mid.map((c, i) => Math.round(c + (to[i] - c) * t)).join(',')})`;
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = $('#app'), sheet = $('#sheet');

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- 화면 상태 ----------
  const ui = { selected: today(), draft: null, addingMed: false };
  const standalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

  // ---------- 오늘 화면 ----------
  function renderToday() {
    const t = today();
    const sel = ui.selected;
    const ws = weekStart(sel);
    const e = db.entries[sel];

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i), en = db.entries[d], dt = parse(d);
      const cls = ['day', d === t ? 'today' : '', d === sel ? 'sel' : ''].join(' ');
      const dot = en
        ? `<span class="dot on" style="background:${moodColor(en.mood)}">${en.mood}</span>`
        : '<span class="dot"></span>';
      return `<button class="${cls}" data-act="pick" data-date="${d}" ${d > t ? 'disabled' : ''}
        aria-label="${longDate(d)}${en ? `, 기분 ${en.mood}` : ', 기록 없음'}">
        <span>${WD[dt.getDay()]}</span><span class="num">${dt.getDate()}</span>${dot}</button>`;
    }).join('');

    const wsD = parse(ws), weD = parse(addDays(ws, 6));
    const weekLabel = `${wsD.getMonth() + 1}월 ${wsD.getDate()}일 – ${weD.getMonth() + 1}월 ${weD.getDate()}일`;
    const hint = (!standalone() && !db.settings.hintClosed)
      ? `<div class="card hint"><div><b>홈 화면에 추가해서 쓰세요.</b><br>사파리 아래쪽 공유 버튼(네모에 화살표) → “홈 화면에 추가”를 누르면 앱처럼 열려요.</div>
         <button class="x" data-act="closeHint" aria-label="닫기">✕</button></div>` : '';

    app.innerHTML = `
      <header class="top">
        <div><h1>${sel === t ? '오늘' : '지난 기록'}</h1><div class="sub">${longDate(sel)}</div></div>
        <button class="icon-btn" data-act="settings" aria-label="설정과 백업">⚙︎</button>
      </header>
      ${hint}
      <section class="card week">
        <div class="week-head">
          <button data-act="week" data-step="-1" aria-label="이전 주">‹</button>
          <span>${weekLabel}</span>
          <button data-act="week" data-step="1" aria-label="다음 주" ${addDays(ws, 7) > t ? 'disabled' : ''}>›</button>
        </div>
        <div class="days">${days}</div>
      </section>
      <section class="card">${e ? summary(e) : emptyCard(sel === t)}</section>
      ${sel !== t ? '<button class="btn ghost" data-act="goToday">오늘로 돌아가기</button>' : ''}
      <p class="foot">${DISCLAIMER}</p>`;
  }

  function emptyCard(isToday) {
    return `<div class="empty"><div class="e1">${isToday ? '오늘 기록이 아직 없어요' : '이 날은 기록이 없어요'}</div>
      <div>10초면 끝나요.</div></div>
      <button class="btn" data-act="record">기록하기</button>`;
  }

  function summary(e) {
    const lv = (v) => `<span class="lv l${v}">${LEVELS[v]}</span>`;
    const row = (k, v) => `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
    const sleepBig = e.sleepMin == null ? '–' : `${Math.floor(e.sleepMin / 60)}:${pad(e.sleepMin % 60)}`;
    const signs = SIGNS.filter(([k]) => e.signs && e.signs[k]).map(([, label]) => label);
    const meds = (e.meds || []).map((x) => esc(x.name) + (x.dose ? ` ${esc(x.dose)}` : '')).join(', ');
    return `
      <div class="big-row">
        <div class="big"><div class="n" style="color:${moodColor(e.mood)}">${e.mood}</div><div class="l">기분</div></div>
        <div class="big"><div class="n">${e.energy}</div><div class="l">에너지</div></div>
        <div class="big"><div class="n">${sleepBig}</div><div class="l">수면 (시간:분)</div></div>
      </div>
      <div class="rows">
        ${row('우울 · 고조 · 불안', `${lv(e.dep)} ${lv(e.elev)} ${lv(e.anx)}`)}
        ${e.bed && e.wake ? row('잠든 시각 → 깬 시각', `${ampm(e.bed)} → ${ampm(e.wake)}`) : ''}
        ${e.tired != null ? row('일어났을 때', e.tired ? '피곤했어요' : '피곤하지 않았어요') : ''}
        ${e.appetite != null ? row('식욕', APPETITE[e.appetite]) : ''}
        ${e.caffeine != null ? row('카페인', CAFFEINE[e.caffeine]) : ''}
        ${row('약', meds || '복용 기록 없음')}
        ${signs.length ? row('체크한 항목', signs.map(esc).join('<br>')) : ''}
        ${e.note ? row('메모', esc(e.note)) : ''}
      </div>
      <button class="btn ghost" data-act="record">수정하기</button>`;
  }

  // ---------- 기록 화면 ----------
  function newDraft(date) {
    const old = db.entries[date];
    if (old) return JSON.parse(JSON.stringify(Object.assign({ signs: {}, meds: [] }, old)));
    // 잠든·깬 시각은 가장 최근 기록을 기본값으로 (대부분 비슷하니까 덜 만져도 되게)
    const last = Object.keys(db.entries).sort().reverse().map((k) => db.entries[k]).find((x) => x.bed && x.wake);
    return {
      date, mood: 5, energy: 5, dep: 0, elev: 0, anx: 0,
      bed: last ? last.bed : '23:30', wake: last ? last.wake : '07:00',
      tired: null, appetite: 1, caffeine: null, meds: [], note: '', signs: {},
    };
  }

  const medKey = (m) => `${m.name}|${m.dose || ''}`;
  const seg = (field, labels, value, cls) => `<div class="seg ${cls || ''}" data-field="${field}">${
    labels.map((l, i) => `<button type="button" data-v="${i}" aria-pressed="${value === i}">${l}</button>`).join('')}</div>`;

  function medsHtml() {
    const d = ui.draft;
    const taken = new Set(d.meds.map(medKey));
    const all = db.meds.concat(d.meds.filter((m) => !db.meds.some((s) => medKey(s) === medKey(m))));
    const chips = all.map((m) => `<button type="button" class="chip" data-med="${esc(medKey(m))}" aria-pressed="${taken.has(medKey(m))}">${
      esc(m.name)}${m.dose ? `<small>${esc(m.dose)}</small>` : ''}</button>`).join('');
    const add = ui.addingMed
      ? `<div class="med-new">
           <input type="text" id="med-name" placeholder="약 이름" autocomplete="off" maxlength="30">
           <input type="text" id="med-dose" placeholder="용량 (예: 300mg)" autocomplete="off" maxlength="20">
           <button type="button" class="btn ghost" data-act="saveMed">이 약 저장하고 선택</button>
         </div>` : '';
    return `<div class="chips">${chips}<button type="button" class="chip add" data-act="addMed">+ 약 추가</button></div>
      ${all.length ? '' : '<p class="set-p" style="margin-top:8px">자주 먹는 약을 한 번 추가해 두면 다음부터는 탭 한 번이면 돼요.</p>'}${add}`;
  }

  function signsHtml() {
    const d = ui.draft;
    return SIGNS.map(([k, label]) => `<button type="button" class="tog" data-sign="${k}" aria-pressed="${!!d.signs[k]}">
      <span>${label}</span><i></i></button>`).join('');
  }

  function openRecord(date) {
    ui.draft = newDraft(date);
    ui.addingMed = false;
    const d = ui.draft, isEdit = !!db.entries[date];
    sheet.innerHTML = `<div class="sheet-in">
      <div class="sheet-top">
        <div><h2>${isEdit ? '기록 수정' : '기록하기'}</h2><div class="sub">${longDate(date)}</div></div>
        <button class="icon-btn" data-act="close" aria-label="닫기">✕</button>
      </div>

      <div class="card field">
        <div class="lab"><b>기분</b><span class="slider-val" id="v-mood">${d.mood}</span></div>
        <input type="range" id="f-mood" min="0" max="10" step="1" value="${d.mood}" aria-label="기분 0에서 10">
        <div class="ticks"><span>가라앉음</span><span>보통</span><span>들뜸</span></div>
      </div>
      <div class="card field">
        <div class="lab"><b>에너지</b><span class="slider-val" id="v-energy">${d.energy}</span></div>
        <input type="range" id="f-energy" min="0" max="10" step="1" value="${d.energy}" aria-label="에너지 0에서 10">
        <div class="ticks"><span>바닥</span><span>보통</span><span>넘침</span></div>
      </div>

      <div class="card field signs" id="signs" hidden>
        <div class="lab"><b>오늘 이런 점이 있었나요?</b><span>해당하는 것만</span></div>
        ${signsHtml()}
      </div>

      <div class="card field">
        ${SYMPTOMS.map(([k, label]) => `<div class="sub-field"><div class="sub-lab">${label}</div>${seg(k, LEVELS, d[k])}</div>`).join('')}
      </div>

      <div class="card field">
        <div class="lab"><b>지난밤 수면</b><span id="v-sleep"></span></div>
        <div class="times">
          <label>잠든 시각<input type="time" id="f-bed" value="${esc(d.bed || '')}"></label>
          <label>깬 시각<input type="time" id="f-wake" value="${esc(d.wake || '')}"></label>
        </div>
        <div class="sub-field"><div class="sub-lab">일어났을 때 피곤했나요?</div>${seg('tired', ['아니오', '예'], d.tired == null ? null : +d.tired, 'seg3')}</div>
      </div>

      <div class="card field">
        <div class="sub-field"><div class="sub-lab">식욕</div>${seg('appetite', APPETITE, d.appetite, 'seg3')}</div>
        <div class="sub-field"><div class="sub-lab">카페인</div>${seg('caffeine', CAFFEINE, d.caffeine, 'seg3')}</div>
      </div>

      <div class="card field">
        <div class="lab"><b>오늘 먹은 약</b><span>탭해서 선택</span></div>
        <div id="meds">${medsHtml()}</div>
      </div>

      <div class="card field">
        <div class="lab"><b>메모</b><span>선택</span></div>
        <input type="text" id="f-note" maxlength="120" placeholder="한 줄로 남기기" value="${esc(d.note || '')}" autocomplete="off" style="margin-top:0">
      </div>

      ${isEdit ? '<button class="btn danger" data-act="deleteEntry">이 날 기록 삭제</button>' : ''}
      <div class="savebar"><button class="btn" data-act="save">저장</button></div>
    </div>`;
    showSheet();
    syncForm();
  }

  // 슬라이더 값에 따라 숫자·체크리스트·수면 시간을 바로 갱신
  function syncForm() {
    const d = ui.draft;
    if (!d) return;
    $('#v-mood').textContent = d.mood;
    $('#v-mood').style.color = moodColor(d.mood);
    $('#v-energy').textContent = d.energy;
    $('#signs').hidden = !(d.mood >= SIGN_THRESHOLD || d.energy >= SIGN_THRESHOLD);
    const min = sleepMinutes(d.bed, d.wake);
    $('#v-sleep').textContent = min == null ? '시각을 넣으면 자동 계산' : `${durText(min)} 잤어요`;
  }

  function saveEntry() {
    const d = ui.draft;
    const showSigns = d.mood >= SIGN_THRESHOLD || d.energy >= SIGN_THRESHOLD;
    const signs = {};
    if (showSigns) SIGNS.forEach(([k]) => { if (d.signs[k]) signs[k] = true; });
    db.entries[d.date] = {
      date: d.date, mood: d.mood, energy: d.energy, dep: d.dep, elev: d.elev, anx: d.anx,
      bed: d.bed || null, wake: d.wake || null, sleepMin: sleepMinutes(d.bed, d.wake),
      tired: d.tired, appetite: d.appetite, caffeine: d.caffeine,
      meds: d.meds, note: (d.note || '').trim(), signs, updatedAt: new Date().toISOString(),
    };
    if (!save()) return;
    closeSheet();
    renderToday();
    toast('저장했어요');
  }

  // ---------- 설정·백업 ----------
  function openSettings() {
    const n = Object.keys(db.entries).length;
    const meds = db.meds.length
      ? db.meds.map((m) => `<div class="med-row"><span>${esc(m.name)} ${esc(m.dose || '')}</span>
          <button data-act="delMed" data-med="${esc(medKey(m))}">삭제</button></div>`).join('')
      : '<p class="set-p">저장된 약이 없어요. 기록 화면에서 “+ 약 추가”로 넣을 수 있어요.</p>';
    sheet.innerHTML = `<div class="sheet-in">
      <div class="sheet-top"><div><h2>설정과 백업</h2><div class="sub">기록 ${n}일</div></div>
        <button class="icon-btn" data-act="close" aria-label="닫기">✕</button></div>

      <div class="set-title">백업</div>
      <div class="card">
        <p class="set-p">기록은 이 아이폰 안에만 저장돼요. 폰을 바꾸거나 앱을 지우면 사라지니, 가끔 백업 파일을 만들어 “파일” 앱이나 iCloud에 넣어 두세요.</p>
        <button class="btn ghost" data-act="export">백업 파일 내보내기</button>
        <button class="btn ghost" data-act="import">백업 파일 불러오기</button>
      </div>

      <div class="set-title">자주 먹는 약</div>
      <div class="card">${meds}</div>

      <div class="set-title">홈 화면에 추가하는 방법</div>
      <div class="card"><ol class="steps">
        <li>사파리에서 이 페이지를 엽니다.</li>
        <li>아래쪽 공유 버튼(네모에 위쪽 화살표)을 누릅니다.</li>
        <li>“홈 화면에 추가”를 누릅니다.</li>
      </ol></div>

      <div class="set-title">안내</div>
      <div class="card"><p class="set-p">${DISCLAIMER} 걱정되는 변화가 있으면 진료 때 이 기록을 보여 주며 이야기해 보세요.</p></div>
    </div>`;
    showSheet();
  }

  async function exportData() {
    const name = `harugyeol-backup-${today()}.json`;
    const text = JSON.stringify(Object.assign({ app: 'harugyeol', exportedAt: new Date().toISOString() }, db), null, 2);
    try {
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });   // 아이폰: 공유 창에서 “파일에 저장”
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;     // 사용자가 공유 창을 닫음
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('백업 파일을 만들었어요');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let inc;
      try { inc = JSON.parse(reader.result); } catch (e) { inc = null; }
      const ok = inc && typeof inc.entries === 'object' && inc.entries &&
        Object.values(inc.entries).every((e) => e && typeof e.mood === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''));
      if (!ok) { toast('이 앱의 백업 파일이 아니에요'); return; }
      const n = Object.keys(inc.entries).length;
      if (!confirm(`백업 파일에 ${n}일치 기록이 있어요.\n지금 기록과 합칠까요? (같은 날짜는 더 최근에 수정한 쪽을 남겨요)`)) return;
      Object.values(inc.entries).forEach((e) => {
        const cur = db.entries[e.date];
        if (!cur || (e.updatedAt || '') >= (cur.updatedAt || '')) db.entries[e.date] = e;
      });
      (Array.isArray(inc.meds) ? inc.meds : []).forEach((m) => {
        if (m && m.name && !db.meds.some((s) => medKey(s) === medKey(m))) db.meds.push({ name: String(m.name), dose: String(m.dose || '') });
      });
      if (!save()) return;
      renderToday();
      openSettings();
      toast(`${n}일치 기록을 불러왔어요`);
    };
    reader.readAsText(file);
  }

  // ---------- 시트 열고 닫기 ----------
  function showSheet() { sheet.hidden = false; sheet.scrollTop = 0; document.body.classList.add('locked'); }
  function closeSheet() { sheet.hidden = true; sheet.innerHTML = ''; ui.draft = null; document.body.classList.remove('locked'); }

  // ---------- 이벤트 ----------
  const actions = {
    pick: (el) => { ui.selected = el.dataset.date; renderToday(); },
    week: (el) => {
      const next = addDays(ui.selected, 7 * Number(el.dataset.step));
      ui.selected = next > today() ? today() : next;
      renderToday();
    },
    goToday: () => { ui.selected = today(); renderToday(); },
    closeHint: () => { db.settings.hintClosed = true; save(); renderToday(); },
    record: () => openRecord(ui.selected),
    settings: openSettings,
    close: closeSheet,
    save: saveEntry,
    deleteEntry: () => {
      if (!confirm('이 날 기록을 삭제할까요?')) return;
      delete db.entries[ui.draft.date];
      save(); closeSheet(); renderToday(); toast('삭제했어요');
    },
    addMed: () => { ui.addingMed = !ui.addingMed; $('#meds').innerHTML = medsHtml(); if (ui.addingMed) $('#med-name').focus(); },
    saveMed: () => {
      const name = $('#med-name').value.trim(), dose = $('#med-dose').value.trim();
      if (!name) { toast('약 이름을 적어 주세요'); return; }
      const m = { name, dose };
      if (!db.meds.some((s) => medKey(s) === medKey(m))) { db.meds.push(m); save(); }
      if (!ui.draft.meds.some((s) => medKey(s) === medKey(m))) ui.draft.meds.push(m);
      ui.addingMed = false;
      $('#meds').innerHTML = medsHtml();
    },
    delMed: (el) => {
      db.meds = db.meds.filter((m) => medKey(m) !== el.dataset.med);
      save(); openSettings();
    },
    export: exportData,
    import: () => $('#importFile').click(),
  };

  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('button');
    if (!t) return;
    if (t.dataset.act) { actions[t.dataset.act](t); return; }
    const d = ui.draft;
    if (!d) return;
    const segEl = t.closest('.seg');
    if (segEl) {                                   // 단계 버튼
      const f = segEl.dataset.field, v = Number(t.dataset.v);
      const required = f === 'dep' || f === 'elev' || f === 'anx';
      const cur = f === 'tired' ? (d.tired == null ? null : +d.tired) : d[f];
      const next = (cur === v && !required) ? null : v;   // 선택 항목은 다시 누르면 해제
      d[f] = f === 'tired' ? (next == null ? null : !!next) : next;
      segEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === next)));
    } else if (t.dataset.sign) {                   // 조건부 체크리스트
      d.signs[t.dataset.sign] = !d.signs[t.dataset.sign];
      t.setAttribute('aria-pressed', String(!!d.signs[t.dataset.sign]));
    } else if (t.dataset.med) {                    // 약 선택
      const k = t.dataset.med, i = d.meds.findIndex((m) => medKey(m) === k);
      if (i >= 0) d.meds.splice(i, 1);
      else { const m = db.meds.find((s) => medKey(s) === k); if (m) d.meds.push({ name: m.name, dose: m.dose }); }
      t.setAttribute('aria-pressed', String(i < 0));
    }
  });

  sheet.addEventListener('input', (ev) => {
    const d = ui.draft, el = ev.target;
    if (!d) return;
    if (el.id === 'f-mood') d.mood = Number(el.value);
    else if (el.id === 'f-energy') d.energy = Number(el.value);
    else if (el.id === 'f-bed') d.bed = el.value;
    else if (el.id === 'f-wake') d.wake = el.value;
    else if (el.id === 'f-note') d.note = el.value;
    else return;
    syncForm();
  });

  $('#importFile').addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (f) importData(f);
  });

  // 자정을 넘긴 뒤 앱으로 돌아오면 '오늘'을 새로 계산
  let lastDay = today();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || today() === lastDay) return;
    if (ui.selected === lastDay) ui.selected = today();
    lastDay = today();
    if (sheet.hidden) renderToday();
  });

  // ---------- 시작 ----------
  renderToday();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
