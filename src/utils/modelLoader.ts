import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface LoadedModel {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  idleAction: THREE.AnimationAction | null;
  attackAction: THREE.AnimationAction | null;
  playAttack: () => void;
  rootMesh?: THREE.Object3D;
}

export interface LoadModelOptions {
  targetHeight: number;
  shadowTint?: boolean;
  shadowGlowHex?: number;
  rotationY?: number;
}

const loader = new GLTFLoader();
const modelCache = new Map<string, GLTF>();
const loadingPromises = new Map<string, Promise<GLTF | null>>();

function fetchGLTF(url: string): Promise<GLTF | null> {
  if (modelCache.has(url)) {
    return Promise.resolve(modelCache.get(url)!);
  }
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }
  const promise = new Promise<GLTF | null>((resolve) => {
    loader.load(
      url,
      (gltf) => {
        modelCache.set(url, gltf);
        loadingPromises.delete(url);
        resolve(gltf);
      },
      undefined,
      (err) => {
        console.warn(`[ModelLoader] Failed to load ${url}:`, err);
        loadingPromises.delete(url);
        resolve(null);
      }
    );
  });
  loadingPromises.set(url, promise);
  return promise;
}

/**
 * Deep-clones a loaded GLTF scene, retaining skinning, materials, and geometries.
 */
function cloneScene(scene: THREE.Group): THREE.Group {
  return scene.clone(true) as THREE.Group;
}

/**
 * Loads a .glb model from public/models/, normalizes scale, grounds at y = 0,
 * enhances materials for anime/cinematic PBR lighting, and wires up actions.
 */
export async function loadCharacterModel(
  url: string,
  options: LoadModelOptions
): Promise<LoadedModel | null> {
  const gltf = await fetchGLTF(url);
  if (!gltf) return null;

  const root = cloneScene(gltf.scene);

  // Compute geometry-based bounding box
  const box = new THREE.Box3();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        const meshBox = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        box.union(meshBox);
      }
    }
  });

  // If geometry box is empty, fallback to setFromObject
  if (box.isEmpty()) {
    box.setFromObject(root);
  }

  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.y > 0.001) {
    const scale = options.targetHeight / size.y;
    root.scale.setScalar(scale);
  }

  // Recalculate box after scale to sit feet at y = 0
  const postBox = new THREE.Box3().setFromObject(root);
  root.position.y -= postBox.min.y;

  // Enhance and protect materials
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    // Filter Jinwoo's extra LOD hair meshes to prevent Z-fighting
    if (mesh.name && /Hair.*NLOD[123]/i.test(mesh.name)) {
      mesh.visible = false;
      return;
    }

    const processMat = (mat: THREE.Material): THREE.Material => {
      const std = mat as THREE.MeshStandardMaterial;
      if (options.shadowTint) {
        // Shadow Monarch extraction: obsidian dark body with vibrant ethereal glow
        const glowColor = new THREE.Color(options.shadowGlowHex ?? 0x22d3ee);
        const shadowMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x0a0c18),
          emissive: glowColor,
          emissiveIntensity: 0.85,
          map: std.map ?? null,
          roughness: 0.35,
          metalness: 0.8,
          side: THREE.DoubleSide,
        });
        return shadowMat;
      }

      // Standard character: preserve original textures & enhance for lighting
      if (std.isMeshStandardMaterial || (std as any).isMeshPhysicalMaterial) {
        std.side = THREE.DoubleSide;
        std.roughness = Math.min(std.roughness ?? 0.5, 0.65);
        if (std.emissive && std.emissiveIntensity !== undefined) {
          std.emissiveIntensity = Math.max(std.emissiveIntensity, 0.4);
        }
        return std;
      }

      // Convert basic materials to double-sided standard materials
      return new THREE.MeshStandardMaterial({
        color: (std as any).color ? (std as any).color.clone() : new THREE.Color(0xffffff),
        map: (std as any).map ?? null,
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
    };

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(processMat);
    } else if (mesh.material) {
      mesh.material = processMat(mesh.material);
    }
  });

  if (options.rotationY !== undefined) {
    root.rotation.y = options.rotationY;
  }

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

  return { group: wrapper, mixer, idleAction, attackAction, playAttack, rootMesh: root };
}

/**
 * Loads a static weapon model (dagger or sword).
 */
export async function loadWeaponModel(
  url: string,
  targetLength = 0.95
): Promise<THREE.Group | null> {
  const gltf = await fetchGLTF(url);
  if (!gltf) return null;

  const root = cloneScene(gltf.scene);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0.001) {
    root.scale.setScalar(targetLength / maxDim);
  }

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.side = THREE.DoubleSide;
    }
  });

  return root;
}
