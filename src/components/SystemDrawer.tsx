import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatNum, getHeroAtk, getShadowDps, getStatCost, SHADOW_DEFS, WEAPONS } from '../data/gameData';
import { GameState, ShadowId, StatKey, TabKey } from '../types/game';

interface Props {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  state: GameState;
  onUpgradeStat: (k: StatKey) => void;
  onUpgradeShadow: (id: ShadowId) => void;
  onWeapon: (id: string) => void;
  onClaimQuest: (id: string, reward: number) => void;
}

const IGRIS_ASSET = require('../../assets/igris.png');

export const SystemDrawer: React.FC<Props> = ({
  tab,
  setTab,
  state,
  onUpgradeStat,
  onUpgradeShadow,
  onWeapon,
  onClaimQuest,
}) => {
  const statsList: { key: StatKey; label: string; sub: string; color: string }[] = [
    { key: 'str', label: 'STRENGTH', sub: `Attack ${formatNum(getHeroAtk(state))}`, color: '#fb7185' },
    { key: 'agi', label: 'AGILITY', sub: `Crit & Attack Speed`, color: '#22d3ee' },
    { key: 'int', label: 'INTELLIGENCE', sub: `Shadow DPS ${formatNum(getShadowDps(state))}/s`, color: '#a78bfa' },
    { key: 'vit', label: 'VITALITY', sub: 'Combat Power & Resilience', color: '#34d399' },
    { key: 'per', label: 'SENSE / PER', sub: `Gold Bonus +${state.stats.per * 6}%`, color: '#fbbf24' },
  ];

  const quests = [
    { id: 'q_kills', title: 'Defeat 15 Dungeon Monsters', cur: state.kills, goal: 15, reward: 20 },
    { id: 'q_crits', title: 'Land 20 Critical Strikes', cur: state.crits, goal: 20, reward: 25 },
    { id: 'q_boss', title: 'Clear 1 Gate Boss', cur: state.bossKills, goal: 1, reward: 35 },
    { id: 'q_arise', title: 'Extract 1 Shadow Soldier', cur: state.extractions, goal: 1, reward: 40 },
  ];

  return (
    <View style={styles.drawer}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tab === 'stats' &&
          statsList.map((s) => {
            const cost = getStatCost(state.stats[s.key]);
            const can = state.gold >= cost;
            return (
              <View key={s.key} style={styles.row}>
                <View>
                  <Text style={[styles.rowTitle, { color: s.color }]}>
                    {s.label}  <Text style={styles.white}>{state.stats[s.key]}</Text>
                  </Text>
                  <Text style={styles.rowSub}>{s.sub}</Text>
                </View>
                <Pressable
                  onPress={() => onUpgradeStat(s.key)}
                  style={[styles.actionBtn, can ? styles.cyanBtn : styles.disabledBtn]}
                >
                  <Text style={[styles.actionText, can ? styles.darkText : styles.mutedText]}>+1 • {formatNum(cost)}G</Text>
                </Pressable>
              </View>
            );
          })}

        {tab === 'shadows' &&
          SHADOW_DEFS.map((def) => {
            const lv = state.shadows[def.id] || 0;
            const locked = lv === 0;
            const cost = locked ? def.unlockCost : Math.floor(def.upgradeBase * Math.pow(1.38, lv - 1));
            const can = locked ? state.crystals >= cost : state.gold >= cost;
            return (
              <View key={def.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  {def.id === 'igris' ? (
                    <Image source={IGRIS_ASSET} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarBadge}>
                      <Text style={styles.avatarBadgeText}>{def.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.rowTitle}>{def.name}</Text>
                    <Text style={styles.rowSub}>{locked ? 'Extract via Crystals or Boss' : `LV.${lv} • Active in 3D`}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => onUpgradeShadow(def.id)}
                  style={[styles.actionBtn, can ? (locked ? styles.violetBtn : styles.cyanBtn) : styles.disabledBtn]}
                >
                  <Text style={[styles.actionText, can && !locked ? styles.darkText : styles.white]}>
                    {locked ? `ARISE ◆${cost}` : `UP ${formatNum(cost)}G`}
                  </Text>
                </Pressable>
              </View>
            );
          })}

        {tab === 'gear' &&
          WEAPONS.map((w) => {
            const owned = state.ownedWeapons.includes(w.id);
            const eq = state.equippedWeapon === w.id;
            const can = state.gold >= w.cost;
            return (
              <View key={w.id} style={styles.row}>
                <View>
                  <Text style={styles.rowTitle}>{w.name}</Text>
                  <Text style={styles.rowSub}>+{formatNum(w.bonusAtk)} ATK • +{Math.round(w.critDmg * 100)}% Crit DMG</Text>
                </View>
                <Pressable
                  onPress={() => onWeapon(w.id)}
                  style={[styles.actionBtn, eq ? styles.eqBtn : owned ? styles.ownedBtn : can ? styles.crimsonBtn : styles.disabledBtn]}
                >
                  <Text style={styles.actionText}>{eq ? 'EQUIPPED' : owned ? 'EQUIP' : `${formatNum(w.cost)}G`}</Text>
                </Pressable>
              </View>
            );
          })}

        {tab === 'quests' &&
          quests.map((q) => {
            const done = q.cur >= q.goal;
            const claimed = !!state.claimedQuests[q.id];
            return (
              <View key={q.id} style={styles.row}>
                <View>
                  <Text style={styles.rowTitle}>{q.title}</Text>
                  <Text style={styles.rowSub}>{Math.min(q.cur, q.goal)} / {q.goal} • Reward ◆{q.reward}</Text>
                </View>
                <Pressable
                  onPress={() => done && !claimed && onClaimQuest(q.id, q.reward)}
                  style={[styles.actionBtn, !claimed && done ? styles.violetBtn : styles.disabledBtn]}
                >
                  <Text style={styles.actionText}>{claimed ? 'CLAIMED' : done ? `CLAIM ◆${q.reward}` : 'ACTIVE'}</Text>
                </Pressable>
              </View>
            );
          })}
      </ScrollView>

      <View style={styles.tabBar}>
        {(['stats', 'shadows', 'gear', 'quests'] as TabKey[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{t.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  drawer: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderColor: '#e11d2e' },
  avatarBadge: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#8b5cf6' },
  avatarBadgeText: { color: '#22d3ee', fontWeight: '900', fontSize: 12 },
  rowTitle: { color: '#f8fafc', fontWeight: '800', fontSize: 12 },
  rowSub: { color: '#94a3b8', fontSize: 10, marginTop: 2 },
  white: { color: '#ffffff' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  cyanBtn: { backgroundColor: '#22d3ee' },
  violetBtn: { backgroundColor: '#7c3aed' },
  crimsonBtn: { backgroundColor: '#e11d2e' },
  eqBtn: { backgroundColor: 'rgba(34,211,238,0.18)', borderWidth: 1, borderColor: '#22d3ee' },
  ownedBtn: { backgroundColor: '#334155' },
  disabledBtn: { backgroundColor: '#1e293b' },
  actionText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  darkText: { color: '#020617' },
  mutedText: { color: '#64748b' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1e293b', backgroundColor: '#06080e' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(34,211,238,0.12)', borderTopWidth: 2, borderTopColor: '#22d3ee' },
  tabLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  tabLabelActive: { color: '#22d3ee' },
});
