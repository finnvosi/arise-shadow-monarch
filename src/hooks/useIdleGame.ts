import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchLeaderboard, LeaderboardEntry, loadCloudSave, syncCloudSave } from '../services/playerSync';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  getCritChance,
  getCritMult,
  getGate,
  getHeroAtk,
  getShadowDps,
  getStatCost,
  getWeapon,
  getXpNeeded,
  INITIAL_STATE,
  SHADOW_DEFS,
  WEAPONS,
} from '../data/gameData';
import { EnemyState, GameState, ShadowDef, ShadowId, StatKey } from '../types/game';

const STORAGE_KEY = 'arise_shadow_monarch_rn_v1';
export const SKILL_MAX_CD = [5, 9, 13, 18];

export function useIdleGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [enemy, setEnemy] = useState<EnemyState>({
    hp: 110,
    maxHp: 110,
    isBoss: false,
    name: 'Steel-Fanged Lycan',
    bossTimer: 30,
  });
  const [pendingArise, setPendingArise] = useState<ShadowDef | null>(null);
  const [skillCds, setSkillCds] = useState<number[]>([0, 0, 0, 0]);
  const [buffs, setBuffs] = useState({ bloodlust: 0, domain: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [offlineReward, setOfflineReward] = useState<{ sec: number; gold: number; xp: number } | null>(null);
  const [slashPulse, setSlashPulse] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced'>(isSupabaseConfigured ? 'syncing' : 'local');
  const [hunterName, setHunterName] = useState('Sung Jinwoo');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2000);
  }, []);

  const spawnEnemy = useCallback((stage: number, asBoss: boolean) => {
    const gate = getGate(stage);
    const maxHp = Math.floor(gate.baseHp * Math.pow(1.42, stage - 1) * (asBoss ? 5.2 : 1));
    setEnemy({
      hp: maxHp,
      maxHp,
      isBoss: asBoss,
      name: asBoss ? `[BOSS] ${gate.boss}` : gate.mob,
      bossTimer: 30,
    });
  }, []);

  // Load saved state + compute offline earnings
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Partial<GameState>;
        const merged: GameState = {
          ...INITIAL_STATE,
          ...parsed,
          stats: { ...INITIAL_STATE.stats, ...(parsed.stats || {}) },
          shadows: { ...INITIAL_STATE.shadows, ...(parsed.shadows || {}) },
          claimedQuests: { ...(parsed.claimedQuests || {}) },
        };
        setState(merged);
        spawnEnemy(merged.stage, false);
        const elapsed = Math.min(28800, Math.floor((Date.now() - (merged.lastSaved || Date.now())) / 1000));
        if (elapsed >= 20) {
          const gold = Math.max(15, Math.floor(elapsed * (3 + merged.stage * 2.4) * (1 + merged.stats.per * 0.04)));
          const xp = Math.max(10, Math.floor(elapsed * (2 + merged.stage * 1.8)));
          setOfflineReward({ sec: elapsed, gold, xp });
        }
      } catch {}
    });
  }, [spawnEnemy]);

  // Cloud load on mount (prefers higher progress between local & Supabase)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    loadCloudSave().then((res) => {
      if (res.hunterName) setHunterName(res.hunterName);
      if (res.state) {
        setState((local) => {
          const cloudWins = (res.state!.stage || 1) > local.stage || (res.state!.level || 1) > local.level;
          if (!cloudWins) return local;
          const merged = { ...local, ...res.state } as GameState;
          spawnEnemy(merged.stage, false);
          return merged;
        });
        if (res.offlineSeconds >= 20) {
          const st = res.state.stage || 1;
          const gold = Math.max(15, Math.floor(res.offlineSeconds * (3 + st * 2.4)));
          const xp = Math.max(10, Math.floor(res.offlineSeconds * (2 + st * 1.8)));
          setOfflineReward({ sec: res.offlineSeconds, gold, xp });
        }
      }
      setSyncStatus('synced');
      fetchLeaderboard().then(setLeaderboard).catch(() => {});
    }).catch(() => setSyncStatus('local'));
  }, [spawnEnemy]);

  // Auto-save every 6s (local AsyncStorage + Supabase cloud upsert)
  useEffect(() => {
    const id = setInterval(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stateRef.current, lastSaved: Date.now() })).catch(() => {});
      if (isSupabaseConfigured) {
        setSyncStatus('syncing');
        syncCloudSave(stateRef.current, hunterName).then((ok) => setSyncStatus(ok ? 'synced' : 'local')).catch(() => setSyncStatus('local'));
      }
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const applyDamage = useCallback(
    (rawDmg: number, isCritEligible = true, isManual = false) => {
      if (pendingArise) return;
      if (isManual) {
        setSlashPulse((p) => p + 1);
      }
      const s = stateRef.current;
      let dmg = rawDmg;
      let didCrit = false;
      if (isCritEligible && Math.random() < getCritChance(s)) {
        dmg = Math.floor(dmg * getCritMult(s));
        didCrit = true;
      }

      setEnemy((prev) => {
        if (prev.hp <= 0) return prev;
        const nextHp = Math.max(0, prev.hp - dmg);
        if (nextHp === 0) {
          const goldGain = Math.floor((14 + s.stage * 11) * (prev.isBoss ? 5.5 : 1) * (1 + s.stats.per * 0.06));
          const xpGain = Math.floor((12 + s.stage * 8) * (prev.isBoss ? 4.5 : 1));
          setState((cur) => {
            let level = cur.level;
            let xp = cur.xp + xpGain;
            let crystals = cur.crystals + (prev.isBoss ? 12 : 0);
            while (xp >= getXpNeeded(level)) {
              xp -= getXpNeeded(level);
              level += 1;
              crystals += 5;
              notify(`[SYSTEM] LEVEL UP! REACHED LV. ${level}`);
            }
            const nextStage = prev.isBoss ? cur.stage + 1 : cur.stage;
            const nextWave = prev.isBoss ? 1 : cur.wave >= 4 ? 1 : cur.wave + 1;
            return {
              ...cur,
              level,
              xp,
              gold: cur.gold + goldGain,
              crystals,
              stage: nextStage,
              wave: nextWave,
              kills: cur.kills + 1,
              bossKills: cur.bossKills + (prev.isBoss ? 1 : 0),
              crits: cur.crits + (didCrit ? 1 : 0),
            };
          });

          if (prev.isBoss) {
            const locked = SHADOW_DEFS.find((d) => (s.shadows[d.id] || 0) === 0);
            setPendingArise(locked || SHADOW_DEFS[Math.floor(Math.random() * SHADOW_DEFS.length)]);
          } else {
            const nextIsBoss = s.wave >= 4;
            setTimeout(() => spawnEnemy(s.stage, nextIsBoss), 60);
          }
        } else if (didCrit) {
          setState((cur) => ({ ...cur, crits: cur.crits + 1 }));
        }
        return { ...prev, hp: nextHp };
      });
    },
    [notify, pendingArise, spawnEnemy]
  );

  // Idle Combat Tick (200ms)
  useEffect(() => {
    const id = setInterval(() => {
      if (pendingArise) return;
      const s = stateRef.current;
      const dt = 0.2 * s.speed;
      const spdMult = buffs.bloodlust > 0 ? 1.9 : 1;
      const heroDps = getHeroAtk(s) * Math.min(3.4, 1.15 + s.stats.agi * 0.035) * spdMult;
      const shadowDps = getShadowDps(s, buffs.domain > 0);
      applyDamage(Math.max(1, Math.floor((heroDps + shadowDps) * dt)), true);

      setSkillCds((cds) => cds.map((c) => Math.max(0, c - dt)));
      setBuffs((b) => ({
        bloodlust: Math.max(0, b.bloodlust - dt),
        domain: Math.max(0, b.domain - dt),
      }));
    }, 200);
    return () => clearInterval(id);
  }, [applyDamage, buffs.bloodlust, buffs.domain, pendingArise]);

  const useSkill = useCallback(
    (idx: number) => {
      if (skillCds[idx] > 0 || pendingArise) return;
      const s = stateRef.current;
      setSkillCds((cds) => cds.map((v, i) => (i === idx ? SKILL_MAX_CD[idx] : v)));
      if (idx === 0) applyDamage(Math.floor(getHeroAtk(s) * 3.4), false, true);
      if (idx === 1) {
        applyDamage(Math.floor(getHeroAtk(s) * 2.6 + getShadowDps(s)), false, true);
        notify("[SYSTEM] RULER'S AUTHORITY!");
      }
      if (idx === 2) {
        setBuffs((b) => ({ ...b, bloodlust: 6 }));
        notify('[SYSTEM] BLOODLUST — 2x SPEED');
      }
      if (idx === 3) {
        setBuffs((b) => ({ ...b, domain: 7 }));
        notify('[SYSTEM] DOMAIN OF THE MONARCH — SHADOWS x3');
      }
    },
    [applyDamage, notify, pendingArise, skillCds]
  );

  const triggerArise = useCallback(() => {
    if (!pendingArise) return;
    const target = pendingArise;
    setState((cur) => ({
      ...cur,
      shadows: { ...cur.shadows, [target.id]: (cur.shadows[target.id] || 0) + 1 },
      extractions: cur.extractions + 1,
    }));
    setPendingArise(null);
    notify(`[ARISE] ${target.name.toUpperCase()} EXTRACTED!`);
    spawnEnemy(stateRef.current.stage, false);
  }, [notify, pendingArise, spawnEnemy]);

  const upgradeStat = useCallback((key: StatKey) => {
    setState((cur) => {
      const cost = getStatCost(cur.stats[key]);
      if (cur.gold < cost) return cur;
      return { ...cur, gold: cur.gold - cost, stats: { ...cur.stats, [key]: cur.stats[key] + 1 } };
    });
  }, []);

  const upgradeShadow = useCallback(
    (id: ShadowId) => {
      const def = SHADOW_DEFS.find((d) => d.id === id);
      if (!def) return;
      setState((cur) => {
        const lv = cur.shadows[id] || 0;
        if (lv === 0) {
          if (cur.crystals < def.unlockCost) return cur;
          notify(`[ARISE] ${def.name.toUpperCase()} SUMMONED!`);
          return {
            ...cur,
            crystals: cur.crystals - def.unlockCost,
            shadows: { ...cur.shadows, [id]: 1 },
            extractions: cur.extractions + 1,
          };
        }
        const cost = Math.floor(def.upgradeBase * Math.pow(1.38, lv - 1));
        if (cur.gold < cost) return cur;
        return { ...cur, gold: cur.gold - cost, shadows: { ...cur.shadows, [id]: lv + 1 } };
      });
    },
    [notify]
  );

  const equipOrBuyWeapon = useCallback(
    (weaponId: string) => {
      const w = WEAPONS.find((x) => x.id === weaponId);
      if (!w) return;
      setState((cur) => {
        if (cur.ownedWeapons.includes(weaponId)) {
          notify(`[SYSTEM] EQUIPPED ${w.name.toUpperCase()}`);
          return { ...cur, equippedWeapon: weaponId };
        }
        if (cur.gold < w.cost) return cur;
        notify(`[SYSTEM] ACQUIRED ${w.name.toUpperCase()}`);
        return {
          ...cur,
          gold: cur.gold - w.cost,
          ownedWeapons: [...cur.ownedWeapons, weaponId],
          equippedWeapon: weaponId,
        };
      });
    },
    [notify]
  );

  const claimQuest = useCallback(
    (questId: string, reward: number) => {
      setState((cur) => {
        if (cur.claimedQuests[questId]) return cur;
        notify(`[SYSTEM] CLAIMED ${reward} MANA CRYSTALS`);
        return {
          ...cur,
          crystals: cur.crystals + reward,
          claimedQuests: { ...cur.claimedQuests, [questId]: true },
        };
      });
    },
    [notify]
  );

  const claimOffline = useCallback(() => {
    if (!offlineReward) return;
    setState((cur) => ({ ...cur, gold: cur.gold + offlineReward.gold, xp: cur.xp + offlineReward.xp }));
    setOfflineReward(null);
  }, [offlineReward]);

  return {
    state,
    setState,
    enemy,
    pendingArise,
    skillCds,
    buffs,
    toast,
    offlineReward,
    slashPulse,
    syncStatus,
    hunterName,
    setHunterName,
    leaderboard,
    refreshLeaderboard: () => fetchLeaderboard().then(setLeaderboard).catch(() => {}),
    applyDamage,
    useSkill,
    triggerArise,
    spawnEnemy,
    upgradeStat,
    upgradeShadow,
    equipOrBuyWeapon,
    claimQuest,
    claimOffline,
  };
}
