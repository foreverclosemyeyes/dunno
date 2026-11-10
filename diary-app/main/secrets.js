// API 키 저장: 운영체제 보안 저장소(Mac 키체인 / Windows DPAPI)로 암호화해서 파일에 보관
'use strict';
const fs = require('fs');
const { safeStorage } = require('electron');

class Secrets {
  constructor(file) {
    this.file = file;
    try { this.data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { this.data = {}; }
  }
  has(name) { return !!this.data[name]; }
  get(name) {
    const v = this.data[name];
    if (!v) return '';
    try {
      const buf = Buffer.from(v.value, 'base64');
      return v.encrypted ? safeStorage.decryptString(buf) : buf.toString('utf8');
    } catch { return ''; }
  }
  set(name, value) {
    if (!value) { delete this.data[name]; }
    else {
      const enc = safeStorage.isEncryptionAvailable();
      const buf = enc ? safeStorage.encryptString(value) : Buffer.from(value, 'utf8');
      this.data[name] = { encrypted: enc, value: buf.toString('base64') };
    }
    fs.writeFileSync(this.file, JSON.stringify(this.data), { mode: 0o600 });
  }
}
module.exports = { Secrets };
