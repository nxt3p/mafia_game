'use strict';
/* =====================================================================
   MOB EMPIRE — single-file, single-player, infinite-progression RPG
   ===================================================================== */

const now = () => Date.now();
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const g = L => Math.pow(1.22, L - 1);

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n) {
  n = Math.floor(n);
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return String(n);
  let tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIXES.length) return n.toExponential(2).replace('+', '');
  const scaled = n / Math.pow(10, tier * 3);
  return (scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)) + SUFFIXES[tier];
}
function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m >= 60) return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  return m + ':' + String(s).padStart(2, '0');
}
function roman(n) {
  const R = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return n < R.length ? R[n] : 'x' + n;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function utcDay() { return Math.floor(Date.now() / 86400000); }
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- static data
const RARITIES = [
  { id: 'common',    name: 'Common',    mult: 1.0, w: 58 },
  { id: 'uncommon',  name: 'Uncommon',  mult: 1.4, w: 26 },
  { id: 'rare',      name: 'Rare',      mult: 2.0, w: 11 },
  { id: 'epic',      name: 'Epic',      mult: 3.0, w: 4  },
  { id: 'legendary', name: 'Legendary', mult: 4.5, w: 1  },
  { id: 'mythic',    name: 'Mythic',    mult: 6.5, w: 0  },
];
const RAR_IDX = Object.fromEntries(RARITIES.map((r, i) => [r.id, i]));
const RAR_PREFIX = { common: '', uncommon: 'Polished ', rare: 'Custom ', epic: "Enforcer's ", legendary: "Godfather's ", mythic: 'Mythic ' };

const SLOTS = ['weapon', 'armor', 'accessory'];
const SLOT_LABEL = { weapon: 'Weapon', armor: 'Armor', accessory: 'Accessory' };
const ITEM_BASES = {
  weapon:    ['Switchblade', 'Brass Knuckles', 'Snub Pistol', 'Sawn-Off Shotgun', 'Tommy Gun', 'Silenced SMG', 'Sniper Rifle', 'Grenade Launcher'],
  armor:     ['Leather Jacket', 'Padded Vest', 'Kevlar Vest', 'Riot Armor', 'Tactical Plate', 'Armored Trenchcoat', 'Titanium Weave Suit'],
  accessory: ['Lucky Coin', 'Gold Chain', 'Signet Ring', 'Pocket Watch', 'Cufflinks', 'Diamond Pinky Ring', 'Family Medallion'],
};

const TURF_NAMES = ['Little Italy', 'Downtown', 'The Docks', 'Red Light District', 'Chinatown', 'Uptown', 'The Airport', 'Casino Strip'];
const JOB_NAMES = [
  ['Run Errands for the Don', 'Collect Protection Money', 'Rough Up a Snitch', 'Hijack a Delivery Truck', 'Torch a Rival Storefront'],
  ['Pickpocket Commuters', 'Fence Stolen Goods', 'Rig the Numbers Game', 'Shake Down a Pawn Shop', 'Rob the Armored Car'],
  ['Smuggle Contraband Crates', 'Bribe the Harbormaster', 'Sink a Rival Shipment', 'Raid the Customs House', 'Steal a Cargo Freighter'],
  ['Run the Door at the Club', 'Blackmail a Councilman', 'Bust Up an Unlicensed Den', 'Take Over the Strip', 'Silence the Reporter'],
  ['Deliver Mysterious Packages', 'Win Big at Pai Gow', 'Broker a Triad Truce', 'Heist the Jade Exhibit', 'Ambush the Dragon Head'],
  ['Valet Scam at the Opera', 'Forge Blue-Chip Bonds', 'Infiltrate the Country Club', 'Blackmail the Senator', 'Empty the Penthouse Vault'],
  ['Swipe Unattended Luggage', 'Bribe a Baggage Handler', 'Ground a Rival Charter', 'Hijack the Cargo Jet', 'Own the Control Tower'],
  ['Count Cards at Blackjack', 'Skim the Slot Machines', 'Loan-Shark the High Rollers', 'Rig the Roulette Wheel', 'Take the House Itself'],
];
const PROPERTIES = [
  { id: 'corner',    name: 'Corner Store',    desc: 'A humble front for laundering small bills.' },
  { id: 'chopshop',  name: 'Chop Shop',       desc: 'Stolen cars in, clean parts and cash out.' },
  { id: 'warehouse', name: 'Warehouse',       desc: 'Storage for goods that fell off a truck.' },
  { id: 'nightclub', name: 'Nightclub',       desc: 'Velvet ropes, watered drinks, fat margins.' },
  { id: 'casino',    name: 'Underground Casino', desc: 'The house always wins. You are the house.' },
  { id: 'hotel',     name: 'Grand Hotel',     desc: 'Five stars up front, favors in the back.' },
  { id: 'bank',      name: 'Offshore Bank',   desc: 'Where dirty money goes to get a passport.' },
  { id: 'island',    name: 'Private Island',  desc: 'Sovereign soil. Your own little empire.' },
];
const BOSS_NAMES = [
  'Vinnie "The Blade" Moretti', 'Don Falcone', 'Madame Wu', 'The Butcher of Fifth Street',
  'Commissioner Kane', 'El Serpiente', 'The Chairman', 'The Phantom',
];
const BOSS_FLAVOR = [
  'A knife artist who collects debts and ears.',
  'The old don who runs Little Italy with an iron fist.',
  'Chinatown\'s spymaster. She already knows you\'re coming.',
  'He owns the meat district. The meat is not always beef.',
  'The most crooked cop money ever bought.',
  'Cartel liaison. Venomous in negotiation and otherwise.',
  'Untouchable financier of the entire underworld.',
  'Nobody has seen his face. Few survive the meeting.',
];

const MATS = { scrap: 'Scrap Metal', ball: 'Ballistics', alloy: 'Rare Alloys', shard: 'Mythic Shards' };
const SALVAGE_YIELD = {
  common:    { scrap: 2,  ball: 0,  alloy: 0, shard: 0 },
  uncommon:  { scrap: 4,  ball: 1,  alloy: 0, shard: 0 },
  rare:      { scrap: 8,  ball: 3,  alloy: 0, shard: 0 },
  epic:      { scrap: 15, ball: 8,  alloy: 2, shard: 0 },
  legendary: { scrap: 30, ball: 15, alloy: 6, shard: 0 },
  mythic:    { scrap: 50, ball: 25, alloy: 12, shard: 2 },
};
const RECIPES = [
  { id: 'rare',      name: 'Back-Alley Job',       rarity: 'rare',      cost: { scrap: 25,  ball: 8,   alloy: 0,  shard: 0 } },
  { id: 'epic',      name: 'Military Contract',    rarity: 'epic',      cost: { scrap: 60,  ball: 25,  alloy: 6,  shard: 0 } },
  { id: 'legendary', name: 'Syndicate Masterwork', rarity: 'legendary', cost: { scrap: 150, ball: 70,  alloy: 25, shard: 0 } },
  { id: 'mythic',    name: 'Blood Oath Relic',     rarity: 'mythic',    cost: { scrap: 200, ball: 100, alloy: 40, shard: 5 } },
];

const PRESTIGE_SHOP = [
  { id: 'iron',    name: 'Iron Will',         desc: '+2% Attack permanently',           key: 'iron' },
  { id: 'stone',   name: 'Stone Wall',        desc: '+2% Defense permanently',          key: 'stone' },
  { id: 'lungs',   name: 'Deep Lungs',        desc: '+1 max Energy & Stamina on runs',  key: 'lungs' },
  { id: 'golden',  name: 'Golden Touch',      desc: '+2% cash from all sources',        key: 'golden' },
  { id: 'scholar', name: 'Scholar of Crime',  desc: '+2% XP permanently',              key: 'scholar' },
  { id: 'heat',    name: 'Heat Laundry',      desc: '+5% Heat decay',                  key: 'heat' },
  { id: 'vault',   name: 'Family Vault',      desc: '+5 stash capacity',               key: 'vault' },
  { id: 'chest',   name: 'War Chest',         desc: '+1 Gold Bond on each prestige',   key: 'chest' },
  { id: 'crate',   name: 'Mythic Crate',      desc: 'Guaranteed Mythic item (one-shot buy)', key: 'crate', oneShot: true, cost: 25 },
];
const ARMY_UNITS = [
  { id: 'soldiers',  name: 'Street Soldiers', desc: '+ATK per level',              hire: 400,  atk: 2, def: 0, hp: 0, energy: 0, stamina: 0, atkPct: 0, crit: 0 },
  { id: 'enforcers', name: 'Enforcer Squad',  desc: '+ATK and small +DEF',         hire: 900,  atk: 3, def: 1, hp: 0, energy: 0, stamina: 0, atkPct: 0, crit: 0 },
  { id: 'guards',    name: 'Bodyguards',      desc: '+DEF and max HP',             hire: 1100, atk: 0, def: 3, hp: 15, energy: 0, stamina: 0, atkPct: 0, crit: 0 },
  { id: 'drivers',   name: 'Drivers',         desc: '+Max Energy',                 hire: 800,  atk: 0, def: 0, hp: 0, energy: 1, stamina: 0, atkPct: 0, crit: 0 },
  { id: 'runners',   name: 'Runners',         desc: '+Max Stamina',                hire: 800,  atk: 0, def: 0, hp: 0, energy: 0, stamina: 1, atkPct: 0, crit: 0 },
  { id: 'hitters',   name: 'Hit Team',        desc: '+ATK% and crit chance',       hire: 2500, atk: 1, def: 0, hp: 0, energy: 0, stamina: 0, atkPct: 0.01, crit: 0.005 },
];
const SYNDICATE_NAMES = ['The Commission', 'Cartel Azul', 'Five Families Pact', 'Eastern Syndicate', 'Night Parliament'];

const CLIMB_NAMES = ['Gutter Rats', 'Chop-Shop Crew', 'Dockside Boys', 'Numbers Gang', 'Vice Ring', 'Loan Sharks', 'Cartel Outpost', 'Syndicate Cell', 'Kingpin\'s Guard', 'Phantom Cabal'];
const CLIMB_AFFIXES = [
  { id: 'armored',  name: 'Armored',      desc: 'High defense',                 def: 1.8 },
  { id: 'brutal',   name: 'Brutal',       desc: 'Hits much harder',             atk: 1.7 },
  { id: 'regen',    name: 'Regenerating', desc: 'Heals each round',             regen: 0.06 },
  { id: 'evasive',  name: 'Evasive',      desc: 'Chance to dodge your strike',  dodge: 0.22 },
  { id: 'vampiric', name: 'Vampiric',     desc: 'Heals from the damage it deals', vamp: 0.5 },
  { id: 'mademan',  name: 'Made Man',     desc: 'Drops extra loot',             loot: 1.6 },
];
const CONSUMABLES = [
  { id: 'adrenaline', name: 'Adrenaline Shot', icon: '💉', desc: '+25% combat damage for 12 strikes', dur: 12, cash: 500, mats: { ball: 3 } },
  { id: 'bodyarmor',  name: 'Body Armor',      icon: '🦺', desc: 'Big defense boost for 12 strikes',  dur: 12, cash: 500, mats: { scrap: 8 } },
  { id: 'focus',      name: 'Focus',           icon: '🎯', desc: '+15% crit for 12 strikes',          dur: 12, cash: 650, mats: { alloy: 2 } },
  { id: 'painkillers',name: 'Painkillers',     icon: '💊', desc: 'Instantly heal 55% HP',             instant: 'heal', cash: 400, mats: { scrap: 4 } },
  { id: 'smoke',      name: 'Smoke Bomb',      icon: '💨', desc: 'Reset current Climb enemy, no HP loss', instant: 'smoke', cash: 300, mats: { ball: 1 } },
];
const CONSUMABLE_IDX = Object.fromEntries(CONSUMABLES.map(c => [c.id, c]));
const GEAR_MODS = [
  { stat: 'atk',  label: '+ATK',   kind: 'flat' },
  { stat: 'def',  label: '+DEF',   kind: 'flat' },
  { stat: 'crit', label: '+Crit%', kind: 'crit' },
  { stat: 'cash', label: '+Cash%', kind: 'cash' },
];


const MASTERY_THRESHOLDS = [10, 50, 150, 500, 1500];
const STASH_CAP_BASE = 80;
const TURF_DEFEND_MS = 45 * 60 * 1000;
const HEAT_DECAY_PER_MIN = 0.4;
const PRESTIGE_LEVEL = 40;

const CREW_ROLES = [
  { id: 'enforcer',   name: 'Enforcer',   desc: '+% Attack in boss & raid fights.',      hire: 800 },
  { id: 'accountant', name: 'Accountant', desc: '+% property income.',                   hire: 1200 },
  { id: 'fixer',      name: 'Fixer',      desc: '+Energy & Stamina regeneration.',       hire: 1000 },
  { id: 'smuggler',   name: 'Smuggler',   desc: '+% job drop chance & rare finds.',      hire: 1500 },
];

const SPECS = {
  enforcer: { name: 'Enforcer', desc: '+15% ATK, +5% crit, −10% job cash' },
  operator: { name: 'Operator', desc: '+15% job XP & drops, −10% boss damage dealt' },
  kingpin:  { name: 'Kingpin',  desc: '+20% property income & shop discount, −10% combat stats' },
  shadow:   { name: 'Shadow',   desc: '−Heat gain, cheaper bribes, +10% rare find' },
};


const VEHICLES = [
  { id: 'beater',  name: 'Beater Sedan',   desc: 'Rust, fumes, and a full tank of hope.',        hire: 500 },
  { id: 'coupe',   name: 'Street Coupe',   desc: 'Fast enough to outrun a beat cop.',            hire: 2500 },
  { id: 'van',     name: 'Panel Van',      desc: 'Room for the crew and the take.',              hire: 8000 },
  { id: 'muscle',  name: 'Muscle Car',     desc: 'Loud, proud, and hard to catch.',              hire: 25000 },
  { id: 'suv',     name: 'Armored SUV',    desc: 'Bulletproof glass and diplomatic plates.',     hire: 90000 },
];
const HEIST_DEFS = [
  { id: 'pawn',    name: 'Pawn Shop Smash',      flavor: 'Smash, grab, vanish.' },
  { id: 'armored', name: 'Armored Car Hit',      flavor: 'Timing is everything.' },
  { id: 'museum',  name: 'Museum Night Job',     flavor: 'Art that fell off a wall.' },
  { id: 'casino',  name: 'Casino Vault Crack',   flavor: 'The house does not always win.' },
  { id: 'docks',   name: 'Dockside Container',   flavor: 'Whatever is inside pays.' },
  { id: 'pent',    name: 'Penthouse Safe Crack', flavor: 'High rise, higher stakes.' },
];
const HEIST_STAGES = [
  { name: 'Case the Joint', resource: 'energy',  baseCost: 5 },
  { name: 'The Hit',        resource: 'stamina', baseCost: 4 },
  { name: 'Getaway',       resource: 'energy',  baseCost: 6 },
];
const GEAR_SETS = {
  street:   { name: 'Street',   color: '#9aa4b2', bonus2: { jobXp: 0.08 }, bonus3: { jobCash: 0.08 } },
  enforcer: { name: 'Enforcer', color: '#f97316', bonus2: { atk: 0.08 }, bonus3: { crit: 0.04 } },
  shadow:   { name: 'Shadow',   color: '#c084fc', bonus2: { heat: -0.15 }, bonus3: { drop: 0.1 } },
  kingpin:  { name: 'Kingpin',  color: '#e3b341', bonus2: { income: 0.1 }, bonus3: { shop: 0.05 } },
};
const SET_IDS = Object.keys(GEAR_SETS);
const STORY_CHAPTERS = [
  { title: 'Making Bones', desc: 'Complete 15 jobs to prove you belong.', type: 'jobs', need: 15, gold: 2 },
  { title: 'First Blood', desc: 'Defeat any boss once.', type: 'bossKills', need: 1, gold: 2 },
  { title: 'Wheels Up', desc: 'Own any vehicle.', type: 'vehicle', need: 1, gold: 2 },
  { title: 'Big Score', desc: 'Complete 1 heist.', type: 'heists', need: 1, gold: 3 },
  { title: 'Heat Management', desc: 'Survive a police raid.', type: 'raidsWon', need: 1, gold: 3 },
  { title: 'Landlord', desc: 'Own 2 properties.', type: 'props', need: 2, gold: 3 },
  { title: 'Family Business', desc: 'Hire any crew member.', type: 'crew', need: 1, gold: 4 },
  { title: 'Don\'s Blessing', desc: 'Reach level 25.', type: 'level', need: 25, gold: 5 },
];
const RACKET_TYPES = [
  { id: 'protect', name: 'Protection Run', resource: 'stamina', cost: 3 },
  { id: 'skim',    name: 'Skim the Till',  resource: 'energy',  cost: 4 },
  { id: 'fence',   name: 'Fence Shipment', resource: 'either',  cost: 4 },
];


const HIDEOUT_ROOMS = [
  { id: 'armory',   name: 'Armory',   desc: '+5 stash capacity per level (max +40).',     scrap: 10, ball: 0, alloy: 0, base: 600 },
  { id: 'laundry',  name: 'Laundry',  desc: 'Faster Heat decay.',                         scrap: 8,  ball: 2, alloy: 0, base: 900 },
  { id: 'gym',      name: 'Gym',      desc: '+Energy & Stamina regen (stacks with Fixer).', scrap: 12, ball: 4, alloy: 0, base: 1100 },
  { id: 'warroom',  name: 'War Room', desc: '+Arena attack & streak rewards.',            scrap: 15, ball: 6, alloy: 1, base: 1500 },
];
const TALENT_TREE = {
  violence: [
    { id: 'v1', name: 'Iron Jaw', desc: '+4% ATK', cost: 1 },
    { id: 'v2', name: 'Killer Eye', desc: '+3% crit', cost: 1 },
    { id: 'v3', name: 'Pit Fighter', desc: '+8% Arena ATK', cost: 1 },
    { id: 'v4', name: 'Executioner', desc: '+6% boss damage', cost: 2 },
  ],
  business: [
    { id: 'b1', name: 'Ledger', desc: '+4% income', cost: 1 },
    { id: 'b2', name: 'Racket Tip', desc: '+50% racket spawn', cost: 1 },
    { id: 'b3', name: 'Street Tax', desc: '+5% job cash', cost: 1 },
    { id: 'b4', name: 'Syndicate', desc: '+8% shop discount', cost: 2 },
  ],
  ghost: [
    { id: 'g1', name: 'Soap', desc: '+25% Heat decay', cost: 1 },
    { id: 'g2', name: 'Quiet Exit', desc: '+6% heist success', cost: 1 },
    { id: 'g3', name: 'Ghost Run', desc: '+15% smuggle speed', cost: 1 },
    { id: 'g4', name: 'Phantom', desc: '−20% raid chance', cost: 2 },
  ],
};
const ARENA_NAMES = ['Kid Brass', 'One-Eye Malone', 'The Hook', 'Sister Switch', 'Iron Mike Rossi', 'Ghost Chin', 'Dockyard Dan', 'Lady Knuckles'];
const COLLECTIONS = [
  { id: 'italy',  name: 'Little Italy Relics', tokens: 5, bonus: { jobCash: 0.02 } },
  { id: 'docks',  name: 'Dock Manifests',      tokens: 5, bonus: { drop: 0.02 } },
  { id: 'casino', name: 'Casino Chips',        tokens: 5, bonus: { income: 0.02 } },
  { id: 'uptown', name: 'Uptown Cufflinks',    tokens: 5, bonus: { atk: 0.02 } },
  { id: 'airport',name: 'Airport Tags',        tokens: 5, bonus: { jobXp: 0.02 } },
  { id: 'redlight',name: 'Red Light Tokens',   tokens: 5, bonus: { heat: -0.05 } },
];
const HIT_NAMES = ['Tommy Two-Tone', 'Silvio the Rat', 'Agent Park', 'Big Nora', 'The Accountant', 'Cousin Rico', 'Madame Fang', 'Officer Blake'];
const INFLUENCE_CONTACTS = [
  { id: 'capo',  name: 'Neighborhood Capo', cost: 2000, needStory: 0 },
  { id: 'cop',   name: 'Crooked Cop',       cost: 8000, needStory: 2 },
  { id: 'judge', name: 'Friendly Judge',    cost: 25000, needStory: 4 },
  { id: 'dock',  name: 'Dock Boss',         cost: 60000, needStory: 6 },
];
const INFLUENCE_BUFFS = [
  { id: 'xp',      name: 'Job XP Boost',     cost: 8,  mins: 15, effect: 'jobXp' },
  { id: 'shop',    name: 'Black Market Deal', cost: 10, mins: 20, effect: 'shop' },
  { id: 'raid',    name: 'Look the Other Way', cost: 12, mins: 20, effect: 'raid' },
  { id: 'smuggle', name: 'Open Corridor',    cost: 10, mins: 25, effect: 'smuggle' },
];
const SMUGGLE_ROUTES = [
  { id: 'coast',  name: 'Coast Run',   energy: 8,  mins: 3,  cashMult: 1.0 },
  { id: 'border', name: 'Border Hop',  energy: 12, mins: 5,  cashMult: 1.4 },
  { id: 'uptown', name: 'Uptown Drop', energy: 10, mins: 4,  cashMult: 1.2 },
  { id: 'island', name: 'Island Hop',  energy: 18, mins: 8,  cashMult: 2.0 },
];

const ACHIEVEMENTS = [
  { id: 'first_job',  icon: '🕶️', name: 'Made Your Bones',   desc: 'Complete your first job',            gold: 1,  cond: s => s.counters.jobs >= 1 },
  { id: 'jobs_100',   icon: '💼', name: 'Career Criminal',    desc: 'Complete 100 jobs',                  gold: 3,  cond: s => s.counters.jobs >= 100 },
  { id: 'jobs_1000',  icon: '🏛️', name: 'Institution',        desc: 'Complete 1,000 jobs',                gold: 10, cond: s => s.counters.jobs >= 1000 },
  { id: 'first_prop', icon: '🏠', name: 'Landlord',           desc: 'Buy your first property',            gold: 1,  cond: s => Object.keys(s.props).length >= 1 },
  { id: 'prop_10',    icon: '🏙️', name: 'Real Estate Mogul',  desc: 'Upgrade any property to level 10',   gold: 5,  cond: s => Object.values(s.props).some(l => l >= 10) },
  { id: 'rich_10k',   icon: '💵', name: 'First Stack',        desc: 'Hold $10,000 cash',                  gold: 1,  cond: s => s.cash >= 1e4 },
  { id: 'rich_1m',    icon: '💰', name: 'Millionaire',        desc: 'Hold $1,000,000 cash',               gold: 5,  cond: s => s.cash >= 1e6 },
  { id: 'rich_1b',    icon: '🏦', name: 'Billionaire',        desc: 'Hold $1,000,000,000 cash',           gold: 15, cond: s => s.cash >= 1e9 },
  { id: 'lvl_5',      icon: '⭐', name: 'Rising Star',        desc: 'Reach level 5',                      gold: 2,  cond: s => s.level >= 5 },
  { id: 'lvl_15',     icon: '🌟', name: 'Capo',               desc: 'Reach level 15',                     gold: 4,  cond: s => s.level >= 15 },
  { id: 'lvl_30',     icon: '👑', name: 'Underboss',          desc: 'Reach level 30',                     gold: 8,  cond: s => s.level >= 30 },
  { id: 'lvl_50',     icon: '🐐', name: 'The Godfather',      desc: 'Reach level 50',                     gold: 15, cond: s => s.level >= 50 },
  { id: 'boss_first', icon: '⚔️', name: 'Head Hunter',        desc: 'Defeat your first boss',             gold: 2,  cond: s => s.counters.bossKills >= 1 },
  { id: 'boss_25',    icon: '💀', name: 'Reaper',             desc: 'Defeat 25 bosses',                   gold: 8,  cond: s => s.counters.bossKills >= 25 },
  { id: 'craft_1',    icon: '🔧', name: 'Gunsmith',           desc: 'Craft your first item',              gold: 2,  cond: s => s.counters.crafted >= 1 },
  { id: 'legend',     icon: '🏆', name: 'Stuff of Legends',   desc: 'Own a Legendary item',               gold: 5,  cond: s => s.inv.some(i => i.rarity === 'legendary') || SLOTS.some(sl => s.equip[sl] && s.equip[sl].rarity === 'legendary') },
  { id: 'mastery5',   icon: '🌟', name: 'Master Operator',    desc: 'Reach 5★ mastery on any job',        gold: 5,  cond: s => Object.keys(s.mastery || {}).some(k => masteryStars(s.mastery[k] || 0) >= 5) },
  { id: 'raid_1',     icon: '🚨', name: 'Most Wanted',        desc: 'Survive a Police Raid',              gold: 3,  cond: s => (s.counters.raidsWon || 0) >= 1 },
  { id: 'crew_hire',  icon: '👥', name: 'Family First',       desc: 'Hire your first crew member',        gold: 2,  cond: s => Object.values(s.crew || {}).some(l => l > 0) },
  { id: 'turf_1',     icon: '🗺️', name: 'Turf King',          desc: 'Claim your first turf',              gold: 3,  cond: s => Object.values(s.turfControl || {}).some(t => (t.tier || 0) >= 1) },
  { id: 'contract_1', icon: '📋', name: 'Contract Killer',    desc: 'Complete a daily contract',          gold: 2,  cond: s => (s.counters.contracts || 0) >= 1 },
  { id: 'prestige_1', icon: '♻️', name: 'Phoenix Empire',     desc: 'Rebuild the Empire once',            gold: 10, cond: s => (s.prestige || 0) >= 1 },
  { id: 'heist_1',    icon: '💣', name: 'Mastermind',         desc: 'Complete your first heist',           gold: 3,  cond: s => (s.counters.heists || 0) >= 1 },
  { id: 'vehicle_1',  icon: '🚗', name: 'Keys to the City',   desc: 'Buy your first vehicle',              gold: 2,  cond: s => Object.values(s.vehicles || {}).some(l => l > 0) },
  { id: 'jail_1',     icon: '🔓', name: 'Jailbird',           desc: 'Get out of jail (any method)',        gold: 2,  cond: s => (s.counters.jailBreaks || 0) >= 1 },
  { id: 'racket_1',   icon: '📦', name: 'Racket Runner',      desc: 'Clear a property racket',             gold: 2,  cond: s => (s.counters.rackets || 0) >= 1 },
  { id: 'set_1',      icon: '🧩', name: 'Set Collector',      desc: 'Own all 3 pieces of any gear set',    gold: 4,  cond: s => SET_IDS.some(id => setOwnedCount(s, id) >= 3) },
  { id: 'weekly_1',   icon: '📅', name: 'Weekly Capo',        desc: 'Complete a weekly empire goal',       gold: 3,  cond: s => (s.counters.weeklies || 0) >= 1 },
  { id: 'story_done', icon: '📖', name: 'Don\'s Right Hand', desc: 'Finish the Don\'s Favor story',       gold: 10, cond: s => (s.storyChapter || 0) >= 8 },
  { id: 'arena_3',    icon: '🥊', name: 'Pit Champion',       desc: 'Reach a 3-win arena streak',          gold: 3,  cond: s => (s.counters.arenaBest || 0) >= 3 },
  { id: 'hideout_1',  icon: '🏚️', name: 'Home Base',          desc: 'Upgrade any hideout room',            gold: 2,  cond: s => Object.values(s.hideout || {}).some(l => l > 0) },
  { id: 'col_1',      icon: '🧿', name: 'Relic Hunter',       desc: 'Complete any collection',             gold: 4,  cond: s => COLLECTIONS.some(c => (s.collections || {})[c.id] >= c.tokens) },
  { id: 'talent_1',   icon: '🧠', name: 'Capo Mind',          desc: 'Spend a talent point',                gold: 2,  cond: s => Object.keys(s.talents || {}).length >= 1 },
  { id: 'hit_1',      icon: '🎯', name: 'Hired Gun',          desc: 'Complete an assassination hit',       gold: 3,  cond: s => (s.counters.hits || 0) >= 1 },
  { id: 'smuggle_1',  icon: '🚢', name: 'Pipeline Boss',      desc: 'Complete a smuggling run',            gold: 3,  cond: s => (s.counters.smuggles || 0) >= 1 },
  { id: 'inf_1',      icon: '🤝', name: 'Connected',          desc: 'Unlock an Influence contact',         gold: 2,  cond: s => Object.values(s.influenceContacts || {}).some(Boolean) },
  { id: 'pp_spend',   icon: '💠', name: 'Blood Money',        desc: 'Spend Prestige Points in the shop',    gold: 3,  cond: s => (s.counters.ppSpent || 0) >= 1 },
  { id: 'army_10',    icon: '🪖', name: 'Private Army',       desc: 'Reach 10 total army levels',           gold: 4,  cond: s => Object.values(s.army || {}).reduce((a,b)=>a+b,0) >= 10 },
  { id: 'synd_1',     icon: '☠️', name: 'Warlord',            desc: 'Clear a Syndicate War',               gold: 5,  cond: s => (s.counters.syndicate || 0) >= 1 },
  { id: 'mythic_1',   icon: '🩸', name: 'Blood Relic',        desc: 'Own a Mythic item',                   gold: 8,  cond: s => (s.inv||[]).some(i=>i.rarity==='mythic') || ['weapon','armor','accessory'].some(sl => s.equip&&s.equip[sl]&&s.equip[sl].rarity==='mythic') },
  { id: 'climb_10',   icon: '🏙️', name: 'Ground Floor',       desc: 'Reach Floor 10 in The Climb',         gold: 3,  cond: s => (s.climb && s.climb.best || 0) >= 10 },
  { id: 'climb_50',   icon: '🌆', name: 'High Riser',          desc: 'Reach Floor 50 in The Climb',         gold: 6,  cond: s => (s.climb && s.climb.best || 0) >= 50 },
  { id: 'climb_100',  icon: '🏗️', name: 'Skyline Overlord',   desc: 'Reach Floor 100 in The Climb',        gold: 12, cond: s => (s.climb && s.climb.best || 0) >= 100 },
  { id: 'mod_1',      icon: '🔩', name: 'Gunsmith II',         desc: 'Reforge or enchant a weapon',         gold: 3,  cond: s => (s.counters.mods || 0) >= 1 },
  { id: 'contraband', icon: '💊', name: 'Chemically Enhanced', desc: 'Use a Contraband consumable',         gold: 2,  cond: s => (s.counters.consumablesUsed || 0) >= 1 },
];

const EN_REGEN = 1 / 10;
const ST_REGEN = 1 / 30;
const HP_REGEN_PCT = 1 / 240;
const OFFLINE_CAP_MS = 8 * 3600 * 1000;

const SAVE_KEY = 'mob_empire_save_v6';
const SAVE_KEY_V5 = 'mob_empire_save_v5';
const SAVE_KEY_V4 = 'mob_empire_save_v4';
const SAVE_KEY_V3 = 'mob_empire_save_v3';
const SAVE_KEY_V2 = 'mob_empire_save_v2';
const SAVE_KEY_V1 = 'mob_empire_save_v1';
let state = null;
let stashFilter = 'all';

function defaultState() {
  return {
    version: 6,
    level: 1, xp: 0, statPoints: 0,
    atk: 5, def: 5,
    maxEnergy: 30, energy: 30,
    maxStamina: 15, stamina: 15,
    hp: 100,
    cash: 250, gold: 3,
    heat: 0,
    wanted: 0,
    jailUntil: 0,
    inv: [], nextId: 1,
    equip: { weapon: null, armor: null, accessory: null },
    mats: { scrap: 0, ball: 0, alloy: 0, shard: 0 },
    props: {},
    bossKills: {},
    bossHp: {},
    boosters: { xp: 0, cash: 0 },
    ach: [],
    counters: { jobs: 0, bossKills: 0, crafted: 0, salvaged: 0, raidsWon: 0, contracts: 0, bossDmg: 0, propEarned: 0, heists: 0, jailBreaks: 0, rackets: 0, weeklies: 0, turfActions: 0, arenaWins: 0, arenaBest: 0, hits: 0, smuggles: 0, ppSpent: 0, syndicate: 0, climbClears: 0, mods: 0, consumablesUsed: 0 },
    mastery: {},
    crew: { enforcer: 0, accountant: 0, fixer: 0, smuggler: 0 },
    turfControl: {},
    contracts: [],
    contractDay: 0,
    freeContractReroll: true,
    weeklies: [],
    weekId: 0,
    freeWeeklyReroll: true,
    spec: null,
    prestige: 0,
    autoSalvageCommons: false,
    pendingRaid: null,
    vehicles: { beater: 0, coupe: 0, van: 0, muscle: 0, suv: 0 },
    vehicleActive: null,
    heistProgress: {},
    heistCd: {},
    racket: null,
    propBoosts: {},
    storyChapter: 0,
    storyProgress: {},
    hideout: { armory: 0, laundry: 0, gym: 0, warroom: 0 },
    talentPoints: 0,
    talents: {},
    arenaRank: 0,
    arenaStreak: 0,
    arenaTokens: 0,
    collections: {},
    hits: [],
    hitDay: 0,
    influence: 0,
    influenceContacts: { capo: false, cop: false, judge: false, dock: false },
    influenceBuffs: {},
    smuggle: null,
    prestigePoints: 0,
    prestigeUpgrades: {},
    army: { soldiers: 0, enforcers: 0, guards: 0, drivers: 0, runners: 0, hitters: 0 },
    syndicate: null,
    intel: 0,
    climb: { floor: 1, best: 0, enemy: null, auto: false },
    climbRank: 0,
    consumables: { adrenaline: 0, bodyarmor: 0, focus: 0, painkillers: 0, smoke: 0 },
    combatBuffs: {},
    lastTick: now(),
    created: now(),
  };
}

function normalizeState(s) {
  const d = defaultState();
  const mats = Object.assign({ scrap: 0, ball: 0, alloy: 0, shard: 0 }, s.mats || {});
  return Object.assign(d, s, {
    version: 6,
    mats,
    crew: Object.assign({ enforcer: 0, accountant: 0, fixer: 0, smuggler: 0 }, s.crew || {}),
    vehicles: Object.assign({ beater: 0, coupe: 0, van: 0, muscle: 0, suv: 0 }, s.vehicles || {}),
    hideout: Object.assign({ armory: 0, laundry: 0, gym: 0, warroom: 0 }, s.hideout || {}),
    army: Object.assign({ soldiers: 0, enforcers: 0, guards: 0, drivers: 0, runners: 0, hitters: 0 }, s.army || {}),
    prestigeUpgrades: s.prestigeUpgrades || {},
    influenceContacts: Object.assign({ capo: false, cop: false, judge: false, dock: false }, s.influenceContacts || {}),
    counters: Object.assign(d.counters, s.counters || {}),
    mastery: s.mastery || {},
    turfControl: s.turfControl || {},
    heistProgress: s.heistProgress || {},
    heistCd: s.heistCd || {},
    propBoosts: s.propBoosts || {},
    storyProgress: s.storyProgress || {},
    weeklies: s.weeklies || [],
    contracts: s.contracts || [],
    talents: s.talents || {},
    collections: s.collections || {},
    hits: s.hits || [],
    influenceBuffs: s.influenceBuffs || {},
    intel: s.intel || 0,
    climb: Object.assign({ floor: 1, best: 0, enemy: null, auto: false }, s.climb || {}),
    climbRank: s.climbRank || 0,
    consumables: Object.assign({ adrenaline: 0, bodyarmor: 0, focus: 0, painkillers: 0, smoke: 0 }, s.consumables || {}),
    combatBuffs: s.combatBuffs || {},
  });
}
function migrateV1(s) { return normalizeState(Object.assign({}, s, { version: 2 })); }
function migrateV2(s) { return normalizeState(s); }
function migrateV3(s) { return normalizeState(s); }
function migrateV4(s) { return normalizeState(s); }
function migrateV5(s) { return normalizeState(s); }

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}
function load() {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 6) return normalizeState(s);
      if (s && s.version === 5) {
        const m = migrateV5(s);
        localStorage.setItem(SAVE_KEY, JSON.stringify(m));
        return m;
      }
      if (s && s.version === 4) {
        const m = migrateV4(s);
        localStorage.setItem(SAVE_KEY, JSON.stringify(m));
        return m;
      }
      if (s && s.version === 3) {
        const m = migrateV3(s);
        localStorage.setItem(SAVE_KEY, JSON.stringify(m));
        return m;
      }
      if (s && s.version === 2) {
        const m = migrateV2(s);
        localStorage.setItem(SAVE_KEY, JSON.stringify(m));
        return m;
      }
    }
    raw = localStorage.getItem(SAVE_KEY_V5);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && (s.version === 5 || s.version === 6)) {
        const m = normalizeState(s);
        localStorage.setItem(SAVE_KEY, JSON.stringify(m));
        return m;
      }
    }
    raw = localStorage.getItem(SAVE_KEY_V4);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && (s.version === 4 || s.version === 5)) {
        const m = normalizeState(s);
        localStorage.setItem(SAVE_KEY, JSON.stringify(m));
        return m;
      }
    }
    raw = localStorage.getItem(SAVE_KEY_V3);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && (s.version === 3 || s.version === 4)) {
        const m = normalizeState(s);
        localStorage.setItem(SAVE_KEY, JSON.stringify(m));
        return m;
      }
    }
    raw = localStorage.getItem(SAVE_KEY_V2);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && (s.version === 2 || s.version === 3)) {
        const m = normalizeState(s);
        localStorage.setItem(SAVE_KEY, JSON.stringify(m));
        return m;
      }
    }
    raw = localStorage.getItem(SAVE_KEY_V1);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 1) {
        const m = migrateV1(s);
        localStorage.setItem(SAVE_KEY, JSON.stringify(m));
        return m;
      }
    }
    return null;
  } catch (e) { return null; }
}
function hardReset() {
  if (!confirm('Wipe ALL progress and start over? This cannot be undone.')) return;
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(SAVE_KEY_V5);
  localStorage.removeItem(SAVE_KEY_V4);
  localStorage.removeItem(SAVE_KEY_V3);
  localStorage.removeItem(SAVE_KEY_V2);
  localStorage.removeItem(SAVE_KEY_V1);
  location.reload();
}
function exportSave() {
  save();
  prompt('Copy this save code:', btoa(unescape(encodeURIComponent(JSON.stringify(state)))));
}
function importSave() {
  const code = prompt('Paste your save code:');
  if (!code) return;
  try {
    const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!s || ![1, 2, 3, 4, 5, 6].includes(s.version)) throw new Error('bad');
    const migrated = normalizeState(s);
    localStorage.setItem(SAVE_KEY, JSON.stringify(migrated));
    location.reload();
  } catch (e) { alert('Invalid save code.'); }
}

// ---------------------------------------------------------------- multipliers & derived
function prestigeMult() { return Math.pow(1.08, state.prestige || 0); }
function crewLevel(id) { return state.crew[id] || 0; }
function crewAtkBonus() { return 1 + crewLevel('enforcer') * 0.03; }
function crewIncomeBonus() { return 1 + crewLevel('accountant') * 0.04; }
function crewRegenBonus() { return 1 + crewLevel('fixer') * 0.05; }
function crewDropBonus() { return 1 + crewLevel('smuggler') * 0.02; }

function vehicleLevel(id) { return (state.vehicles && state.vehicles[id]) || 0; }
function activeVehicle() {
  if (!state.vehicleActive || !vehicleLevel(state.vehicleActive)) return null;
  return VEHICLES.find(v => v.id === state.vehicleActive) || null;
}
function vehicleTier() {
  const v = activeVehicle();
  if (!v) return 0;
  return VEHICLES.findIndex(x => x.id === v.id) + 1 + Math.min(5, vehicleLevel(v.id) - 1) * 0.2;
}
function vehicleJobCashBonus() { return 1 + vehicleTier() * 0.02; }
function vehicleHeistBonus() { return vehicleTier() * 0.04; }
function vehicleHeatReduce() { return 1 - Math.min(0.35, vehicleTier() * 0.03); }

function equippedSetCounts() {
  const counts = {};
  for (const sl of SLOTS) {
    const it = state.equip[sl];
    if (it && it.setId) counts[it.setId] = (counts[it.setId] || 0) + 1;
  }
  return counts;
}
function setOwnedCount(s, setId) {
  const pieces = new Set();
  for (const it of (s.inv || [])) if (it.setId === setId) pieces.add(it.slot);
  for (const sl of SLOTS) if (s.equip && s.equip[sl] && s.equip[sl].setId === setId) pieces.add(sl);
  return pieces.size;
}
function setBonuses() {
  const counts = equippedSetCounts();
  const out = { atk: 0, jobXp: 0, jobCash: 0, crit: 0, heat: 0, heat: 0, shop: 0, heat: 0 };
  for (const [id, n] of Object.entries(counts)) {
    const gset = GEAR_SETS[id];
    if (!gset) continue;
    if (n >= 2 && gset.bonus2) for (const [k, v] of Object.entries(gset.bonus2)) out[k] = (out[k] || 0) + v;
    if (n >= 3 && gset.bonus3) for (const [k, v] of Object.entries(gset.bonus3)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

function storyWantedTolerance() { return (state.storyChapter || 0) >= 5 ? 1 : 0; }

function hideoutLevel(id) { return (state.hideout && state.hideout[id]) || 0; }

function pUp(key) { return (state.prestigeUpgrades && state.prestigeUpgrades[key]) || 0; }
function prestigeShopAtk() { return Math.pow(1.02, pUp('iron')); }
function prestigeShopDef() { return Math.pow(1.02, pUp('stone')); }
function prestigeShopCash() { return Math.pow(1.02, pUp('golden')); }
function prestigeShopXp() { return Math.pow(1.02, pUp('scholar')); }
function prestigeShopHeat() { return 1 + pUp('heat') * 0.05; }
function prestigeShopVault() { return pUp('vault') * 5; }
function prestigeShopLungs() { return pUp('lungs'); }
function armyLevel(id) { return (state.army && state.army[id]) || 0; }
function armyFlat(stat) {
  let sum = 0;
  for (const u of ARMY_UNITS) sum += armyLevel(u.id) * (u[stat] || 0);
  return sum;
}
function armyAtkPct() {
  let p = 0;
  for (const u of ARMY_UNITS) p += armyLevel(u.id) * (u.atkPct || 0);
  return p;
}
function armyCrit() {
  let p = 0;
  for (const u of ARMY_UNITS) p += armyLevel(u.id) * (u.crit || 0);
  return p;
}
function armyTotalLevels() { return Object.values(state.army || {}).reduce((a, b) => a + b, 0); }

function stashCap() { return STASH_CAP_BASE + Math.min(40, hideoutLevel('armory') * 5) + prestigeShopVault(); }
function laundryHeatMult() {
  let m = 1 + hideoutLevel('laundry') * 0.08;
  if (hasTalent('g1')) m *= 1.25;
  m *= prestigeShopHeat();
  return m;
}
function gymRegenBonus() { return 1 + hideoutLevel('gym') * 0.04; }
function warRoomArenaBonus() { return 1 + hideoutLevel('warroom') * 0.05; }
function hasTalent(id) { return !!(state.talents && state.talents[id]); }
function talentAtk() { return hasTalent('v1') ? 0.04 : 0; }
function talentCrit() { return hasTalent('v2') ? 0.03 : 0; }
function talentArena() { return hasTalent('v3') ? 0.08 : 0; }
function talentBoss() { return hasTalent('v4') ? 0.06 : 0; }
function talentIncome() { return hasTalent('b1') ? 0.04 : 0; }
function talentJobCash() { return hasTalent('b3') ? 0.05 : 0; }
function talentShop() { return hasTalent('b4') ? 0.08 : 0; }
function talentHeist() { return hasTalent('g2') ? 0.06 : 0; }
function talentSmuggleSpeed() { return hasTalent('g3') ? 0.15 : 0; }
function talentRaidReduce() { return hasTalent('g4') ? 0.2 : 0; }
function collectionBonuses() {
  const out = { atk: 0, jobXp: 0, jobCash: 0, drop: 0, income: 0, heat: 0 };
  for (const c of COLLECTIONS) {
    if ((state.collections[c.id] || 0) >= c.tokens) {
      for (const [k, v] of Object.entries(c.bonus)) out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}
function influenceBuffActive(effect) {
  const b = state.influenceBuffs && state.influenceBuffs[effect];
  return b && b > now();
}
function arenaAtkMult() {
  return atkMult() * warRoomArenaBonus() * (1 + talentArena());
}

function atkMult() {
  let m = crewAtkBonus() * prestigeMult() * prestigeShopAtk() * climbRankAtk() * (1 + setBonuses().atk) * (1 + vehicleTier() * 0.01) * (1 + talentAtk()) * (1 + (collectionBonuses().atk || 0)) * (1 + armyAtkPct());
  if (state.spec === 'enforcer') m *= 1.15;
  if (state.spec === 'kingpin') m *= 0.9;
  if (state.spec === 'operator') m *= 0.9;
  return m;
}
function defMult() {
  let m = prestigeShopDef();
  if (state.spec === 'kingpin') m *= 0.9;
  return m;
}
function cashMult(ctx) {
  let m = prestigeMult() * prestigeShopCash() * climbRankCashXp() * (1 + gearModCash());
  if (ctx === 'job') {
    m *= vehicleJobCashBonus();
    m *= (1 + (setBonuses().jobCash || 0) + talentJobCash() + (collectionBonuses().jobCash || 0));
    if (state.spec === 'enforcer') m *= 0.9;
  }
  return m;
}
function xpMult(ctx) {
  let m = prestigeMult() * prestigeShopXp() * climbRankCashXp();
  if (ctx === 'job') {
    m *= (1 + (setBonuses().jobXp || 0) + (collectionBonuses().jobXp || 0));
    if (influenceBuffActive('jobXp')) m *= 1.25;
    if (state.spec === 'operator') m *= 1.15;
  }
  return m;
}
function dropLuck() {
  let m = 1 * crewDropBonus() * (1 + (setBonuses().drop || 0) + (collectionBonuses().drop || 0));
  if (state.heat >= 50) m *= 1.35;
  if (state.spec === 'operator') m *= 1.15;
  if (state.spec === 'shadow') m *= 1.1;
  return m;
}
function incomeMult() {
  let m = crewIncomeBonus() * prestigeMult() * (1 + (setBonuses().income || 0) + talentIncome() + (collectionBonuses().income || 0));
  if (state.spec === 'kingpin') m *= 1.2;
  return m;
}
function shopDiscount() {
  let d = state.spec === 'kingpin' ? 0.9 : 1;
  d *= (1 - (setBonuses().shop || 0) - talentShop());
  if (influenceBuffActive('shop')) d *= 0.9;
  return Math.max(0.7, d);
}
function heatGainMult() {
  let m = state.spec === 'shadow' ? 0.6 : 1;
  m *= (1 + (setBonuses().heat || 0) + (collectionBonuses().heat || 0));
  return Math.max(0.25, m);
}
function critChance() {
  return 0.12 + (state.spec === 'enforcer' ? 0.05 : 0) + (setBonuses().crit || 0) + talentCrit() + armyCrit() + gearModCrit();
}
function bossDmgMult() { let m = state.spec === 'operator' ? 0.9 : 1; m *= (1 + talentBoss()); return m; }

// ---- climb ranks, combat consumables & gear mods ----
function climbRankAtk() { return 1 + (state.climbRank || 0) * 0.01; }
function climbRankCashXp() { return 1 + (state.climbRank || 0) * 0.02; }
function buffActive(k) { return ((state.combatBuffs && state.combatBuffs[k]) || 0) > 0; }
function combatAtkMult() { return buffActive('adrenaline') ? 1.25 : 1; }
function combatCrit() { return buffActive('focus') ? 0.15 : 0; }
function combatDefBonus() { return buffActive('bodyarmor') ? Math.round(state.def * 0.6 + 25 * g(state.level)) : 0; }
function tickCombatBuffs(n = 1) {
  if (!state.combatBuffs) state.combatBuffs = {};
  for (const k of ['adrenaline', 'bodyarmor', 'focus']) {
    if (state.combatBuffs[k] > 0) {
      state.combatBuffs[k] = Math.max(0, state.combatBuffs[k] - n);
      if (state.combatBuffs[k] === 0) delete state.combatBuffs[k];
    }
  }
}
function equippedMods() {
  const out = { atk: 0, def: 0, crit: 0, cash: 0 };
  for (const sl of SLOTS) {
    const it = state.equip[sl];
    if (it && it.mods) for (const m of it.mods) out[m.stat] = (out[m.stat] || 0) + m.val;
  }
  return out;
}
function gearModCrit() { return equippedMods().crit; }
function gearModCash() { return equippedMods().cash; }
function maxModSlots(rarity) { return RAR_IDX[rarity] >= RAR_IDX.epic ? 2 : 1; }

function isJailed() { return (state.jailUntil || 0) > now(); }
function jailBlock(action) {
  if (!isJailed()) return false;
  addLog('🔒 You are in jail — ' + action + ' blocked until release.', 'bad');
  return true;
}
function wantedStarsStr(n) {
  n = clamp(n|0, 0, 5);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
function addWanted(n) {
  state.wanted = clamp((state.wanted || 0) + n, 0, 5);
  const thresh = 3 - storyWantedTolerance();
  if (state.wanted >= thresh && !isJailed()) sendToJail('Wanted level too high');
}
function sendToJail(reason) {
  const mins = 2 + (state.wanted || 0);
  state.jailUntil = now() + mins * 60 * 1000;
  state.pendingRaid = null;
  addLog(`🔒 <b>JAILED!</b> ${reason}. Out in ${mins} min (or bail/break out).`, 'bad');
}
function bailCost() {
  let c = Math.round(120 * g(state.level) * (1 + (state.wanted || 0)));
  if (state.spec === 'kingpin' || state.spec === 'shadow') c = Math.round(c * 0.5);
  return c;
}
function leaveJail(method) {
  state.jailUntil = 0;
  state.wanted = Math.max(0, (state.wanted || 0) - 2);
  state.counters.jailBreaks = (state.counters.jailBreaks || 0) + 1;
  addLog(`🔓 Free again (${method}). Wanted reduced.`, 'good');
}
function payBail() {
  if (!isJailed()) { addLog('You are not in jail.', 'info'); return; }
  const c = bailCost();
  if (state.cash < c) { addLog(`Bail costs $${fmt(c)}.`, 'bad'); return; }
  state.cash -= c;
  leaveJail('bail $' + fmt(c));
  afterAction();
}
function goldBreakout() {
  if (!isJailed()) return;
  if (state.gold < 1) { addLog('Need 1 Gold Bond.', 'bad'); return; }
  state.gold -= 1;
  leaveJail('gold bond');
  afterAction();
}
function fightBreakout() {
  if (!isJailed()) return;
  if (Math.floor(state.stamina) < 5) { addLog('Need 5 stamina to break out.', 'bad'); return; }
  if (state.hp <= 1) { addLog('Too injured.', 'bad'); return; }
  state.stamina -= 5;
  const guardHp = Math.round(200 * g(state.level));
  const dmg = totalAtk() * rnd(0.9, 1.2);
  if (dmg >= guardHp * 0.4 || Math.random() < 0.45 + vehicleHeistBonus()) {
    leaveJail('violent breakout');
  } else {
    state.hp = 1;
    state.jailUntil = now() + 3 * 60 * 1000;
    addLog('🔒 Breakout failed — solitary for 3 more minutes.', 'bad');
  }
  afterAction();
}
function utcWeek() { return Math.floor(Date.now() / (7 * 86400000)); }

function xpNeeded(level) { return Math.round(70 * Math.pow(1.25, level - 1)); }
function equipBonus(stat) {
  return SLOTS.reduce((sum, sl) => sum + (state.equip[sl] ? state.equip[sl][stat] : 0), 0);
}
function totalAtk() { return Math.round((state.atk + equipBonus('atk') + armyFlat('atk') + equippedMods().atk) * atkMult()); }
function totalDef() { return Math.round((state.def + equipBonus('def') + armyFlat('def') + equippedMods().def) * defMult()); }
function maxHp() { return Math.round(100 * g(state.level) + totalDef() * 2 + armyFlat('hp')); }
function armyEnergyBonus() { return armyFlat('energy') + prestigeShopLungs(); }
function armyStaminaBonus() { return armyFlat('stamina') + prestigeShopLungs(); }
function xpBoosted() { return state.boosters.xp > now(); }
function cashBoosted() { return state.boosters.cash > now(); }

function masteryKey(t, j) { return t + ':' + j; }
function masteryStars(count) {
  let stars = 0;
  for (const th of MASTERY_THRESHOLDS) { if (count >= th) stars++; else break; }
  return stars;
}
function masteryBonus(t, j) {
  const stars = masteryStars(state.mastery[masteryKey(t, j)] || 0);
  return {
    stars,
    cash: 1 + stars * 0.04,
    xp: 1 + stars * 0.03,
    drop: stars * 0.01,
  };
}
function starString(stars) {
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

function turfTier(t) {
  const c = state.turfControl[t];
  return c ? (c.tier || 0) : 0;
}
function turfJobBonus(t) {
  return 1 + Math.min(5, turfTier(t)) * 0.05;
}
function turfNeedsDefend(t) {
  const c = state.turfControl[t];
  if (!c || !c.tier) return false;
  return now() - (c.lastDefend || 0) >= TURF_DEFEND_MS;
}

// ---------------------------------------------------------------- log
const logEl = document.getElementById('log');
const logBuf = [];
function addLog(msg, cls = '') {
  logBuf.unshift({ msg, cls, t: new Date() });
  if (logBuf.length > 80) logBuf.pop();
  logEl.innerHTML = logBuf.map(e =>
    `<p class="${e.cls}"><span style="color:#4a5468;font-size:.68rem">${e.t.toLocaleTimeString()}</span> ${e.msg}</p>`
  ).join('');
  if (cls === 'gold' || cls === 'bad') showToast(msg.replace(/<[^>]+>/g, ''), cls);
}

// ---------------------------------------------------------------- rewards
function gainXp(amount, ctx) {
  amount *= xpMult(ctx);
  if (xpBoosted()) amount *= 2;
  amount = Math.round(amount);
  state.xp += amount;
  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level++;
    state.statPoints += 5;
    state.gold += 1;
    if (state.level % 5 === 0) { state.talentPoints = (state.talentPoints || 0) + 1; addLog('🧠 +1 Talent Point!', 'gold'); }
    if (state.level === 12) addLog('🧠 Capo Talent Tree unlocked on the Character tab!', 'gold');
    state.energy = state.maxEnergy;
    state.stamina = state.maxStamina;
    state.hp = maxHp();
    addLog(`⭐ <b>LEVEL UP!</b> You are now level <b>${state.level}</b>. +5 stat points, +1 Gold Bond, resources refilled!`, 'gold');
    if (state.level === 10 && !state.spec) addLog('🎭 Level 10 — choose a <b>Specialization</b> on the Character tab!', 'gold');
    if (state.level === PRESTIGE_LEVEL) addLog('♻️ Level 40 — you can now <b>Rebuild the Empire</b> (prestige)!', 'gold');
  }
  return amount;
}
function gainCash(amount, ctx) {
  amount *= cashMult(ctx);
  if (cashBoosted()) amount *= 2;
  amount = Math.round(amount);
  state.cash += amount;
  return amount;
}

// ---------------------------------------------------------------- items
function rollRarity(minIdx = 0, luckMult = 1) {
  luckMult *= dropLuck();
  const pool = RARITIES.slice(minIdx);
  let total = 0;
  const weights = pool.map((r, i) => {
    const w = r.w * (i + minIdx > 0 ? luckMult : 1);
    total += w; return w;
  });
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function genItem(level, forceRarity = null, forceSlot = null, forceSet = null) {
  const rar = forceRarity ? RARITIES[RAR_IDX[forceRarity]] : rollRarity();
  const slot = forceSlot || SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const budget = 10 * g(level) * rar.mult * rnd(0.9, 1.1);
  const atkShare = slot === 'weapon' ? 0.8 : slot === 'armor' ? 0.2 : 0.5;
  const base = ITEM_BASES[slot][Math.floor(Math.random() * ITEM_BASES[slot].length)];
  let prefix = RAR_PREFIX[rar.id];
  if (state.prestige >= 3 && rar.id !== 'common') prefix = 'Family Seal ' + prefix;
  const setId = forceSet || (Math.random() < 0.55 ? SET_IDS[Math.floor(Math.random() * SET_IDS.length)] : null);
  if (setId) prefix = GEAR_SETS[setId].name + ' ' + prefix;
  return {
    id: state.nextId++,
    name: prefix + base,
    slot, rarity: rar.id, lvl: level, setId,
    atk: Math.max(0, Math.round(budget * atkShare)),
    def: Math.max(0, Math.round(budget * (1 - atkShare))),
  };
}
function modText(it) {
  if (!it.mods || !it.mods.length) return '';
  return ' ' + it.mods.map(m => {
    if (m.stat === 'crit') return `+${(m.val * 100).toFixed(1)}% crit`;
    if (m.stat === 'cash') return `+${(m.val * 100).toFixed(0)}% cash`;
    return `+${fmt(m.val)} ${m.stat.toUpperCase()}`;
  }).join(', ');
}
function itemHtml(it) {
  const mods = it.mods && it.mods.length ? ` <span style="color:var(--purple);font-size:.72rem">[${modText(it).trim()}]</span>` : '';
  return `<span class="rar-${it.rarity}"><b>${esc(it.name)}</b></span> <span style="color:var(--muted);font-size:.75rem">(Lv ${it.lvl} ${SLOT_LABEL[it.slot]}, +${fmt(it.atk)} ATK / +${fmt(it.def)} DEF)</span>${mods}`;
}

function enforceStash() {
  if (state.autoSalvageCommons) {
    const commons = state.inv.filter(i => i.rarity === 'common');
    if (commons.length) {
      const tot = { scrap: 0, ball: 0, alloy: 0 };
      commons.forEach(it => {
        const y = SALVAGE_YIELD.common;
        tot.scrap += y.scrap; tot.ball += y.ball; tot.alloy += y.alloy; tot.shard = (tot.shard||0) + (y.shard||0);
      });
      state.inv = state.inv.filter(i => i.rarity !== 'common');
      state.mats.scrap += tot.scrap; state.mats.ball += tot.ball; state.mats.alloy += tot.alloy; state.mats.shard = (state.mats.shard||0) + (tot.shard||0);
      state.counters.salvaged += commons.length;
    }
  }
  while (state.inv.length > stashCap()) {
    const sorted = [...state.inv].sort((a, b) => RAR_IDX[a.rarity] - RAR_IDX[b.rarity] || a.lvl - b.lvl);
    const victim = sorted[0];
    const idx = state.inv.findIndex(i => i.id === victim.id);
    if (idx < 0) break;
    const it = state.inv.splice(idx, 1)[0];
    const y = SALVAGE_YIELD[it.rarity];
    state.mats.scrap += y.scrap; state.mats.ball += y.ball; state.mats.alloy += y.alloy; state.mats.shard = (state.mats.shard||0) + (y.shard||0);
    state.counters.salvaged++;
  }
}

function addItem(it, source) {
  state.inv.push(it);
  enforceStash();
  addLog(`🎁 Loot drop from ${source}: ${itemHtml(it)}`, '');
}

function equipItem(id) {
  const idx = state.inv.findIndex(i => i.id === id);
  if (idx < 0) return;
  const it = state.inv.splice(idx, 1)[0];
  const old = state.equip[it.slot];
  state.equip[it.slot] = it;
  if (old) { state.inv.push(old); enforceStash(); }
  addLog(`🧥 Equipped ${itemHtml(it)}${old ? ` (unequipped ${esc(old.name)})` : ''}`, 'info');
  afterAction();
}
function unequipItem(slot) {
  const it = state.equip[slot];
  if (!it) return;
  state.equip[slot] = null;
  state.inv.push(it);
  enforceStash();
  state.hp = Math.min(state.hp, maxHp());
  addLog(`Unequipped ${esc(it.name)}.`, 'info');
  afterAction();
}
function salvageItem(id) {
  const idx = state.inv.findIndex(i => i.id === id);
  if (idx < 0) return;
  const it = state.inv.splice(idx, 1)[0];
  const y = SALVAGE_YIELD[it.rarity];
  state.mats.scrap += y.scrap; state.mats.ball += y.ball; state.mats.alloy += y.alloy; state.mats.shard = (state.mats.shard||0) + (y.shard||0);
  state.counters.salvaged++;
  addLog(`🔩 Salvaged <span class="rar-${it.rarity}">${esc(it.name)}</span> → ${salvageText(y)}`, 'info');
  afterAction();
}
function salvageBelow(rarityId) {
  const cutoff = RAR_IDX[rarityId];
  const targets = state.inv.filter(i => RAR_IDX[i.rarity] <= cutoff);
  if (!targets.length) { addLog('Nothing to salvage at that rarity.', 'info'); return; }
  const tot = { scrap: 0, ball: 0, alloy: 0 };
  targets.forEach(it => {
    const y = SALVAGE_YIELD[it.rarity];
    tot.scrap += y.scrap; tot.ball += y.ball; tot.alloy += y.alloy; tot.shard = (tot.shard||0) + (y.shard||0);
  });
  state.inv = state.inv.filter(i => RAR_IDX[i.rarity] > cutoff);
  state.mats.scrap += tot.scrap; state.mats.ball += tot.ball; state.mats.alloy += tot.alloy; state.mats.shard = (state.mats.shard||0) + (tot.shard||0);
  state.counters.salvaged += targets.length;
  addLog(`🔩 Bulk-salvaged <b>${targets.length}</b> items → ${salvageText(tot)}`, 'info');
  afterAction();
}
function salvageText(y) {
  const parts = [];
  if (y.scrap) parts.push(`${y.scrap} ${MATS.scrap}`);
  if (y.ball) parts.push(`${y.ball} ${MATS.ball}`);
  if (y.alloy) parts.push(`${y.alloy} ${MATS.alloy}`);
  if (y.shard) parts.push(`${y.shard} ${MATS.shard}`);
  return parts.join(', ') || 'nothing';
}
function toggleAutoSalvage() {
  state.autoSalvageCommons = !state.autoSalvageCommons;
  addLog(state.autoSalvageCommons ? 'Auto-salvage Commons: ON' : 'Auto-salvage Commons: OFF', 'info');
  if (state.autoSalvageCommons) enforceStash();
  afterAction();
}
function setStashFilter(f) { stashFilter = f; renderTab(); }

// ---------------------------------------------------------------- turfs & jobs
function turfCount() {
  let t = 0;
  while (turfUnlockLevel(t) <= state.level) t++;
  return t + 1;
}
function turfUnlockLevel(t) { return 1 + t * 4; }
function turfName(t) {
  const cycle = Math.floor(t / TURF_NAMES.length);
  return TURF_NAMES[t % TURF_NAMES.length] + (cycle > 0 ? ' ' + roman(cycle + 1) : '');
}
function jobData(t, j) {
  const ul = turfUnlockLevel(t);
  const mb = masteryBonus(t, j);
  const tb = turfJobBonus(t);
  return {
    name: JOB_NAMES[t % JOB_NAMES.length][j],
    energy: 3 + Math.min(t, 12) + j,
    cash: 20 * g(ul) * (1 + j * 0.7) * mb.cash * tb,
    xp: 10 * g(ul) * (1 + j * 0.5) * mb.xp * tb,
    dropChance: (0.08 + j * 0.02 + mb.drop) * crewDropBonus() * (state.spec === 'operator' ? 1.15 : 1),
    itemLevel: ul + j,
    stars: mb.stars,
    masteryCount: state.mastery[masteryKey(t, j)] || 0,
  };
}
function bestJobTip() {
  let best = null, bestScore = 0;
  const n = turfCount();
  for (let t = 0; t < n; t++) {
    if (state.level < turfUnlockLevel(t)) continue;
    for (let j = 0; j < 5; j++) {
      const jd = jobData(t, j);
      const score = jd.xp / jd.energy;
      if (score > bestScore) { bestScore = score; best = { t, j, jd, score }; }
    }
  }
  return best;
}

function addHeat(amount) {
  state.heat = clamp(state.heat + amount * heatGainMult(), 0, 100);
}

function doJobs(t, j, n) {
  if (jailBlock('jobs')) return;
  if (state.pendingRaid) { addLog('🚨 Resolve the Police Raid first!', 'bad'); switchTab('quests'); return; }
  const jd = jobData(t, j);
  if (state.level < turfUnlockLevel(t)) { addLog('That turf is still locked.', 'bad'); return; }
  if (n < 0) n = 99999; // spend all
  let done = 0, cashTot = 0, xpTot = 0, drops = 0, raidTriggered = false;
  while (done < n && Math.floor(state.energy) >= jd.energy) {
    state.energy -= jd.energy;
    done++;
    state.counters.jobs++;
    const mk = masteryKey(t, j);
    state.mastery[mk] = (state.mastery[mk] || 0) + 1;
    const starsNow = masteryStars(state.mastery[mk]);
    if (MASTERY_THRESHOLDS.includes(state.mastery[mk])) {
      addLog(`⭐ Job mastery: <b>${jd.name}</b> is now ${starsNow}★!`, 'gold');
    }
    if (starsNow >= 5 && state.mastery[mk] % 10 === 0) {
      state.mats.ball += 1;
      addLog(`🧨 5★ drip: +1 ${MATS.ball} from ${jd.name}.`, 'info');
    }
    cashTot += gainCash(jd.cash * rnd(0.9, 1.1), 'job');
    xpTot += gainXp(jd.xp * rnd(0.95, 1.05), 'job');
    if (Math.random() < jd.dropChance) { drops++; addItem(genItem(jd.itemLevel), `"${jd.name}"`); }
    const goldChance = 0.005 * (state.spec === 'shadow' ? 1.5 : 1) * crewDropBonus();
    if (Math.random() < goldChance) { state.gold++; addLog('◈ You found a <b>Gold Bond</b> tucked in the take!', 'gold'); }
    addHeat(1 + j * 0.3 + t * 0.2);
    progressContracts('job', { t, j, count: 1 });
    progressWeeklies('jobs', 1);
    bumpStory('jobs', 1);
    if (Math.random() < 0.08) maybeDropCollection('job');
    if (j >= 3) state.influence = (state.influence || 0) + 0.1;
    if (state.heat >= 90 && Math.random() < 0.08) addWanted(1);
    if (state.heat >= 70 && Math.random() < 0.18 * (influenceBuffActive('raid') ? 0.5 : 1) * (1 - talentRaidReduce())) {
      raidTriggered = true;
      break;
    }
  }
  if (!done) { addLog(`Not enough energy — "${jd.name}" costs ${jd.energy} ⚡.`, 'bad'); return; }
  addLog(`💼 ${jd.name} ×${done}: <span class="good">+$${fmt(cashTot)}</span>, <span class="xp">+${fmt(xpTot)} XP</span>${drops ? `, ${drops} item drop${drops > 1 ? 's' : ''}` : ''}`, '');
  if (raidTriggered) spawnRaid();
  afterAction();
}

// ---------------------------------------------------------------- heat / raids
function spawnRaid() {
  const bl = Math.max(1, state.level);
  state.pendingRaid = {
    maxHp: Math.round(400 * g(bl)),
    hp: Math.round(400 * g(bl)),
    atk: 6 * g(bl),
    def: 3 * g(bl),
    stamina: 4,
    bribeCash: Math.round(80 * g(bl) * (state.spec === 'shadow' ? 0.5 : 1)),
  };
  addLog('🚨 <b>POLICE RAID!</b> Fight them off or bribe your way out — Quests tab.', 'bad');
}

function fightRaid(times) {
  const r = state.pendingRaid;
  if (!r) return;
  let hits = 0, dmgTot = 0, taken = 0, won = false;
  while (hits < times) {
    if (Math.floor(state.stamina) < r.stamina) { if (!hits) { addLog(`Need ${r.stamina} stamina to fight the raid.`, 'bad'); return; } break; }
    if (state.hp <= 1) { if (!hits) { addLog('Too injured to fight the raid.', 'bad'); return; } break; }
    state.stamina -= r.stamina;
    hits++;
    const crit = Math.random() < critChance();
    const dmg = Math.max(1, Math.round(totalAtk() * rnd(0.85, 1.15) * (crit ? 2 : 1) - r.def * 0.25));
    r.hp -= dmg; dmgTot += dmg;
    if (r.hp <= 0) { won = true; break; }
    const ret = Math.max(0, Math.round(r.atk * rnd(0.8, 1.2) - totalDef() * 0.5));
    state.hp = Math.max(0, state.hp - ret); taken += ret;
    if (state.hp <= 0) {
      state.hp = 1;
      const fine = Math.min(state.cash, Math.round(state.cash * 0.08 + 50 * g(state.level)));
      state.cash -= fine;
      state.heat = clamp(state.heat - 40, 0, 100);
      state.pendingRaid = null;
      addWanted(2);
      addLog(`🚑 Raid failed! Hospitalized, lost $${fmt(fine)}, Heat −40.`, 'bad');
      sendToJail('Raid wipe');
      afterAction();
      return;
    }
  }
  if (!hits) return;
  addLog(`🚨 Raid fight ×${hits}: dealt ${fmt(dmgTot)}${taken ? `, took ${fmt(taken)}` : ''}. ${won ? '' : `(${fmt(Math.max(0, r.hp))} HP left)`}`, '');
  if (won) {
    state.pendingRaid = null;
    state.heat = clamp(state.heat - 25, 0, 100);
    state.counters.raidsWon++;
    bumpStory('raidsWon', 1);
    const xp = gainXp(30 * g(state.level), 'raid');
    addLog(`🚨 <b>Raid survived!</b> Heat −25, +${fmt(xp)} XP.`, 'gold');
    if (Math.random() < 0.25) { state.gold++; addLog('◈ Confiscated a Gold Bond from Internal Affairs.', 'gold'); }
  }
  afterAction();
}

function bribeRaid(useGold) {
  const r = state.pendingRaid;
  if (!r) return;
  if (useGold) {
    const cost = state.spec === 'shadow' ? 1 : 1;
    if (state.gold < cost) { addLog('Need 1 Gold Bond to bribe.', 'bad'); return; }
    state.gold -= cost;
  } else {
    if (state.cash < r.bribeCash) { addLog(`Bribe costs $${fmt(r.bribeCash)}.`, 'bad'); return; }
    state.cash -= r.bribeCash;
  }
  state.pendingRaid = null;
  state.heat = clamp(state.heat - 20, 0, 100);
  addLog(`💵 Bribe paid. Heat −20. The boys in blue look the other way.`, 'info');
  afterAction();
}

// ---------------------------------------------------------------- properties
function propBaseCost(i) { return 400 * Math.pow(8.5, i); }
function propIncomePerMin(i, lvl) {
  if (lvl <= 0) return 0;
  let mult = incomeMult();
  const boost = state.propBoosts && state.propBoosts[i];
  if (boost && boost.until > now()) mult *= boost.mult;
  else if (boost && boost.penaltyUntil > now()) mult *= 0.7;
  return (propBaseCost(i) / 45) * lvl * Math.pow(1.12, lvl - 1) * mult;
}
function propUpgradeCost(i, lvl) {
  if (lvl === 0) return propBaseCost(i);
  return Math.round(propBaseCost(i) * 0.6 * Math.pow(1.5, lvl - 1));
}
function totalIncomePerMin() {
  return Object.entries(state.props).reduce((s, [i, lvl]) => s + propIncomePerMin(+i, lvl), 0);
}
function buyOrUpgradeProp(i) {
  const lvl = state.props[i] || 0;
  const cost = propUpgradeCost(i, lvl);
  if (state.cash < cost) { addLog(`Not enough cash — need $${fmt(cost)}.`, 'bad'); return; }
  state.cash -= cost;
  state.props[i] = lvl + 1;
  const p = PROPERTIES[i];
  addLog(lvl === 0
    ? `🏠 Purchased <b>${p.name}</b> for $${fmt(cost)}! Now earning $${fmt(propIncomePerMin(i, 1))}/min.`
    : `🏗️ Upgraded <b>${p.name}</b> to level ${lvl + 1} (now $${fmt(propIncomePerMin(i, lvl + 1))}/min).`, 'good');
  afterAction();
}

// ---------------------------------------------------------------- turf wars
function rivalData(t) {
  const ul = turfUnlockLevel(t);
  const tier = turfTier(t);
  return {
    name: `Rival Crew — ${turfName(t)}`,
    maxHp: Math.round(300 * g(ul) * (1 + tier * 0.4)),
    atk: 5 * g(ul) * (1 + tier * 0.2),
    def: 3 * g(ul) * (1 + tier * 0.2),
    stamina: 4,
  };
}
function claimTurf(t) {
  if (jailBlock('turf wars')) return;
  if (state.level < turfUnlockLevel(t)) { addLog('Turf locked.', 'bad'); return; }
  const r = rivalData(t);
  if (Math.floor(state.stamina) < r.stamina) { addLog(`Need ${r.stamina} stamina to contest this turf.`, 'bad'); return; }
  if (state.hp <= 1) { addLog('Too injured to claim turf.', 'bad'); return; }
  let hp = r.maxHp, spent = 0, taken = 0;
  while (hp > 0 && Math.floor(state.stamina) >= r.stamina && state.hp > 1) {
    state.stamina -= r.stamina; spent++;
    const crit = Math.random() < critChance();
    hp -= Math.max(1, Math.round(totalAtk() * rnd(0.85, 1.15) * (crit ? 2 : 1) - r.def * 0.25));
    if (hp <= 0) break;
    const ret = Math.max(0, Math.round(r.atk * rnd(0.8, 1.2) - totalDef() * 0.5));
    state.hp = Math.max(1, state.hp - ret); taken += ret;
  }
  if (hp > 0) {
    addLog(`🗺️ Failed to take ${turfName(t)} after ${spent} attacks (${fmt(Math.max(0, hp))} rival HP left).`, 'bad');
    afterAction();
    return;
  }
  const prev = state.turfControl[t] || { tier: 0 };
  const newTier = Math.min(5, (prev.tier || 0) + 1);
  state.turfControl[t] = { tier: newTier, lastDefend: now() };
  state.counters.turfActions = (state.counters.turfActions || 0) + 1;
  progressWeeklies('turf', 1);
  addLog(`🗺️ <b>${turfName(t)}</b> claimed! Ownership tier ${newTier} (+${newTier * 5}% job rewards). Took ${fmt(taken)} damage.`, 'gold');
  afterAction();
}
function doDefendTurf(t) {
  if (jailBlock('turf defense')) return;
  if (turfTier(t) <= 0) { claimTurf(t); return; }
  const r = rivalData(t);
  if (Math.floor(state.stamina) < r.stamina) { addLog(`Need ${r.stamina} stamina to defend.`, 'bad'); return; }
  if (state.hp <= 1) { addLog('Too injured to defend.', 'bad'); return; }
  let hp = r.maxHp;
  while (hp > 0 && Math.floor(state.stamina) >= r.stamina && state.hp > 1) {
    state.stamina -= r.stamina;
    const crit = Math.random() < critChance();
    hp -= Math.max(1, Math.round(totalAtk() * rnd(0.85, 1.15) * (crit ? 2 : 1) - r.def * 0.25));
    if (hp <= 0) break;
    const ret = Math.max(0, Math.round(r.atk * rnd(0.8, 1.2) - totalDef() * 0.5));
    state.hp = Math.max(1, state.hp - ret);
  }
  if (hp > 0) {
    const c = state.turfControl[t];
    c.tier = Math.max(1, c.tier - 1);
    c.lastDefend = now();
    addLog(`🗺️ Defense of ${turfName(t)} failed — ownership dropped to tier ${c.tier}.`, 'bad');
  } else {
    state.turfControl[t].lastDefend = now();
    state.counters.turfActions = (state.counters.turfActions || 0) + 1;
    progressWeeklies('turf', 1);
    addLog(`🗺️ Successfully defended <b>${turfName(t)}</b>. Ownership secure.`, 'good');
  }
  afterAction();
}
function tickTurfDecay() {
  for (const [t, c] of Object.entries(state.turfControl)) {
    if (!c.tier) continue;
    if (now() - (c.lastDefend || 0) >= TURF_DEFEND_MS * 2) {
      // overdue by 2 windows: drop a tier once per window roughly via lastDefend bump
      const overdue = now() - c.lastDefend;
      const drops = Math.floor(overdue / TURF_DEFEND_MS) - 1;
      if (drops > 0) {
        c.tier = Math.max(1, c.tier - drops);
        c.lastDefend += drops * TURF_DEFEND_MS;
      }
    }
  }
}

// ---------------------------------------------------------------- bosses
function bossCount() {
  let i = 0;
  while (bossLevel(i) <= state.level + 3) i++;
  return Math.max(1, i + 1);
}
function bossLevel(i) { return 3 + i * 5; }
function bossData(i) {
  const bl = bossLevel(i);
  const kills = state.bossKills[i] || 0;
  const cycle = Math.floor(i / BOSS_NAMES.length);
  return {
    name: BOSS_NAMES[i % BOSS_NAMES.length] + (cycle > 0 ? ' ' + roman(cycle + 1) : ''),
    flavor: BOSS_FLAVOR[i % BOSS_FLAVOR.length],
    level: bl, kills,
    maxHp: Math.round(750 * Math.pow(2.4, i) * Math.pow(1.35, kills)),
    atk: 8 * g(bl) * Math.pow(1.15, kills),
    def: 5 * g(bl) * Math.pow(1.15, kills),
    cash: 130 * g(bl) * Math.pow(1.3, kills),
    xp: 65 * g(bl) * Math.pow(1.12, kills),
    stamina: 5,
  };
}
function hitBoss(i, times) {
  if (jailBlock('boss fights')) return;
  if (state.pendingRaid) { addLog('🚨 Resolve the Police Raid first!', 'bad'); return; }
  const b = bossData(i);
  if (state.level < b.level) { addLog(`${b.name} won't even meet you until level ${b.level}.`, 'bad'); return; }
  if (state.bossHp[i] === undefined) state.bossHp[i] = b.maxHp;

  let hits = 0, dmgTot = 0, taken = 0, killed = false;
  while (hits < times) {
    if (Math.floor(state.stamina) < b.stamina) { if (!hits) { addLog(`Not enough stamina — attacks cost ${b.stamina} 🔥.`, 'bad'); return; } break; }
    if (state.hp <= 1) { if (!hits) { addLog('You are too injured to fight. Heal up first!', 'bad'); return; } break; }
    state.stamina -= b.stamina;
    hits++;
    tickCombatBuffs();
    const crit = Math.random() < critChance() + combatCrit();
    let dmg = Math.max(1, Math.round(totalAtk() * combatAtkMult() * bossDmgMult() * rnd(0.85, 1.15) * (crit ? 2 : 1) - b.def * 0.25));
    state.bossHp[i] -= dmg;
    dmgTot += dmg;
    state.counters.bossDmg += dmg;
    progressContracts('bossDmg', { amount: dmg });
    if (crit) addLog(`💥 <b>CRITICAL!</b> You smash ${b.name} for ${fmt(dmg)} damage!`, 'gold');
    if (state.bossHp[i] <= 0) { killed = true; break; }
    const ret = Math.max(0, Math.round(b.atk * rnd(0.8, 1.2) - (totalDef() + combatDefBonus()) * 0.5));
    state.hp = Math.max(0, state.hp - ret);
    taken += ret;
    if (state.hp <= 0) {
      state.hp = 1;
      addLog(`🚑 ${b.name} put you in the hospital! Retreat and recover.`, 'bad');
      break;
    }
  }
  if (!hits) return;
  addHeat(0.5 * hits);
  addLog(`⚔️ You hit ${b.name} ×${hits} for <b>${fmt(dmgTot)}</b> damage${taken ? `, took <span class="bad">${fmt(taken)}</span> back` : ''}. ${killed ? '' : `(${fmt(Math.max(0, state.bossHp[i]))} HP left)`}`, '');

  if (killed) {
    state.counters.bossKills++;
    state.bossKills[i] = (state.bossKills[i] || 0) + 1;
    bumpStory('bossKills', 1);
    progressWeeklies('bossDmg', 0);
    maybeDropCollection('boss');
    const cashGot = gainCash(b.cash, 'boss');
    const xpGot = gainXp(b.xp, 'boss');
    addLog(`☠️ <b>${b.name} DEFEATED!</b> <span class="good">+$${fmt(cashGot)}</span>, <span class="xp">+${fmt(xpGot)} XP</span>`, 'gold');
    addItem(genItem(b.level + 1, rollRarity(1, 2.5).id), b.name);
    const alloys = 1 + Math.floor(Math.random() * 3);
    state.mats.alloy += alloys;
    state.mats.ball += 5;
    addLog(`🔧 Scavenged ${alloys} ${MATS.alloy} and 5 ${MATS.ball} from the scene.`, 'info');
    if (Math.random() < 0.2) { const gg = 1 + Math.floor(Math.random() * 2); state.gold += gg; addLog(`◈ Found <b>${gg} Gold Bond${gg > 1 ? 's' : ''}</b> in the boss's coat!`, 'gold'); }
    const nb = bossData(i);
    state.bossHp[i] = nb.maxHp;
    addLog(`${nb.name} will return stronger (HP ${fmt(nb.maxHp)}).`, 'info');
  }
  afterAction();
}

// ---------------------------------------------------------------- crew
function crewUpgradeCost(id) {
  const role = CREW_ROLES.find(r => r.id === id);
  const lvl = crewLevel(id);
  if (lvl === 0) return Math.round(role.hire * g(Math.max(1, state.level)));
  return Math.round(role.hire * 0.7 * g(Math.max(1, state.level)) * Math.pow(1.45, lvl));
}
function upgradeCrew(id) {
  const cost = crewUpgradeCost(id);
  if (state.cash < cost) { addLog(`Need $${fmt(cost)} to hire/upgrade.`, 'bad'); return; }
  state.cash -= cost;
  const was = crewLevel(id);
  state.crew[id] = was + 1;
  const role = CREW_ROLES.find(r => r.id === id);
  addLog(was === 0
    ? `👥 Hired <b>${role.name}</b>!`
    : `👥 ${role.name} promoted to level ${was + 1}.`, 'good');
  afterAction();
}

// ---------------------------------------------------------------- crafting
function craft(recipeId, slot) {
  const r = RECIPES.find(x => x.id === recipeId);
  for (const m in r.cost) {
    if (state.mats[m] < r.cost[m]) { addLog(`Missing materials — need ${r.cost[m]} ${MATS[m]}.`, 'bad'); return; }
  }
  for (const m in r.cost) state.mats[m] -= r.cost[m];
  const bonus = r.rarity === 'mythic' ? 3 : r.rarity === 'legendary' ? 2 : r.rarity === 'epic' ? 1 : 0;
  const it = genItem(state.level + bonus, r.rarity, slot);
  state.inv.push(it);
  enforceStash();
  state.counters.crafted++;
  addLog(`🔨 <b>Crafted:</b> ${itemHtml(it)}`, 'gold');
  afterAction();
}
function convertMats(from, to, inCost, outAmt) {
  if (state.mats[from] < inCost) { addLog(`Need ${inCost} ${MATS[from]}.`, 'bad'); return; }
  state.mats[from] -= inCost;
  state.mats[to] += outAmt;
  addLog(`♻️ Converted ${inCost} ${MATS[from]} → ${outAmt} ${MATS[to]}.`, 'info');
  afterAction();
}

// ---------------------------------------------------------------- shop
function shopItems() {
  const L = state.level;
  const d = shopDiscount();
  return [
    { id: 'gearw', name: 'Street Piece', desc: `Uncommon level-${L} weapon`, cash: Math.round(160 * g(L) * d), act: () => { state.inv.push(genItem(L, 'uncommon', 'weapon')); enforceStash(); addLog('🛒 Bought a Street Piece.', 'info'); } },
    { id: 'geara', name: 'Kevlar Special', desc: `Uncommon level-${L} armor`, cash: Math.round(160 * g(L) * d), act: () => { state.inv.push(genItem(L, 'uncommon', 'armor')); enforceStash(); addLog('🛒 Bought a Kevlar Special.', 'info'); } },
    { id: 'gearc', name: 'Hot Merchandise', desc: `Uncommon level-${L} accessory`, cash: Math.round(160 * g(L) * d), act: () => { state.inv.push(genItem(L, 'uncommon', 'accessory')); enforceStash(); addLog('🛒 Bought Hot Merchandise.', 'info'); } },
    { id: 'medkit', name: 'Back-Room Doctor', desc: 'Fully restore health', cash: Math.round(60 * g(L) * d), act: () => { state.hp = maxHp(); addLog('🩹 Patched up to full health.', 'good'); } },
    { id: 'bxp', name: 'Double XP (10 min)', desc: 'All XP gains doubled', cash: Math.round(300 * g(L) * d), act: () => { state.boosters.xp = Math.max(now(), state.boosters.xp) + 10 * 60000; addLog('📈 Double XP active for 10 minutes!', 'gold'); } },
    { id: 'bcash', name: 'Double Cash (10 min)', desc: 'All cash gains doubled (incl. income)', cash: Math.round(300 * g(L) * d), act: () => { state.boosters.cash = Math.max(now(), state.boosters.cash) + 10 * 60000; addLog('💸 Double Cash active for 10 minutes!', 'gold'); } },
    { id: 'sta', name: 'Adrenaline Shot', desc: 'Fully refill stamina', gold: 2, act: () => { state.stamina = state.maxStamina; addLog('🔥 Stamina fully restored!', 'good'); } },
    { id: 'ene', name: 'Triple Espresso', desc: 'Fully refill energy', gold: 2, act: () => { state.energy = state.maxEnergy; addLog('⚡ Energy fully restored!', 'good'); } },
    { id: 'bxpg', name: 'Double XP (30 min)', desc: 'Premium: XP doubled for 30 min', gold: 3, act: () => { state.boosters.xp = Math.max(now(), state.boosters.xp) + 30 * 60000; addLog('📈 Double XP active for 30 minutes!', 'gold'); } },
    { id: 'bcashg', name: 'Double Cash (30 min)', desc: 'Premium: cash doubled for 30 min', gold: 3, act: () => { state.boosters.cash = Math.max(now(), state.boosters.cash) + 30 * 60000; addLog('💸 Double Cash active for 30 minutes!', 'gold'); } },
    { id: 'crate1', name: 'Elite Crate', desc: `Guaranteed Epic level-${L} item`, gold: 8, act: () => { const it = genItem(L, 'epic'); state.inv.push(it); enforceStash(); addLog(`📦 Elite Crate: ${itemHtml(it)}`, 'gold'); } },
    { id: 'crate2', name: 'Godfather Crate', desc: `Guaranteed Legendary level-${L + 1} item`, gold: 25, act: () => { const it = genItem(L + 1, 'legendary'); state.inv.push(it); enforceStash(); addLog(`📦 Godfather Crate: ${itemHtml(it)}`, 'gold'); } },
  ];
}
function buyShop(id) {
  const s = shopItems().find(x => x.id === id);
  if (!s) return;
  if (s.cash !== undefined) {
    if (state.cash < s.cash) { addLog(`Not enough cash — need $${fmt(s.cash)}.`, 'bad'); return; }
    state.cash -= s.cash;
  } else {
    if (state.gold < s.gold) { addLog(`Not enough Gold Bonds — need ${s.gold} ◈.`, 'bad'); return; }
    state.gold -= s.gold;
  }
  s.act();
  afterAction();
}

// ---------------------------------------------------------------- contracts
function generateContracts() {
  const day = utcDay();
  const rng = mulberry32(day * 9973 + (state.prestige || 0) * 13);
  const unlocked = [];
  let t = 0;
  while (turfUnlockLevel(t) <= state.level) {
    for (let j = 0; j < 5; j++) unlocked.push({ t, j });
    t++;
  }
  if (!unlocked.length) unlocked.push({ t: 0, j: 0 });
  const pick = () => unlocked[Math.floor(rng() * unlocked.length)];
  const contracts = [];
  // job contract
  const j1 = pick();
  const need = 5 + Math.floor(rng() * 10);
  contracts.push({
    id: 'job_' + j1.t + '_' + j1.j,
    type: 'job', t: j1.t, j: j1.j, need, progress: 0, claimed: false,
    reward: { cash: Math.round(100 * g(state.level) * need), gold: 1, ball: 2 },
  });
  // boss damage
  const dmgNeed = Math.round(200 * g(state.level));
  contracts.push({
    id: 'dmg',
    type: 'bossDmg', need: dmgNeed, progress: 0, claimed: false,
    reward: { cash: Math.round(150 * g(state.level)), gold: 2, alloy: 1 },
  });
  // property earnings
  const earnNeed = Math.round(80 * g(state.level) * 10);
  contracts.push({
    id: 'prop',
    type: 'prop', need: earnNeed, progress: 0, claimed: false,
    reward: { cash: Math.round(120 * g(state.level)), gold: 1, scrap: 15 },
  });
  state.contracts = contracts;
  state.contractDay = day;
  state.freeContractReroll = true;
}

function ensureContracts() {
  if (state.contractDay !== utcDay() || !state.contracts || !state.contracts.length) {
    generateContracts();
  }
}

function progressContracts(type, data) {
  ensureContracts();
  for (const c of state.contracts) {
    if (c.claimed) continue;
    if (type === 'job' && c.type === 'job' && c.t === data.t && c.j === data.j) {
      c.progress = Math.min(c.need, c.progress + data.count);
    }
    if (type === 'bossDmg' && c.type === 'bossDmg') {
      c.progress = Math.min(c.need, c.progress + data.amount);
    }
    if (type === 'prop' && c.type === 'prop') {
      c.progress = Math.min(c.need, c.progress + data.amount);
    }
  }
}

function claimContract(id) {
  ensureContracts();
  const c = state.contracts.find(x => x.id === id);
  if (!c || c.claimed || c.progress < c.need) return;
  c.claimed = true;
  state.counters.contracts++;
  if (c.reward.cash) gainCash(c.reward.cash, 'contract');
  if (c.reward.gold) state.gold += c.reward.gold;
  if (c.reward.scrap) state.mats.scrap += c.reward.scrap;
  if (c.reward.ball) state.mats.ball += c.reward.ball;
  if (c.reward.alloy) state.mats.alloy += c.reward.alloy;
  addLog(`📋 Contract complete! Rewards claimed.`, 'gold');
  afterAction();
}

function rerollContracts() {
  ensureContracts();
  if (state.freeContractReroll) {
    state.freeContractReroll = false;
    generateContracts();
    addLog('📋 Free contract reroll used.', 'info');
    afterAction();
    return;
  }
  if (state.gold < 2) { addLog('Reroll costs 2 Gold Bonds.', 'bad'); return; }
  state.gold -= 2;
  generateContracts();
  addLog('📋 Contracts rerolled for 2 ◈.', 'info');
  afterAction();
}

function contractDesc(c) {
  if (c.type === 'job') return `Complete "${jobData(c.t, c.j).name}" ${c.need} times`;
  if (c.type === 'bossDmg') return `Deal ${fmt(c.need)} boss damage`;
  if (c.type === 'prop') return `Earn $${fmt(c.need)} from properties`;
  return 'Unknown';
}

// ---------------------------------------------------------------- specialization
function chooseSpec(id) {
  if (!SPECS[id]) return;
  if (state.level < 10) { addLog('Specialization unlocks at level 10.', 'bad'); return; }
  if (state.spec && state.spec !== id) {
    if (state.gold < 5) { addLog('Respec costs 5 Gold Bonds.', 'bad'); return; }
    state.gold -= 5;
    addLog(`🎭 Respecced to <b>${SPECS[id].name}</b> (−5 ◈).`, 'gold');
  } else if (!state.spec) {
    addLog(`🎭 You chose the path of the <b>${SPECS[id].name}</b>.`, 'gold');
  } else {
    addLog('Already that specialization.', 'info');
    return;
  }
  state.spec = id;
  afterAction();
}


// ---------------------------------------------------------------- vehicles
function vehicleUpgradeCost(id) {
  const role = VEHICLES.find(v => v.id === id);
  const lvl = vehicleLevel(id);
  if (lvl === 0) return Math.round(role.hire * g(Math.max(1, state.level)));
  return Math.round(role.hire * 0.65 * g(Math.max(1, state.level)) * Math.pow(1.4, lvl));
}
function upgradeVehicle(id) {
  const cost = vehicleUpgradeCost(id);
  if (state.cash < cost) { addLog(`Need $${fmt(cost)}.`, 'bad'); return; }
  state.cash -= cost;
  const was = vehicleLevel(id);
  state.vehicles[id] = was + 1;
  if (!state.vehicleActive) state.vehicleActive = id;
  const v = VEHICLES.find(x => x.id === id);
  addLog(was === 0 ? `🚗 Purchased <b>${v.name}</b>!` : `🚗 Upgraded <b>${v.name}</b> to Lv ${was + 1}.`, 'good');
  bumpStory('vehicle', 1);
  afterAction();
}
function setActiveVehicle(id) {
  if (!vehicleLevel(id)) { addLog('You do not own that vehicle.', 'bad'); return; }
  state.vehicleActive = id;
  addLog(`🚗 Active getaway: <b>${VEHICLES.find(v => v.id === id).name}</b>.`, 'info');
  afterAction();
}

// ---------------------------------------------------------------- heists
function heistUnlockLevel() { return 8; }
function heistDifficulty(idx) {
  return 1 + Math.floor(idx / HEIST_DEFS.length) + (idx % HEIST_DEFS.length) * 0.15;
}
function heistList() {
  const base = Math.max(0, Math.floor((state.level - 8) / 5));
  const list = [];
  for (let i = 0; i < HEIST_DEFS.length; i++) {
    const idx = base * HEIST_DEFS.length + i;
    list.push({ idx, def: HEIST_DEFS[i], diff: heistDifficulty(idx) });
  }
  return list;
}
function heistSuccessChance(stageIdx, diff) {
  let chance = 0.72 - diff * 0.04 + totalAtk() / (80 * g(state.level)) * 0.15;
  chance += vehicleHeistBonus();
  if (state.spec === 'shadow' || state.spec === 'operator') chance += 0.06;
  chance += talentHeist();
  if (stageIdx === 2) chance -= state.heat / 400;
  return clamp(chance, 0.2, 0.95);
}
function heistStageCost(stageIdx, diff) {
  const st = HEIST_STAGES[stageIdx];
  return Math.max(1, Math.round(st.baseCost * (1 + diff * 0.3)));
}
function startOrContinueHeist(idx) {
  if (jailBlock('heists')) return;
  if (state.level < heistUnlockLevel()) { addLog(`Heists unlock at level ${heistUnlockLevel()}.`, 'bad'); return; }
  if (state.pendingRaid) { addLog('Resolve the raid first.', 'bad'); return; }
  const key = String(idx);
  if ((state.heistCd[key] || 0) > now() && !(state.heistProgress[key] >= 0 && state.heistProgress[key] < 3)) {
    addLog(`Heist on cooldown (${fmtTime((state.heistCd[key] - now()) / 1000)}).`, 'bad');
    return;
  }
  const stage = state.heistProgress[key] || 0;
  if (stage >= 3) { state.heistProgress[key] = 0; }
  const st = state.heistProgress[key] || 0;
  const diff = heistDifficulty(idx);
  const cost = heistStageCost(st, diff);
  const res = HEIST_STAGES[st].resource;
  if (res === 'energy' && Math.floor(state.energy) < cost) { addLog(`Need ${cost} energy.`, 'bad'); return; }
  if (res === 'stamina' && Math.floor(state.stamina) < cost) { addLog(`Need ${cost} stamina.`, 'bad'); return; }
  if (res === 'energy') state.energy -= cost; else state.stamina -= cost;

  const chance = heistSuccessChance(st, diff);
  const roll = Math.random();
  const def = HEIST_DEFS[idx % HEIST_DEFS.length];
  if (roll > chance) {
    addHeat(8 * (st === 2 ? vehicleHeatReduce() : 1));
    if (st === 2) addWanted(1);
    const consolation = gainCash(40 * g(state.level) * diff * (st + 1) * 0.25, 'heist');
    state.heistProgress[key] = 0;
    state.heistCd[key] = now() + 3 * 60 * 1000;
    addLog(`💣 <b>${def.name}</b> failed at stage ${st + 1} (${Math.round(chance * 100)}%). Partial take $${fmt(consolation)}.`, 'bad');
    if (st === 2 && state.wanted >= 3) sendToJail('Failed getaway');
    afterAction();
    return;
  }
  state.heistProgress[key] = st + 1;
  addLog(`💣 ${HEIST_STAGES[st].name} succeeded on <b>${def.name}</b>!`, 'good');
  if (state.heistProgress[key] >= 3) {
    const cash = gainCash(280 * g(state.level) * diff, 'heist');
    const xp = gainXp(120 * g(state.level) * diff, 'heist');
    addItem(genItem(state.level + 1, rollRarity(2, 2).id), def.name);
    state.mats.alloy += 2; state.mats.ball += 6;
    addHeat(12 * vehicleHeatReduce());
    state.counters.heists = (state.counters.heists || 0) + 1;
    state.heistProgress[key] = 0;
    state.heistCd[key] = now() + 8 * 60 * 1000;
    progressWeeklies('heists', 1);
    bumpStory('heists', 1);
    maybeDropCollection('heist');
    addLog(`💣 <b>HEIST COMPLETE:</b> ${def.name} — +$${fmt(cash)}, +${fmt(xp)} XP, Rare+ loot!`, 'gold');
  }
  afterAction();
}

// ---------------------------------------------------------------- rackets
function maybeSpawnRacket() {
  if (state.racket && state.racket.expiry > now()) return;
  if (state.racket && state.racket.expiry <= now()) {
    expireRacket();
  }
  const owned = Object.keys(state.props).filter(i => state.props[i] > 0);
  if (!owned.length) return;
  if (Math.random() > 0.012 * (hasTalent('b2') ? 1.5 : 1)) return;
  const pi = +owned[Math.floor(Math.random() * owned.length)];
  const rt = RACKET_TYPES[Math.floor(Math.random() * RACKET_TYPES.length)];
  state.racket = { prop: pi, type: rt.id, expiry: now() + 5 * 60 * 1000 };
  addLog(`📦 Racket event at <b>${PROPERTIES[pi].name}</b>: ${rt.name}!`, 'gold');
}
function expireRacket() {
  if (!state.racket) return;
  const pi = state.racket.prop;
  state.propBoosts[pi] = Object.assign({}, state.propBoosts[pi], { penaltyUntil: now() + 10 * 60 * 1000 });
  addHeat(5);
  addLog(`📦 Racket at ${PROPERTIES[pi].name} expired — income penalty & Heat.`, 'bad');
  state.racket = null;
}
function resolveRacket(useEnergy) {
  const r = state.racket;
  if (!r || r.expiry < now()) { addLog('No active racket.', 'bad'); return; }
  const rt = RACKET_TYPES.find(x => x.id === r.type);
  if (rt.resource === 'stamina' || (rt.resource === 'either' && !useEnergy)) {
    if (Math.floor(state.stamina) < rt.cost) { addLog(`Need ${rt.cost} stamina.`, 'bad'); return; }
    state.stamina -= rt.cost;
  } else {
    if (Math.floor(state.energy) < rt.cost) { addLog(`Need ${rt.cost} energy.`, 'bad'); return; }
    state.energy -= rt.cost;
  }
  const lump = gainCash(propIncomePerMin(r.prop, state.props[r.prop] || 1) * rnd(8, 15), 'racket');
  state.propBoosts[r.prop] = { mult: 1.5, until: now() + (5 + Math.floor(Math.random() * 10)) * 60 * 1000 };
  state.counters.rackets = (state.counters.rackets || 0) + 1;
  state.racket = null;
  addLog(`📦 Racket cleared at ${PROPERTIES[r.prop].name}! +$${fmt(lump)} and income boost.`, 'good');
  afterAction();
}

// ---------------------------------------------------------------- weeklies
function generateWeeklies() {
  const week = utcWeek();
  const rng = mulberry32(week * 7919 + (state.prestige || 0));
  state.weeklies = [
    { id: 'w_jobs', type: 'jobs', need: 80 + Math.floor(rng() * 60), progress: 0, claimed: false, reward: { gold: 3, scrap: 40 } },
    { id: 'w_turf', type: 'turf', need: 3 + Math.floor(rng() * 4), progress: 0, claimed: false, reward: { gold: 4, ball: 15 } },
    { id: 'w_heist', type: 'heists', need: Math.max(1, 2 + Math.floor(rng() * 2)), progress: 0, claimed: false, reward: { gold: 5, alloy: 4 } },
  ];
  state.weekId = week;
  state.freeWeeklyReroll = true;
}
function ensureWeeklies() {
  if (state.weekId !== utcWeek() || !state.weeklies || !state.weeklies.length) generateWeeklies();
}
function progressWeeklies(type, amount) {
  if (!amount) return;
  ensureWeeklies();
  for (const w of state.weeklies) {
    if (!w.claimed && w.type === type) w.progress = Math.min(w.need, w.progress + amount);
  }
}
function claimWeekly(id) {
  ensureWeeklies();
  const w = state.weeklies.find(x => x.id === id);
  if (!w || w.claimed || w.progress < w.need) return;
  w.claimed = true;
  state.counters.weeklies = (state.counters.weeklies || 0) + 1;
  if (w.reward.gold) state.gold += w.reward.gold;
  if (w.reward.scrap) state.mats.scrap += w.reward.scrap;
  if (w.reward.ball) state.mats.ball += w.reward.ball;
  if (w.reward.alloy) state.mats.alloy += w.reward.alloy;
  addLog('📅 Weekly goal claimed!', 'gold');
  afterAction();
}
function rerollWeeklies() {
  ensureWeeklies();
  if (state.freeWeeklyReroll) {
    state.freeWeeklyReroll = false;
    generateWeeklies();
    addLog('📅 Free weekly reroll used.', 'info');
    afterAction();
    return;
  }
  if (state.gold < 3) { addLog('Weekly reroll costs 3 ◈.', 'bad'); return; }
  state.gold -= 3;
  generateWeeklies();
  addLog('📅 Weeklies rerolled.', 'info');
  afterAction();
}

// ---------------------------------------------------------------- story
function storyNeedMet(ch) {
  const c = STORY_CHAPTERS[ch];
  if (!c) return false;
  if (c.type === 'jobs') return state.counters.jobs >= c.need;
  if (c.type === 'bossKills') return state.counters.bossKills >= c.need;
  if (c.type === 'vehicle') return Object.values(state.vehicles || {}).some(l => l > 0);
  if (c.type === 'heists') return (state.counters.heists || 0) >= c.need;
  if (c.type === 'raidsWon') return (state.counters.raidsWon || 0) >= c.need;
  if (c.type === 'props') return Object.keys(state.props).filter(i => state.props[i] > 0).length >= c.need;
  if (c.type === 'crew') return Object.values(state.crew || {}).some(l => l > 0);
  if (c.type === 'level') return state.level >= c.need;
  return false;
}
function bumpStory() { /* progress is counter-based */ }
function claimStory() {
  const ch = state.storyChapter || 0;
  if (ch >= STORY_CHAPTERS.length) { addLog('Story complete.', 'info'); return; }
  if (!storyNeedMet(ch)) { addLog('Story requirement not met yet.', 'bad'); return; }
  const c = STORY_CHAPTERS[ch];
  state.gold += c.gold;
  const setPick = SET_IDS[ch % SET_IDS.length];
  const slot = SLOTS[ch % 3];
  const gear = genItem(Math.max(state.level, 5 + ch), ch >= 6 ? 'epic' : 'rare', slot, setPick);
  gear.name = "Don's " + gear.name;
  state.inv.push(gear);
  enforceStash();
  state.storyChapter = ch + 1;
  addLog(`📖 <b>Chapter complete:</b> ${c.title} — +${c.gold} ◈ and ${itemHtml(gear)}`, 'gold');
  afterAction();
}


// ---------------------------------------------------------------- hideout
function hideoutUpgradeCost(id) {
  const r = HIDEOUT_ROOMS.find(x => x.id === id);
  const lvl = hideoutLevel(id);
  return {
    cash: Math.round(r.base * g(Math.max(1, state.level)) * Math.pow(1.45, lvl)),
    scrap: r.scrap * (lvl + 1),
    ball: r.ball * (lvl + 1),
    alloy: r.alloy * (lvl + 1),
  };
}
function upgradeHideout(id) {
  const c = hideoutUpgradeCost(id);
  if (state.cash < c.cash || state.mats.scrap < c.scrap || state.mats.ball < c.ball || state.mats.alloy < c.alloy) {
    addLog('Not enough cash/materials for hideout upgrade.', 'bad'); return;
  }
  state.cash -= c.cash; state.mats.scrap -= c.scrap; state.mats.ball -= c.ball; state.mats.alloy -= c.alloy;
  state.hideout[id] = hideoutLevel(id) + 1;
  addLog(`🏚️ Upgraded <b>${HIDEOUT_ROOMS.find(r => r.id === id).name}</b> to Lv ${state.hideout[id]}.`, 'good');
  afterAction();
}

// ---------------------------------------------------------------- talents
function buyTalent(id) {
  if (state.level < 12) { addLog('Talents unlock at level 12.', 'bad'); return; }
  let node = null, branch = null;
  for (const [b, nodes] of Object.entries(TALENT_TREE)) {
    const n = nodes.find(x => x.id === id);
    if (n) { node = n; branch = b; break; }
  }
  if (!node) return;
  if (hasTalent(id)) { addLog('Already owned.', 'info'); return; }
  const idx = TALENT_TREE[branch].findIndex(x => x.id === id);
  if (idx > 0 && !hasTalent(TALENT_TREE[branch][idx - 1].id)) { addLog('Unlock previous node first.', 'bad'); return; }
  if (idx === 3) {
    const finals = ['v4', 'b4', 'g4'];
    if (finals.some(f => f !== id && hasTalent(f))) { addLog('Only one branch finale allowed. Respec to switch.', 'bad'); return; }
  }
  if ((state.talentPoints || 0) < node.cost) { addLog('Need more talent points.', 'bad'); return; }
  state.talentPoints -= node.cost;
  state.talents[id] = true;
  addLog(`🧠 Learned <b>${node.name}</b>.`, 'gold');
  afterAction();
}
function respecTalents() {
  if (state.gold < 8) { addLog('Respec costs 8 ◈.', 'bad'); return; }
  let refund = 0;
  for (const nodes of Object.values(TALENT_TREE)) for (const n of nodes) if (hasTalent(n.id)) refund += n.cost;
  if (!refund) { addLog('No talents to respec.', 'info'); return; }
  state.gold -= 8;
  state.talents = {};
  state.talentPoints = (state.talentPoints || 0) + refund;
  addLog(`🧠 Talents reset. Refunded ${refund} points (−8 ◈).`, 'info');
  afterAction();
}

// ---------------------------------------------------------------- arena
function arenaFighter() {
  const rank = state.arenaRank || 0;
  const name = ARENA_NAMES[rank % ARENA_NAMES.length] + (rank >= ARENA_NAMES.length ? ' ' + roman(Math.floor(rank / ARENA_NAMES.length) + 1) : '');
  const bl = Math.max(6, state.level);
  return {
    name,
    hp: Math.round(180 * g(bl) * Math.pow(1.18, rank)),
    atk: 5 * g(bl) * Math.pow(1.12, rank),
    def: 3 * g(bl) * Math.pow(1.1, rank),
    stamina: 4,
    cash: 60 * g(bl) * Math.pow(1.15, rank),
    xp: 35 * g(bl) * Math.pow(1.1, rank),
  };
}
function fightArena() {
  if (jailBlock('arena')) return;
  if (state.level < 6) { addLog('Arena unlocks at level 6.', 'bad'); return; }
  const f = arenaFighter();
  if (Math.floor(state.stamina) < f.stamina) { addLog(`Need ${f.stamina} stamina.`, 'bad'); return; }
  if (state.hp <= 1) { addLog('Too injured.', 'bad'); return; }
  state.stamina -= f.stamina;
  tickCombatBuffs();
  let hp = f.hp, taken = 0, rounds = 0;
  while (hp > 0 && state.hp > 1 && rounds < 40) {
    rounds++;
    const crit = Math.random() < critChance() + combatCrit();
    hp -= Math.max(1, Math.round(totalAtk() * combatAtkMult() * warRoomArenaBonus() * (1 + talentArena()) * rnd(0.85, 1.15) * (crit ? 2 : 1) - f.def * 0.25));
    if (hp <= 0) break;
    const ret = Math.max(0, Math.round(f.atk * rnd(0.8, 1.2) - (totalDef() + combatDefBonus()) * 0.5));
    state.hp = Math.max(1, state.hp - ret); taken += ret;
  }
  if (hp > 0) {
    state.arenaStreak = 0;
    addHeat(3);
    addLog(`🥊 Lost to <b>${f.name}</b>. Streak reset. Took ${fmt(taken)} damage.`, 'bad');
    afterAction();
    return;
  }
  const streakMult = warRoomArenaBonus();
  const cash = gainCash(f.cash * streakMult, 'arena');
  const xp = gainXp(f.xp * streakMult, 'arena');
  state.arenaStreak = (state.arenaStreak || 0) + 1;
  state.counters.arenaWins = (state.counters.arenaWins || 0) + 1;
  state.counters.arenaBest = Math.max(state.counters.arenaBest || 0, state.arenaStreak);
  state.arenaTokens = (state.arenaTokens || 0) + 1 + Math.floor(state.arenaStreak / 3);
  state.influence = (state.influence || 0) + 1;
  state.arenaRank = (state.arenaRank || 0) + 1;
  addLog(`🥊 Beat <b>${f.name}</b>! +$${fmt(cash)}, +${fmt(xp)} XP, streak ${state.arenaStreak}.`, 'gold');
  if ([3, 5, 10].includes(state.arenaStreak)) {
    const ggain = state.arenaStreak === 10 ? 3 : state.arenaStreak === 5 ? 2 : 1;
    state.gold += ggain;
    state.mats.ball += state.arenaStreak;
    addLog(`🏆 Streak ${state.arenaStreak}! +${ggain} ◈ and materials.`, 'gold');
  }
  maybeDropCollection('arena');
  afterAction();
}

// ---------------------------------------------------------------- collections
function maybeDropCollection(source) {
  if (Math.random() > 0.1) return;
  const c = COLLECTIONS[Math.floor(Math.random() * COLLECTIONS.length)];
  const cur = state.collections[c.id] || 0;
  if (cur >= c.tokens) return;
  state.collections[c.id] = cur + 1;
  addLog(`🧿 Collection: <b>${c.name}</b> ${cur + 1}/${c.tokens} (from ${source})`, 'info');
  if (cur + 1 >= c.tokens) addLog(`🧿 <b>${c.name}</b> complete! Permanent bonus unlocked.`, 'gold');
}

// ---------------------------------------------------------------- hits
function generateHits() {
  const day = utcDay();
  const rng = mulberry32(day * 4243 + (state.prestige || 0));
  const hits = [];
  for (let i = 0; i < 2; i++) {
    const name = HIT_NAMES[Math.floor(rng() * HIT_NAMES.length)];
    const turf = Math.floor(rng() * Math.min(4, Math.max(1, Math.floor(state.level / 4))));
    hits.push({
      id: 'hit_' + day + '_' + i,
      name, turf,
      prep: null,
      done: false,
      level: Math.max(5, state.level + Math.floor(rng() * 3) - 1),
    });
  }
  state.hits = hits;
  state.hitDay = day;
}
function ensureHits() {
  if (state.level < 10) return;
  if (state.hitDay !== utcDay() || !state.hits || !state.hits.length) generateHits();
}
function prepHit(id, kind) {
  ensureHits();
  const h = state.hits.find(x => x.id === id);
  if (!h || h.done) return;
  if (kind === 'scout') {
    if (Math.floor(state.energy) < 4) { addLog('Need 4 energy to scout.', 'bad'); return; }
    state.energy -= 4; h.prep = 'scout';
  } else if (kind === 'bribe') {
    const cost = Math.round(80 * g(h.level));
    if (state.cash < cost) { addLog(`Bribe costs $${fmt(cost)}.`, 'bad'); return; }
    state.cash -= cost; h.prep = 'bribe';
  } else if (kind === 'muscle') {
    if (Math.floor(state.stamina) < 3) { addLog('Need 3 stamina.', 'bad'); return; }
    state.stamina -= 3; h.prep = 'muscle';
  }
  addLog(`🎯 Prep (${kind}) ready on <b>${h.name}</b>.`, 'info');
  afterAction();
}
function executeHit(id) {
  if (jailBlock('hits')) return;
  ensureHits();
  const h = state.hits.find(x => x.id === id);
  if (!h || h.done) return;
  if (Math.floor(state.stamina) < 5) { addLog('Need 5 stamina to execute.', 'bad'); return; }
  if (state.hp <= 1) { addLog('Too injured.', 'bad'); return; }
  state.stamina -= 5;
  let chance = 0.55 + totalAtk() / (100 * g(h.level)) * 0.2;
  if (h.prep === 'scout') chance += 0.15;
  if (h.prep === 'muscle') chance += 0.1;
  const success = Math.random() < clamp(chance, 0.25, 0.92);
  if (!success) {
    addHeat(10); addWanted(1);
    addLog(`🎯 Hit on <b>${h.name}</b> failed. Heat & Wanted up.`, 'bad');
    h.done = true;
    afterAction();
    return;
  }
  h.done = true;
  state.counters.hits = (state.counters.hits || 0) + 1;
  const cash = gainCash(200 * g(h.level), 'hit');
  const xp = gainXp(90 * g(h.level), 'hit');
  state.mats.alloy += 1; state.mats.ball += 4;
  state.influence = (state.influence || 0) + 3;
  if (h.prep === 'bribe') addHeat(2); else addHeat(8);
  maybeDropCollection('hit');
  addLog(`🎯 <b>${h.name}</b> eliminated. +$${fmt(cash)}, +${fmt(xp)} XP, +3 Influence.`, 'gold');
  afterAction();
}

// ---------------------------------------------------------------- influence
function unlockContact(id) {
  const c = INFLUENCE_CONTACTS.find(x => x.id === id);
  if (!c) return;
  if (state.influenceContacts[id]) { addLog('Already unlocked.', 'info'); return; }
  if ((state.storyChapter || 0) < c.needStory) { addLog(`Requires Don story chapter ${c.needStory}.`, 'bad'); return; }
  const cost = Math.round(c.cost * g(Math.max(1, state.level)));
  if (state.cash < cost) { addLog(`Need $${fmt(cost)}.`, 'bad'); return; }
  state.cash -= cost;
  state.influenceContacts[id] = true;
  addLog(`🤝 Unlocked contact: <b>${c.name}</b>.`, 'gold');
  afterAction();
}
function buyInfluenceBuff(id) {
  const b = INFLUENCE_BUFFS.find(x => x.id === id);
  if (!b) return;
  const unlocked = Object.values(state.influenceContacts || {}).filter(Boolean).length;
  if (!unlocked) { addLog('Unlock a contact first.', 'bad'); return; }
  if ((state.influence || 0) < b.cost) { addLog(`Need ${b.cost} Influence.`, 'bad'); return; }
  state.influence -= b.cost;
  state.influenceBuffs[b.effect] = Math.max(now(), state.influenceBuffs[b.effect] || 0) + b.mins * 60000;
  addLog(`🤝 City buff active: <b>${b.name}</b> (${b.mins} min).`, 'gold');
  afterAction();
}

// ---------------------------------------------------------------- smuggling
function startSmuggle(routeId) {
  if (jailBlock('smuggling')) return;
  if (state.smuggle && state.smuggle.arrive > now()) { addLog('A shipment is already in transit.', 'bad'); return; }
  const r = SMUGGLE_ROUTES.find(x => x.id === routeId);
  if (!r) return;
  if (!state.vehicleActive || !vehicleLevel(state.vehicleActive)) { addLog('Assign an active vehicle first.', 'bad'); return; }
  if (Math.floor(state.energy) < r.energy) { addLog(`Need ${r.energy} energy.`, 'bad'); return; }
  state.energy -= r.energy;
  const speed = 1 + talentSmuggleSpeed() + (influenceBuffActive('smuggle') ? 0.2 : 0) + vehicleTier() * 0.03;
  const mins = r.mins / speed;
  state.smuggle = { route: routeId, arrive: now() + mins * 60000, started: now() };
  addLog(`🚢 Shipment en route: <b>${r.name}</b> (~${fmtTime(mins * 60)}).`, 'info');
  afterAction();
}
function resolveSmuggle() {
  const s = state.smuggle;
  if (!s || s.arrive > now()) return false;
  const r = SMUGGLE_ROUTES.find(x => x.id === s.route);
  const risk = clamp(0.15 + state.heat / 200 - vehicleTier() * 0.02 - (influenceBuffActive('smuggle') ? 0.1 : 0), 0.05, 0.5);
  state.smuggle = null;
  if (Math.random() < risk) {
    addHeat(12); addWanted(1);
    const salvage = gainCash(40 * g(state.level) * r.cashMult * 0.3, 'smuggle');
    addLog(`🚢 Shipment seized! Partial salvage $${fmt(salvage)}. Heat/Wanted up.`, 'bad');
    return true;
  }
  const cash = gainCash(150 * g(state.level) * r.cashMult * (1 + vehicleTier() * 0.05), 'smuggle');
  const xp = gainXp(50 * g(state.level), 'smuggle');
  state.counters.smuggles = (state.counters.smuggles || 0) + 1;
  state.influence = (state.influence || 0) + 2;
  addHeat(4 * vehicleHeatReduce());
  maybeDropCollection('smuggle');
  if (Math.random() < 0.25) { state.mats.alloy += 1; addLog('💎 Smuggled a Rare Alloy!', 'gold'); }
  addLog(`🚢 <b>${r.name}</b> delivered! +$${fmt(cash)}, +${fmt(xp)} XP.`, 'good');
  return true;
}
function tickSmuggle() {
  if (state.smuggle && state.smuggle.arrive <= now()) {
    if (resolveSmuggle()) { /* logged */ }
  }
}


// ---------------------------------------------------------------- prestige shop
function prestigeShopCost(id) {
  const item = PRESTIGE_SHOP.find(x => x.id === id);
  if (item.oneShot) return item.cost;
  const lvl = pUp(item.key);
  return 1 + Math.floor(lvl * 1.2) + Math.floor(lvl * lvl * 0.15);
}
function buyPrestigeUpgrade(id) {
  if ((state.prestige || 0) < 1 && id !== 'preview') {
    addLog('Prestige Shop unlocks after your first Rebuild.', 'bad'); return;
  }
  const item = PRESTIGE_SHOP.find(x => x.id === id);
  if (!item) return;
  if (item.oneShot && pUp(item.key) > 0) { addLog('Mythic Crate already purchased.', 'info'); return; }
  const cost = prestigeShopCost(id);
  if ((state.prestigePoints || 0) < cost) { addLog(`Need ${cost} Prestige Points.`, 'bad'); return; }
  state.prestigePoints -= cost;
  state.counters.ppSpent = (state.counters.ppSpent || 0) + cost;
  state.prestigeUpgrades[item.key] = pUp(item.key) + 1;
  if (item.id === 'crate') {
    const it = genItem(Math.max(state.level, 20) + 2, 'mythic');
    state.inv.push(it); enforceStash();
    addLog(`💠 Mythic Crate: ${itemHtml(it)}`, 'gold');
  } else if (item.id === 'lungs') {
    state.maxEnergy += 1; state.energy += 1;
    state.maxStamina += 1; state.stamina += 1;
    addLog(`💠 Purchased <b>${item.name}</b> (Lv ${pUp(item.key)}).`, 'gold');
  } else {
    addLog(`💠 Purchased <b>${item.name}</b> (Lv ${pUp(item.key)}) for ${cost} PP.`, 'gold');
  }
  afterAction();
}

// ---------------------------------------------------------------- army
function armyUpgradeCost(id) {
  const u = ARMY_UNITS.find(x => x.id === id);
  const lvl = armyLevel(id);
  return Math.round(u.hire * g(Math.max(1, state.level)) * Math.pow(1.4, lvl));
}
function upgradeArmy(id) {
  if (state.level < 20) { addLog('Army unlocks at level 20.', 'bad'); return; }
  const cost = armyUpgradeCost(id);
  if (state.cash < cost) { addLog(`Need $${fmt(cost)}.`, 'bad'); return; }
  state.cash -= cost;
  state.army[id] = armyLevel(id) + 1;
  const u = ARMY_UNITS.find(x => x.id === id);
  // apply energy/stamina bonuses immediately when recruiting drivers/runners
  if (u.energy) { state.maxEnergy += u.energy; state.energy += u.energy; }
  if (u.stamina) { state.maxStamina += u.stamina; state.stamina += u.stamina; }
  addLog(`🪖 Recruited <b>${u.name}</b> to Lv ${state.army[id]}.`, 'good');
  afterAction();
}
function armyUpkeepPerMin() {
  const levels = armyTotalLevels();
  if (levels <= 0) return 0;
  const raw = levels * 2 * g(Math.max(1, state.level)) * 0.05;
  return Math.min(raw, totalIncomePerMin() * 0.25);
}

// ---------------------------------------------------------------- syndicate wars
function ensureSyndicate() {
  if ((state.prestige || 0) < 1) return;
  const week = utcWeek();
  if (!state.syndicate || state.syndicate.week !== week) {
    const clears = (state.syndicate && state.syndicate.clears) || 0;
    const name = SYNDICATE_NAMES[week % SYNDICATE_NAMES.length];
    const bl = Math.max(state.level, 40);
    const maxHp = Math.round(2000 * g(bl) * Math.pow(1.15, state.prestige) * Math.pow(1.2, clears));
    state.syndicate = {
      week, name, clears,
      maxHp, hp: maxHp,
      atk: 12 * g(bl) * Math.pow(1.12, state.prestige),
      def: 8 * g(bl) * Math.pow(1.1, state.prestige),
      stamina: 6,
    };
  }
}
function hitSyndicate(times) {
  if (jailBlock('syndicate war')) return;
  if ((state.prestige || 0) < 1) { addLog('Syndicate Wars unlock after first prestige.', 'bad'); return; }
  ensureSyndicate();
  const s = state.syndicate;
  let hits = 0, dmgTot = 0, taken = 0, killed = false;
  while (hits < times) {
    if (Math.floor(state.stamina) < s.stamina) { if (!hits) { addLog(`Need ${s.stamina} stamina.`, 'bad'); return; } break; }
    if (state.hp <= 1) { if (!hits) { addLog('Too injured.', 'bad'); return; } break; }
    state.stamina -= s.stamina; hits++;
    tickCombatBuffs();
    const crit = Math.random() < critChance() + combatCrit();
    const dmg = Math.max(1, Math.round(totalAtk() * combatAtkMult() * bossDmgMult() * rnd(0.85, 1.15) * (crit ? 2 : 1) - s.def * 0.25));
    s.hp -= dmg; dmgTot += dmg;
    if (s.hp <= 0) { killed = true; break; }
    const ret = Math.max(0, Math.round(s.atk * rnd(0.8, 1.2) - (totalDef() + combatDefBonus()) * 0.5));
    state.hp = Math.max(0, state.hp - ret); taken += ret;
    if (state.hp <= 0) { state.hp = 1; addLog('🚑 Syndicate forces put you down. Retreat.', 'bad'); break; }
  }
  if (!hits) return;
  addLog(`☠️ War strike ×${hits} on <b>${s.name}</b> for ${fmt(dmgTot)}${taken ? `, took ${fmt(taken)}` : ''}.`, '');
  if (killed) {
    s.clears = (s.clears || 0) + 1;
    state.counters.syndicate = (state.counters.syndicate || 0) + 1;
    const cash = gainCash(500 * g(state.level) * Math.pow(1.2, s.clears), 'syndicate');
    const xp = gainXp(200 * g(state.level), 'syndicate');
    const pp = 1 + (Math.random() < 0.35 ? 1 : 0);
    state.prestigePoints = (state.prestigePoints || 0) + pp;
    state.mats.shard = (state.mats.shard || 0) + 1 + Math.floor(Math.random() * 2);
    addLog(`☠️ <b>${s.name} DEFEATED!</b> +$${fmt(cash)}, +${fmt(xp)} XP, +${pp} PP, Mythic Shards.`, 'gold');
    if (Math.random() < 0.35) {
      const it = genItem(state.level + 3, 'mythic');
      state.inv.push(it); enforceStash();
      addLog(`🩸 Mythic drop: ${itemHtml(it)}`, 'gold');
    }
    const bl = Math.max(state.level, 40);
    s.maxHp = Math.round(2000 * g(bl) * Math.pow(1.15, state.prestige) * Math.pow(1.2, s.clears));
    s.hp = s.maxHp;
    s.atk *= 1.08; s.def *= 1.08;
  }
  afterAction();
}

// ---------------------------------------------------------------- the climb (infinite PVE)
function climbFloor() { return (state.climb && state.climb.floor) || 1; }
function climbEnemy(floor) {
  const seed = floor * 2654435761 % 4294967296;
  const rng = mulberry32(seed);
  const name = CLIMB_NAMES[floor % CLIMB_NAMES.length] + ' · Floor ' + floor;
  const pr = state.prestige || 0;
  const affixes = [];
  const nAff = floor < 5 ? 0 : floor < 20 ? 1 : 2;
  const pool = CLIMB_AFFIXES.slice();
  for (let i = 0; i < nAff && pool.length; i++) {
    affixes.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  const aff = id => affixes.find(a => a.id === id);
  const hp = Math.round(300 * g(floor) * (1 + floor * 0.04) * Math.pow(1.1, pr));
  let atk = 6 * g(floor) * Math.pow(1.08, pr);
  let def = 4 * g(floor) * Math.pow(1.08, pr);
  if (aff('armored')) def *= aff('armored').def;
  if (aff('brutal')) atk *= aff('brutal').atk;
  return { floor, name, maxHp: hp, hp, atk, def, stamina: 4, affixes };
}
function ensureClimbEnemy() {
  if (!state.climb) state.climb = { floor: 1, best: 0, enemy: null, auto: false };
  if (!state.climb.enemy || state.climb.enemy.floor !== state.climb.floor) {
    state.climb.enemy = climbEnemy(state.climb.floor);
  }
  return state.climb.enemy;
}
function updateClimbRank() {
  const best = (state.climb && state.climb.best) || 0;
  const rank = Math.floor(best / 10);
  if (rank > (state.climbRank || 0)) {
    state.climbRank = rank;
    addLog(`🏙️ <b>Climb Rank ${rank}!</b> Permanent +${(rank * 2)}% cash/XP and +${rank}% ATK.`, 'gold');
  }
  state.climbRank = Math.max(state.climbRank || 0, rank);
}
function climbAffix(e, id) { return e.affixes && e.affixes.find(a => a.id === id); }
function climbStrike(times) {
  if (jailBlock('the climb')) return;
  if (state.pendingRaid) { addLog('🚨 Resolve the Police Raid first!', 'bad'); return; }
  const e = ensureClimbEnemy();
  let hits = 0, dmgTot = 0, taken = 0, killed = false;
  while (hits < times) {
    if (Math.floor(state.stamina) < e.stamina) { if (!hits) { addLog(`Need ${e.stamina} stamina to strike.`, 'bad'); return; } break; }
    if (state.hp <= 1) { if (!hits) { addLog('Too injured — heal before climbing.', 'bad'); return; } break; }
    state.stamina -= e.stamina; hits++;
    tickCombatBuffs();
    const evasive = climbAffix(e, 'evasive');
    if (evasive && Math.random() < evasive.dodge) {
      // enemy dodges; still takes retaliation
    } else {
      const crit = Math.random() < critChance() + combatCrit();
      const dmg = Math.max(1, Math.round(totalAtk() * combatAtkMult() * bossDmgMult() * rnd(0.85, 1.15) * (crit ? 2 : 1) - e.def * 0.25));
      e.hp -= dmg; dmgTot += dmg;
    }
    const regen = climbAffix(e, 'regen');
    if (regen && e.hp > 0) e.hp = Math.min(e.maxHp, e.hp + Math.round(e.maxHp * regen.regen));
    if (e.hp <= 0) { killed = true; break; }
    let ret = Math.max(0, Math.round(e.atk * rnd(0.8, 1.2) - (totalDef() + combatDefBonus()) * 0.5));
    const vamp = climbAffix(e, 'vampiric');
    if (vamp && ret > 0) e.hp = Math.min(e.maxHp, e.hp + Math.round(ret * vamp.vamp));
    state.hp = Math.max(0, state.hp - ret); taken += ret;
    if (state.hp <= 0) { state.hp = 1; addLog('🚑 The floor beat you down. Heal and try again.', 'bad'); break; }
  }
  if (!hits) return;
  addHeat(0.3 * hits);
  if (killed) {
    const floor = state.climb.floor;
    const loot = climbAffix(e, 'mademan') ? climbAffix(e, 'mademan').loot : 1;
    const cash = gainCash(120 * g(floor) * (1 + floor * 0.05) * loot, 'climb');
    const xp = gainXp(60 * g(floor) * loot, 'climb');
    const intelGain = Math.max(1, Math.round((1 + floor * 0.15) * loot));
    state.intel = (state.intel || 0) + intelGain;
    state.counters.climbClears = (state.counters.climbClears || 0) + 1;
    let extra = '';
    if (floor % 25 === 0) {
      state.mats.shard = (state.mats.shard || 0) + 2;
      const it = genItem(state.level + 3, floor % 100 === 0 ? 'mythic' : 'legendary');
      state.inv.push(it); enforceStash();
      extra = ` <b>Milestone!</b> +2 Mythic Shards, dropped ${itemHtml(it)}`;
    } else if (floor % 5 === 0) {
      const it = genItem(state.level + 1);
      state.inv.push(it); enforceStash();
      extra = ` Dropped ${itemHtml(it)}`;
    }
    if (floor % 50 === 0) { state.prestigePoints = (state.prestigePoints || 0) + 2; extra += ' +2 PP'; }
    addLog(`🏙️ Cleared <b>Floor ${floor}</b> (${e.name.split(' · ')[0]}). +$${fmt(cash)}, +${fmt(xp)} XP, +${intelGain} Intel.${extra}`, 'gold');
    state.climb.floor = floor + 1;
    if (state.climb.floor - 1 > (state.climb.best || 0)) state.climb.best = state.climb.floor - 1;
    updateClimbRank();
    state.climb.enemy = climbEnemy(state.climb.floor);
    if (state.climb.auto && state.hp > 1 && Math.floor(state.stamina) >= state.climb.enemy.stamina) {
      afterAction();
      return climbStrike(times);
    }
  } else {
    addLog(`🏙️ Struck Floor ${state.climb.floor} ×${hits} for ${fmt(dmgTot)}${taken ? `, took ${fmt(taken)}` : ''}. (${fmt(Math.max(0, e.hp))} HP left)`, '');
  }
  afterAction();
}
function toggleAutoClimb() { state.climb.auto = !state.climb.auto; afterAction(); }
function resetClimb() {
  state.climb.floor = 1;
  state.climb.enemy = climbEnemy(1);
  addLog('🏙️ Returned to Floor 1. Your best floor is kept.', 'info');
  afterAction();
}
function climbCheckpoint() {
  const best = (state.climb && state.climb.best) || 0;
  const cp = Math.max(1, Math.floor(best / 10) * 10);
  state.climb.floor = cp;
  state.climb.enemy = climbEnemy(cp);
  addLog(`🏙️ Jumped to checkpoint Floor ${cp}.`, 'info');
  afterAction();
}

// ---------------------------------------------------------------- contraband (consumables)
function consumableCount(id) { return (state.consumables && state.consumables[id]) || 0; }
function canAfford(cost) {
  if (cost.cash && state.cash < cost.cash) return false;
  for (const m in (cost.mats || {})) if ((state.mats[m] || 0) < cost.mats[m]) return false;
  return true;
}
function buyConsumable(id, useMats) {
  const c = CONSUMABLE_IDX[id];
  if (!c) return;
  if (useMats) {
    for (const m in (c.mats || {})) if ((state.mats[m] || 0) < c.mats[m]) { addLog(`Need ${c.mats[m]} ${MATS[m]}.`, 'bad'); return; }
    for (const m in (c.mats || {})) state.mats[m] -= c.mats[m];
    addLog(`🧪 Brewed <b>${c.name}</b>.`, 'good');
  } else {
    const cost = Math.round(c.cash * g(Math.max(1, state.level)) / g(1) * 0.4 + c.cash);
    if (state.cash < cost) { addLog(`Need $${fmt(cost)}.`, 'bad'); return; }
    state.cash -= cost;
    addLog(`🛒 Bought <b>${c.name}</b> for $${fmt(cost)}.`, 'good');
  }
  state.consumables[id] = consumableCount(id) + 1;
  afterAction();
}
function consumableCashCost(id) {
  const c = CONSUMABLE_IDX[id];
  return Math.round(c.cash * g(Math.max(1, state.level)) / g(1) * 0.4 + c.cash);
}
function useConsumable(id) {
  const c = CONSUMABLE_IDX[id];
  if (!c) return;
  if (consumableCount(id) <= 0) { addLog(`No ${c.name} in stock.`, 'bad'); return; }
  if (!state.combatBuffs) state.combatBuffs = {};
  if (c.instant === 'heal') {
    const heal = Math.round(maxHp() * 0.55);
    state.hp = Math.min(maxHp(), state.hp + heal);
    addLog(`💊 Painkillers restored ${fmt(heal)} HP.`, 'good');
  } else if (c.instant === 'smoke') {
    if (state.climb && state.climb.enemy) { state.climb.enemy = climbEnemy(state.climb.floor); addLog('💨 Smoke bomb — current floor enemy reset.', 'info'); }
    else { addLog('💨 Nothing to smoke here.', 'info'); return; }
  } else {
    state.combatBuffs[id] = c.dur;
    addLog(`${c.icon} <b>${c.name}</b> active for ${c.dur} strikes.`, 'gold');
  }
  state.consumables[id] = consumableCount(id) - 1;
  state.counters.consumablesUsed = (state.counters.consumablesUsed || 0) + 1;
  afterAction();
}

// ---------------------------------------------------------------- gunsmith (gear modding)
function reforgeCost() { return { intel: 5 + (state.climbRank || 0), mats: { alloy: 3 } }; }
function enchantCost() { return { intel: 12 + (state.climbRank || 0) * 2, mats: { shard: 1 } }; }
function payCost(cost) {
  if ((state.intel || 0) < (cost.intel || 0)) return false;
  for (const m in (cost.mats || {})) if ((state.mats[m] || 0) < cost.mats[m]) return false;
  state.intel -= (cost.intel || 0);
  for (const m in (cost.mats || {})) state.mats[m] -= cost.mats[m];
  return true;
}
function reforgeItem(slot) {
  const it = state.equip[slot];
  if (!it) { addLog('Nothing equipped in that slot.', 'bad'); return; }
  const cost = reforgeCost();
  if (!payCost(cost)) { addLog(`Reforge needs ${cost.intel} Intel + ${cost.mats.alloy} ${MATS.alloy}.`, 'bad'); return; }
  const rar = RARITIES[RAR_IDX[it.rarity]];
  const budget = 10 * g(it.lvl) * rar.mult * rnd(0.9, 1.1);
  const atkShare = it.slot === 'weapon' ? 0.8 : it.slot === 'armor' ? 0.2 : 0.5;
  it.atk = Math.max(0, Math.round(budget * atkShare));
  it.def = Math.max(0, Math.round(budget * (1 - atkShare)));
  addLog(`🔧 Reforged <b>${esc(it.name)}</b> → +${fmt(it.atk)} ATK / +${fmt(it.def)} DEF.`, 'gold');
  state.counters.mods = (state.counters.mods || 0) + 1;
  afterAction();
}
function enchantItem(slot) {
  const it = state.equip[slot];
  if (!it) { addLog('Nothing equipped in that slot.', 'bad'); return; }
  const cost = enchantCost();
  if (!payCost(cost)) { addLog(`Enchant needs ${cost.intel} Intel + ${cost.mats.shard} ${MATS.shard}.`, 'bad'); return; }
  if (!it.mods) it.mods = [];
  const pick = GEAR_MODS[Math.floor(Math.random() * GEAR_MODS.length)];
  let val;
  if (pick.kind === 'flat') val = Math.max(1, Math.round(6 * g(it.lvl) * rnd(0.4, 0.8)));
  else if (pick.kind === 'crit') val = +(rnd(0.03, 0.08)).toFixed(3);
  else val = +(rnd(0.05, 0.12)).toFixed(3);
  const mod = { stat: pick.stat, val };
  const cap = maxModSlots(it.rarity);
  if (it.mods.length < cap) it.mods.push(mod);
  else it.mods[Math.floor(Math.random() * it.mods.length)] = mod;
  addLog(`✨ Enchanted <b>${esc(it.name)}</b> → [${modText(it).trim()}].`, 'gold');
  state.counters.mods = (state.counters.mods || 0) + 1;
  afterAction();
}

// ---------------------------------------------------------------- prestige
function canPrestige() {
  return state.level >= PRESTIGE_LEVEL;
}
function doPrestige() {
  if (!canPrestige()) { addLog(`Reach level ${PRESTIGE_LEVEL} to Rebuild the Empire.`, 'bad'); return; }
  const ppGain = 5 + Math.floor(state.level / 10) + (state.prestige || 0);
  const goldGain = 5 + pUp('chest');
  if (!confirm(`Rebuild the Empire?\n\nKeep: Gold, Achievements, Crew, Army, Prestige Shop, Hideout, Vehicles, Spec, Story, Collections, half mastery.\n\nGain: Prestige +1 (×${(Math.pow(1.08, state.prestige + 1)).toFixed(2)}), +${goldGain} Gold Bonds, +${ppGain} Prestige Points.`)) return;

  const kept = {
    gold: state.gold + goldGain,
    ach: state.ach.slice(),
    crew: Object.assign({}, state.crew),
    army: Object.assign({}, state.army),
    vehicles: Object.assign({}, state.vehicles),
    vehicleActive: state.vehicleActive,
    hideout: Object.assign({}, state.hideout),
    talents: Object.assign({}, state.talents),
    talentPoints: (state.talentPoints || 0) + 1,
    collections: Object.assign({}, state.collections),
    influenceContacts: Object.assign({}, state.influenceContacts),
    influence: Math.floor((state.influence || 0) * 0.5),
    arenaTokens: state.arenaTokens || 0,
    prestigePoints: (state.prestigePoints || 0) + ppGain,
    prestigeUpgrades: Object.assign({}, state.prestigeUpgrades),
    mats: { scrap: 0, ball: 0, alloy: 0, shard: (state.mats && state.mats.shard) || 0 },
    intel: state.intel || 0,
    climbRank: state.climbRank || 0,
    climb: { floor: 1, best: (state.climb && state.climb.best) || 0, enemy: null, auto: false },
    consumables: Object.assign({}, state.consumables),
    spec: state.spec,
    prestige: state.prestige + 1,
    storyChapter: state.storyChapter || 0,
    mastery: {},
    autoSalvageCommons: state.autoSalvageCommons,
    created: state.created,
    counters: Object.assign({}, state.counters, { bossDmg: 0, propEarned: 0 }),
  };
  for (const [k, v] of Object.entries(state.mastery || {})) {
    kept.mastery[k] = Math.floor(v / 2);
  }
  const fresh = defaultState();
  Object.assign(state, fresh, kept);
  // Deep Lungs / army energy-stamina on fresh run
  const lung = prestigeShopLungs();
  const ae = armyFlat('energy'), ast = armyFlat('stamina');
  state.maxEnergy = 30 + lung + ae;
  state.energy = state.maxEnergy;
  state.maxStamina = 15 + lung + ast;
  state.stamina = state.maxStamina;
  state.version = 6;
  state.syndicate = null;
  state.combatBuffs = {};
  state.lastTick = now();
  const starter = genItem(1, 'common', 'weapon');
  starter.name = 'Rusty Switchblade';
  state.equip.weapon = starter;
  generateContracts();
  generateWeeklies();
  addLog(`♻️ <b>Empire Rebuilt!</b> Rank ${state.prestige} · +${ppGain} PP · ×${prestigeMult().toFixed(2)} cash/XP.`, 'gold');
  afterAction();
}

// ---------------------------------------------------------------- stats
function spendStat(stat, n) {
  n = Math.min(n, state.statPoints);
  if (n <= 0) { addLog('No stat points available. Level up to earn more!', 'bad'); return; }
  state.statPoints -= n;
  if (stat === 'atk') state.atk += n;
  else if (stat === 'def') state.def += n;
  else if (stat === 'stamina') { state.maxStamina += n; state.stamina += n; }
  else if (stat === 'energy') { state.maxEnergy += n; state.energy += n; }
  addLog(`📊 +${n} ${stat === 'atk' ? 'Attack' : stat === 'def' ? 'Defense' : stat === 'stamina' ? 'Max Stamina' : 'Max Energy'}.`, 'info');
  afterAction();
}

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!state.ach.includes(a.id) && a.cond(state)) {
      state.ach.push(a.id);
      state.gold += a.gold;
      addLog(`${a.icon} <b>Achievement:</b> ${a.name} — +${a.gold} Gold Bond${a.gold > 1 ? 's' : ''}!`, 'gold');
    }
  }
}

// ---------------------------------------------------------------- tick
function tick() {
  const t = now();
  const dt = clamp((t - state.lastTick) / 1000, 0, 120);
  state.lastTick = t;

  const regen = crewRegenBonus() * gymRegenBonus();
  state.energy = Math.min(state.maxEnergy, state.energy + EN_REGEN * regen * dt);
  state.stamina = Math.min(state.maxStamina, state.stamina + ST_REGEN * regen * dt);
  state.hp = Math.min(maxHp(), state.hp + maxHp() * HP_REGEN_PCT * dt);

  const inc = totalIncomePerMin() / 60 * dt * (cashBoosted() ? 2 : 1);
  if (inc > 0) {
    state.cash += inc;
    state.counters.propEarned += inc;
    progressContracts('prop', { amount: inc });
  }

  state.heat = clamp(state.heat - (HEAT_DECAY_PER_MIN / 60) * laundryHeatMult() * dt, 0, 100);
  if (state.heat < 40 && state.wanted > 0 && Math.random() < dt / 90) {
    state.wanted = Math.max(0, state.wanted - 1);
  }
  tickTurfDecay();
  ensureContracts();
  ensureWeeklies();
  ensureHits();
  maybeSpawnRacket();
  if (state.racket && state.racket.expiry <= now()) expireRacket();
  tickSmuggle();
  ensureSyndicate();
  const upkeep = armyUpkeepPerMin() / 60 * dt;
  if (upkeep > 0) state.cash = Math.max(0, state.cash - upkeep);

  updateHeader();
  if (activeTab === 'dashboard') renderTab();
  refreshAffordability();

  tickCount++;
  if (tickCount % 5 === 0) checkAchievements();
  if (tickCount % 15 === 0) save();
}

function applyOffline() {
  const away = clamp(now() - state.lastTick, 0, OFFLINE_CAP_MS);
  if (away < 5000) return;
  const sec = away / 1000;
  const regen = crewRegenBonus() * gymRegenBonus();
  const cashGain = Math.round(totalIncomePerMin() / 60 * sec * (cashBoosted() ? 2 : 1));
  state.cash += cashGain;
  state.counters.propEarned += cashGain;
  progressContracts('prop', { amount: cashGain });
  state.energy = Math.min(state.maxEnergy, state.energy + EN_REGEN * regen * sec);
  state.stamina = Math.min(state.maxStamina, state.stamina + ST_REGEN * regen * sec);
  state.hp = Math.min(maxHp(), state.hp + maxHp() * HP_REGEN_PCT * sec);
  state.heat = clamp(state.heat - (HEAT_DECAY_PER_MIN / 60) * laundryHeatMult() * sec, 0, 100);
  tickTurfDecay();
  tickSmuggle();
  state.lastTick = now();
  addLog(`🌙 Welcome back! While you were away (${fmtTime(sec)}) your empire earned <span class="good">$${fmt(cashGain)}</span> and your crew rested up.`, 'gold');
}

function updateHeader() {
  const $ = id => document.getElementById(id);
  $('h-cash').textContent = fmt(state.cash);
  $('h-gold').textContent = fmt(state.gold);
  $('h-level').textContent = state.level;
  $('h-heat').textContent = Math.floor(state.heat);
  if ($('h-wanted')) $('h-wanted').textContent = wantedStarsStr(state.wanted || 0);
  if ($('h-inf')) $('h-inf').textContent = fmt(Math.floor(state.influence || 0));
  if ($('h-pp')) $('h-pp').textContent = fmt(Math.floor(state.prestigePoints || 0));
  if ($('h-intel')) $('h-intel').textContent = fmt(Math.floor(state.intel || 0));
  const need = xpNeeded(state.level);
  $('h-xp-text').textContent = `${fmt(state.xp)} / ${fmt(need)}`;
  $('h-xp-bar').style.width = clamp(state.xp / need * 100, 0, 100) + '%';
  const regen = crewRegenBonus();
  $('h-en-text').textContent = `${Math.floor(state.energy)} / ${state.maxEnergy}`;
  $('h-en-bar').style.width = clamp(state.energy / state.maxEnergy * 100, 0, 100) + '%';
  $('h-en-timer').textContent = state.energy < state.maxEnergy ? `(+1 in ${Math.ceil((1 - (state.energy % 1)) / (EN_REGEN * regen))}s)` : '';
  $('h-st-text').textContent = `${Math.floor(state.stamina)} / ${state.maxStamina}`;
  $('h-st-bar').style.width = clamp(state.stamina / state.maxStamina * 100, 0, 100) + '%';
  $('h-st-timer').textContent = state.stamina < state.maxStamina ? `(+1 in ${Math.ceil((1 - (state.stamina % 1)) / (ST_REGEN * regen))}s)` : '';
  $('h-hp-text').textContent = `${fmt(Math.floor(state.hp))} / ${fmt(maxHp())}`;
  $('h-hp-bar').style.width = clamp(state.hp / maxHp() * 100, 0, 100) + '%';
  $('h-heat-text').textContent = `${Math.floor(state.heat)} / 100`;
  $('h-heat-bar').style.width = clamp(state.heat, 0, 100) + '%';
  if ($('h-en-compact')) $('h-en-compact').textContent = `${Math.floor(state.energy)}/${state.maxEnergy}`;
  if ($('h-st-compact')) $('h-st-compact').textContent = `${Math.floor(state.stamina)}/${state.maxStamina}`;
  if ($('h-hp-compact')) $('h-hp-compact').textContent = `${fmt(Math.floor(state.hp))}/${fmt(maxHp())}`;

  const badges = [];
  if (isJailed()) badges.push(`<span class="boost-badge" style="border-color:var(--purple);color:var(--purple)">JAIL ${fmtTime((state.jailUntil - now()) / 1000)}</span>`);
  if (state.spec) badges.push(`<span class="boost-badge">${SPECS[state.spec].name}</span>`);
  if (state.prestige > 0) badges.push(`<span class="boost-badge">P${state.prestige} ×${prestigeMult().toFixed(2)}</span>`);
  if (state.storyChapter >= 8) badges.push(`<span class="boost-badge">Don's Right Hand</span>`);
  for (const [eff, until] of Object.entries(state.influenceBuffs || {})) {
    if (until > now()) badges.push(`<span class="boost-badge" style="border-color:var(--purple);color:var(--purple)">${eff} ${fmtTime((until - now()) / 1000)}</span>`);
  }
  if (state.smuggle && state.smuggle.arrive > now()) badges.push(`<span class="boost-badge">Ship ${fmtTime((state.smuggle.arrive - now()) / 1000)}</span>`);
  if (xpBoosted()) badges.push(`<span class="boost-badge">2× XP ${fmtTime((state.boosters.xp - now()) / 1000)}</span>`);
  if (cashBoosted()) badges.push(`<span class="boost-badge">2× Cash ${fmtTime((state.boosters.cash - now()) / 1000)}</span>`);
  document.getElementById('boost-badges').innerHTML = badges.join('');
  resizeHeader();
}

function refreshAffordability() {
  document.querySelectorAll('[data-en]').forEach(b => b.classList.toggle('disabled', Math.floor(state.energy) < +b.dataset.en));
  document.querySelectorAll('[data-st]').forEach(b => b.classList.toggle('disabled', Math.floor(state.stamina) < +b.dataset.st));
  document.querySelectorAll('[data-cash]').forEach(b => b.classList.toggle('disabled', state.cash < +b.dataset.cash));
  document.querySelectorAll('[data-gold]').forEach(b => b.classList.toggle('disabled', state.gold < +b.dataset.gold));
}

// ---------------------------------------------------------------- UI / navigation
const NAV_GROUPS = [
  { id: 'hq',      label: 'HQ',      icon: '🏠', tabs: ['dashboard'] },
  { id: 'streets', label: 'Streets', icon: '🗺️', tabs: ['quests', 'properties'] },
  { id: 'ops',     label: 'Ops',     icon: '💼', tabs: ['heists', 'crew', 'army'] },
  { id: 'combat',  label: 'Combat',  icon: '⚔️', tabs: ['arena', 'bosses', 'climb'] },
  { id: 'empire',  label: 'Empire',  icon: '🏛️', tabs: ['crafting', 'hideout', 'prestige', 'shop', 'character'] },
];
const TAB_LABELS = {
  dashboard: 'Dashboard', quests: 'Quests', properties: 'Properties',
  heists: 'Heists', crew: 'Crew', army: 'Army',
  crafting: 'Crafting', prestige: 'Prestige', arena: 'Arena',
  climb: 'The Climb', bosses: 'Bosses', hideout: 'Hideout',
  shop: 'Black Market', character: 'Character',
};
const TAB_TO_GROUP = {};
for (const g of NAV_GROUPS) for (const t of g.tabs) TAB_TO_GROUP[t] = g.id;

function categoryForTab(tab) { return TAB_TO_GROUP[tab] || 'hq'; }

function initNav() {
  const catEl = document.getElementById('nav-categories');
  if (catEl) {
    catEl.innerHTML = NAV_GROUPS.map(g =>
      `<button type="button" class="nav-cat" data-cat="${g.id}" onclick="switchCategory('${g.id}')">${g.label}</button>`
    ).join('');
  }
  const bottomEl = document.getElementById('nav-bottom');
  if (bottomEl) {
    const mobileItems = [
      { cat: 'hq', label: 'HQ', icon: '🏠' },
      { cat: 'streets', label: 'Streets', icon: '🗺️' },
      { cat: 'combat', label: 'Combat', icon: '⚔️' },
      { cat: 'empire', label: 'Empire', icon: '🏛️' },
      { cat: 'more', label: 'More', icon: '☰' },
    ];
    bottomEl.innerHTML = mobileItems.map(m =>
      m.cat === 'more'
        ? `<button type="button" class="nav-bottom-btn" data-cat="more" onclick="openMoreSheet()"><span class="nav-icon">${m.icon}</span>${m.label}</button>`
        : `<button type="button" class="nav-bottom-btn" data-cat="${m.cat}" onclick="switchCategory('${m.cat}')"><span class="nav-icon">${m.icon}</span>${m.label}</button>`
    ).join('');
    document.body.classList.add('has-bottom-nav');
  }
  const moreContent = document.getElementById('nav-more-content');
  if (moreContent) {
    moreContent.innerHTML = NAV_GROUPS.map(g => `
      <div class="more-group">
        <div class="more-group-title">${g.label}</div>
        <div class="more-group-btns">${g.tabs.map(t =>
          `<button type="button" class="more-tab-btn" data-tab="${t}" onclick="switchTab('${t}'); closeMoreSheet();">${TAB_LABELS[t] || t}</button>`
        ).join('')}</div>
      </div>`).join('');
  }
  syncNavUI(activeTab);
}

function renderSubNav(catId) {
  const el = document.getElementById('nav-subtabs');
  if (!el) return;
  const g = NAV_GROUPS.find(x => x.id === catId);
  if (!g || g.tabs.length <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = g.tabs.map(t =>
    `<button type="button" class="nav-sub" data-tab="${t}" onclick="switchTab('${t}')">${TAB_LABELS[t] || t}</button>`
  ).join('');
}

function syncNavUI(tab) {
  const cat = categoryForTab(tab);
  document.querySelectorAll('.nav-cat').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  document.querySelectorAll('.nav-sub').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.nav-bottom-btn').forEach(b => {
    if (b.dataset.cat === 'more') return;
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  document.querySelectorAll('.more-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  renderSubNav(cat);
}

function switchCategory(catId) {
  const g = NAV_GROUPS.find(x => x.id === catId);
  if (!g || !g.tabs.length) return;
  switchTab(g.tabs.includes(activeTab) ? activeTab : g.tabs[0]);
}

function openMoreSheet() {
  const sheet = document.getElementById('nav-more-sheet');
  const backdrop = document.getElementById('nav-more-backdrop');
  if (sheet) { sheet.hidden = false; }
  if (backdrop) { backdrop.hidden = false; }
  syncNavUI(activeTab);
}

function closeMoreSheet() {
  const sheet = document.getElementById('nav-more-sheet');
  const backdrop = document.getElementById('nav-more-backdrop');
  if (sheet) sheet.hidden = true;
  if (backdrop) backdrop.hidden = true;
}

function toggleHeaderCompact(forceCompact) {
  const compact = forceCompact !== undefined ? forceCompact : !document.body.classList.contains('header-compact');
  document.body.classList.toggle('header-compact', compact);
  const btn = document.getElementById('header-toggle');
  if (btn) btn.setAttribute('aria-expanded', compact ? 'false' : 'true');
  try { localStorage.setItem('mob_ui_compact', compact ? '1' : '0'); } catch (e) { /* ignore */ }
  resizeHeader();
}

function resizeHeader() {
  const header = document.getElementById('header');
  const navWrap = document.getElementById('nav-wrap');
  if (!header) return;
  const h = header.offsetHeight;
  document.documentElement.style.setProperty('--header-h', h + 'px');
  if (navWrap) {
    const nh = navWrap.offsetHeight;
    document.documentElement.style.setProperty('--nav-h', nh + 'px');
  }
}

function isMobileUI() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 980px)').matches;
}

function toggleLogPanel(forceOpen) {
  const main = document.getElementById('main');
  const backdrop = document.getElementById('log-drawer-backdrop');
  if (isMobileUI()) {
    const open = forceOpen !== undefined ? forceOpen : !main.classList.contains('log-drawer-open');
    main.classList.toggle('log-drawer-open', open);
    if (backdrop) backdrop.hidden = !open;
  } else {
    const open = forceOpen !== undefined ? forceOpen : main.classList.contains('log-closed');
    main.classList.toggle('log-closed', !open);
    main.classList.toggle('log-open', open);
    const btn = document.getElementById('log-collapse-btn');
    if (btn) btn.textContent = open ? '◀' : '▶';
    try { localStorage.setItem('mob_ui_log_open', open ? '1' : '0'); } catch (e) { /* ignore */ }
  }
  resizeHeader();
}

let toastTimer = null;
function showToast(text, cls) {
  if (!isMobileUI()) return;
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text.slice(0, 120);
  el.className = cls || '';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function initUI() {
  try {
    if (localStorage.getItem('mob_ui_compact') === '1') toggleHeaderCompact(true);
    if (!isMobileUI() && localStorage.getItem('mob_ui_log_open') === '0') toggleLogPanel(false);
  } catch (e) { /* ignore */ }
  initNav();
  resizeHeader();
  window.addEventListener('resize', resizeHeader);
}

let activeTab = 'dashboard';
let tickCount = 0;
const content = document.getElementById('content');

function switchTab(tab) {
  activeTab = tab;
  syncNavUI(tab);
  closeMoreSheet();
  renderTab();
  if (isMobileUI()) window.scrollTo({ top: 0, behavior: 'smooth' });
}
function afterAction() {
  checkAchievements();
  updateHeader();
  renderTab();
  save();
}
function renderTab() {
  const renderers = {
    dashboard: renderDashboard, quests: renderQuests, heists: renderHeists, properties: renderProperties,
    crew: renderCrew, army: renderArmy, crafting: renderCrafting, arena: renderArena, bosses: renderBosses,
    hideout: renderHideout, shop: renderShop, prestige: renderPrestige, character: renderCharacter,
    climb: renderClimb,
  };
  content.innerHTML = renderers[activeTab]();
  refreshAffordability();
}

function renderContractsBlock() {
  ensureContracts();
  return state.contracts.map(c => {
    const done = c.progress >= c.need;
    const rewardBits = [];
    if (c.reward.cash) rewardBits.push('$' + fmt(c.reward.cash));
    if (c.reward.gold) rewardBits.push(c.reward.gold + ' ◈');
    if (c.reward.scrap) rewardBits.push(c.reward.scrap + ' scrap');
    if (c.reward.ball) rewardBits.push(c.reward.ball + ' ball');
    if (c.reward.alloy) rewardBits.push(c.reward.alloy + ' alloy');
    return `
    <div class="contract-card ${done && !c.claimed ? 'done' : ''}">
      <div style="font-weight:700;font-size:.85rem">${contractDesc(c)}</div>
      <div style="font-size:.75rem;color:var(--muted);margin:4px 0">${fmt(Math.floor(c.progress))} / ${fmt(c.need)} · Reward: ${rewardBits.join(', ')}</div>
      ${c.claimed ? '<span class="tag" style="color:var(--green)">Claimed</span>' :
        done ? `<button class="btn small primary" onclick="claimContract('${c.id}')">Claim</button>` :
        `<div class="bar" style="height:8px;margin-top:4px"><div class="xp" style="width:${clamp(c.progress / c.need * 100, 0, 100)}%"></div></div>`}
    </div>`;
  }).join('');
}


function renderJailBanner() {
  if (!isJailed()) return '';
  return `<div class="jail-banner">
    <h2 style="color:var(--purple);margin-bottom:6px">🔒 County Lockup</h2>
    <div class="desc">Out in ${fmtTime((state.jailUntil - now()) / 1000)}. Jobs, heists, bosses, and turf wars are blocked.</div>
    <button class="btn" data-cash="${bailCost()}" onclick="payBail()">Bail $${fmt(bailCost())}</button>
    <button class="btn primary small" data-gold="1" onclick="goldBreakout()">Breakout 1 ◈</button>
    <button class="btn danger small" data-st="5" onclick="fightBreakout()">Fight Guards (5 🔥)</button>
  </div>`;
}
function renderStoryBlock() {
  const ch = state.storyChapter || 0;
  if (ch >= STORY_CHAPTERS.length) {
    return `<div class="card"><h2>The Don's Favor</h2><div class="desc" style="margin:0">All chapters complete. You are the Don's Right Hand.</div></div>`;
  }
  const c = STORY_CHAPTERS[ch];
  const ready = storyNeedMet(ch);
  return `<div class="card">
    <h2>The Don's Favor <span class="sub">Chapter ${ch + 1} / ${STORY_CHAPTERS.length}</span></h2>
    <div class="jname">${c.title}</div>
    <div class="desc">${c.desc} · Reward: ${c.gold} ◈ + story gear</div>
    ${ready ? `<button class="btn primary" onclick="claimStory()">Claim Chapter</button>` : `<span class="tag">In progress</span>`}
  </div>`;
}
function renderWeekliesBlock() {
  ensureWeeklies();
  const rows = state.weeklies.map(w => {
    const done = w.progress >= w.need;
    const label = w.type === 'jobs' ? `Complete ${w.need} jobs` : w.type === 'turf' ? `Turf actions ×${w.need}` : `Complete ${w.need} heists`;
    const bits = [];
    if (w.reward.gold) bits.push(w.reward.gold + ' ◈');
    if (w.reward.scrap) bits.push(w.reward.scrap + ' scrap');
    if (w.reward.ball) bits.push(w.reward.ball + ' ball');
    if (w.reward.alloy) bits.push(w.reward.alloy + ' alloy');
    return `<div class="contract-card ${done && !w.claimed ? 'done' : ''}">
      <div style="font-weight:700;font-size:.85rem">${label}</div>
      <div style="font-size:.75rem;color:var(--muted);margin:4px 0">${fmt(Math.floor(w.progress))} / ${fmt(w.need)} · ${bits.join(', ')}</div>
      ${w.claimed ? '<span class="tag" style="color:var(--green)">Claimed</span>' : done ? `<button class="btn small primary" onclick="claimWeekly('${w.id}')">Claim</button>` : `<div class="bar" style="height:8px;margin-top:4px"><div class="xp" style="width:${clamp(w.progress / w.need * 100, 0, 100)}%"></div></div>`}
    </div>`;
  }).join('');
  return rows + `<button class="btn small" onclick="rerollWeeklies()">${state.freeWeeklyReroll ? 'Free Weekly Reroll' : 'Reroll Weeklies (3 ◈)'}</button>`;
}
function renderHeists() {
  if (state.level < heistUnlockLevel()) {
    return `<div class="card"><h2>Heists</h2><div class="desc">Unlocks at level ${heistUnlockLevel()}. Buy a getaway car first for better odds.</div></div>`;
  }
  let garage = VEHICLES.map(v => {
    const lvl = vehicleLevel(v.id);
    const cost = vehicleUpgradeCost(v.id);
    const active = state.vehicleActive === v.id;
    return `<div class="prop-card">
      <div class="pname">${v.name} ${lvl ? `· Lv ${lvl}` : ''} ${active ? '<span style="color:var(--green)">ACTIVE</span>' : ''}</div>
      <div class="pinfo">${v.desc}</div>
      <button class="btn small ${lvl === 0 ? 'primary' : ''}" data-cash="${cost}" onclick="upgradeVehicle('${v.id}')">${lvl === 0 ? 'Buy' : 'Upgrade'} $${fmt(cost)}</button>
      ${lvl > 0 && !active ? `<button class="btn small" onclick="setActiveVehicle('${v.id}')">Set Active</button>` : ''}
    </div>`;
  }).join('');
  let heists = heistList().map(({ idx, def, diff }) => {
    const key = String(idx);
    const stage = state.heistProgress[key] || 0;
    const cd = state.heistCd[key] || 0;
    const onCd = cd > now() && stage === 0;
    const st = HEIST_STAGES[Math.min(stage, 2)];
    const cost = heistStageCost(Math.min(stage, 2), diff);
    const chance = Math.round(heistSuccessChance(Math.min(stage, 2), diff) * 100);
    return `<div class="boss-card">
      <div class="boss-head"><span class="bname">${def.name}</span><span style="font-size:.75rem;color:var(--muted)">Diff ${diff.toFixed(1)}</span></div>
      <div style="font-size:.76rem;color:var(--muted)">${def.flavor}</div>
      <div class="heist-stage">Stage ${Math.min(stage + 1, 3)}/3: <b>${st.name}</b> · ${st.resource} ${cost} · ~${chance}% success ${onCd ? `· CD ${fmtTime((cd - now()) / 1000)}` : ''}</div>
      <button class="btn danger" ${onCd ? 'disabled' : ''} onclick="startOrContinueHeist(${idx})">${stage === 0 ? 'Start Heist' : 'Continue Stage ' + (stage + 1)}</button>
    </div>`;
  }).join('');
  const routes = SMUGGLE_ROUTES.map(r => {
    const busy = state.smuggle && state.smuggle.arrive > now();
    return `<div class="prop-card"><div class="pname">${r.name}</div>
      <div class="pinfo">⚡${r.energy} · ~${r.mins}m · ×${r.cashMult} payout</div>
      <button class="btn small primary" data-en="${r.energy}" ${busy ? 'disabled' : ''} onclick="startSmuggle('${r.id}')">Ship</button>
    </div>`;
  }).join('');
  const shipStatus = state.smuggle
    ? (state.smuggle.arrive > now()
        ? `<div class="desc">In transit: ${SMUGGLE_ROUTES.find(x=>x.id===state.smuggle.route).name} — ${fmtTime((state.smuggle.arrive-now())/1000)}</div>`
        : `<button class="btn primary" onclick="tickSmuggle();afterAction()">Collect Shipment</button>`)
    : '<div class="desc">No active shipment.</div>';
  return `${renderJailBanner()}
  <div class="card"><h2>Getaway Garage</h2><div class="desc">Active vehicle boosts job cash, heist success, and lowers getaway Heat.</div><div class="grid2">${garage}</div></div>
  <div class="card"><h2>Smuggling Pipeline</h2>${shipStatus}<div class="grid2">${routes}</div></div>
  <div class="card"><h2>Available Heists</h2><div class="desc">Three stages: Case → Hit → Getaway. Fail aborts with partial loot.</div></div>
  ${heists}`;
}


function renderHitsBlock() {
  if (state.level < 10) return '';
  ensureHits();
  return state.hits.map(h => {
    if (h.done) return `<div class="contract-card"><div class="jname">${esc(h.name)}</div><span class="tag" style="color:var(--green)">Done</span></div>`;
    return `<div class="contract-card">
      <div class="jname">🎯 ${esc(h.name)} <span style="color:var(--muted);font-size:.75rem">Lv ${h.level} · ${turfName(h.turf)}</span></div>
      <div class="desc">Prep: ${h.prep || 'none'}</div>
      <button class="btn small" data-en="4" onclick="prepHit('${h.id}','scout')">Scout ⚡4</button>
      <button class="btn small" onclick="prepHit('${h.id}','bribe')">Bribe</button>
      <button class="btn small" data-st="3" onclick="prepHit('${h.id}','muscle')">Muscle 🔥3</button>
      <button class="btn danger small" data-st="5" onclick="executeHit('${h.id}')">Execute 🔥5</button>
    </div>`;
  }).join('');
}
function renderArena() {
  if (state.level < 6) return `<div class="card"><h2>Underground Arena</h2><div class="desc">Unlocks at level 6.</div></div>`;
  const f = arenaFighter();
  return `${renderJailBanner()}
  <div class="card">
    <h2>Underground Arena <span class="sub">streak ${state.arenaStreak || 0} · best ${state.counters.arenaBest || 0} · tokens ${fmt(state.arenaTokens || 0)}</span></h2>
    <div class="desc">Burst fights for cash, XP, Influence, and streak milestones (3/5/10).</div>
    <div class="boss-card">
      <div class="boss-head"><span class="bname">${f.name}</span><span style="font-size:.75rem;color:var(--muted)">Rank ${state.arenaRank || 0}</span></div>
      <div class="boss-stats"><span>❤️ ${fmt(f.hp)}</span><span>⚔️ ${fmt(f.atk)}</span><span>💵 $${fmt(f.cash)}</span><span>✨ ${fmt(f.xp)} XP</span></div>
      <button class="btn danger" data-st="${f.stamina}" onclick="fightArena()">Fight (${f.stamina} 🔥)</button>
    </div>
  </div>`;
}
function renderContraband() {
  const rows = CONSUMABLES.map(c => {
    const have = consumableCount(c.id);
    const matStr = Object.entries(c.mats || {}).map(([m, v]) => `${v} ${MATS[m]}`).join(', ');
    return `<div class="job-row">
      <div><div class="jname">${c.icon} ${c.name} <span class="tag">x${have}</span></div>
      <div class="jinfo">${c.desc}</div></div>
      <div class="job-actions">
        <button class="btn small" data-cash="${consumableCashCost(c.id)}" onclick="buyConsumable('${c.id}',false)">Buy $${fmt(consumableCashCost(c.id))}</button>
        <button class="btn small" onclick="buyConsumable('${c.id}',true)" title="${matStr}">Brew</button>
        <button class="btn small primary" ${have <= 0 ? 'disabled' : ''} onclick="useConsumable('${c.id}')">Use</button>
      </div>
    </div>`;
  }).join('');
  const active = Object.entries(state.combatBuffs || {}).filter(([, v]) => v > 0)
    .map(([k, v]) => `<span class="mat-pill">${(CONSUMABLE_IDX[k] || {}).icon || ''} ${(CONSUMABLE_IDX[k] || {}).name || k}: ${v} strikes</span>`).join('');
  return `<div class="card"><h2>Contraband <span class="sub">combat consumables</span></h2>
    <div class="desc">Buy with cash or brew from materials. Boosts apply to The Climb, bosses, syndicate, and arena.</div>
    ${active ? `<div style="margin-bottom:8px">Active: ${active}</div>` : ''}
    ${rows}</div>`;
}
function renderClimb() {
  const e = ensureClimbEnemy();
  const hpPct = clamp(e.hp / e.maxHp * 100, 0, 100);
  const best = (state.climb && state.climb.best) || 0;
  const affix = e.affixes && e.affixes.length
    ? e.affixes.map(a => `<span class="set-pill" title="${a.desc}">${a.name}</span>`).join(' ')
    : '<span class="tag">No modifiers</span>';
  const cp = Math.max(1, Math.floor(best / 10) * 10);
  return `${renderJailBanner()}
  <div class="card">
    <h2>The Climb <span class="sub">Floor ${state.climb.floor} · best ${best} · Rank ${state.climbRank || 0}</span></h2>
    <div class="desc">Endless tower of rival crews. Enemies scale forever; each 5th floor drops gear, each 25th drops Mythic mats, each 50th gives PP. Earn <b>Intel</b> for the Gunsmith. Climb Rank (+2% cash/XP, +1% ATK per 10 floors) is permanent and survives prestige.</div>
    <div class="dash-grid">
      <div class="dash-tile"><div class="val">${state.climb.floor}</div><div class="lbl">Current Floor</div></div>
      <div class="dash-tile"><div class="val">${best}</div><div class="lbl">Best Floor</div></div>
      <div class="dash-tile"><div class="val">${state.climbRank || 0}</div><div class="lbl">Climb Rank</div></div>
      <div class="dash-tile"><div class="val">${fmt(state.intel || 0)}</div><div class="lbl">Intel</div></div>
    </div>
    <div class="boss-card">
      <div class="boss-head"><span class="bname">${esc(e.name.split(' · ')[0])}</span><span style="font-size:.75rem;color:var(--muted)">Floor ${e.floor}</span></div>
      <div style="margin:4px 0">${affix}</div>
      <div class="boss-hp-bar"><div style="width:${hpPct}%"></div></div>
      <div class="boss-stats"><span>❤️ ${fmt(Math.max(0, e.hp))} / ${fmt(e.maxHp)}</span><span>⚔️ ${fmt(e.atk)}</span><span>🛡️ ${fmt(e.def)}</span></div>
      <div class="job-actions">
        <button class="btn danger" data-st="${e.stamina}" onclick="climbStrike(1)">Strike (${e.stamina} 🔥)</button>
        <button class="btn danger small" data-st="${e.stamina}" onclick="climbStrike(5)">×5</button>
        <button class="btn danger small" data-st="${e.stamina}" onclick="climbStrike(1000)">Push</button>
        <button class="btn small ${state.climb.auto ? 'primary' : ''}" onclick="toggleAutoClimb()">Auto: ${state.climb.auto ? 'ON' : 'OFF'}</button>
      </div>
      <div class="job-actions" style="margin-top:6px">
        ${best >= 10 ? `<button class="btn small" onclick="climbCheckpoint()">Jump to Floor ${cp}</button>` : ''}
        <button class="btn small" onclick="resetClimb()">Back to Floor 1</button>
      </div>
    </div>
  </div>
  ${renderContraband()}`;
}
function renderHideout() {
  const rooms = HIDEOUT_ROOMS.map(r => {
    const lvl = hideoutLevel(r.id);
    const c = hideoutUpgradeCost(r.id);
    return `<div class="prop-card">
      <div class="pname">${r.name} · Lv ${lvl}</div>
      <div class="pinfo">${r.desc}</div>
      <div class="pinfo">Cost: $${fmt(c.cash)} · ${c.scrap} scrap · ${c.ball} ball · ${c.alloy} alloy</div>
      <button class="btn ${lvl === 0 ? 'primary' : ''} wide" data-cash="${c.cash}" onclick="upgradeHideout('${r.id}')">Upgrade</button>
    </div>`;
  }).join('');
  return `<div class="card"><h2>Hideout Facilities <span class="sub">persists through prestige</span></h2>
    <div class="desc">Armory stash cap: ${stashCap()}. Laundry & Gym improve heat decay and regen.</div>
    <div class="grid2">${rooms}</div></div>`;
}


function renderPrestige() {
  const locked = (state.prestige || 0) < 1;
  const rows = PRESTIGE_SHOP.map(item => {
    const lvl = pUp(item.key);
    const cost = prestigeShopCost(item.id);
    const ownedShot = item.oneShot && lvl > 0;
    return `<div class="job-row">
      <div><div class="jname">${item.name} ${item.oneShot ? '' : `· Lv ${lvl}`}</div>
      <div class="jinfo">${item.desc}</div></div>
      <button class="btn primary" ${locked || ownedShot ? 'disabled' : ''} onclick="buyPrestigeUpgrade('${item.id}')">
        ${ownedShot ? 'Owned' : cost + ' PP'}
      </button>
    </div>`;
  }).join('');
  return `${canPrestige() ? `<div class="card"><h2>Rebuild the Empire</h2>
    <div class="desc">Gain PP = 5 + floor(level/10) + current prestige rank. War Chest adds bonus gold.</div>
    <button class="btn primary" onclick="doPrestige()">Prestige Now (Rank ${(state.prestige||0)+1})</button></div>` : ''}
  <div class="card ${locked ? 'locked' : ''}">
    <h2>Prestige Shop <span class="sub">${fmt(state.prestigePoints||0)} PP · permanent</span></h2>
    <div class="desc">${locked ? 'Unlocks after your first prestige.' : 'Spend Prestige Points on forever upgrades.'}</div>
    ${rows}
  </div>`;
}
function renderArmy() {
  if (state.level < 20) return `<div class="card"><h2>Army</h2><div class="desc">Unlocks at level 20. Recruits add flat stats to your character sheet.</div></div>`;
  const cards = ARMY_UNITS.map(u => {
    const lvl = armyLevel(u.id);
    const cost = armyUpgradeCost(u.id);
    const bits = [];
    if (u.atk) bits.push(`+${u.atk} ATK`);
    if (u.def) bits.push(`+${u.def} DEF`);
    if (u.hp) bits.push(`+${u.hp} HP`);
    if (u.energy) bits.push(`+${u.energy} Energy`);
    if (u.stamina) bits.push(`+${u.stamina} Stamina`);
    if (u.atkPct) bits.push(`+${(u.atkPct*100).toFixed(0)}% ATK`);
    if (u.crit) bits.push(`+${(u.crit*100).toFixed(1)}% crit`);
    return `<div class="prop-card">
      <div class="pname">${u.name} · Lv ${lvl}</div>
      <div class="pinfo">${u.desc}</div>
      <div class="pinfo">Per level: ${bits.join(', ')}</div>
      <button class="btn ${lvl===0?'primary':''} wide" data-cash="${cost}" onclick="upgradeArmy('${u.id}')">Recruit — $${fmt(cost)}</button>
    </div>`;
  }).join('');
  return `<div class="card">
    <h2>Private Army <span class="sub">${armyTotalLevels()} levels · upkeep $${fmt(armyUpkeepPerMin())}/min</span></h2>
    <div class="desc">Persists through prestige. Upkeep capped at 25% of passive income.</div>
    <div class="dash-grid">
      <div class="dash-tile"><div class="val">+${fmt(armyFlat('atk'))}</div><div class="lbl">Flat ATK</div></div>
      <div class="dash-tile"><div class="val">+${fmt(armyFlat('def'))}</div><div class="lbl">Flat DEF</div></div>
      <div class="dash-tile"><div class="val">+${fmt(armyFlat('hp'))}</div><div class="lbl">Flat HP</div></div>
      <div class="dash-tile"><div class="val">+${(armyAtkPct()*100).toFixed(1)}%</div><div class="lbl">ATK%</div></div>
    </div>
    <div class="grid2">${cards}</div>
  </div>`;
}

function renderDashboard() {
  const playedMin = Math.floor((now() - state.created) / 60000);
  const tip = bestJobTip();
  const heatTip = state.heat >= 70 ? 'Cops are circling — expect raids!' : state.heat >= 50 ? 'High heat: better loot luck, more risk.' : 'Stay quiet or turn up the heat for better drops.';
  const crewSum = CREW_ROLES.map(r => `${r.name} Lv${crewLevel(r.id)}`).join(' · ');
  const setProg = SET_IDS.map(id => `${GEAR_SETS[id].name} ${setOwnedCount(state, id)}/3`).join(' · ');
  return `
  ${renderJailBanner()}
  ${renderStoryBlock()}
  <div class="card">
    <h2>Empire Overview ${state.prestige ? `<span class="sub">Prestige ${state.prestige} · ×${prestigeMult().toFixed(2)}</span>` : ''}</h2>
    <div class="desc">The city is yours for the taking. Run jobs, pull heists, claim turf, hire crew.</div>
    <div class="dash-grid">
      <div class="dash-tile"><div class="val">$${fmt(state.cash)}</div><div class="lbl">Cash on hand</div></div>
      <div class="dash-tile"><div class="val">$${fmt(totalIncomePerMin() * 60)}/hr</div><div class="lbl">Passive income</div></div>
      <div class="dash-tile"><div class="val">${fmt(state.gold)} ◈</div><div class="lbl">Gold Bonds</div></div>
      <div class="dash-tile"><div class="val">${Math.floor(state.heat)}</div><div class="lbl">Heat</div></div>
      <div class="dash-tile"><div class="val">${fmt(totalAtk())}</div><div class="lbl">Total Attack</div></div>
      <div class="dash-tile"><div class="val">${fmt(totalDef())}</div><div class="lbl">Total Defense</div></div>
      <div class="dash-tile"><div class="val">${state.statPoints}</div><div class="lbl">Stat points</div></div>
      <div class="dash-tile"><div class="val">${fmt(state.counters.jobs)}</div><div class="lbl">Jobs done</div></div>
      <div class="dash-tile"><div class="val">${fmt(state.counters.bossKills)}</div><div class="lbl">Bosses down</div></div>
      <div class="dash-tile"><div class="val">${state.spec ? SPECS[state.spec].name : '—'}</div><div class="lbl">Specialization</div></div>
      <div class="dash-tile"><div class="val">${state.ach.length} / ${ACHIEVEMENTS.length}</div><div class="lbl">Achievements</div></div>
      <div class="dash-tile"><div class="val">${playedMin < 60 ? playedMin + 'm' : Math.floor(playedMin / 60) + 'h ' + playedMin % 60 + 'm'}</div><div class="lbl">Career</div></div>
    </div>
  </div>
  <div class="card">
    <h2>Daily Contracts <span class="sub">UTC day · ${state.freeContractReroll ? 'free reroll available' : 'reroll 2◈'}</span></h2>
    ${renderContractsBlock()}
    <button class="btn small" onclick="rerollContracts()">${state.freeContractReroll ? 'Free Reroll' : 'Reroll (2 ◈)'}</button>
  </div>
  <div class="card">
    <h2>Weekly Empire Goals</h2>
    ${renderWeekliesBlock()}
  </div>
  ${state.level >= 10 ? `<div class="card"><h2>Hit Board</h2>${renderHitsBlock()}</div>` : ''}
  <div class="card"><h2>City Influence <span class="sub">${fmt(Math.floor(state.influence || 0))} pts</span></h2>
    <div class="grid2">${INFLUENCE_CONTACTS.map(c => {
      const owned = state.influenceContacts[c.id];
      const cost = Math.round(c.cost * g(Math.max(1, state.level)));
      return `<div class="prop-card"><div class="pname">${c.name}</div>
        ${owned ? '<span class="tag" style="color:var(--green)">Unlocked</span>' :
          `<div class="pinfo">Story ch ${c.needStory}+ · $${fmt(cost)}</div>
           <button class="btn small primary" data-cash="${cost}" onclick="unlockContact('${c.id}')">Unlock</button>`}
      </div>`;
    }).join('')}
    </div>
    <div style="margin-top:10px">${INFLUENCE_BUFFS.map(b =>
      `<button class="btn small" onclick="buyInfluenceBuff('${b.id}')">${b.name} (${b.cost} Inf · ${b.mins}m)</button>`
    ).join(' ')}</div>
  </div>
  ${state.racket ? `<div class="card"><h2>Active Racket</h2><div class="desc">${PROPERTIES[state.racket.prop].name}: ${RACKET_TYPES.find(r=>r.id===state.racket.type).name} · expires ${fmtTime((state.racket.expiry-now())/1000)}</div>
    <button class="btn primary" onclick="resolveRacket(false)">Resolve</button></div>` : ''}
  <div class="card">
    <h2>Tips</h2>
    <div class="desc" style="margin-bottom:6px"><b style="color:var(--text)">Best XP/Energy:</b> ${tip ? `${tip.jd.name} (~${tip.score.toFixed(1)} XP/⚡)` : '—'}</div>
    <div class="desc" style="margin-bottom:6px"><b style="color:var(--heat)">Heat:</b> ${heatTip}</div>
    <div class="desc" style="margin-bottom:6px"><b style="color:var(--text)">Crew:</b> ${crewSum || 'None hired'}</div>
    <div class="desc" style="margin-bottom:0"><b style="color:var(--text)">Sets:</b> ${setProg}</div>
  </div>
  ${(state.prestige||0) >= 1 ? `<div class="card"><h2>Prestige Shop</h2><div class="desc">${fmt(state.prestigePoints||0)} PP available.</div>
    <button class="btn primary" onclick="switchTab('prestige')">Open Prestige Shop</button></div>` : ''}
  ${canPrestige() ? `
  <div class="card">
    <h2>Rebuild the Empire</h2>
    <div class="desc">Soft-reset for permanent power. Keep gold, crew, army, prestige shop, achievements, half mastery. Earn Prestige Points.</div>
    <button class="btn primary" onclick="doPrestige()">Prestige → Rank ${(state.prestige || 0) + 1}</button>
  </div>` : ''}
  <div class="card">
    <h2>How to grow</h2>
    <div class="desc" style="margin-bottom:0">
      • Master jobs for stars · raise Heat carefully for better loot<br>
      • Claim turfs for permanent job bonuses · hire Crew for passives<br>
      • Specialize at 10 · Prestige at 40 for infinite late-game growth
    </div>
  </div>`;
}

function renderQuests() {
  let raidHtml = renderJailBanner() + renderStoryBlock() + (state.level >= 10 ? `<div class="card"><h2>Hit Board</h2>${renderHitsBlock()}</div>` : '');
  if (state.pendingRaid) {
    const r = state.pendingRaid;
    raidHtml = `
    <div class="raid-banner">
      <h2 style="color:var(--heat);margin-bottom:6px">🚨 Police Raid in Progress</h2>
      <div class="boss-hp-bar"><div style="width:${clamp(r.hp / r.maxHp * 100, 0, 100)}%"></div></div>
      <div class="boss-stats">
        <span>❤️ ${fmt(Math.max(0, r.hp))} / ${fmt(r.maxHp)}</span>
        <span>⚔️ ${fmt(r.atk)}</span>
        <span>💵 Bribe $${fmt(r.bribeCash)}</span>
      </div>
      <button class="btn danger" data-st="${r.stamina}" onclick="fightRaid(1)">Fight (${r.stamina} 🔥)</button>
      <button class="btn danger small" data-st="${r.stamina}" onclick="fightRaid(5)">×5</button>
      <button class="btn" data-cash="${r.bribeCash}" onclick="bribeRaid(false)">Bribe $${fmt(r.bribeCash)}</button>
      <button class="btn primary small" data-gold="1" onclick="bribeRaid(true)">Bribe 1 ◈</button>
    </div>`;
  }

  let html = raidHtml + `
  <div class="card">
    <h2>Daily Contracts</h2>
    ${renderContractsBlock()}
  </div>`;

  const n = turfCount();
  for (let t = n - 1; t >= 0; t--) {
    const unlocked = state.level >= turfUnlockLevel(t);
    const tier = turfTier(t);
    const needsDef = turfNeedsDefend(t);
    let jobs = '';
    if (unlocked) {
      for (let j = 0; j < 5; j++) {
        const jd = jobData(t, j);
        const nextTh = MASTERY_THRESHOLDS[jd.stars] || null;
        const prog = nextTh ? `${jd.masteryCount}/${nextTh}` : `${jd.masteryCount} (MAX)`;
        jobs += `
        <div class="job-row">
          <div>
            <div class="jname">${jd.name} <span class="stars">${starString(jd.stars)}</span></div>
            <div class="jinfo">
              <span class="tag en">⚡ ${jd.energy}</span>
              <span class="tag cash">💵 ~$${fmt(jd.cash)}</span>
              <span class="tag xp">✨ ~${fmt(jd.xp)} XP</span>
              <span class="tag">🎁 ${Math.round(jd.dropChance * 100)}%</span>
              <span class="tag">Mastery ${prog}</span>
            </div>
          </div>
          <div class="job-actions">
            <button class="btn" data-en="${jd.energy}" onclick="doJobs(${t},${j},1)">Do Job</button>
            <button class="btn small" data-en="${jd.energy}" onclick="doJobs(${t},${j},5)">×5</button>
            <button class="btn small" data-en="${jd.energy}" onclick="doJobs(${t},${j},-1)">All ⚡</button>
          </div>
        </div>`;
      }
    } else {
      jobs = `<div class="desc">🔒 Reach <b>level ${turfUnlockLevel(t)}</b> to unlock this turf.</div>`;
    }
    const turfBtns = unlocked ? `
      <div style="margin-bottom:10px">
        ${tier > 0 ? `<span class="tag" style="color:var(--green)">Owned Tier ${tier} (+${tier * 5}% jobs)</span>` : '<span class="tag">Unclaimed</span>'}
        ${needsDef ? '<span class="tag" style="color:var(--heat)">Needs Defend!</span>' : ''}
        ${tier === 0
          ? `<button class="btn small primary" data-st="4" onclick="claimTurf(${t})">Claim Turf (🔥)</button>`
          : needsDef
            ? `<button class="btn small danger" data-st="4" onclick="doDefendTurf(${t})">Defend Turf (🔥)</button>`
            : `<button class="btn small" data-st="4" onclick="claimTurf(${t})">Raise Tier (🔥)</button>`}
      </div>` : '';
    html += `
    <div class="card ${unlocked ? '' : 'locked'}">
      <h2>${turfName(t)} <span class="sub">Tier ${t + 1} · unlocks L${turfUnlockLevel(t)}</span></h2>
      ${turfBtns}
      ${jobs}
    </div>`;
  }
  return html;
}

function renderProperties() {
  let cards = '';
  PROPERTIES.forEach((p, i) => {
    const lvl = state.props[i] || 0;
    const cost = propUpgradeCost(i, lvl);
    const incNow = propIncomePerMin(i, lvl);
    const incNext = propIncomePerMin(i, lvl + 1);
    cards += `
    <div class="prop-card">
      <div class="pname">${p.name} ${lvl > 0 ? `<span style="color:var(--gold)">· Lv ${lvl}</span>` : ''}</div>
      <div class="pinfo">${p.desc}</div>
      <div class="pinfo">
        ${lvl > 0 ? `Income: <b style="color:var(--green)">$${fmt(incNow)}/min</b> → next: $${fmt(incNext)}/min` : `Income at Lv 1: <b style="color:var(--green)">$${fmt(incNext)}/min</b>`}
      </div>
      <button class="btn ${lvl === 0 ? 'primary' : ''} wide" data-cash="${cost}" onclick="buyOrUpgradeProp(${i})">
        ${lvl === 0 ? 'Buy' : 'Upgrade'} — $${fmt(cost)}
      </button>
    </div>`;
  });
  let racket = '';
  if (state.racket && state.racket.expiry > now()) {
    const rt = RACKET_TYPES.find(r => r.id === state.racket.type);
    racket = `<div class="card"><h2>Active Racket — ${PROPERTIES[state.racket.prop].name}</h2>
      <div class="desc">${rt.name} · ${fmtTime((state.racket.expiry - now()) / 1000)} left</div>
      <button class="btn primary" onclick="resolveRacket(false)">Handle with Stamina</button>
      <button class="btn" onclick="resolveRacket(true)">Handle with Energy</button>
    </div>`;
  }
  return `
  ${racket}
  <div class="card">
    <h2>Real Estate Empire <span class="sub">$${fmt(totalIncomePerMin())}/min · $${fmt(totalIncomePerMin() * 60)}/hr</span></h2>
    <div class="desc">Income includes Accountant, Kingpin, set, and temporary racket boosts.</div>
    <div class="grid3">${cards}</div>
  </div>`;
}

function renderCrew() {
  const cards = CREW_ROLES.map(r => {
    const lvl = crewLevel(r.id);
    const cost = crewUpgradeCost(r.id);
    let effect = '';
    if (r.id === 'enforcer') effect = `+${(lvl * 3)}% ATK in fights`;
    if (r.id === 'accountant') effect = `+${(lvl * 4)}% property income`;
    if (r.id === 'fixer') effect = `+${(lvl * 5)}% energy/stamina regen`;
    if (r.id === 'smuggler') effect = `+${(lvl * 2)}% drop / rare find`;
    return `
    <div class="prop-card">
      <div class="pname">${r.name} ${lvl > 0 ? `<span style="color:var(--gold)">· Lv ${lvl}</span>` : ''}</div>
      <div class="pinfo">${r.desc}</div>
      <div class="pinfo">${lvl > 0 ? effect : 'Not hired'}</div>
      <button class="btn ${lvl === 0 ? 'primary' : ''} wide" data-cash="${cost}" onclick="upgradeCrew('${r.id}')">
        ${lvl === 0 ? 'Hire' : 'Upgrade'} — $${fmt(cost)}
      </button>
    </div>`;
  }).join('');
  return `
  <div class="card">
    <h2>Your Crew <span class="sub">persists through prestige</span></h2>
    <div class="desc">Hire specialists to passively strengthen every loop. Levels have no cap.</div>
    <div class="grid2">${cards}</div>
  </div>`;
}

function renderCrafting() {
  let recipeRows = RECIPES.map(r => {
    const costStr = Object.entries(r.cost).filter(([, v]) => v > 0)
      .map(([m, v]) => `<span style="color:${state.mats[m] >= v ? 'var(--green)' : 'var(--red)'}">${v} ${MATS[m]}</span>`).join(' + ');
    const slotBtns = SLOTS.map(sl =>
      `<button class="btn small" onclick="craft('${r.id}','${sl}')">${SLOT_LABEL[sl]}</button>`).join('');
    return `
    <div class="job-row">
      <div>
        <div class="jname rar-${r.rarity}">${r.name} <span style="font-size:.72rem">(${RARITIES[RAR_IDX[r.rarity]].name})</span></div>
        <div class="jinfo">Cost: ${costStr}</div>
      </div>
      <div class="job-actions">${slotBtns}</div>
    </div>`;
  }).join('');
  return `
  <div class="card">
    <h2>Workshop Materials</h2>
    <div style="margin-bottom:4px">
      <span class="mat-pill">🔩 ${MATS.scrap}: <b>${fmt(state.mats.scrap)}</b></span>
      <span class="mat-pill">🧨 ${MATS.ball}: <b>${fmt(state.mats.ball)}</b></span>
      <span class="mat-pill">💎 ${MATS.alloy}: <b>${fmt(state.mats.alloy)}</b></span>
      <span class="mat-pill">🩸 ${MATS.shard}: <b>${fmt(state.mats.shard||0)}</b></span>
    </div>
    <button class="btn small" onclick="convertMats('scrap','ball',15,1)">15 Scrap → 1 Ballistics</button>
    <button class="btn small" onclick="convertMats('ball','alloy',10,1)">10 Ballistics → 1 Rare Alloy</button>
  </div>
  <div class="card">
    <h2>Forge Custom Gear</h2>
    <div class="desc">Crafted gear is at (or above) your level.${state.prestige >= 3 ? ' Family Seal prefix active.' : ''}</div>
    ${recipeRows}
  </div>
  <div class="card">
    <h2>Bulk Salvage</h2>
    <button class="btn small" onclick="salvageBelow('common')">Salvage Commons</button>
    <button class="btn small" onclick="salvageBelow('uncommon')">Up to Uncommon</button>
    <button class="btn small" onclick="salvageBelow('rare')">Up to Rare</button>
  </div>
  ${renderGunsmith()}`;
}
function renderGunsmith() {
  const rc = reforgeCost(), ec = enchantCost();
  const rows = SLOTS.map(sl => {
    const it = state.equip[sl];
    if (!it) return `<div class="job-row"><div><div class="jname">${SLOT_LABEL[sl]}</div><div class="jinfo">Empty — equip an item to mod it.</div></div></div>`;
    return `<div class="job-row">
      <div><div class="jname">${itemHtml(it)}</div>
      <div class="jinfo">Mod slots: ${(it.mods || []).length}/${maxModSlots(it.rarity)}</div></div>
      <div class="job-actions">
        <button class="btn small" onclick="reforgeItem('${sl}')">Reforge</button>
        <button class="btn small primary" onclick="enchantItem('${sl}')">Enchant</button>
      </div>
    </div>`;
  }).join('');
  return `<div class="card">
    <h2>Gunsmith <span class="sub">${fmt(state.intel || 0)} Intel</span></h2>
    <div class="desc">Spend Intel (from The Climb) to upgrade equipped gear. Reforge rerolls base stats (${rc.intel} Intel + ${rc.mats.alloy} ${MATS.alloy}). Enchant adds a bonus mod (${ec.intel} Intel + ${ec.mats.shard} ${MATS.shard}); Epic+ gear holds 2 mods.</div>
    ${rows}
  </div>`;
}

function renderBosses() {
  ensureSyndicate();
  let synd = '';
  if ((state.prestige || 0) >= 1 && state.syndicate) {
    const s = state.syndicate;
    const hp = clamp(s.hp, 0, s.maxHp);
    synd = `<div class="card"><h2>Syndicate War <span class="sub">${s.name} · clears ${s.clears||0}</span></h2>
      <div class="desc">Weekly endgame foe. Rewards PP, Mythic Shards, chance at Mythic gear.</div>
      <div class="boss-hp-bar"><div style="width:${hp/s.maxHp*100}%"></div></div>
      <div class="boss-stats"><span>❤️ ${fmt(hp)} / ${fmt(s.maxHp)}</span><span>⚔️ ${fmt(s.atk)}</span><span>🛡️ ${fmt(s.def)}</span></div>
      <button class="btn danger" data-st="${s.stamina}" onclick="hitSyndicate(1)">Strike (${s.stamina} 🔥)</button>
      <button class="btn danger small" data-st="${s.stamina}" onclick="hitSyndicate(5)">×5</button>
      <button class="btn danger small" data-st="${s.stamina}" onclick="hitSyndicate(1000)">All-in</button>
    </div>`;
  } else if ((state.prestige || 0) < 1) {
    synd = `<div class="card locked"><h2>Syndicate Wars</h2><div class="desc">Unlocks after your first prestige.</div></div>`;
  }
  let html = synd + `
  <div class="card">
    <h2>Boss Fights <span class="sub">stamina · retaliation · guaranteed loot</span></h2>
    <div class="desc">Bosses scale forever. Crit chance: ${Math.round(critChance() * 100)}%.</div>
  </div>`;
  const n = bossCount();
  for (let i = n - 1; i >= 0; i--) {
    const b = bossData(i);
    if (state.bossHp[i] === undefined) state.bossHp[i] = b.maxHp;
    const hp = clamp(state.bossHp[i], 0, b.maxHp);
    const unlocked = state.level >= b.level;
    html += `
    <div class="boss-card ${unlocked ? '' : 'locked'}">
      <div class="boss-head">
        <span class="bname">${b.name}</span>
        <span style="font-size:.75rem;color:var(--muted)">Level ${b.level} · ×${b.kills}</span>
      </div>
      <div style="font-size:.76rem;color:var(--muted);margin-top:2px">${b.flavor}</div>
      <div class="boss-hp-bar"><div style="width:${hp / b.maxHp * 100}%"></div></div>
      <div class="boss-stats">
        <span>❤️ ${fmt(hp)} / ${fmt(b.maxHp)}</span>
        <span>⚔️ ${fmt(b.atk)}</span>
        <span>🛡️ ${fmt(b.def)}</span>
        <span>💵 $${fmt(b.cash)}</span>
        <span>✨ ${fmt(b.xp)} XP</span>
      </div>
      ${unlocked ? `
        <button class="btn danger" data-st="${b.stamina}" onclick="hitBoss(${i},1)">Attack (${b.stamina} 🔥)</button>
        <button class="btn danger small" data-st="${b.stamina}" onclick="hitBoss(${i},5)">×5</button>
        <button class="btn danger small" data-st="${b.stamina}" onclick="hitBoss(${i},1000)">All-in</button>
      ` : `<div class="desc" style="margin:0">🔒 Requires level ${b.level}.</div>`}
    </div>`;
  }
  return html;
}

function renderShop() {
  const rows = shopItems().map(s => `
    <div class="job-row">
      <div>
        <div class="jname">${s.name}</div>
        <div class="jinfo">${s.desc}</div>
      </div>
      <button class="btn ${s.gold !== undefined ? 'primary' : ''}" ${s.cash !== undefined ? `data-cash="${s.cash}"` : `data-gold="${s.gold}"`} onclick="buyShop('${s.id}')">
        ${s.cash !== undefined ? '$' + fmt(s.cash) : s.gold + ' ◈'}
      </button>
    </div>`).join('');
  return `
  <div class="card">
    <h2>The Black Market ${state.spec === 'kingpin' ? '<span class="sub">10% Kingpin discount</span>' : ''}</h2>
    <div class="desc">Cash prices scale with level. Gold Bonds from level-ups, bosses, contracts, achievements.</div>
    ${rows}
  </div>`;
}

function renderCharacter() {
  const equipCards = SLOTS.map(sl => {
    const it = state.equip[sl];
    return `
    <div class="equip-slot">
      <div class="slot-name">${SLOT_LABEL[sl]}</div>
      ${it ? `
        <div class="iname rar-${it.rarity}" style="font-weight:700;font-size:.85rem">${esc(it.name)}</div>
        <div class="istats" style="font-size:.74rem;color:var(--muted)">Lv ${it.lvl} · +${fmt(it.atk)} ATK · +${fmt(it.def)} DEF</div>
        <button class="btn small" style="margin-top:6px" onclick="unequipItem('${sl}')">Unequip</button>
      ` : `<div style="color:var(--muted);font-size:.8rem">— empty —</div>`}
    </div>`;
  }).join('');

  let inv = [...state.inv];
  if (stashFilter !== 'all') inv = inv.filter(i => i.rarity === stashFilter);
  inv.sort((a, b) => (RAR_IDX[b.rarity] - RAR_IDX[a.rarity]) || (b.lvl - a.lvl));
  const invCards = inv.map(it => {
    const cur = state.equip[it.slot];
    const diffA = it.atk - (cur ? cur.atk : 0), diffD = it.def - (cur ? cur.def : 0);
    const diff = v => v === 0 ? '' : `<span style="color:${v > 0 ? 'var(--green)' : 'var(--red)'}">(${v > 0 ? '+' : '−'}${fmt(Math.abs(v))})</span>`;
    return `
    <div class="item-card b-${it.rarity}">
      <div class="iname rar-${it.rarity}">${esc(it.name)}</div>
      <div class="istats">Lv ${it.lvl} ${SLOT_LABEL[it.slot]} · ${RARITIES[RAR_IDX[it.rarity]].name}${it.setId ? ` <span class="set-pill">${GEAR_SETS[it.setId].name}</span>` : ''}</div>
      <div class="istats">⚔️ ${fmt(it.atk)} ${diff(diffA)} · 🛡️ ${fmt(it.def)} ${diff(diffD)}</div>
      <div class="iactions">
        <button class="btn small primary" onclick="equipItem(${it.id})">Equip</button>
        <button class="btn small" onclick="salvageItem(${it.id})">Salvage</button>
      </div>
    </div>`;
  }).join('') || '<div class="desc">No items match this filter.</div>';

  const filters = ['all', ...RARITIES.map(r => r.id)].map(f =>
    `<button class="filter-chip ${stashFilter === f ? 'active' : ''}" onclick="setStashFilter('${f}')">${f === 'all' ? 'All' : RARITIES[RAR_IDX[f]].name}</button>`
  ).join('');

  const achRows = ACHIEVEMENTS.map(a => {
    const done = state.ach.includes(a.id);
    return `
    <div class="ach ${done ? 'done' : ''}" style="${done ? '' : 'opacity:.55'}">
      <div class="icon">${done ? a.icon : '🔒'}</div>
      <div><div class="aname">${a.name}</div><div class="adesc">${a.desc}</div></div>
      <div class="reward">${done ? '✔' : '+' + a.gold + ' ◈'}</div>
    </div>`;
  }).join('');

  const statBtn = (stat, label) => `
    <div class="stat-row">
      <span>${label}</span>
      <span>
        <b>${stat === 'atk' ? fmt(state.atk) : stat === 'def' ? fmt(state.def) : stat === 'stamina' ? state.maxStamina : state.maxEnergy}</b>
        <button class="btn small" style="margin-left:8px" onclick="spendStat('${stat}',1)">+1</button>
        <button class="btn small" onclick="spendStat('${stat}',5)">+5</button>
      </span>
    </div>`;

  const specCards = Object.entries(SPECS).map(([id, s]) => `
    <div class="spec-card ${state.spec === id ? 'selected' : ''}" onclick="chooseSpec('${id}')">
      <h3>${s.name}${state.spec === id ? ' ✓' : ''}</h3>
      <p>${s.desc}</p>
      <p style="margin-top:6px">${!state.spec && state.level >= 10 ? 'Click to choose' : state.spec === id ? 'Current' : state.level < 10 ? 'Unlocks at L10' : 'Respec: 5 ◈'}</p>
    </div>`).join('');

  return `
  <div class="card">
    <h2>Character Sheet <span class="sub">L${state.level} · ${fmt(state.xp)} / ${fmt(xpNeeded(state.level))} XP</span></h2>
    <div class="grid2">
      <div>
        <div class="stat-row"><span>Stat Points</span><b style="font-size:1.1rem">${state.statPoints}</b></div>
        ${statBtn('atk', '⚔️ Attack (base)')}
        ${statBtn('def', '🛡️ Defense (base)')}
        ${statBtn('stamina', '🔥 Max Stamina')}
        ${statBtn('energy', '⚡ Max Energy')}
      </div>
      <div>
        <div class="stat-row"><span>Total Attack</span><b>${fmt(totalAtk())}</b></div>
        <div class="stat-row"><span>Total Defense</span><b>${fmt(totalDef())}</b></div>
        <div class="stat-row"><span>Max Health</span><b>${fmt(maxHp())}</b></div>
        <div class="stat-row"><span>Crit Chance</span><b>${Math.round(critChance() * 100)}%</b></div>
        <div class="stat-row"><span>Prestige</span><b>${state.prestige} (×${prestigeMult().toFixed(2)})</b></div>
        <div class="stat-row"><span>Prestige Points</span><b>${fmt(state.prestigePoints||0)}</b></div>
        <div class="stat-row"><span>Raids Survived</span><b>${fmt(state.counters.raidsWon)}</b></div>
      </div>
    </div>
  </div>
  <div class="card">
    <h2>Army Power <span class="sub">${armyTotalLevels()} unit levels</span></h2>
    <div class="desc">Flat bonuses from your Private Army (persist through prestige).</div>
    <div class="dash-grid">
      <div class="dash-tile"><div class="val">+${fmt(armyFlat('atk'))}</div><div class="lbl">Attack</div></div>
      <div class="dash-tile"><div class="val">+${fmt(armyFlat('def'))}</div><div class="lbl">Defense</div></div>
      <div class="dash-tile"><div class="val">+${fmt(armyFlat('hp'))}</div><div class="lbl">Max HP</div></div>
      <div class="dash-tile"><div class="val">+${fmt(armyFlat('energy') + prestigeShopLungs())}</div><div class="lbl">Energy</div></div>
      <div class="dash-tile"><div class="val">+${fmt(armyFlat('stamina') + prestigeShopLungs())}</div><div class="lbl">Stamina</div></div>
      <div class="dash-tile"><div class="val">+${(armyAtkPct()*100).toFixed(1)}% / +${(armyCrit()*100).toFixed(1)}%</div><div class="lbl">ATK% / Crit</div></div>
    </div>
  </div>
  <div class="card">
    <h2>Specialization <span class="sub">${state.level < 10 ? 'unlocks at level 10' : state.spec ? SPECS[state.spec].name : 'choose one'}</span></h2>
    <div class="grid2">${specCards}</div>
  </div>
  <div class="card">
    <h2>Capo Talent Tree <span class="sub">${state.talentPoints || 0} points · unlocks L12</span></h2>
    <button class="btn small" onclick="respecTalents()">Respec (8 ◈)</button>
    ${Object.entries(TALENT_TREE).map(([branch, nodes]) => `
      <h3 style="margin:10px 0 6px;color:var(--gold);font-size:.85rem;text-transform:uppercase">${branch}</h3>
      ${nodes.map(n => `
        <div class="talent-node ${hasTalent(n.id) ? 'owned' : ''}">
          <b>${n.name}</b> <span style="color:var(--muted);font-size:.75rem">(${n.cost} pt) — ${n.desc}</span>
          ${hasTalent(n.id) ? '' : `<button class="btn small" style="margin-left:8px" onclick="buyTalent('${n.id}')">Learn</button>`}
        </div>`).join('')}
    `).join('')}
  </div>
  <div class="card">
    <h2>Collections</h2>
    ${COLLECTIONS.map(c => {
      const n = state.collections[c.id] || 0;
      const done = n >= c.tokens;
      return `<div style="margin-bottom:8px"><b>${c.name}</b> ${n}/${c.tokens} ${done ? '<span class="tag" style="color:var(--green)">Complete</span>' : ''}
        <div class="col-bar"><div style="width:${clamp(n / c.tokens * 100, 0, 100)}%"></div></div></div>`;
    }).join('')}
  </div>
  <div class="card">
    <h2>Equipment</h2>
    <div class="equip-grid">${equipCards}</div>
    <h2 style="margin-top:8px">Stash <span class="sub">${state.inv.length} / ${stashCap()}</span></h2>
    <div>${filters}</div>
    <label style="font-size:.78rem;color:var(--muted);display:block;margin:6px 0">
      <input type="checkbox" ${state.autoSalvageCommons ? 'checked' : ''} onchange="toggleAutoSalvage()"> Auto-salvage Commons
    </label>
    <div class="grid3">${invCards}</div>
  </div>
  <div class="card">
    <h2>Achievements <span class="sub">${state.ach.length} / ${ACHIEVEMENTS.length}</span></h2>
    <div class="grid2">${achRows}</div>
  </div>
  ${canPrestige() ? `
  <div class="card">
    <h2>Rebuild the Empire</h2>
    <div class="desc">Soft reset for permanent ×1.08 cash/XP per rank. Keep crew, army, prestige shop, half mastery. Earn Prestige Points.</div>
    <button class="btn primary" onclick="doPrestige()">Prestige Now</button>
  </div>` : ''}
  <div class="card">
    <h2>Save Management</h2>
    <div class="desc">Auto-saves every 15s and after actions. Save format v5.</div>
    <button class="btn small" onclick="exportSave()">Export Save</button>
    <button class="btn small" onclick="importSave()">Import Save</button>
    <button class="btn small danger" onclick="hardReset()">Hard Reset</button>
  </div>`;
}

(function init() {
  window.__gameLoaded = true;
  const loaded = load();
  if (loaded) {
    state = loaded;
    ensureContracts();
    ensureWeeklies();
    ensureHits();
    applyOffline();
    addLog('💾 Save loaded. Back to business.', 'info');
  } else {
    state = defaultState();
    const starter = genItem(1, 'common', 'weapon');
    starter.name = 'Rusty Switchblade';
    state.equip.weapon = starter;
    generateContracts();
    generateWeeklies();
    addLog('🌆 Welcome to the city, kid. Start with jobs in <b>Little Italy</b>. Master them, pull heists, claim turf — then own the skyline.', 'gold');
  }
  updateHeader();
  initUI();
  renderTab();
  setInterval(tick, 1000);
  window.addEventListener('beforeunload', save);
})();
