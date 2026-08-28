#!/usr/bin/env node
/** Build a mid-game v6 save JSON for Playwright UI audits. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const gameJs = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
const code = gameJs.replace(/\(function init\(\)[\s\S]*$/, '');
const sandbox = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean,
  parseInt, parseFloat, isNaN, Infinity,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: { getElementById: () => ({ textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {} } }), querySelectorAll: () => [], addEventListener() {}, body: {} },
  confirm: () => true, alert: () => {}, prompt: () => null,
  setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0, clearTimeout: () => {},
  performance: { now: () => Date.now() },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(code + '\nthis.__out = defaultState();', sandbox);

const s = sandbox.__out;
s.level = 21;
s.xp = 2400;
s.cash = 15600;
s.gold = 272;
s.heat = 51;
s.wanted = 3;
s.influence = 24;
s.prestigePoints = 0;
s.intel = 0;
s.maxEnergy = 41;
s.energy = 41;
s.maxStamina = 41;
s.stamina = 41;
s.hp = 14;
s.atk = 120;
s.def = 80;
s.statPoints = 25;
s.storyChapter = 8;
s.spec = 'kingpin';
s.counters.jobs = 217;
s.counters.bossKills = 31;
s.counters.arenaBest = 10;
s.arenaTokens = 25;
s.arenaRank = 1;
s.vehicles.beater = 3;
s.vehicles.coupe = 1;
s.vehicleActive = 'beater';
s.army.soldiers = 2;
s.army.runners = 1;
s.climb = { floor: 5, best: 12, enemy: null, auto: false };
s.climbRank = 1;
s.created = Date.now() - 629 * 3600000;

const out = path.join(__dirname, '../tests/fixtures/midgame-save.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(s));
console.log('Wrote', out);
