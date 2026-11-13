// 꾸밈 묶음(.diarypack): 스킨·캐릭터 그림·색·배치를 파일 하나로 내보내고 가져오기.
// 새로 설치한 사람이 파일 하나만 넣으면 같은 모습이 되게 하려는 것. 그림은 저장소에 없고 각자 컴퓨터에만 있으므로
// 그림까지 파일 안에 함께 담는다. 개인적인 것(업무 지침, Claude 채팅 주소, 참고 문서)은 담지 않는다.
'use strict';

const FORMAT = 'work-diary-pack';
const PERSONAL = ['instructions', 'claudeUrl', 'docs']; // 비서별 개인 설정: 내보내지 않고, 가져올 때는 받는 사람 것을 지킴
const ASSET_RE = /diary-asset:\/\/local\/([\w.-]+)/g;

const strip = (a) => { const o = { ...(a || {}) }; for (const k of PERSONAL) delete o[k]; return o; };
const keep = (from) => Object.fromEntries(PERSONAL.filter((k) => from && from[k] != null).map((k) => [k, from[k]]));

// theme → 묶음. readAsset(id) 는 그림 파일 내용을 base64 로 돌려주는 함수 (없으면 null)
function build(theme, readAsset) {
  const t = JSON.parse(JSON.stringify(theme || {}));
  t.assistant = strip(t.assistant);
  for (const id of Object.keys(t.cast || {})) t.cast[id] = strip(t.cast[id]);
  const assets = {};
  for (const [, id] of JSON.stringify(t).matchAll(ASSET_RE)) {
    if (assets[id] !== undefined) continue;
    const data = readAsset(id);
    if (data) assets[id] = data;
  }
  return { format: FORMAT, version: 1, theme: t, assets };
}

// 묶음 → 새 theme. writeAsset(id, base64) 는 그림을 저장하고 새 주소를 돌려주는 함수.
// 받는 사람의 비서별 개인 설정(지침·채팅 주소·참고 문서)은 그대로 둔다.
function apply(pack, current, writeAsset) {
  if (!pack || pack.format !== FORMAT || !pack.theme) throw new Error('업무다이어리 꾸밈 파일이 아니에요.');
  let json = JSON.stringify(pack.theme);
  for (const [id, data] of Object.entries(pack.assets || {})) json = json.split(`diary-asset://local/${id}`).join(writeAsset(id, data));
  const t = JSON.parse(json), cur = current || {};
  const mine = { ...(cur.cast || {}), [cur.castActive || 'ren']: cur.assistant || {} }; // 지금 내 비서들 (id → 설정)
  t.assistant = { ...strip(t.assistant), ...keep(mine[t.castActive || 'ren']) };
  for (const id of Object.keys(t.cast || {})) t.cast[id] = { ...strip(t.cast[id]), ...keep(mine[id]) };
  return t;
}

module.exports = { FORMAT, build, apply };
