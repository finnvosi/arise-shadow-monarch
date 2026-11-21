import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as THREE from 'three';
import { getGate, SHADOW_DEFS } from '../data/gameData';
import { ShadowId } from '../types/game';
import { JinwooRigController, EnemyRigController, ShadowRigController } from '../utils/characterRigs';
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

  const heroModelRef = useRef<LoadedModel | null>(null);
  const enemyHitRef = useRef(0);
  const firstSlashRef = useRef(true);
  const rebuildShadowsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    rebuildShadowsRef.current?.();
  }, [shadows]);

  useEffect(() => {
    if (firstSlashRef.current) {
      firstSlashRef.current = false;
      return;
    }
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
    scene.background = new THREE.Color(0x0e0618);
    scene.fog = new THREE.FogExp2(0x0e0618, 0.018);

    const width = container.clientWidth || 844;
    const height = container.clientHeight || 390;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    // Dynamic Heroic Action Camera: Looking down the grand cathedral aisle
    camera.position.set(0.0, 2.12, 5.1);
    camera.lookAt(0.0, 1.18, -0.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'default',
        alpha: false,
      });
    } catch (err) {
      console.error('[Arena3D] WebGL context creation failed:', err);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 1. Soft Gothic Ambient Fill
    const ambientLight = new THREE.AmbientLight(0x281938, 1.6);
    scene.add(ambientLight);

    // 2. Front Fill Light (soft neutral light for face, hair, coat, daggers)
    const frontFillLight = new THREE.DirectionalLight(0xffeedd, 1.1);
    frontFillLight.position.set(0, 4.0, 6.0);
    scene.add(frontFillLight);

    // 3. Hero Key/Rim Light (Monarch Electric Cyan)
    const heroKeyLight = new THREE.DirectionalLight(0x22d3ee, 3.5);
    heroKeyLight.position.set(-4.0, 5.5, 2.5);
    scene.add(heroKeyLight);

    // 4. Enemy Rim Light (Blood Crimson)
    const enemyRimLight = new THREE.DirectionalLight(0xf43f5e, 3.8);
    enemyRimLight.position.set(4.0, 5.5, -1.0);
    scene.add(enemyRimLight);

    // 5. Cathedral Gothic Accent Light
    const cathedralLight = new THREE.PointLight(0xa855f7, 3.5, 32);
    cathedralLight.position.set(0, 7.0, -3.5);
    scene.add(cathedralLight);

    // 6. Dynamic Floor Light Pools
    const heroFloorLight = new THREE.PointLight(0x06b6d4, 2.5, 4.0);
    heroFloorLight.position.set(-1.6, 0.35, 0.2);
    scene.add(heroFloorLight);

    const enemyFloorLight = new THREE.PointLight(0xe11d2e, 2.8, 4.5);
    enemyFloorLight.position.set(1.6, 0.35, -0.2);
    scene.add(enemyFloorLight);

    // =========================================================================
    // 3D FIGHTING ENVIRONMENT (HALL OF BLOOD-RED COMMANDER)
    // =========================================================================
    const arenaAnchor = new THREE.Group();
    scene.add(arenaAnchor);

    // Decorative Battle Floor (visible immediately while 3D hall streams in)
    const baseFloor = new THREE.Mesh(
      new THREE.CircleGeometry(26, 48),
      new THREE.MeshStandardMaterial({
        color: 0x120c1e,
        roughness: 0.7,
        metalness: 0.2,
      })
    );
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.01;
    scene.add(baseFloor);

    // Floor Grid Lines
    const grid = new THREE.GridHelper(28, 28, 0x8b5cf6, 0x1d1130);
    grid.position.y = 0.005;
    scene.add(grid);

    // Load full 3D Hall of Commander environment
    loadCharacterModel('/models/arena.glb', { targetHeight: 18.0 }).then((loaded) => {
      if (disposed || !loaded) return;
      const arena = loaded.group;

      // Filter out exterior enclosing walls, untextured sconces and tune materials
      arena.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          const mat = m.material as any;
          const matName = mat?.name;
          if (
            m.name === 'Object_9' ||
            m.name === 'Object_11' ||
            m.name === 'Object_84' ||
            m.name === 'Object_109' ||
            m.name === 'Object_134' ||
            m.name === 'Object_137' ||
            m.name === 'Object_100' ||
            m.name === 'Object_101' ||
            m.name === 'Object_114' ||
            matName === 'Stone_Slate_Wall' ||
            matName === 'material_0' ||
            matName === 'Fire'
          ) {
            m.visible = false;
            return;
          }
          if (mat) {
            mat.side = THREE.DoubleSide;
            if (matName === 'Tiles_Floor_02' || matName === 'Mosac_Floor' || matName === 'Arabic_Wood_Flooring_Material') {
              mat.roughness = 0.65;
              mat.metalness = 0.2;
              if (mat.color) mat.color.setHex(0x1a1526);
            } else if (matName === 'rock_wall' || matName === 'Preto') {
              mat.roughness = 0.7;
              if (mat.color) mat.color.setHex(0x282033);
            } else if (matName === 'vERMELHO') {
              mat.roughness = 0.5;
              if (mat.color) mat.color.setHex(0xa30b20);
            }
          }
        }
      });

      // Rotate 90 degrees so the grand aisle runs down the battle view
      arena.rotation.y = Math.PI / 2;

      // Center arena accurately at (0, 0, 0)
      const postBox = new THREE.Box3().setFromObject(arena);
      const center = new THREE.Vector3();
      postBox.getCenter(center);
      arena.position.x = -center.x;
      arena.position.z = -center.z - 3.0;
      arena.position.y = -postBox.min.y;

      arenaAnchor.add(arena);
    });

    // Domain of the Monarch Vortex Ring
    const domainRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 7.5, 48),
      new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      })
    );
    domainRing.rotation.x = -Math.PI / 2;
    domainRing.position.set(0, 0.24, 0);
    scene.add(domainRing);

    // Floating Dungeon Gate Ring (indicates current stage rank)
    const gateInfo = getGate(stageRef.current);
    const gateRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.12, 12, 48),
      new THREE.MeshBasicMaterial({ color: gateInfo.color, transparent: true, opacity: 0.85 })
    );
    gateRing.position.set(3.8, 2.4, -2.5);
    gateRing.rotation.y = -Math.PI / 3.4;
    scene.add(gateRing);

    // =========================================================================
    // HERO SLOT (SUNG JINWOO + DUAL DAGGERS)
    // =========================================================================
    const heroAnchor = new THREE.Group();
    heroAnchor.position.set(-1.6, 0.22, 0.2);
    // Face towards enemy (+X), angled 3/4 towards camera
    heroAnchor.rotation.y = Math.PI * 0.44;
    scene.add(heroAnchor);

    // Stylized procedural fallback while model loads
    const fallbackHero = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x111625, roughness: 0.4 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.82, 8), coatMat);
    torso.position.y = 1.32;
    fallbackHero.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe2d9d2 }));
    head.position.y = 1.95;
    fallbackHero.add(head);
    heroAnchor.add(fallbackHero);

    // Load authentic Sung Jinwoo 3D Model
    let jinwooRig: JinwooRigController | null = null;
    loadCharacterModel('/models/jinwoo.glb', { targetHeight: 2.15 }).then((loaded) => {
      if (disposed || !loaded) return;
      heroAnchor.remove(fallbackHero);
      heroAnchor.add(loaded.group);
      heroModelRef.current = loaded;
      jinwooRig = new JinwooRigController(loaded.group);

      // Attach dual glowing daggers to hands
      const lHand = loaded.group.getObjectByName('Bip001_L_Hand_051');
      const rHand = loaded.group.getObjectByName('Bip001_R_Hand_098');

      loadWeaponModel('/models/weapon_dagger.glb', 0.85).then((weaponL) => {
        if (disposed || !weaponL) return;
        weaponL.rotation.set(Math.PI * 0.5, 0, 0);
        if (lHand) {
          lHand.add(weaponL);
        } else {
          weaponL.position.set(0.48, 1.15, -0.45);
          loaded.group.add(weaponL);
        }

        const weaponR = weaponL.clone(true);
        if (rHand) {
          rHand.add(weaponR);
        } else {
          weaponR.position.set(-0.48, 1.15, -0.45);
          loaded.group.add(weaponR);
        }
      });
    });

    // Hero shadow aura ring on the ground
    const heroAura = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 1.15, 32),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    heroAura.rotation.x = -Math.PI / 2;
    heroAura.position.y = 0.02;
    heroAnchor.add(heroAura);

    // Dual Cross-Slash Energy Crescent Trails
    const slashArcGeo = new THREE.RingGeometry(0.85, 1.35, 32, 1, 0, Math.PI * 0.8);
    const slashArc1Mat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const slashArc1 = new THREE.Mesh(slashArcGeo, slashArc1Mat);
    slashArc1.position.set(0.6, 1.25, -0.6);
    slashArc1.rotation.set(0.2, 0.4, -0.6);
    heroAnchor.add(slashArc1);

    const slashArc2Mat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const slashArc2 = new THREE.Mesh(slashArcGeo, slashArc2Mat);
    slashArc2.position.set(0.6, 1.25, -0.6);
    slashArc2.rotation.set(-0.3, 0.4, 0.8);
    heroAnchor.add(slashArc2);

    // =========================================================================
    // ENEMY SLOT (MOB OR BOSS)
    // =========================================================================
    const enemyAnchor = new THREE.Group();
    enemyAnchor.position.set(1.6, 0.22, -0.2);
    // Face towards Jinwoo (-X), angled 3/4 towards camera
    enemyAnchor.rotation.y = -Math.PI * 0.56;
    scene.add(enemyAnchor);

    // Fallback procedural enemy
    const fallbackEnemy = new THREE.Group();
    const enemyBody = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({ color: 0x24324a, roughness: 0.5, metalness: 0.3 })
    );
    enemyBody.position.y = 1.05;
    fallbackEnemy.add(enemyBody);
    enemyAnchor.add(fallbackEnemy);

    let mobModel: THREE.Group | null = null;
    let bossModel: THREE.Group | null = null;
    let mobRig: EnemyRigController | null = null;
    let bossRig: EnemyRigController | null = null;

    loadCharacterModel('/models/mob.glb', { targetHeight: 1.95 }).then((loaded) => {
      if (disposed || !loaded) return;
      mobModel = loaded.group;
      mobRig = new EnemyRigController(mobModel);
      if (!isBossRef.current) {
        enemyAnchor.remove(fallbackEnemy);
        enemyAnchor.add(mobModel);
      }
    });

    loadCharacterModel('/models/boss.glb', { targetHeight: 2.7 }).then((loaded) => {
      if (disposed || !loaded) return;
      bossModel = loaded.group;
      bossRig = new EnemyRigController(bossModel);
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
      [-2.8, 0.22, -0.8],
      [-3.0, 0.22, 1.2],
      [-4.0, 0.22, -0.2],
      [-4.1, 0.22, 1.6],
    ];

    const shadowUnits: { group: THREE.Group; defId: ShadowId; rig?: ShadowRigController }[] = [];

    const rebuildShadows = () => {
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
          sGroup.rotation.y = Math.PI * 0.45;
          shadowsContainer.add(sGroup);
          const unitEntry: { group: THREE.Group; defId: ShadowId; rig?: ShadowRigController } = {
            group: sGroup,
            defId: def.id,
          };
          shadowUnits.push(unitEntry);

          // Shadow ground aura
          const aura = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.85, 24),
            new THREE.MeshBasicMaterial({
              color: def.color,
              transparent: true,
              opacity: 0.65,
              side: THREE.DoubleSide,
            })
          );
          aura.rotation.x = -Math.PI / 2;
          aura.position.y = 0.02;
          sGroup.add(aura);

          const modelPath =
            def.id === 'infantry'
              ? '/models/shadow_soldier.glb'
              : def.id === 'igris'
              ? '/models/igris.glb'
              : '/models/mob.glb';
          loadCharacterModel(modelPath, {
            targetHeight: def.id === 'igris' ? 2.3 : def.id === 'tank' ? 2.2 : 1.75,
            shadowTint: true,
            shadowGlowHex: def.color,
          }).then((loaded) => {
            if (disposed || !loaded) return;
            sGroup.add(loaded.group);
            unitEntry.rig = new ShadowRigController(loaded.group);
          });
        }
      });
    };

    rebuildShadowsRef.current = rebuildShadows;
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
    window.addEventListener('orientationchange', onResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => onResize());
      resizeObserver.observe(container);
    }

    const clock = new THREE.Clock();
    let currentIsBoss = isBossRef.current;
    let currentStage = stageRef.current;
    let raf = 0;

    const renderLoop = (now: number) => {
      raf = requestAnimationFrame(renderLoop);
      const dt = Math.min(0.05, clock.getDelta());
      const t = now * 0.001;

      // Boss state swap
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

      // Stage gate color update
      if (currentStage !== stageRef.current) {
        currentStage = stageRef.current;
        const gate = getGate(currentStage);
        (gateRing.material as THREE.MeshBasicMaterial).color.setHex(gate.color);
      }

      // Domain of Monarch vortex rotation
      const domainActiveVal = domainRef.current;
      const targetDomainOpacity = domainActiveVal ? 0.75 : 0;
      const ringMat = domainRing.material as THREE.MeshBasicMaterial;
      ringMat.opacity += (targetDomainOpacity - ringMat.opacity) * dt * 4;
      if (domainActiveVal) {
        domainRing.rotation.z += dt * 1.5;
      }

      // Tap Slash Hero Dash animation
      if (pulseRef.current > 0) {
        pulseRef.current = Math.max(0, pulseRef.current - dt * 3.6);
      }
      const dash = Math.sin(pulseRef.current * Math.PI);
      heroAnchor.position.x = -1.6 + dash * 2.1;

      // Dynamic Dual Cross-Slash Energy Blade Trails
      if (pulseRef.current > 0.15 && pulseRef.current < 0.85) {
        const arcIntensity = Math.sin(((pulseRef.current - 0.15) / 0.7) * Math.PI);
        slashArc1Mat.opacity = arcIntensity * 0.95;
        slashArc2Mat.opacity = arcIntensity * 0.85;
        slashArc1.scale.setScalar(0.9 + (1 - pulseRef.current) * 0.6);
        slashArc2.scale.setScalar(0.9 + (1 - pulseRef.current) * 0.6);
        slashArc1.rotation.z = -0.6 + (1 - pulseRef.current) * 2.2;
        slashArc2.rotation.z = 0.8 - (1 - pulseRef.current) * 2.2;
      } else {
        slashArc1Mat.opacity = 0;
        slashArc2Mat.opacity = 0;
      }

      // Enemy hit recoil
      if (enemyHitRef.current > 0) {
        enemyHitRef.current = Math.max(0, enemyHitRef.current - dt * 4.8);
      }
      const hitRecoil = Math.sin(enemyHitRef.current * Math.PI);
      enemyAnchor.position.x = 1.6 + hitRecoil * 0.4;
      enemyAnchor.position.y = 0.22 + hitRecoil * 0.15;

      // Idle breathing & floating root animations
      const breath = Math.sin(t * 2.4) * 0.025;
      heroAnchor.position.y = 0.22 + breath;
      if (enemyHitRef.current <= 0) {
        enemyAnchor.position.y = 0.22 + Math.sin(t * 2.0 + 1) * 0.035;
      }

      // =======================================================================
      // PROCEDURAL SKELETAL RIG ANIMATIONS
      // =======================================================================
      // 1. Jinwoo Rig (Combat stance, breathing, coat physics, 3-phase dual cross-slash combo)
      if (jinwooRig) {
        jinwooRig.update(t, pulseRef.current);
      }

      // 2. Enemy Rig (Monster breathing, head tracking, hit stagger & recoil)
      const activeEnemyRig = currentIsBoss ? bossRig : mobRig;
      if (activeEnemyRig) {
        activeEnemyRig.update(t, enemyHitRef.current, currentIsBoss);
      }

      // 3. Shadow Soldiers Rig (Guard stance, float sway, attack follow-through)
      shadowUnits.forEach(({ rig }, i) => {
        rig?.update(t, i, pulseRef.current);
      });

      // Shadow army floating hover
      shadowUnits.forEach(({ group }, i) => {
        group.position.y = 0.22 + Math.sin(t * 3.0 + i * 1.2) * 0.075;
      });

      // Dungeon Gate rotation
      gateRing.rotation.z = t * 0.4;

      // Subtle dynamic cinematic camera drift
      camera.position.x = Math.sin(t * 0.25) * 0.18;
      camera.position.y = 2.12 + Math.cos(t * 0.3) * 0.05;
      camera.lookAt(0.0, 1.18, -0.5);

      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(renderLoop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      resizeObserver?.disconnect();
      renderer.dispose();
    };
  }, []);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.nativeFallback}>
        <Text style={styles.fallbackText}>Run with `npx expo start --web` for Three.js WebGL PWA Arena</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onStartShouldSetResponder={() => true} onResponderGrant={onTapSlash}>
      <div
        ref={hostRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0e0618',
    overflow: 'hidden',
  },
  nativeFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#130a1c', padding: 20 },
  fallbackText: { color: '#22d3ee', fontWeight: '700', textAlign: 'center' },
});
