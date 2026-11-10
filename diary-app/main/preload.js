// 화면(렌더러)에 안전하게 노출하는 기능 목록. API 키 값은 절대 화면으로 넘기지 않음.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const fn = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld('diary', {
  init: () => ipcRenderer.invoke('init'),
  setSettings: (p) => ipcRenderer.invoke('settings:set', p),
  setNotionCfg: (p) => ipcRenderer.invoke('notionCfg:set', p),
  setSecret: (name, value) => ipcRenderer.invoke('secret:set', name, value),
  testNotion: () => ipcRenderer.invoke('notion:test'),
  sync: (force) => ipcRenderer.invoke('sync', force),
  setView: (v) => ipcRenderer.invoke('view', v),
  askAssistant: () => ipcRenderer.invoke('assistant:ask'),
  saveTheme: (t) => ipcRenderer.invoke('theme:save', t),
  saveThemes: (l) => ipcRenderer.invoke('themes:save', l),
  saveStats: (s) => ipcRenderer.invoke('stats:save', s),
  open: (url) => ipcRenderer.invoke('open', url),
  pickAsset: (kind) => ipcRenderer.invoke('asset:pick', kind),
  readAsset: (id) => ipcRenderer.invoke('asset:read', id),
  writeAsset: (name, b64) => ipcRenderer.invoke('asset:write', name, b64),
  exportTheme: (json, name) => ipcRenderer.invoke('theme:export', json, name),
  importTheme: () => ipcRenderer.invoke('theme:import'),
  systemFonts: () => ipcRenderer.invoke('fonts:system'),
  onData: on('data'),
  onDayChanged: on('day-changed'),
  onAssistant: on('assistant'),
  onSettings: on('settings'),
});
