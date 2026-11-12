// 지금 탭을 그린다
import { app } from './dom.js';
import { T } from './i18n.js';
import { IC } from './icons.js';
import { ui } from './state.js';
import { viewInsight } from './views/insight.js';
import { viewToday } from './views/today.js';
import { viewTrend } from './views/trend.js';

export function render() {
  ({ trend: viewTrend, insight: viewInsight }[ui.tab] || viewToday)();
  app.insertAdjacentHTML('beforeend', `<nav class="tabbar">
    <button data-act="tab" data-tab="today" aria-pressed="${ui.tab === 'today'}">${IC.today}<span>${T('오늘')}</span></button>
    <button data-act="tab" data-tab="trend" aria-pressed="${ui.tab === 'trend'}">${IC.chart}<span>${T('흐름')}</span></button>
    <button data-act="tab" data-tab="insight" aria-pressed="${ui.tab === 'insight'}">${IC.spark}<span>${T('인사이트')}</span></button></nav>`);
}
