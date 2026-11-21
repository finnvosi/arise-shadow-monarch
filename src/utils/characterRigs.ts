import * as THREE from 'three';

/**
 * Utility to safely get and store a bone's initial rest orientation.
 */
interface BoneBinding {
  bone: THREE.Object3D;
  restRotation: THREE.Euler;
  restPosition: THREE.Vector3;
}

function bindBone(root: THREE.Object3D, name: string): BoneBinding | null {
  const bone = root.getObjectByName(name);
  if (!bone) return null;
  return {
    bone,
    restRotation: bone.rotation.clone(),
    restPosition: bone.position.clone(),
  };
}

/**
 * Procedural Rig Controller for Sung Jinwoo.
 * Animates the full 258-joint armature:
 * - Athletic dual-dagger combat idle stance
 * - Dynamic breathing & chest expansion
 * - Head tracking
 * - 24-bone procedural aerodynamic trench coat billowing
 * - 3-phase explosive dash & dual cross-slash attack
 */
export class JinwooRigController {
  private pelvis: BoneBinding | null;
  private spine: BoneBinding | null;
  private spine1: BoneBinding | null;
  private spine2: BoneBinding | null;
  private neck: BoneBinding | null;
  private head: BoneBinding | null;

  // Left Arm
  private lClavicle: BoneBinding | null;
  private lUpperArm: BoneBinding | null;
  private lForearm: BoneBinding | null;
  private lHand: BoneBinding | null;

  // Right Arm
  private rClavicle: BoneBinding | null;
  private rUpperArm: BoneBinding | null;
  private rForearm: BoneBinding | null;
  private rHand: BoneBinding | null;

  // Legs
  private lThigh: BoneBinding | null;
  private lCalf: BoneBinding | null;
  private rThigh: BoneBinding | null;
  private rCalf: BoneBinding | null;

  // Trench coat bones (strips R01, R02, R03 and Opp)
  private coatBones: { binding: BoneBinding; depth: number; stripIndex: number }[] = [];

  constructor(root: THREE.Object3D) {
    this.pelvis = bindBone(root, 'Bip001_Pelvis_07');
    this.spine = bindBone(root, 'Bip001_Spine_044');
    this.spine1 = bindBone(root, 'Bip001_Spine1_045');
    this.spine2 = bindBone(root, 'Bip001_Spine2_046');
    this.neck = bindBone(root, 'Bip001_Neck_078');
    this.head = bindBone(root, 'Bip001_Head_079');

    this.lClavicle = bindBone(root, 'Bip001_L_Clavicle_047');
    this.lUpperArm = bindBone(root, 'Bip001_L_UpperArm_048');
    this.lForearm = bindBone(root, 'Bip001_L_Forearm_049');
    this.lHand = bindBone(root, 'Bip001_L_Hand_051');

    this.rClavicle = bindBone(root, 'Bip001_R_Clavicle_094');
    this.rUpperArm = bindBone(root, 'Bip001_R_UpperArm_095');
    this.rForearm = bindBone(root, 'Bip001_R_Forearm_096');
    this.rHand = bindBone(root, 'Bip001_R_Hand_098');

    this.lThigh = bindBone(root, 'Bip001_L_Thigh_032');
    this.lCalf = bindBone(root, 'Bip001_L_Calf_033');
    this.rThigh = bindBone(root, 'Bip001_R_Thigh_038');
    this.rCalf = bindBone(root, 'Bip001_R_Calf_039');

    // Discover coat bones
    root.traverse((obj) => {
      if (obj.name && obj.name.includes('Coat') && (obj as any).isBone) {
        const depthMatch = obj.name.match(/_00(\d)/);
        const depth = depthMatch ? parseInt(depthMatch[1], 10) : 1;
        const isOpp = obj.name.includes('Opp');
        const stripIndex = (obj.name.includes('R02') ? 1 : obj.name.includes('R03') ? 2 : 0) + (isOpp ? 3 : 0);
        this.coatBones.push({
          binding: {
            bone: obj,
            restRotation: obj.rotation.clone(),
            restPosition: obj.position.clone(),
          },
          depth,
          stripIndex,
        });
      }
    });
  }

  /**
   * Update Jinwoo's skeletal rig every frame.
   * @param t Total elapsed time in seconds.
   * @param slashProgress Attack progress from 1.0 (start) down to 0.0 (finished).
   */
  public update(t: number, slashProgress = 0): void {
    // -------------------------------------------------------------------------
    // 1. COMBAT IDLE POSE & BREATHING
    // -------------------------------------------------------------------------
    const breath = Math.sin(t * 2.8);
    const breathSub = Math.sin(t * 2.8 - 0.4);

    // Athletic combat stance: legs slightly bent and staggered
    if (this.lThigh) {
      this.lThigh.bone.rotation.x = this.lThigh.restRotation.x + 0.15; // Left leg forward
    }
    if (this.lCalf) {
      this.lCalf.bone.rotation.x = this.lCalf.restRotation.x - 0.22; // Left knee flex
    }
    if (this.rThigh) {
      this.rThigh.bone.rotation.x = this.rThigh.restRotation.x - 0.12; // Right leg back
    }
    if (this.rCalf) {
      this.rCalf.bone.rotation.x = this.rCalf.restRotation.x - 0.18; // Right knee flex
    }

    // Spine combat lean & breathing
    if (this.spine) {
      this.spine.bone.rotation.x = this.spine.restRotation.x + 0.08 + breath * 0.02;
      this.spine.bone.rotation.y = this.spine.restRotation.y - 0.05; // slight twist towards enemy
    }
    if (this.spine1) {
      this.spine1.bone.rotation.x = this.spine1.restRotation.x + breathSub * 0.025;
    }
    if (this.spine2) {
      this.spine2.bone.rotation.x = this.spine2.restRotation.x + breathSub * 0.02;
    }

    // Head focused straight forward at the enemy
    if (this.head) {
      this.head.bone.rotation.y = this.head.restRotation.y + 0.08;
      this.head.bone.rotation.x = this.head.restRotation.x - 0.04 + breath * 0.015;
    }

    // Ready stance dual daggers
    // Left Arm (Parry / Reverse-Grip Dagger)
    let lUpperArmZ = -1.05 + breath * 0.03;
    let lUpperArmY = 0.38;
    let lForearmZ = 0.75 + breath * 0.02;
    let lForearmX = 0.25;

    // Right Arm (Forward Thrust / Strike Dagger)
    let rUpperArmZ = 1.05 - breath * 0.03;
    let rUpperArmY = -0.38;
    let rForearmZ = -0.75 - breath * 0.02;
    let rForearmX = 0.25;

    // -------------------------------------------------------------------------
    // 2. DYNAMIC ATTACK COMBO (SLASH DASH)
    // -------------------------------------------------------------------------
    if (slashProgress > 0) {
      // Phase 1 (1.0 -> 0.7): Windup & Crouch
      // Phase 2 (0.7 -> 0.3): Explosive Dual Cross-Slash
      // Phase 3 (0.3 -> 0.0): Follow-through & Recovery
      if (slashProgress > 0.7) {
        // Windup: Crouch deeper, cock right arm back, shield with left
        const p = (slashProgress - 0.7) / 0.3; // 1 -> 0
        if (this.spine) {
          this.spine.bone.rotation.x += 0.25 * p;
          this.spine.bone.rotation.y -= 0.35 * p; // twist back
        }
        // Right arm drawn back
        rUpperArmZ += 0.45 * p;
        rUpperArmY += 0.55 * p;
        rForearmZ -= 0.45 * p;
        // Left arm raised in guard
        lUpperArmZ -= 0.35 * p;
        lForearmZ += 0.55 * p;
      } else if (slashProgress > 0.25) {
        // Strike: Violent forward cross-slashing torque!
        const p = (slashProgress - 0.25) / 0.45;
        const slashWave = Math.sin((1 - p) * Math.PI); // 0 -> 1 -> 0

        if (this.spine) {
          this.spine.bone.rotation.x += 0.32 * slashWave;
          this.spine.bone.rotation.y += 0.55 * slashWave; // explosive forward torque
        }
        if (this.head) {
          this.head.bone.rotation.x -= 0.15 * slashWave; // fierce forward gaze
        }

        // Right arm whips forward in horizontal decapitating cross-slash
        rUpperArmZ -= 1.1 * slashWave;
        rUpperArmY -= 1.25 * slashWave;
        rForearmZ -= 0.85 * slashWave;
        rForearmX += 0.95 * slashWave;

        // Left arm follows through with rising diagonal parry-slash
        lUpperArmZ += 0.85 * slashWave;
        lUpperArmY += 0.95 * slashWave;
        lForearmZ += 0.95 * slashWave;
        lForearmX -= 0.65 * slashWave;
      } else {
        // Recovery: Smooth ease back to combat stance
        const p = slashProgress / 0.25; // 1 -> 0
        if (this.spine) {
          this.spine.bone.rotation.x += 0.1 * p;
        }
        rUpperArmY -= 0.25 * p;
        lUpperArmY += 0.25 * p;
      }
    }

    // Apply arm rotations
    if (this.lUpperArm) {
      this.lUpperArm.bone.rotation.z = lUpperArmZ;
      this.lUpperArm.bone.rotation.y = lUpperArmY;
    }
    if (this.lForearm) {
      this.lForearm.bone.rotation.z = lForearmZ;
      this.lForearm.bone.rotation.x = lForearmX;
    }
    if (this.rUpperArm) {
      this.rUpperArm.bone.rotation.z = rUpperArmZ;
      this.rUpperArm.bone.rotation.y = rUpperArmY;
    }
    if (this.rForearm) {
      this.rForearm.bone.rotation.z = rForearmZ;
      this.rForearm.bone.rotation.x = rForearmX;
    }

    // -------------------------------------------------------------------------
    // 3. SECONDARY MOTION: AERODYNAMIC BILLOWING TRENCH COAT
    // -------------------------------------------------------------------------
    const coatWindSpeed = slashProgress > 0 ? 9.5 : 3.6;
    const coatFlutterAmp = slashProgress > 0 ? 0.28 : 0.085;
    const coatBackSweep = slashProgress > 0 ? 0.35 * Math.sin(slashProgress * Math.PI) : 0;

    for (const { binding, depth, stripIndex } of this.coatBones) {
      const phase = t * coatWindSpeed - depth * 0.55 + stripIndex * 0.45;
      const waveZ = Math.sin(phase) * coatFlutterAmp * (depth * 0.35 + 0.65);
      const waveX = Math.cos(phase * 0.85) * (coatFlutterAmp * 0.6);

      // Trailing backward in the wind/dash
      binding.bone.rotation.z = binding.restRotation.z + waveZ + (stripIndex >= 3 ? -coatBackSweep : coatBackSweep);
      binding.bone.rotation.x = binding.restRotation.x + waveX - coatBackSweep * 0.45;
    }
  }
}

/**
 * Procedural Rig Controller for Enemy Boss and Mobs.
 * Animates:
 * - Menacing beast breathing & swaying
 * - Heavy head tilting & jaw tracking
 * - Claw / arm tension
 * - Staggering hit recoil when struck by Jinwoo's daggers
 */
export class EnemyRigController {
  private spine1: BoneBinding | null;
  private spine2: BoneBinding | null;
  private spine3: BoneBinding | null;
  private head: BoneBinding | null;
  private neck: BoneBinding | null;

  private lUpperArm: BoneBinding | null;
  private lLowerArm: BoneBinding | null;
  private rUpperArm: BoneBinding | null;
  private rLowerArm: BoneBinding | null;

  private lThigh: BoneBinding | null;
  private rThigh: BoneBinding | null;

  constructor(root: THREE.Object3D) {
    this.spine1 = bindBone(root, 'spine_01');
    this.spine2 = bindBone(root, 'spine_02');
    this.spine3 = bindBone(root, 'spine_03');
    this.head = bindBone(root, 'Head');
    this.neck = bindBone(root, 'neck_01');

    this.lUpperArm = bindBone(root, 'upperarm_l');
    this.lLowerArm = bindBone(root, 'lowerarm_l');
    this.rUpperArm = bindBone(root, 'upperarm_r');
    this.rLowerArm = bindBone(root, 'lowerarm_r');

    this.lThigh = bindBone(root, 'thigh_l');
    this.rThigh = bindBone(root, 'thigh_r');
  }

  /**
   * Update Enemy bones every frame.
   * @param t Elapsed time.
   * @param hitProgress Recoil progress from 1.0 down to 0.0.
   * @param isBoss Whether this is the Blood-Fanged Alpha Boss.
   */
  public update(t: number, hitProgress = 0, isBoss = false): void {
    const breathRate = isBoss ? 2.2 : 3.0;
    const breath = Math.sin(t * breathRate);
    const sway = Math.cos(t * (breathRate * 0.5));

    // Heavy spine posture
    if (this.spine1) {
      this.spine1.bone.rotation.x = this.spine1.restRotation.x + breath * 0.04;
      this.spine1.bone.rotation.y = this.spine1.restRotation.y + sway * 0.05;
    }
    if (this.spine2) {
      this.spine2.bone.rotation.x = this.spine2.restRotation.x + breath * 0.05;
    }

    // Menacing head tracking & snarling
    if (this.head) {
      this.head.bone.rotation.x = this.head.restRotation.x + breath * 0.06;
      this.head.bone.rotation.y = this.head.restRotation.y - sway * 0.08;
    }

    // Claws / arms twitching with predatory tension
    if (this.lUpperArm) {
      this.lUpperArm.bone.rotation.z = this.lUpperArm.restRotation.z + breath * 0.07;
      this.lUpperArm.bone.rotation.y = this.lUpperArm.restRotation.y + sway * 0.06;
    }
    if (this.rUpperArm) {
      this.rUpperArm.bone.rotation.z = this.rUpperArm.restRotation.z - breath * 0.07;
      this.rUpperArm.bone.rotation.y = this.rUpperArm.restRotation.y - sway * 0.06;
    }

    // HIT RECOIL: Stagger back violently when struck by Jinwoo's daggers
    if (hitProgress > 0) {
      const flinch = Math.sin(hitProgress * Math.PI);
      if (this.spine1) {
        this.spine1.bone.rotation.x -= 0.38 * flinch; // Spine throws backward
      }
      if (this.head) {
        this.head.bone.rotation.x -= 0.55 * flinch; // Head snaps back
      }
      if (this.lUpperArm) {
        this.lUpperArm.bone.rotation.z -= 0.45 * flinch; // Left arm thrown wide
      }
      if (this.rUpperArm) {
        this.rUpperArm.bone.rotation.z += 0.45 * flinch; // Right arm thrown wide
      }
    }
  }
}

/**
 * Procedural Rig Controller for Shadow Soldier units (Infantry / Igris / Tank).
 * Animates:
 * - Vigilant guard stance with weapon raised
 * - Ethereal floating mana sway
 * - Synchronized slash attack when the Shadow Monarch commands!
 */
export class ShadowRigController {
  private spine: BoneBinding | null;
  private head: BoneBinding | null;
  private lUpperArm: BoneBinding | null;
  private rUpperArm: BoneBinding | null;
  private lLowerArm: BoneBinding | null;
  private rLowerArm: BoneBinding | null;

  constructor(root: THREE.Object3D) {
    this.spine = bindBone(root, 'spine');
    this.head = bindBone(root, 'head');
    this.lUpperArm = bindBone(root, 'upperarml') || bindBone(root, 'upperarm.l');
    this.rUpperArm = bindBone(root, 'upperarmr') || bindBone(root, 'upperarm.r');
    this.lLowerArm = bindBone(root, 'lowerarml') || bindBone(root, 'lowerarm.l');
    this.rLowerArm = bindBone(root, 'lowerarmr') || bindBone(root, 'lowerarm.r');
  }

  public update(t: number, index = 0, slashProgress = 0): void {
    const floatSway = Math.sin(t * 3.2 + index * 1.5) * 0.06;

    if (this.spine) {
      this.spine.bone.rotation.x = this.spine.restRotation.x + floatSway * 0.5;
      this.spine.bone.rotation.y = this.spine.restRotation.y - 0.2; // angled towards enemy
    }

    // Guard stance
    let rArmZ = this.rUpperArm ? this.rUpperArm.restRotation.z + 0.35 + floatSway : 0;
    let lArmZ = this.lUpperArm ? this.lUpperArm.restRotation.z - 0.35 - floatSway : 0;

    // Follow Monarch's slash command!
    if (slashProgress > 0) {
      const strike = Math.sin(slashProgress * Math.PI);
      rArmZ -= 0.95 * strike;
      lArmZ += 0.65 * strike;
    }

    if (this.rUpperArm) {
      this.rUpperArm.bone.rotation.z = rArmZ;
    }
    if (this.lUpperArm) {
      this.lUpperArm.bone.rotation.z = lArmZ;
    }
  }
}
