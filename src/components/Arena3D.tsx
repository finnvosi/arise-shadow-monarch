import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as THREE from 'three';
import { getGate, getWeapon, SHADOW_DEFS } from '../data/gameData';
import { ShadowId } from '../types/game';
import { loadCharacterModel, loadWeaponModel, LoadedModel } from '../utils/modelLoader';

interface Arena3DProps {
  stage: number;
  isBoss: boolean;
  equippedWeapon: string;
  shadows: Record<ShadowId, number>;
  slashPulse: number;
  domainActive: boolean;
  onTapSlash: () => void;
}

export const Arena3D: React.FC<Arena3DProps> = ({
  stage,
  isBoss,
  equippedWeapon,
  shadows,
  slashPulse,
  domainActive,
  onTapSlash,
}) => {
  const hostRef = useRef<any>(null);
  const pulseRef = useRef(0);
  const isBossRef = useRef(isBoss);
  const stageRef = useRef(stage);
  const weaponRef = useRef(equippedWeapon);
  const shadowsRef = useRef(shadows);
  const domainRef = useRef(domainActive);

  isBossRef.current = isBoss;
  stageRef.current = stage;
  weaponRef.current = equippedWeapon;
  shadowsRef.current = shadows;
  domainRef.current = domainActive;

  // Trigger attack slash on slashPulse update
  const heroModelRef = useRef<LoadedModel | null>(null);
  const enemyHitRef = useRef(0);

  useEffect(() => {
    pulseRef.current = 1;
    enemyHitRef.current = 1;
    heroModelRef.current?.playAttack();
  }, [slashPulse]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !hostRef.current) return;
    let disposed = false;
    const container: HTMLDivElement = hostRef.current;

    // =========================================================================
    // SCENE & ATMOSPHERIC LIGHTING
    // =========================================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a050d);
    scene.fog = new THREE.FogExp2(0x0e0614, 0.038);

    const width = container.clientWidth || 844;
    const height = container.clientHeight || 390;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0.1, 2.35, 7.6);
    camera.lookAt(0.1, 1.25, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Cinematic Arena Lights (Gothic Cathedral Ambience)
    const ambientLight = new THREE.AmbientLight(0x2a1e36, 1.25);
    scene.add(ambientLight);

    const heroKeyLight = new THREE.DirectionalLight(0x38bdf8, 2.4);
    heroKeyLight.position.set(-5, 8, 5);
    scene.add(heroKeyLight);

    const enemyRimLight = new THREE.DirectionalLight(0xe11d2e, 2.8);
    enemyRimLight.position.set(6, 6, -3);
    scene.add(enemyRimLight);

    const overheadVioletLight = new THREE.PointLight(0xa855f7, 2.2, 18);
    overheadVioletLight.position.set(0, 5, 1);
    scene.add(overheadVioletLight);

    // =========================================================================
    // 3D FIGHTING ENVIRONMENT (HALL OF BLOOD-RED COMMANDER)
    // =========================================================================
    const arenaAnchor = new THREE.Group();
    scene.add(arenaAnchor);

    // Fallback decorative floor ring & grid in case glb is downloading
    const baseFloor = new THREE.Mesh(
      new THREE.CircleGeometry(26, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0c0c16,
        roughness: 0.8,
        metalness: 0.2,
      })
    );
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.02;
    scene.add(baseFloor);

    // Load full 3D Hall of Commander environment
    loadCharacterModel('/models/arena.glb', { targetHeight: 13.5 }).then((loaded) => {
      if (disposed || !loaded) return;
      // Position the throne room hall cleanly centered along the battle aisle
      loaded.group.position.set(0, 0, -4.5);
      arenaAnchor.add(loaded.group);
    });

    // Domain of the Monarch Vortex Ring
    const domainRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 7.5, 48),
      new THREE.MeshBasicMaterial({
        color: 0x7c3aed,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      })
    );
    domainRing.rotation.x = -Math.PI / 2;
    domainRing.position.set(-1.0, 0.01, 0);
    scene.add(domainRing);

    // Floating Dungeon Gate Ring (indicates current stage rank)
    const gateInfo = getGate(stageRef.current);
    const gateRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.12, 12, 48),
      new THREE.MeshBasicMaterial({ color: gateInfo.color, transparent: true, opacity: 0.85 })
    );
    gateRing.position.set(5.6, 2.6, -2.2);
    gateRing.rotation.y = -Math.PI / 3.4;
    scene.add(gateRing);

    // =========================================================================
    // HERO SLOT (SUNG JINWOO + DUAL DAGGERS / SWORD)
    // =========================================================================
    const heroAnchor = new THREE.Group();
    heroAnchor.position.set(-2.2, 0, 0.2);
    // Jinwoo model faces -Z internally; rotate by -Math.PI / 2 to face +X towards enemy!
    heroAnchor.rotation.y = -Math.PI / 2;
    scene.add(heroAnchor);

    // Fallback stylized procedural hero while model loads
    const fallbackHero = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x0e1320, roughness: 0.4 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.82, 8), coatMat);
    torso.position.y = 1.32;
    fallbackHero.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe2d9d2 }));
    head.position.y = 1.95;
    fallbackHero.add(head);
    heroAnchor.add(fallbackHero);

    // Load authentic Sung Jinwoo 3D Model
    loadCharacterModel('/models/jinwoo.glb', { targetHeight: 2.1 }).then((loaded) => {
      if (disposed || !loaded) return;
      heroAnchor.remove(fallbackHero);
      heroAnchor.add(loaded.group);
      heroModelRef.current = loaded;

      // Attach dual glowing daggers to hands
      loadWeaponModel('/models/weapon_dagger.glb', 0.85).then((weaponL) => {
        if (disposed || !weaponL) return;
        weaponL.position.set(0.48, 1.15, -0.45);
        weaponL.rotation.set(Math.PI * 0.4, 0, -Math.PI * 0.2);
        loaded.group.add(weaponL);

        const weaponR = weaponL.clone(true);
        weaponR.position.set(-0.48, 1.15, -0.45);
        weaponR.rotation.set(Math.PI * 0.4, 0, Math.PI * 0.2);
        loaded.group.add(weaponR);
      });
    });

    // Hero shadow aura ring on the ground
    const heroAura = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 1.1, 32),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    heroAura.rotation.x = -Math.PI / 2;
    heroAura.position.y = 0.015;
    heroAnchor.add(heroAura);

    // =========================================================================
    // ENEMY SLOT (MOB OR BOSS)
    // =========================================================================
    const enemyAnchor = new THREE.Group();
    enemyAnchor.position.set(2.4, 0, 0);
    // Enemy faces +Z internally; rotate by -Math.PI / 2 to face -X towards Jinwoo!
    enemyAnchor.rotation.y = -Math.PI / 2;
    scene.add(enemyAnchor);

    // Fallback procedural enemy while loading
    const fallbackEnemy = new THREE.Group();
    const enemyBody = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({ color: 0x1f293d, roughness: 0.5, metalness: 0.3 })
    );
    enemyBody.position.y = 1.05;
    fallbackEnemy.add(enemyBody);
    enemyAnchor.add(fallbackEnemy);

    let mobModel: THREE.Group | null = null;
    let bossModel: THREE.Group | null = null;

    // Preload both mob (Imp) and boss (Puglin / Commander) for instantaneous zero-lag swapping
    loadCharacterModel('/models/mob.glb', { targetHeight: 1.95 }).then((loaded) => {
      if (disposed || !loaded) return;
      mobModel = loaded.group;
      if (!isBossRef.current) {
        enemyAnchor.remove(fallbackEnemy);
        enemyAnchor.add(mobModel);
      }
    });

    loadCharacterModel('/models/boss.glb', { targetHeight: 2.75 }).then((loaded) => {
      if (disposed || !loaded) return;
      bossModel = loaded.group;
      if (isBossRef.current) {
        enemyAnchor.remove(fallbackEnemy);
        enemyAnchor.add(bossModel);
      }
    });

    // =========================================================================
    // SHADOW ARMY SLOTS (INFANTRY, IGRIS, TANK, BERU)
    // =========================================================================
    const shadowsContainer = new THREE.Group();
    scene.add(shadowsContainer);

    const slotCoords = [
      [-3.6, 0, -1.3],
      [-3.5, 0, 1.4],
      [-4.7, 0, -0.5],
      [-4.6, 0, 0.8],
    ];

    const shadowUnits: { group: THREE.Group; defId: ShadowId }[] = [];

    const rebuildShadows = () => {
      // Clear existing shadow units
      while (shadowsContainer.children.length > 0) {
        shadowsContainer.remove(shadowsContainer.children[0]);
      }
      shadowUnits.length = 0;

      let idx = 0;
      SHADOW_DEFS.forEach((def) => {
        const count = shadowsRef.current[def.id] || 0;
        if (count > 0 && idx < slotCoords.length) {
          const slot = slotCoords[idx++];
          const sGroup = new THREE.Group();
          sGroup.position.set(slot[0], slot[1], slot[2]);
          // Shadow skeletons face +Z; rotate +Math.PI / 2 to face +X towards enemy!
          sGroup.rotation.y = Math.PI / 2;
          shadowsContainer.add(sGroup);
          shadowUnits.push({ group: sGroup, defId: def.id });

          // Shadow summon ground aura
          const aura = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.85, 24),
            new THREE.MeshBasicMaterial({
              color: def.color,
              transparent: true,
              opacity: 0.6,
              side: THREE.DoubleSide,
            })
          );
          aura.rotation.x = -Math.PI / 2;
          aura.position.y = 0.015;
          sGroup.add(aura);

          const modelPath = def.id === 'igris' ? '/models/igris.glb' : '/models/shadow_soldier.glb';
          loadCharacterModel(modelPath, {
            targetHeight: def.id === 'igris' ? 2.3 : 1.75,
            shadowTint: true,
            shadowGlowHex: def.color,
          }).then((loaded) => {
            if (disposed || !loaded) return;
            sGroup.add(loaded.group);
          });
        }
      });
    };

    rebuildShadows();

    // =========================================================================
    // WINDOW RESIZE & ANIMATION LOOP
    // =========================================================================
    const onResize = () => {
      const w = container.clientWidth || 844;
      const h = container.clientHeight || 390;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let currentIsBoss = isBossRef.current;
    let currentStage = stageRef.current;
    let raf = 0;

    const renderLoop = (now: number) => {
      raf = requestAnimationFrame(renderLoop);
      const dt = Math.min(0.05, clock.getDelta());
      const t = now * 0.001;

      // Check if boss state changed without tearing down the renderer
      if (currentIsBoss !== isBossRef.current) {
        currentIsBoss = isBossRef.current;
        if (currentIsBoss && bossModel) {
          if (mobModel) enemyAnchor.remove(mobModel);
          enemyAnchor.remove(fallbackEnemy);
          enemyAnchor.add(bossModel);
        } else if (!currentIsBoss && mobModel) {
          if (bossModel) enemyAnchor.remove(bossModel);
          enemyAnchor.remove(fallbackEnemy);
          enemyAnchor.add(mobModel);
        }
      }

      // Check if stage gate color changed
      if (currentStage !== stageRef.current) {
        currentStage = stageRef.current;
        const gate = getGate(currentStage);
        (gateRing.material as THREE.MeshBasicMaterial).color.setHex(gate.color);
      }

      // Dynamic Domain of Monarch vortex opacity
      const domainActiveVal = domainRef.current;
      const targetDomainOpacity = domainActiveVal ? 0.75 : 0;
      const ringMat = domainRing.material as THREE.MeshBasicMaterial;
      ringMat.opacity += (targetDomainOpacity - ringMat.opacity) * dt * 4;
      if (domainActiveVal) {
        domainRing.rotation.z += dt * 1.5;
      }

      // Tap Slash Hero Dash animation
      if (pulseRef.current > 0) {
        pulseRef.current = Math.max(0, pulseRef.current - dt * 5.0);
      }
      const dash = Math.sin(pulseRef.current * Math.PI);
      heroAnchor.position.x = -2.2 + dash * 2.3;

      // Enemy hit recoil
      if (enemyHitRef.current > 0) {
        enemyHitRef.current = Math.max(0, enemyHitRef.current - dt * 6.0);
      }
      const hitRecoil = Math.sin(enemyHitRef.current * Math.PI);
      enemyAnchor.position.x = 2.4 + hitRecoil * 0.45;
      enemyAnchor.position.y = hitRecoil * 0.2;

      // Idle breathing & floating animations
      const breath = Math.sin(t * 2.4) * 0.035;
      heroAnchor.position.y = breath;
      if (enemyHitRef.current <= 0) {
        enemyAnchor.position.y = Math.sin(t * 2.0 + 1) * 0.045;
      }

      // Shadow army floating hover
      shadowUnits.forEach(({ group }, i) => {
        group.position.y = Math.sin(t * 3.0 + i * 1.2) * 0.075;
      });

      // Dungeon Gate slow rotation
      gateRing.rotation.z = t * 0.4;

      // Subtle dynamic cinematic camera drift
      camera.position.x = 0.1 + Math.sin(t * 0.25) * 0.3;
      camera.position.y = 2.35 + Math.cos(t * 0.3) * 0.08;
      camera.lookAt(0.1, 1.25, 0);

      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(renderLoop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []); // Run ONCE on mount; state updates are reflected dynamically via refs!

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.nativeFallback}>
        <Text style={styles.fallbackText}>Run with `npx expo start --web` for Three.js WebGL PWA Arena</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onStartShouldSetResponder={() => true} onResponderGrant={onTapSlash}>
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', height: '100%', backgroundColor: '#0a050d' },
  nativeFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a050d', padding: 20 },
  fallbackText: { color: '#22d3ee', fontWeight: '700', textAlign: 'center' },
});
