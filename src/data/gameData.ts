import { GateDef, GameState, ShadowDef, WeaponDef } from '../types/game';

export const RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'NAT'];

export const GATES: GateDef[] = [
  { rank: 'E', name: 'Double Dungeon', mob: 'Steel-Fanged Lycan', boss: 'Blood-Fanged Alpha', color: 0xe11d2e, accent: 0x22d3ee, baseHp: 110 },
  { rank: 'D', name: 'Subway Instance', mob: 'Blue Venom-Fanged Snake', boss: 'Blue Venom Kasaka', color: 0x06b6d4, accent: 0xe11d2e, baseHp: 420 },
  { rank: 'C', name: 'Red Gate Forest', mob: 'Ice Elf Scout', boss: 'Ice Elf Baruka', color: 0x38bdf8, accent: 0x8b5cf6, baseHp: 1450 },
  { rank: 'B', name: 'Job Change Throne', mob: 'Armored Knight', boss: 'Blood-Red Igris', color: 0xdc2626, accent: 0xa855f7, baseHp: 4800 },
  { rank: 'A', name: 'Hunters Guild Gate', mob: 'High Orc Warrior', boss: 'High Orc Kargalgan', color: 0xf97316, accent: 0xe11d2e, baseHp: 16500 },
  { rank: 'S', name: 'Jeju Island Nest', mob: 'Winged Ant Guard', boss: 'Ant King Beru', color: 0x9333ea, accent: 0x22d3ee, baseHp: 58000 }
];

export const WEAPONS: WeaponDef[] = [
  { id: 'steel', name: 'Hunter Steel Dagger', bonusAtk: 10, critDmg: 0.1, cost: 0, bladeHex: 0x22d3ee, offHex: 0x38bdf8, desc: 'Standard Association twin blade.' },
  { id: 'kasaka', name: "Kasaka's Venom Fang", bonusAtk: 42, critDmg: 0.25, cost: 450, bladeHex: 0x00f5d4, offHex: 0x3b82f6, desc: 'Paralyzing venom edge with cyan glow.' },
  { id: 'knight', name: 'Knight Killer', bonusAtk: 135, critDmg: 0.45, cost: 2400, bladeHex: 0xe11d2e, offHex: 0xf97316, desc: 'Armor-piercing crimson serrated blade.' },
  { id: 'baruka', name: "Baruka's Tanto", bonusAtk: 410, critDmg: 0.75, cost: 11500, bladeHex: 0x67e8f9, offHex: 0x8b5cf6, desc: 'Featherweight frost-shadow assassin dagger.' },
  { id: 'kamish', name: "Kamish's Wrath", bonusAtk: 1400, critDmg: 1.35, cost: 55000, bladeHex: 0xc084fc, offHex: 0xe11d2e, desc: 'Forged from calamity dragon fangs.' }
];

export const SHADOW_DEFS: ShadowDef[] = [
  { id: 'infantry', name: 'Shadow Infantry', role: 'Vanguard Blade', baseDps: 14, unlockCost: 0, upgradeBase: 120, color: 0x22d3ee, badge: 'NORMAL' },
  { id: 'igris', name: 'Igris the Bloodred', role: 'Knight Commander', baseDps: 58, unlockCost: 20, upgradeBase: 380, color: 0xe11d2e, badge: 'KNIGHT' },
  { id: 'tank', name: 'Tank', role: 'Alpha Ice Bear', baseDps: 180, unlockCost: 45, upgradeBase: 1200, color: 0x38bdf8, badge: 'ELITE' },
  { id: 'beru', name: 'Beru', role: 'Marshal Grade', baseDps: 620, unlockCost: 90, upgradeBase: 4200, color: 0xa855f7, badge: 'MARSHAL' }
];

export const INITIAL_STATE: GameState = {
  level: 1,
  xp: 0,
  gold: 180,
  crystals: 30,
  stage: 1,
  wave: 1,
  stats: { str: 6, agi: 5, int: 4, vit: 5, per: 4 },
  equippedWeapon: 'steel',
  ownedWeapons: ['steel'],
  shadows: { infantry: 1, igris: 0, tank: 0, beru: 0 },
  kills: 0,
  bossKills: 0,
  crits: 0,
  extractions: 0,
  claimedQuests: {},
  autoSkill: true,
  speed: 1,
  lastSaved: Date.now()
};

export function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.floor(n).toString();
}

export function getGate(stage: number): GateDef {
  return GATES[Math.min(GATES.length - 1, Math.floor((stage - 1) / 3))];
}

export function getWeapon(id: string): WeaponDef {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

export function getHeroAtk(s: GameState): number {
  const w = getWeapon(s.equippedWeapon);
  return Math.floor((14 + s.stats.str * 6.5 + s.level * 4 + w.bonusAtk) * (1 + s.level * 0.03));
}

export function getCritChance(s: GameState): number {
  return Math.min(0.75, 0.12 + s.stats.agi * 0.012);
}

export function getCritMult(s: GameState): number {
  return 1.8 + getWeapon(s.equippedWeapon).critDmg + s.stats.agi * 0.015;
}

export function getShadowDps(s: GameState, domainActive = false): number {
  let total = 0;
  for (const def of SHADOW_DEFS) {
    const lv = s.shadows[def.id] || 0;
    if (lv > 0) total += def.baseDps * lv * (1 + s.stats.int * 0.08);
  }
  return Math.floor(total * (domainActive ? 3 : 1));
}

export function getXpNeeded(level: number): number {
  return Math.floor(55 * Math.pow(1.26, level - 1));
}

export function getStatCost(lv: number): number {
  return Math.floor(28 * Math.pow(1.16, lv - 1));
}
