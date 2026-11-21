import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as THREE from 'three';
import { getGate, getWeapon, SHADOW_DEFS } from '../data/gameData';
import { ShadowId } from '../types/game';
import { loadCharacterModel, LoadedModel } from '../utils/modelLoader';

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
  const heroModelRef = useRef<LoadedModel | null>(null);
  const weaponRef = useRef(equippedWeapon);
  weaponRef.current = equippedWeapon;

  useEffect(() => {
    pulseRef.current = 1;
    heroModelRef.current?.playAttack();
  }, [slashPulse]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !hostRef.current) return;
    let disposed = false;
    const container: HTMLDivElement = hostRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x130509);
    scene.fog = new THREE.FogExp2(0x1f060c, 0.048);

    const width = container.clientWidth || 844;
    const height = container.clientHeight || 390;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(0.1, 2.45, 7.4);
    camera.lookAt(0.1, 1.15, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3-step anime cel-shading gradient
    const gradData = new Uint8Array([55, 55, 55, 255, 145, 145, 145, 255, 255, 255, 255, 255]);
    const toonGrad = new THREE.DataTexture(gradData, 3, 1, THREE.RGBAFormat);
    toonGrad.minFilter = THREE.NearestFilter;
    toonGrad.magFilter = THREE.NearestFilter;
    toonGrad.needsUpdate = true;

    const toon = (color: number, emissive = 0x000000, emissiveIntensity = 0) =>
      new THREE.MeshToonMaterial({ color, emissive, emissiveIntensity, gradientMap: toonGrad });

    const outline = (mesh: THREE.Mesh, scale = 1.07) => {
      const m = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x050508, side: THREE.BackSide }));
      m.scale.setScalar(scale);
      mesh.add(m);
    };

    // Crimson + Cyan Reference Lighting
    scene.add(new THREE.AmbientLight(0x3a2a38, 1.15));
    const key = new THREE.DirectionalLight(0x7dd3fc, 1.75);
    key.position.set(-4, 7, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xe11d2e, 2.4);
    rim.position.set(7, 5, -4);
    scene.add(rim);

    // Arena Floor, Monolith Pillars & Dungeon Gate
    const floor = new THREE.Mesh(new THREE.CircleGeometry(22, 44), toon(0x0a0c12));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new THREE.GridHelper(28, 28, 0xe11d2e, 0x151e30));

    const gateInfo = getGate(stage);
    const gateRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.0, 0.14, 10, 44),
      new THREE.MeshBasicMaterial({ color: isBoss ? 0x8b5cf6 : gateInfo.color })
    );
    gateRing.position.set(5.8, 2.5, -1.8);
    gateRing.rotation.y = -Math.PI / 3.4;
    scene.add(gateRing);

    const mixers: THREE.AnimationMixer[] = [];

    // -------------------------------------------------------------------------
    // HERO SLOT: Loads public/models/jinwoo.glb if present, else procedural rig
    // -------------------------------------------------------------------------
    const heroAnchor = new THREE.Group();
    heroAnchor.position.set(-2.2, 0, 0.2);
    heroAnchor.rotation.y = Math.PI / 2;
    scene.add(heroAnchor);

    const fallbackHero = new THREE.Group();
    const coatMat = toon(0x111520);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.21, 0.8, 8), coatMat);
    torso.position.y = 1.3;
    outline(torso);
    fallbackHero.add(torso);
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.17, 0.36), toon(0x0e3a4a, 0x082f49, 0.35));
    cape.position.set(0, 1.6, -0.02);
    outline(cape);
    fallbackHero.add(cape);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), toon(0xd6cfc7));
    head.position.set(0, 1.9, 0.02);
    outline(head);
    fallbackHero.add(head);
    const wDef = getWeapon(weaponRef.current);
    const bladeR = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.82, 4), new THREE.MeshBasicMaterial({ color: wDef.bladeHex }));
    bladeR.position.set(0.42, 1.15, 0.35);
    bladeR.rotation.x = Math.PI * 0.45;
    fallbackHero.add(bladeR);
    heroAnchor.add(fallbackHero);

    loadCharacterModel('/models/jinwoo.glb', { targetHeight: 2.05, toonGradient: toonGrad }).then((loaded) => {
      if (disposed || !loaded) return;
      heroAnchor.remove(fallbackHero);
      heroAnchor.add(loaded.group);
      heroModelRef.current = loaded;
      if (loaded.mixer) mixers.push(loaded.mixer);
    });

    // -------------------------------------------------------------------------
    // SHADOW ARMY SLOTS: Loads igris.glb / shadow_soldier.glb with shadow tint
    // -------------------------------------------------------------------------
    const slots = [
      [-3.5, 0, -1.2],
      [-3.4, 0, 1.4],
      [-4.5, 0, -0.4],
      [-4.3, 0, 0.9],
    ];
    let slotIdx = 0;
    const shadowMeshes: THREE.Group[] = [];
    SHADOW_DEFS.forEach((def) => {
      if ((shadows[def.id] || 0) > 0) {
        const sg = new THREE.Group();
        const fallback = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.9, 6), toon(0x090714, 0x3b0764, 0.6));
        fallback.position.y = 0.75;
        outline(fallback);
        sg.add(fallback);

        const p = slots[slotIdx++ % slots.length];
        sg.position.set(p[0], p[1], p[2]);
        sg.rotation.y = Math.PI / 2;
        scene.add(sg);
        shadowMeshes.push(sg);

        const modelUrl = def.id === 'igris' ? '/models/igris.glb' : '/models/shadow_soldier.glb';
        loadCharacterModel(modelUrl, {
          targetHeight: def.id === 'igris' ? 2.2 : 1.75,
          toonGradient: toonGrad,
          shadowTint: true,
          shadowGlowHex: def.color,
        }).then((loaded) => {
          if (disposed || !loaded) return;
          sg.remove(fallback);
          sg.add(loaded.group);
          if (loaded.mixer) mixers.push(loaded.mixer);
        });
      }
    });

    // -------------------------------------------------------------------------
    // ENEMY / BOSS SLOT: Loads boss.glb or mob.glb if present, else procedural
    // -------------------------------------------------------------------------
    const enemyAnchor = new THREE.Group();
    enemyAnchor.position.set(2.4, 0, 0);
    enemyAnchor.rotation.y = -Math.PI / 2;
    scene.add(enemyAnchor);

    const fallbackEnemy = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.65, 0),
      toon(isBoss ? 0x1e0b16 : 0x19202e, gateInfo.color, isBoss ? 0.38 : 0.14)
    );
    fallbackEnemy.position.y = 1.0;
    fallbackEnemy.scale.setScalar(isBoss ? 1.48 : 1.05);
    outline(fallbackEnemy);
    enemyAnchor.add(fallbackEnemy);

    loadCharacterModel(isBoss ? '/models/boss.glb' : '/models/mob.glb', {
      targetHeight: isBoss ? 2.8 : 1.95,
      toonGradient: toonGrad,
    }).then((loaded) => {
      if (disposed || !loaded) return;
      enemyAnchor.remove(fallbackEnemy);
      enemyAnchor.add(loaded.group);
      if (loaded.mixer) mixers.push(loaded.mixer);
    });

    const onResize = () => {
      const w = container.clientWidth || 844;
      const h = container.clientHeight || 390;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let raf = 0;
    const renderLoop = (now: number) => {
      raf = requestAnimationFrame(renderLoop);
      const dt = Math.min(0.05, clock.getDelta());
      const t = now * 0.001;

      for (const m of mixers) m.update(dt);

      if (pulseRef.current > 0) pulseRef.current = Math.max(0, pulseRef.current - dt * 4.5);
      const dash = Math.sin(pulseRef.current * Math.PI);
      heroAnchor.position.x = -2.2 + dash * 2.4;
      enemyAnchor.position.x = 2.4 + dash * 0.35;
      gateRing.rotation.z = t * 0.45;
      shadowMeshes.forEach((sg, idx) => {
        sg.position.y = Math.sin(t * 3 + idx) * 0.06;
      });
      camera.position.x = 0.1 + Math.sin(t * 0.3) * 0.35;
      camera.lookAt(0.1, 1.15, 0);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(renderLoop);

    return () => {
      disposed = true;
      heroModelRef.current = null;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [stage, isBoss, equippedWeapon, shadows, domainActive]);

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
  container: { flex: 1, width: '100%', height: '100%', backgroundColor: '#130509' },
  nativeFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#130509', padding: 20 },
  fallbackText: { color: '#22d3ee', fontWeight: '700', textAlign: 'center' },
});
