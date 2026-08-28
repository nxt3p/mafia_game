#!/usr/bin/env node
/** Headless UI smoke: nav groups, switchTab, renderers — no browser required. */
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const required = ['nav-categories', 'nav-subtabs', 'nav-bottom', 'nav-more-sheet', 'log-fab', 'header-toggle', 'toast'];
for (const id of required) {
  if (!html.includes(`id="${id}"`)) {
    console.error('Missing element:', id);
    process.exit(1);
  }
}

const gameJs = fs.readFileSync('game.js', 'utf8');
const code = gameJs.replace(/\(function init\(\)[\s\S]*$/, '');
const dom = {};
function el(id) {
  if (!dom[id]) dom[id] = { textContent: '', innerHTML: '', style: {}, classList: { _s: new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)}, toggle(c,v){v===false||!this._s.has(c)?this._s.delete(c):this._s.add(c)} }, hidden: false, setAttribute() {}, offsetHeight: 120 };
  return dom[id];
}
const sandbox = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean,
  parseInt, parseFloat, isNaN, Infinity, document: {
    getElementById: id => el(id),
    querySelectorAll: sel => {
      const out = [];
      if (sel.includes('.nav-cat')) for (let i = 0; i < 5; i++) out.push({ dataset: { cat: ['hq','streets','ops','combat','empire'][i] }, classList: el('x').classList });
      if (sel.includes('.nav-sub')) out.push({ dataset: { tab: 'dashboard' }, classList: el('x').classList });
      if (sel.includes('.nav-bottom-btn')) for (let i = 0; i < 5; i++) out.push({ dataset: { cat: i === 4 ? 'more' : ['hq','streets','combat','empire'][i] }, classList: el('x').classList });
      if (sel.includes('.more-tab-btn')) out.push({ dataset: { tab: 'dashboard' }, classList: el('x').classList });
      if (sel.includes('[data-en]') || sel.includes('[data-st]') || sel.includes('[data-cash]') || sel.includes('[data-gold]')) return [];
      return out;
    },
    body: { classList: { _s: new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)}, toggle(c,v){v?this._s.add(c):this._s.delete(c)}, contains(c){return this._s.has(c)} } },
    documentElement: { style: { setProperty() {} } },
    addEventListener() {},
  },
  localStorage: (() => { const s = {}; return { getItem: k => s[k] ?? null, setItem: (k,v) => { s[k] = String(v); }, removeItem: k => { delete s[k]; } }; })(),
  window: { matchMedia: () => ({ matches: false }), scrollTo() {}, addEventListener() {} },
  confirm: () => true, alert: () => {}, prompt: () => null,
  setInterval: () => 0, clearInterval: () => {}, setTimeout: (fn) => { fn(); return 0; }, clearTimeout: () => {},
  performance: { now: () => Date.now() }, location: { reload() {} },
};
sandbox.window = sandbox;
global.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(`var window = globalThis;`, sandbox);
vm.runInContext(code + `
  state = defaultState();
  state.level = 21;
  activeTab = 'dashboard';
  initNav();
  const tabs = Object.keys({ dashboard:1, quests:1, heists:1, properties:1, crew:1, army:1, crafting:1, prestige:1, arena:1, climb:1, bosses:1, hideout:1, shop:1, character:1 });
  for (const t of tabs) { switchTab(t); if (!content.innerHTML.includes('card')) throw new Error('no card for ' + t); }
  switchCategory('combat');
  if (activeTab !== 'arena' && activeTab !== 'bosses' && activeTab !== 'climb') throw new Error('switchCategory failed');
  toggleHeaderCompact(true);
  if (!document.body.classList.contains('header-compact')) throw new Error('header compact');
  globalThis.__ok = true;
`, sandbox);

if (!sandbox.__ok) { console.error('UI smoke failed'); process.exit(1); }
console.log('UI smoke passed: all 14 tabs render, nav groups OK');
