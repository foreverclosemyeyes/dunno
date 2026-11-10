// 로컬 저장소: 앱 데이터 폴더에 JSON 파일로 저장 (앱을 껐다 켜도 유지)
'use strict';
const fs = require('fs');
const path = require('path');

class JsonStore {
  constructor(file, defaults = {}) {
    this.file = file;
    this.data = { ...defaults };
    try {
      this.data = { ...defaults, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch { /* 처음 실행 */ }
    this.timer = null;
  }
  get(key, fallback) {
    return key in this.data ? this.data[key] : fallback;
  }
  set(key, value) {
    this.data[key] = value;
    this.saveSoon();
  }
  saveSoon() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.saveNow(), 300);
  }
  saveNow() {
    clearTimeout(this.timer);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 1));
    fs.renameSync(tmp, this.file);
  }
}

module.exports = { JsonStore };
