import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Arena3D } from './src/components/Arena3D';
import { SystemDrawer } from './src/components/SystemDrawer';
import { formatNum, getGate, getHeroAtk, getXpNeeded, RANKS } from './src/data/gameData';
import { useIdleGame } from './src/hooks/useIdleGame';
import { TabKey } from './src/types/game';
import { lockToLandscape } from './src/utils/orientation';

const HERO_AVATAR = require('./assets/icon.png');

export default function App() {
  const [openTab, setOpenTab] = useState<TabKey | null>(null);
  const game = useIdleGame();
  const { state, enemy } = game;
  const gate = getGate(state.stage);
  const rank = RANKS[Math.min(RANKS.length - 1, Math.floor((state.level - 1) / 5))];
  const hpPct = enemy.maxHp > 0 ? Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100)) : 0;

  // Automatically lock screen to landscape upon entering the game
  useEffect(() => {
    lockToLandscape();

    // Re-lock if the user returns to the game tab
    const onFocus = () => lockToLandscape();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.stage}>
        {/* 100% FULLSCREEN EDGE-TO-EDGE 3D ARENA */}
        <Arena3D
          stage={state.stage}
          isBoss={enemy.isBoss}
          equippedWeapon={state.equippedWeapon}
          shadows={state.shadows}
          slashPulse={game.slashPulse}
          domainActive={game.buffs.domain > 0}
          onTapSlash={() => game.applyDamage(Math.floor(getHeroAtk(state) * 0.9), true, true)}
        />

        {/* FLOATING TOP ARPG HUD */}
        <View style={styles.topHud} pointerEvents="box-none">
          <View style={styles.identity}>
            <View>
              <Image source={HERO_AVATAR} style={styles.heroImg} />
              <View style={styles.rankBadge}><Text style={styles.rankText}>{rank}</Text></View>
            </View>
            <View>
              <Text style={styles.heroName}>SUNG JINWOO  <Text style={styles.lvText}>LV.{state.level}</Text></Text>
              <Text style={styles.heroSub}>XP {formatNum(state.xp)} / {formatNum(getXpNeeded(state.level))}</Text>
            </View>
          </View>

          <View style={styles.centerBoss}>
            <View style={styles.stageRow}>
              <Text style={styles.gateBadge}>{gate.rank}-GATE</Text>
              <Text style={styles.stageName} numberOfLines={1}>{gate.name} {state.stage}</Text>
              <Pressable onPress={() => !enemy.isBoss && game.spawnEnemy(state.stage, true)} style={styles.bossBtn}>
                <Text style={styles.bossBtnText}>BOSS</Text>
              </Pressable>
            </View>
            <View style={styles.enemyRow}>
              <Text style={styles.enemyName}>{enemy.name}</Text>
              <Text style={styles.enemyHp}>{formatNum(enemy.hp)} / {formatNum(enemy.maxHp)}</Text>
            </View>
            <View style={styles.hpTrack}><View style={[styles.hpFill, { width: `${hpPct}%` }]} /></View>
          </View>

          <View style={styles.currencyPill}>
            <Text style={styles.goldText}>● {formatNum(state.gold)}</Text>
            <Text style={styles.divider}>|</Text>
            <Text style={styles.crystalText}>◆ {formatNum(state.crystals)}</Text>
          </View>
        </View>

        {/* ARISE EXTRACTION OVERLAY */}
        {game.pendingArise && (
          <View style={styles.ariseOverlay}>
            <Text style={styles.ariseLabel}>[ SHADOW EXTRACTION ]</Text>
            <Pressable onPress={game.triggerArise} style={styles.ariseBtn}>
              <Text style={styles.ariseBtnText}>ARISE</Text>
            </Pressable>
            <Text style={styles.ariseTarget}>Extract {game.pendingArise.name}</Text>
          </View>
        )}

        {/* SYSTEM TOAST */}
        {game.toast && (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{game.toast}</Text>
          </View>
        )}

        {/* BOTTOM-LEFT: SYSTEM MENU DOCK */}
        <View style={styles.menuDock}>
          {(['stats', 'shadows', 'gear', 'quests'] as TabKey[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setOpenTab(openTab === t ? null : t)}
              style={[styles.menuPill, openTab === t && styles.menuPillActive]}
            >
              <Text style={styles.menuPillText}>{t === 'stats' ? 'STATUS' : t.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {/* BOTTOM-RIGHT: THUMB COMBAT CLUSTER */}
        <View style={styles.combatCluster}>
          {['MUTILATE', "RULER'S", 'BLOOD', 'DOMAIN'].map((label, i) => {
            const ready = game.skillCds[i] <= 0;
            return (
              <Pressable
                key={label}
                onPress={() => game.useSkill(i)}
                style={[styles.skillTile, !ready && styles.skillCooling]}
              >
                <Text style={styles.skillLabel}>{label}</Text>
                <Text style={styles.skillCd}>{ready ? 'RDY' : `${Math.ceil(game.skillCds[i])}s`}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => game.applyDamage(Math.floor(getHeroAtk(state) * 0.9), true, true)}
            style={styles.slashBtn}
          >
            <Text style={styles.slashBtnText}>SLASH</Text>
          </Pressable>
        </View>

        {/* SLIDE-OVER HOLOGRAPHIC SYSTEM SHEET */}
        {openTab && (
          <View style={styles.sheetOverlay}>
            <Pressable style={styles.sheetBackdrop} onPress={() => setOpenTab(null)} />
            <View style={styles.sheetCard}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>[ SYSTEM · {openTab.toUpperCase()} ]</Text>
                <Pressable onPress={() => setOpenTab(null)} style={styles.closeBtn}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>
              <SystemDrawer
                tab={openTab}
                setTab={setOpenTab}
                state={state}
                onUpgradeStat={game.upgradeStat}
                onUpgradeShadow={game.upgradeShadow}
                onWeapon={game.equipOrBuyWeapon}
                onClaimQuest={game.claimQuest}
              />
            </View>
          </View>
        )}

        {/* OFFLINE REWARDS MODAL */}
        <Modal visible={!!game.offlineReward} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalEyebrow}>[ SYSTEM NOTIFICATION ]</Text>
              <Text style={styles.modalTitle}>SHADOWS HUNTED WHILE AWAY</Text>
              {game.offlineReward && (
                <Text style={styles.modalBody}>
                  +{formatNum(game.offlineReward.gold)} Gold  •  +{formatNum(game.offlineReward.xp)} XP
                </Text>
              )}
              <Pressable onPress={game.claimOffline} style={styles.claimBtn}>
                <Text style={styles.claimBtnText}>ACCEPT REWARDS</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#07080c',
    overflow: 'hidden',
  },
  stage: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#07080c',
    overflow: 'hidden',
  },
  topHud: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))' as any,
    paddingRight: 'max(16px, env(safe-area-inset-right, 16px))' as any,
    paddingTop: 'env(safe-area-inset-top, 0px)' as any,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroImg: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  rankBadge: { position: 'absolute', bottom: -3, right: -3, backgroundColor: '#e11d2e', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  rankText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  heroName: { color: '#fff', fontWeight: '900', fontSize: 13 },
  lvText: { color: '#22d3ee', fontSize: 11 },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  centerBoss: { flex: 1, maxWidth: 380 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  gateBadge: { backgroundColor: '#e11d2e', color: '#fff', fontSize: 9, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  stageName: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  bossBtn: { backgroundColor: '#e11d2e', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  bossBtnText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  enemyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  enemyName: { color: '#fff', fontWeight: '800', fontSize: 11 },
  enemyHp: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700' },
  hpTrack: { height: 7, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.65)', overflow: 'hidden' },
  hpFill: { height: '100%', backgroundColor: '#e11d2e' },
  currencyPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(8,10,16,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  goldText: { color: '#fde68a', fontSize: 11, fontWeight: '800' },
  divider: { color: 'rgba(255,255,255,0.2)' },
  crystalText: { color: '#ddd6fe', fontSize: 11, fontWeight: '800' },
  ariseOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ariseLabel: { color: '#22d3ee', fontSize: 10, fontWeight: '800', letterSpacing: 3 },
  ariseBtn: { backgroundColor: '#6d28d9', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 99, borderWidth: 1, borderColor: '#22d3ee' },
  ariseBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 4 },
  ariseTarget: { color: '#ddd6fe', fontSize: 12, fontWeight: '600' },
  toast: {
    position: 'absolute',
    top: 'max(76px, calc(env(safe-area-inset-top, 0px) + 68px))' as any,
    alignSelf: 'center',
    backgroundColor: 'rgba(8,12,22,0.88)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.45)',
  },
  toastText: { color: '#a5f3fc', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  menuDock: {
    position: 'absolute',
    bottom: 'max(14px, env(safe-area-inset-bottom, 14px))' as any,
    left: 'max(16px, env(safe-area-inset-left, 16px))' as any,
    flexDirection: 'row',
    gap: 8,
  },
  menuPill: { backgroundColor: 'rgba(8,10,16,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  menuPillActive: { borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.18)' },
  menuPillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  combatCluster: {
    position: 'absolute',
    bottom: 'max(14px, env(safe-area-inset-bottom, 14px))' as any,
    right: 'max(16px, env(safe-area-inset-right, 16px))' as any,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  skillTile: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(8,10,16,0.78)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.45)', alignItems: 'center', justifyContent: 'center' },
  skillCooling: { opacity: 0.4 },
  skillLabel: { color: '#22d3ee', fontSize: 8, fontWeight: '900' },
  skillCd: { color: 'rgba(255,255,255,0.6)', fontSize: 8, marginTop: 2 },
  slashBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#c81424', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  slashBtnText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  sheetOverlay: { position: 'absolute', inset: 0, flexDirection: 'row', justifyContent: 'flex-end' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheetCard: {
    width: 340,
    margin: 12,
    marginRight: 'max(12px, env(safe-area-inset-right, 12px))' as any,
    borderRadius: 18,
    backgroundColor: 'rgba(9,13,22,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
    overflow: 'hidden',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  sheetTitle: { color: '#22d3ee', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  closeBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 320, backgroundColor: '#0b1220', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#22d3ee', alignItems: 'center' },
  modalEyebrow: { color: '#22d3ee', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  modalTitle: { color: '#fff', fontSize: 15, fontWeight: '900', marginTop: 6 },
  modalBody: { color: '#fde68a', fontSize: 13, fontWeight: '700', marginTop: 10 },
  claimBtn: { marginTop: 16, backgroundColor: '#06b6d4', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  claimBtnText: { color: '#020617', fontWeight: '900', fontSize: 12 },
});
