// 지금 탭을 그린다
import { app } from './dom.js';
import { T } from './i18n.js';
import { IC } from './icons.js';
import { ui } from './state.js';
import { viewClinic } from './views/clinic.js';
import { viewInsight } from './views/insight.js';
import { viewToday } from './views/today.js';
import { viewTrend } from './views/trend.js';

const TABS = [
  ['today', viewToday, () => IC.today, () => T('오늘')],
  ['trend', viewTrend, () => IC.chart, () => T('흐름')],
  ['insight', viewInsight, () => IC.spark, () => T('인사이트')],
  ['clinic', viewClinic, () => IC.doc, () => T('진료')],
];

export function render() {
  (TABS.find(([key]) => key === ui.tab) || TABS[0])[1]();
  app.insertAdjacentHTML('beforeend', `<nav class="tabbar">${TABS.map(([key, , icon, name]) =>
    `<button data-act="tab" data-tab="${key}" aria-pressed="${ui.tab === key}">${icon()}<span>${name()}</span></button>`).join('')}</nav>`);
}
