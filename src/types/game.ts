export type StatKey = 'str' | 'agi' | 'int' | 'vit' | 'per';
export type ShadowId = 'infantry' | 'igris' | 'tank' | 'beru';
export type TabKey = 'stats' | 'shadows' | 'gear' | 'quests' | 'ranking';

export interface GateDef {
  rank: string;
  name: string;
  mob: string;
  boss: string;
  color: number;
  accent: number;
  baseHp: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  bonusAtk: number;
  critDmg: number;
  cost: number;
  bladeHex: number;
  offHex: number;
  desc: string;
}

export interface ShadowDef {
  id: ShadowId;
  name: string;
  role: string;
  baseDps: number;
  unlockCost: number;
  upgradeBase: number;
  color: number;
  badge: string;
}

export interface GameState {
  level: number;
  xp: number;
  gold: number;
  crystals: number;
  stage: number;
  wave: number;
  stats: Record<StatKey, number>;
  equippedWeapon: string;
  ownedWeapons: string[];
  shadows: Record<ShadowId, number>;
  kills: number;
  bossKills: number;
  crits: number;
  extractions: number;
  claimedQuests: Record<string, boolean>;
  autoSkill: boolean;
  speed: 1 | 2;
  lastSaved: number;
}

export interface EnemyState {
  hp: number;
  maxHp: number;
  isBoss: boolean;
  name: string;
  bossTimer: number;
}
