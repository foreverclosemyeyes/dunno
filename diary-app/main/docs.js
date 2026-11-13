// 비서별 참고 문서 (인수인계 파일 등).
// 글 파일(.md, .txt 등)을 앱 안에 복사해 두고, 그 비서가 답할 때마다 내용을 같이 읽게 한다.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXTENSIONS = ['md', 'markdown', 'txt', 'text', 'csv'];
const MAX_TOTAL = 50_000; // 한 비서가 한 번에 읽는 글자 수. 넘으면 앞에서부터 여기까지만 읽음 (대답이 느려지고 사용량이 커져서)
const MAX_FILE = 2_000_000; // 이보다 큰 파일은 글 파일이 아닐 가능성이 높아 받지 않음 (바이트)

const fileOf = (dir, id) => path.join(dir, path.basename(String(id)) + '.txt');

// 파일 하나를 앱 안으로 복사. 돌려주는 값: { id, name, chars }
function save(dir, filePath) {
  const name = path.basename(filePath);
  const buf = fs.readFileSync(filePath);
  if (buf.length > MAX_FILE) throw new Error(`"${name}"은 너무 커요. 글만 있는 파일(.md, .txt)로 넣어 주세요.`);
  if (buf.includes(0)) throw new Error(`"${name}"은 글 파일이 아니에요. PDF·워드·한글 파일은 내용을 복사해 .txt 로 저장하거나, 노션에서 Markdown 으로 내보낸 파일을 넣어 주세요.`);
  const text = buf.toString('utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
  if (!text) throw new Error(`"${name}"에 내용이 없어요.`);
  fs.mkdirSync(dir, { recursive: true });
  const id = crypto.randomBytes(8).toString('hex');
  fs.writeFileSync(fileOf(dir, id), text);
  return { id, name, chars: text.length };
}

function remove(dir, id) {
  try { fs.unlinkSync(fileOf(dir, id)); } catch { /* 이미 없음 */ }
}

// 비서에게 넘길 글: 문서마다 이름표를 붙여 이어 붙임. 전체가 MAX_TOTAL 을 넘으면 거기서 자름
function text(dir, docs, max = MAX_TOTAL) {
  let left = max;
  const parts = [];
  for (const d of docs || []) {
    if (left <= 0) break;
    let body;
    try { body = fs.readFileSync(fileOf(dir, d.id), 'utf8'); } catch { continue; } // 파일이 지워졌으면 건너뜀
    const cut = body.length > left;
    parts.push(`<문서 이름="${String(d.name).replace(/"/g, "'")}">\n${cut ? body.slice(0, left) + '\n(…뒷부분은 길어서 생략됨)' : body}\n</문서>`);
    left -= Math.min(body.length, left);
  }
  return parts.join('\n\n');
}

module.exports = { EXTENSIONS, MAX_TOTAL, save, remove, text };
