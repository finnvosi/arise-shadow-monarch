import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface LoadedModel {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  idleAction: THREE.AnimationAction | null;
  attackAction: THREE.AnimationAction | null;
  playAttack: () => void;
}

export interface LoadModelOptions {
  targetHeight: number;
  toonGradient?: THREE.DataTexture;
  shadowTint?: boolean;
  shadowGlowHex?: number;
}

const loader = new GLTFLoader();

/**
 * Loads a .glb/.gltf model from public/models/, auto-normalizes its height and
 * floor alignment, optionally applies our 3-step anime cel-shader or Shadow Army
 * obsidian-violet tint, and wires up AnimationMixer (Idle + Attack clips).
 * Returns null gracefully if the file is not present yet so the procedural rig renders.
 */
export function loadCharacterModel(
  url: string,
  options: LoadModelOptions
): Promise<LoadedModel | null> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const root = gltf.scene;

        // Auto-normalize scale and sit feet cleanly on y = 0
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);
        if (size.y > 0.001) {
          const scale = options.targetHeight / size.y;
          root.scale.setScalar(scale);
        }
        const scaledBox = new THREE.Box3().setFromObject(root);
        root.position.y -= scaledBox.min.y;

        // Apply cel-shading or Shadow Soldier material override
        root.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          if (options.shadowTint) {
            mesh.material = new THREE.MeshToonMaterial({
              color: 0x090714,
              emissive: options.shadowGlowHex ?? 0x4c1d95,
              emissiveIntensity: 0.65,
              gradientMap: options.toonGradient,
            });
          } else if (options.toonGradient) {
            const oldMat = mesh.material as THREE.MeshStandardMaterial;
            mesh.material = new THREE.MeshToonMaterial({
              color: oldMat?.color ? oldMat.color.clone() : new THREE.Color(0xffffff),
              map: oldMat?.map ?? null,
              gradientMap: options.toonGradient,
            });
          }
        });

        const wrapper = new THREE.Group();
        wrapper.add(root);

        let mixer: THREE.AnimationMixer | null = null;
        let idleAction: THREE.AnimationAction | null = null;
        let attackAction: THREE.AnimationAction | null = null;

        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(root);
          const findClip = (pattern: RegExp) =>
            gltf.animations.find((clip) => pattern.test(clip.name));

          const idleClip = findClip(/idle|stand|breath/i) || gltf.animations[0];
          const atkClip = findClip(/attack|slash|strike|hit|sword|punch/i) || null;

          if (idleClip) {
            idleAction = mixer.clipAction(idleClip);
            idleAction.play();
          }
          if (atkClip && atkClip !== idleClip) {
            attackAction = mixer.clipAction(atkClip);
            attackAction.setLoop(THREE.LoopOnce, 1);
            attackAction.clampWhenFinished = false;
          }
        }

        const playAttack = () => {
          if (!attackAction) return;
          attackAction.reset().fadeIn(0.08).play();
          if (idleAction) {
            setTimeout(() => {
              attackAction?.fadeOut(0.15);
              idleAction?.fadeIn(0.15);
            }, Math.min(550, (attackAction.getClip().duration || 0.5) * 900));
          }
        };

        resolve({ group: wrapper, mixer, idleAction, attackAction, playAttack });
      },
      undefined,
      () => resolve(null)
    );
  });
}
