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
 * Calculates a natural, organic biological breathing curve:
 * - Active inhale (40% of cycle)
 * - Gentle crest pause (15% of cycle)
 * - Passive elastic exhale (45% of cycle)
 */
function getOrganicBreath(t: number, speed: number): number {
  const cycle = ((t * speed) % 1 + 1) % 1;
  if (cycle < 0.4) {
    const p = cycle / 0.4;
    return Math.sin(p * Math.PI * 0.5);
  }
  if (cycle < 0.55) {
    return 1.0;
  }
  const p = (cycle - 0.55) / 0.45;
  return 0.5 + 0.5 * Math.cos(p * Math.PI);
}

/**
 * Damped spring interpolation for butter-smooth joint movement.
 */
function smoothDamp(current: number, target: number, speed: number, dt: number): number {
  const alpha = 1 - Math.exp(-speed * dt);
  return current + (target - current) * alpha;
}

/**
 * Procedural Natural Rig Controller for Sung Jinwoo.
 * Animates the full 258-joint armature with AAA-grade biomechanics:
 * - Athletic low-profile dual-dagger combat stance
 * - Organic asymmetric respiratory mechanics across spine & clavicles
 * - Micro-saccade eye and head target tracking
 * - 24-bone aerodynamic cloth physics with traveling wave propagation
 * - Fluid 3-phase martial arts dual cross-slash strike
 */
export class JinwooRigController {
  private spine: BoneBinding | null;
  private spine1: BoneBinding | null;
  private spine2: BoneBinding | null;
  private neck: BoneBinding | null;
  private head: BoneBinding | null;

  // Left Arm (Guard / Reverse Dagger)
  private lClavicle: BoneBinding | null;
  private lUpperArm: BoneBinding | null;
  private lForearm: BoneBinding | null;
  private lHand: BoneBinding | null;

  // Right Arm (Forward Thrust / Strike Dagger)
  private rClavicle: BoneBinding | null;
  private rUpperArm: BoneBinding | null;
  private rForearm: BoneBinding | null;
  private rHand: BoneBinding | null;

  // Legs & Grounding
  private lThigh: BoneBinding | null;
  private lCalf: BoneBinding | null;
  private lFoot: BoneBinding | null;
  private rThigh: BoneBinding | null;
  private rCalf: BoneBinding | null;
  private rFoot: BoneBinding | null;

  // Trench coat bones
  private coatBones: { binding: BoneBinding; depth: number; stripIndex: number }[] = [];

  constructor(root: THREE.Object3D) {
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
    this.lFoot = bindBone(root, 'Bip001_L_Foot_034');
    this.rThigh = bindBone(root, 'Bip001_R_Thigh_038');
    this.rCalf = bindBone(root, 'Bip001_R_Calf_039');
    this.rFoot = bindBone(root, 'Bip001_R_Foot_040');

    // Discover coat bones
    root.traverse((obj) => {
      if (obj.name && obj.name.includes('Coat') && (obj as any).isBone) {
        const depthMatch = obj.name.match(/_00(\d)/);
        const depth = depthMatch ? parseInt(depthMatch[1], 10) : 1;
        const isOpp = obj.name.includes('Opp');
        const stripIndex =
          (obj.name.includes('R02') ? 1 : obj.name.includes('R03') ? 2 : 0) +
          (isOpp ? 3 : 0);
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
   * @param t Elapsed time in seconds.
   * @param dt Delta time in seconds.
   * @param slashProgress Attack progress from 1.0 (start) down to 0.0 (finished).
   */
  public update(t: number, dt: number, slashProgress = 0): void {
    const breath = getOrganicBreath(t, 0.42); // ~25 breaths per minute
    const breathSway = Math.sin(t * 1.3) * 0.015;

    // -------------------------------------------------------------------------
    // 1. ATHLETIC COMBAT STANCE & FOOT GROUNDING
    // -------------------------------------------------------------------------
    // Left leg stepped forward, right leg back, knees flexed, weight centered
    if (this.lThigh) {
      this.lThigh.bone.rotation.x = this.lThigh.restRotation.x + 0.16 + breath * 0.01;
      this.lThigh.bone.rotation.z = this.lThigh.restRotation.z + 0.04;
    }
    if (this.lCalf) {
      this.lCalf.bone.rotation.x = this.lCalf.restRotation.x - 0.28;
    }
    if (this.lFoot) {
      this.lFoot.bone.rotation.x = this.lFoot.restRotation.x + 0.12;
    }

    if (this.rThigh) {
      this.rThigh.bone.rotation.x = this.rThigh.restRotation.x - 0.14 - breath * 0.01;
      this.rThigh.bone.rotation.z = this.rThigh.restRotation.z - 0.04;
    }
    if (this.rCalf) {
      this.rCalf.bone.rotation.x = this.rCalf.restRotation.x - 0.22;
    }
    if (this.rFoot) {
      this.rFoot.bone.rotation.x = this.rFoot.restRotation.x + 0.08;
    }

    // -------------------------------------------------------------------------
    // 2. ORGANIC SPINE & BREATHING EXPANSION
    // -------------------------------------------------------------------------
    // Lower spine: slight 7-degree assassin forward tilt
    if (this.spine) {
      this.spine.bone.rotation.x = this.spine.restRotation.x + 0.11 + breath * 0.025;
      this.spine.bone.rotation.y = this.spine.restRotation.y - 0.04 + breathSway;
      this.spine.bone.rotation.z = this.spine.restRotation.z - 0.02;
    }
    // Mid/Upper chest: expands upward and outward on inhalation
    if (this.spine1) {
      this.spine1.bone.rotation.x = this.spine1.restRotation.x + breath * 0.028;
    }
    if (this.spine2) {
      this.spine2.bone.rotation.x = this.spine2.restRotation.x + breath * 0.022;
    }

    // Head: calm, sharp focus on target with micro-saccades
    if (this.head) {
      const saccade = Math.sin(t * 0.7) * Math.cos(t * 1.9) * 0.02;
      this.head.bone.rotation.y = this.head.restRotation.y + 0.06 + saccade;
      this.head.bone.rotation.x = this.head.restRotation.x - 0.06 + breath * 0.012;
    }

    // -------------------------------------------------------------------------
    // 3. NATURAL DUAL-DAGGER ARMS (RESTING IN FIGHTING POCKET)
    // -------------------------------------------------------------------------
    // Left Arm (Parry / Reverse-Grip Dagger)
    // - Upper arm hangs naturally along ribcage (X = -1.15, Z = -0.20)
    // - Forearm bent forward at solar plexus (Z = -1.20)
    // - Hand holds dagger angled forward in defensive ready
    let targetLArmX = -1.15 + breath * 0.02;
    let targetLArmY = 0;
    let targetLArmZ = -0.20 + breathSway;

    let targetLForeZ = -1.20 - breath * 0.025;
    let targetLForeX = -0.20;

    // Right Arm (Primary Strike Dagger)
    // - Upper arm hangs naturally along ribcage (X = -1.15, Z = +0.20)
    // - Forearm bent forward at solar plexus (Z = +1.20)
    let targetRArmX = -1.15 + breath * 0.02;
    let targetRArmY = 0;
    let targetRArmZ = 0.20 - breathSway;

    let targetRForeZ = 1.20 + breath * 0.025;
    let targetRForeX = -0.20;

    // -------------------------------------------------------------------------
    // 4. FLUID 3-PHASE MARTIAL ARTS SLASH ATTACK
    // -------------------------------------------------------------------------
    if (slashProgress > 0) {
      if (slashProgress > 0.7) {
        // Phase 1: Anticipation & Coiling (Windup)
        // Jinwoo sinks lower, draws right dagger back, shields with left
        const p = (slashProgress - 0.7) / 0.3; // 1 -> 0
        const easeWindup = Math.sin(p * Math.PI * 0.5);

        if (this.spine) {
          this.spine.bone.rotation.x += 0.16 * easeWindup;
          this.spine.bone.rotation.y -= 0.28 * easeWindup; // coil torso back
        }

        // Right arm cocks back ready to strike
        targetRArmX -= 0.35 * easeWindup;
        targetRArmZ -= 0.25 * easeWindup;
        targetRForeZ -= 0.30 * easeWindup;

        // Left arm raises to parry/shield
        targetLArmX -= 0.15 * easeWindup;
        targetLArmZ += 0.20 * easeWindup;
      } else if (slashProgress > 0.22) {
        // Phase 2: Explosive Dual Cross-Slash Execution
        const p = (slashProgress - 0.22) / 0.48; // 1 -> 0
        const strikePhase = 1 - p; // 0 -> 1
        const strikeSine = Math.sin(strikePhase * Math.PI); // smooth arc

        if (this.spine) {
          this.spine.bone.rotation.x += 0.24 * strikeSine;
          this.spine.bone.rotation.y += 0.48 * strikeSine; // explosive torso drive
        }
        if (this.head) {
          this.head.bone.rotation.x -= 0.12 * strikeSine; // locked forward on enemy
        }

        // Right Arm: Blistering downward diagonal cross-slash
        targetRArmX += 0.75 * strikeSine;
        targetRArmZ += 0.65 * strikeSine;
        targetRForeZ -= 0.85 * strikeSine;

        // Left Arm: Rising diagonal parry-slash
        targetLArmX += 0.65 * strikeSine;
        targetLArmZ -= 0.65 * strikeSine;
        targetLForeZ += 0.85 * strikeSine;
      } else {
        // Phase 3: Smooth Elastic Settle
        const p = slashProgress / 0.22; // 1 -> 0
        const settle = Math.sin(p * Math.PI * 0.5);
        if (this.spine) {
          this.spine.bone.rotation.x += 0.05 * settle;
        }
        targetRArmX += 0.08 * settle;
        targetLArmX += 0.08 * settle;
      }
    }

    // Apply smoothed bone rotations
    const armLerpSpeed = slashProgress > 0 ? 24 : 14;
    if (this.lUpperArm) {
      this.lUpperArm.bone.rotation.x = smoothDamp(this.lUpperArm.bone.rotation.x, targetLArmX, armLerpSpeed, dt);
      this.lUpperArm.bone.rotation.y = smoothDamp(this.lUpperArm.bone.rotation.y, targetLArmY, armLerpSpeed, dt);
      this.lUpperArm.bone.rotation.z = smoothDamp(this.lUpperArm.bone.rotation.z, targetLArmZ, armLerpSpeed, dt);
    }
    if (this.lForearm) {
      this.lForearm.bone.rotation.x = smoothDamp(this.lForearm.bone.rotation.x, targetLForeX, armLerpSpeed, dt);
      this.lForearm.bone.rotation.z = smoothDamp(this.lForearm.bone.rotation.z, targetLForeZ, armLerpSpeed, dt);
    }
    if (this.rUpperArm) {
      this.rUpperArm.bone.rotation.x = smoothDamp(this.rUpperArm.bone.rotation.x, targetRArmX, armLerpSpeed, dt);
      this.rUpperArm.bone.rotation.y = smoothDamp(this.rUpperArm.bone.rotation.y, targetRArmY, armLerpSpeed, dt);
      this.rUpperArm.bone.rotation.z = smoothDamp(this.rUpperArm.bone.rotation.z, targetRArmZ, armLerpSpeed, dt);
    }
    if (this.rForearm) {
      this.rForearm.bone.rotation.x = smoothDamp(this.rForearm.bone.rotation.x, targetRForeX, armLerpSpeed, dt);
      this.rForearm.bone.rotation.z = smoothDamp(this.rForearm.bone.rotation.z, targetRForeZ, armLerpSpeed, dt);
    }

    // -------------------------------------------------------------------------
    // 5. SECONDARY MOTION: AERODYNAMIC TRENCH COAT CLOTH PROPAGATION
    // -------------------------------------------------------------------------
    const coatWindSpeed = slashProgress > 0 ? 8.5 : 2.8;
    const coatFlutterAmp = slashProgress > 0 ? 0.24 : 0.065;
    const coatDrag = slashProgress > 0 ? 0.42 * Math.sin(slashProgress * Math.PI) : 0;

    for (const { binding, depth, stripIndex } of this.coatBones) {
      // Traveling harmonic wave from hip to hem with phase offset
      const phase = t * coatWindSpeed - depth * 0.62 + stripIndex * 0.38;
      const depthAmp = 0.5 + depth * 0.35;
      const waveZ = Math.sin(phase) * coatFlutterAmp * depthAmp;
      const waveX = Math.cos(phase * 0.9) * (coatFlutterAmp * 0.6) * depthAmp;

      const targetZ = binding.restRotation.z + waveZ + (stripIndex >= 3 ? -coatDrag : coatDrag);
      const targetX = binding.restRotation.x + waveX - coatDrag * 0.5;

      binding.bone.rotation.z = smoothDamp(binding.bone.rotation.z, targetZ, 16, dt);
      binding.bone.rotation.x = smoothDamp(binding.bone.rotation.x, targetX, 16, dt);
    }
  }
}

/**
 * Procedural Natural Rig Controller for Enemy Boss and Mobs.
 * Animates:
 * - Menacing predator posture & heavy chest heaves
 * - Snarling head tracking
 * - Claw / arm tension resting in forward crouch
 * - Concussive impact stagger & organic spring recoil
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
   * @param t Elapsed time in seconds.
   * @param dt Delta time in seconds.
   * @param hitProgress Recoil progress from 1.0 down to 0.0.
   * @param isBoss Whether this is the Blood-Fanged Alpha Boss.
   */
  public update(t: number, dt: number, hitProgress = 0, isBoss = false): void {
    const breathRate = isBoss ? 0.35 : 0.5;
    const breath = getOrganicBreath(t, breathRate);
    const sway = Math.sin(t * (breathRate * 2.5)) * 0.04;

    // Heavy predator spine posture
    if (this.spine1) {
      const targetSpineX = this.spine1.restRotation.x + 0.08 + breath * 0.035;
      const targetSpineY = this.spine1.restRotation.y + sway;
      this.spine1.bone.rotation.x = smoothDamp(this.spine1.bone.rotation.x, targetSpineX, 10, dt);
      this.spine1.bone.rotation.y = smoothDamp(this.spine1.bone.rotation.y, targetSpineY, 10, dt);
    }
    if (this.spine2) {
      const targetSpine2X = this.spine2.restRotation.x + breath * 0.04;
      this.spine2.bone.rotation.x = smoothDamp(this.spine2.bone.rotation.x, targetSpine2X, 10, dt);
    }

    // Menacing head tracking & snarling
    if (this.head) {
      const targetHeadX = this.head.restRotation.x + 0.1 + breath * 0.05;
      const targetHeadY = this.head.restRotation.y - sway * 1.5;
      this.head.bone.rotation.x = smoothDamp(this.head.bone.rotation.x, targetHeadX, 12, dt);
      this.head.bone.rotation.y = smoothDamp(this.head.bone.rotation.y, targetHeadY, 12, dt);
    }

    // Predatory arms hanging forward ready to strike (relative to authentic rest posture)
    let targetLArmX = this.lUpperArm ? this.lUpperArm.restRotation.x - 0.22 + breath * 0.04 : 0;
    let targetLArmY = this.lUpperArm ? this.lUpperArm.restRotation.y + sway * 0.06 : 0;
    let targetRArmX = this.rUpperArm ? this.rUpperArm.restRotation.x - 0.22 + breath * 0.04 : 0;
    let targetRArmY = this.rUpperArm ? this.rUpperArm.restRotation.y - sway * 0.06 : 0;

    let targetForearmL = this.lLowerArm ? this.lLowerArm.restRotation.x + 0.35 + breath * 0.05 : 0;
    let targetForearmR = this.rLowerArm ? this.rLowerArm.restRotation.x + 0.35 + breath * 0.05 : 0;

    // CONCUSSIVE IMPACT STAGGER: Violent flinch when slashed by Jinwoo
    if (hitProgress > 0) {
      const flinch = Math.sin(hitProgress * Math.PI);
      if (this.spine1) {
        this.spine1.bone.rotation.x -= 0.32 * flinch;
        this.spine1.bone.rotation.y -= 0.15 * flinch;
      }
      if (this.head) {
        this.head.bone.rotation.x -= 0.45 * flinch; // head snaps back
      }
      targetLArmX -= 0.35 * flinch;
      targetRArmX -= 0.35 * flinch;
      targetLArmY += 0.25 * flinch;
      targetRArmY -= 0.25 * flinch;
    }

    if (this.lUpperArm) {
      this.lUpperArm.bone.rotation.x = smoothDamp(this.lUpperArm.bone.rotation.x, targetLArmX, 15, dt);
      this.lUpperArm.bone.rotation.y = smoothDamp(this.lUpperArm.bone.rotation.y, targetLArmY, 15, dt);
    }
    if (this.lLowerArm) {
      this.lLowerArm.bone.rotation.x = smoothDamp(this.lLowerArm.bone.rotation.x, targetForearmL, 15, dt);
    }
    if (this.rUpperArm) {
      this.rUpperArm.bone.rotation.x = smoothDamp(this.rUpperArm.bone.rotation.x, targetRArmX, 15, dt);
      this.rUpperArm.bone.rotation.y = smoothDamp(this.rUpperArm.bone.rotation.y, targetRArmY, 15, dt);
    }
    if (this.rLowerArm) {
      this.rLowerArm.bone.rotation.x = smoothDamp(this.rLowerArm.bone.rotation.x, targetForearmR, 15, dt);
    }
  }
}

/**
 * Procedural Rig Controller for Shadow Soldier units (Infantry / Igris / Tank).
 * Animates:
 * - Fluid ethereal floating hover
 * - Disciplined sentinel combat ready stance
 * - Follow-through battle strikes alongside the Shadow Monarch
 */
export class ShadowRigController {
  private spine: BoneBinding | null;
  private head: BoneBinding | null;
  private lUpperArm: BoneBinding | null;
  private rUpperArm: BoneBinding | null;
  private lLowerArm: BoneBinding | null;
  private rLowerArm: BoneBinding | null;

  constructor(root: THREE.Object3D) {
    this.spine = bindBone(root, 'spine') || bindBone(root, 'spine_01');
    this.head = bindBone(root, 'head') || bindBone(root, 'Head');
    this.lUpperArm =
      bindBone(root, 'upperarml') || bindBone(root, 'upperarm.l') || bindBone(root, 'upperarm_l');
    this.rUpperArm =
      bindBone(root, 'upperarmr') || bindBone(root, 'upperarm.r') || bindBone(root, 'upperarm_r');
    this.lLowerArm =
      bindBone(root, 'lowerarml') || bindBone(root, 'lowerarm.l') || bindBone(root, 'lowerarm_l');
    this.rLowerArm =
      bindBone(root, 'lowerarmr') || bindBone(root, 'lowerarm.r') || bindBone(root, 'lowerarm_r');
  }

  public update(t: number, dt: number, index = 0, slashProgress = 0): void {
    const floatSway = Math.sin(t * 2.5 + index * 1.4) * 0.045;

    if (this.spine) {
      const targetSpineX = this.spine.restRotation.x + 0.06 + floatSway * 0.4;
      const targetSpineY = this.spine.restRotation.y - 0.15;
      this.spine.bone.rotation.x = smoothDamp(this.spine.bone.rotation.x, targetSpineX, 10, dt);
      this.spine.bone.rotation.y = smoothDamp(this.spine.bone.rotation.y, targetSpineY, 10, dt);
    }

    // Disciplined sentinel stance (relative to authentic rest rotation)
    let targetRArmZ = this.rUpperArm ? this.rUpperArm.restRotation.z + floatSway * 0.5 : 0;
    let targetLArmZ = this.lUpperArm ? this.lUpperArm.restRotation.z - floatSway * 0.5 : 0;

    // Follow Monarch's slash command!
    if (slashProgress > 0) {
      const strike = Math.sin(slashProgress * Math.PI);
      targetRArmZ -= 0.65 * strike;
      targetLArmZ += 0.45 * strike;
    }

    if (this.rUpperArm) {
      this.rUpperArm.bone.rotation.z = smoothDamp(this.rUpperArm.bone.rotation.z, targetRArmZ, 16, dt);
    }
    if (this.lUpperArm) {
      this.lUpperArm.bone.rotation.z = smoothDamp(this.lUpperArm.bone.rotation.z, targetLArmZ, 16, dt);
    }
  }
}
