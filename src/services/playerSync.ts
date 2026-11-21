import { getHeroAtk, getShadowDps, RANKS } from '../data/gameData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { GameState } from '../types/game';

export interface LeaderboardEntry {
  hunter_name: string;
  hunter_rank: string;
  level: number;
  stage: number;
  combat_power: number;
}

export interface CloudLoadResult {
  state: Partial<GameState> | null;
  hunterName: string;
  offlineSeconds: number;
  userId: string | null;
}

function computeCombatPower(s: GameState): number {
  const dps = getHeroAtk(s) * Math.min(3.4, 1.15 + s.stats.agi * 0.035) + getShadowDps(s);
  return Math.floor(dps * 5.2 + s.stats.vit * 18 + s.level * 25);
}

/**
 * Ensures every player has a seamless Supabase session using Anonymous Auth
 * (zero login friction on first open; can link an email later).
 */
export async function ensureHunterSession(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user?.id) return existing.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function loadCloudSave(): Promise<CloudLoadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { state: null, hunterName: 'Sung Jinwoo', offlineSeconds: 0, userId: null };
  }
  const userId = await ensureHunterSession();
  if (!userId) return { state: null, hunterName: 'Sung Jinwoo', offlineSeconds: 0, userId: null };

  const { data, error } = await supabase
    .from('hunters')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { state: null, hunterName: 'Sung Jinwoo', offlineSeconds: 0, userId };
  }

  // Ask Postgres server for authoritative elapsed offline seconds
  let offlineSeconds = 0;
  const { data: secData } = await supabase.rpc('get_server_offline_seconds');
  if (typeof secData === 'number') offlineSeconds = secData;

  const cloudState: Partial<GameState> = {
    level: data.level,
    xp: Number(data.xp),
    gold: Number(data.gold),
    crystals: data.crystals,
    stage: data.stage,
    wave: data.wave,
    equippedWeapon: data.equipped_weapon,
    ownedWeapons: data.owned_weapons,
    stats: data.stats,
    shadows: data.shadows,
    kills: data.kills,
    bossKills: data.boss_kills,
    crits: data.crits,
    extractions: data.extractions,
    claimedQuests: data.claimed_quests,
    autoSkill: data.auto_skill,
    speed: data.speed === 2 ? 2 : 1,
    lastSaved: Date.now(),
  };

  return {
    state: cloudState,
    hunterName: data.hunter_name || 'Sung Jinwoo',
    offlineSeconds,
    userId,
  };
}

export async function syncCloudSave(s: GameState, hunterName = 'Sung Jinwoo'): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const userId = await ensureHunterSession();
  if (!userId) return false;

  const hunterRank = RANKS[Math.min(RANKS.length - 1, Math.floor((s.level - 1) / 5))];
  const { error } = await supabase.from('hunters').upsert(
    {
      user_id: userId,
      hunter_name: hunterName,
      hunter_rank: hunterRank,
      level: s.level,
      xp: Math.floor(s.xp),
      gold: Math.floor(s.gold),
      crystals: Math.floor(s.crystals),
      stage: s.stage,
      wave: s.wave,
      combat_power: computeCombatPower(s),
      equipped_weapon: s.equippedWeapon,
      owned_weapons: s.ownedWeapons,
      stats: s.stats,
      shadows: s.shadows,
      kills: s.kills,
      boss_kills: s.bossKills,
      crits: s.crits,
      extractions: s.extractions,
      claimed_quests: s.claimedQuests,
      auto_skill: s.autoSkill,
      speed: s.speed,
      last_online_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  return !error;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('hunter_leaderboard')
    .select('hunter_name, hunter_rank, level, stage, combat_power')
    .limit(20);
  if (error || !data) return [];
  return data as LeaderboardEntry[];
}
