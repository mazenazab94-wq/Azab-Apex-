import * as THREE from 'three';
import { getCharacterById } from '../data/characters';
import {
  DECALS,
  ENGINES,
  EXHAUSTS,
  getKartById,
  SPOILERS,
  TIRES,
  WHEELS,
} from '../data/karts';
import { KartLoadout, PowerUpType } from '../types/game';
import { createContactShadowTexture, createKartPaintTexture } from './proceduralTextures';

export interface CharacterRig {
  root: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  browLeft: THREE.Mesh;
  browRight: THREE.Mesh;
}

export interface KartRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  hoodMesh: THREE.Mesh;
  bodyMat: THREE.MeshPhysicalMaterial;
  brakeLightsMat: THREE.MeshStandardMaterial;
  headlightBeam: THREE.SpotLight | null;
  wheels: THREE.Group[];
  frontWheelPivots: THREE.Group[];
  steeringWheel: THREE.Object3D;
  flameMeshes: THREE.Mesh[];
  shieldMesh: THREE.Mesh;
  cloakTargets: THREE.Mesh[];
  characterRig: CharacterRig;
  isHover: boolean;
  rideHeight: number;
}

export function buildCharacterMesh(characterId: string, skinId = 'classic'): CharacterRig {
  const char = getCharacterById(characterId);
  const skin = char.skins.find((s) => s.id === skinId) || char.skins[0];

  const suitMat = new THREE.MeshStandardMaterial({
    color: skin.primaryColor,
    roughness: 0.45,
    metalness: 0.15,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: skin.secondaryColor,
    roughness: 0.5,
    metalness: 0.2,
  });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: '#0F172A',
    roughness: 0.06,
    metalness: 0.85,
    clearcoat: 1.0,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: skin.accentColor,
    roughness: 0.28,
    metalness: 0.55,
  });

  const root = new THREE.Group();

  // Realistic Motorsport Driver Torso + Shoulder Harness
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.42, 12), suitMat);
  torso.position.y = 0.21;
  root.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.24), trimMat);
  belt.position.set(0, 0.23, 0.03);
  root.add(belt);

  const makeArm = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.21, 0.36, 0.02);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.19, 4, 8), suitMat);
    sleeve.rotation.x = -Math.PI / 3;
    sleeve.position.set(0, -0.04, 0.12);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), accentMat);
    glove.position.set(0, -0.09, 0.24);
    pivot.add(sleeve, glove);
    return pivot;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  root.add(leftArm, rightArm);

  // Realistic Full-Face Racing Helmet
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.54, 0);
  root.add(headGroup);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 14), suitMat);
  helmet.castShadow = true;
  const visor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.205, 0.205, 0.11, 16, 1, false, -Math.PI * 0.36, Math.PI * 0.72),
    visorMat
  );
  visor.position.set(0, 0.02, 0.015);
  const aeroStripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.32), accentMat);
  aeroStripe.position.set(0, 0.19, -0.02);
  headGroup.add(helmet, visor, aeroStripe);

  // Dummy eye/brow refs so animation interface remains compatible
  const dummyGeo = new THREE.BoxGeometry(0.01, 0.01, 0.01);
  const leftEye = new THREE.Mesh(dummyGeo, visorMat);
  const rightEye = new THREE.Mesh(dummyGeo, visorMat);
  const browLeft = new THREE.Mesh(dummyGeo, visorMat);
  const browRight = new THREE.Mesh(dummyGeo, visorMat);

  return {
    root,
    headGroup,
    leftArm,
    rightArm,
    leftEye,
    rightEye,
    browLeft,
    browRight,
  };
}

export function animateCharacterRig(
  rig: CharacterRig,
  time: number,
  steer: number,
  mood: 'idle' | 'boost' | 'hit' | 'victory' | 'defeat'
) {
  rig.leftArm.rotation.x = -steer * 0.2;
  rig.rightArm.rotation.x = steer * 0.2;

  if (mood === 'victory') {
    rig.headGroup.position.y = 0.56 + Math.abs(Math.sin(time * 6)) * 0.04;
    rig.headGroup.rotation.z = Math.sin(time * 4) * 0.1;
  } else if (mood === 'hit') {
    rig.headGroup.rotation.z = Math.sin(time * 22) * 0.22;
  } else if (mood === 'boost') {
    rig.headGroup.position.y = 0.54;
    rig.headGroup.rotation.x = -0.1;
    rig.headGroup.rotation.z = -steer * 0.16;
  } else {
    rig.headGroup.position.y = 0.54;
    rig.headGroup.rotation.x = 0;
    rig.headGroup.rotation.z = -steer * 0.14;
  }
}

function createCarSilhouetteGeometry(length: number, width: number, height: number, noseStyle: string): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = width * 0.5;
  const hl = length * 0.5;

  if (noseStyle === 'blade') {
    shape.moveTo(-hw * 0.45, hl * 1.15);
    shape.lineTo(hw * 0.45, hl * 1.15);
    shape.lineTo(hw * 0.98, hl * 0.45);
    shape.lineTo(hw, -hl * 0.85);
    shape.lineTo(hw * 0.85, -hl);
    shape.lineTo(-hw * 0.85, -hl);
    shape.lineTo(-hw, -hl * 0.85);
    shape.lineTo(-hw * 0.98, hl * 0.45);
  } else {
    shape.moveTo(-hw * 0.65, hl * 1.05);
    shape.quadraticCurveTo(0, hl * 1.16, hw * 0.65, hl * 1.05);
    shape.lineTo(hw, hl * 0.45);
    shape.lineTo(hw, -hl * 0.82);
    shape.lineTo(hw * 0.88, -hl);
    shape.lineTo(-hw * 0.88, -hl);
    shape.lineTo(-hw, -hl * 0.82);
    shape.lineTo(-hw, hl * 0.45);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height * 1.05,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function buildKartMesh(
  loadout: KartLoadout,
  maxAnisotropy = 4,
  enableRealHeadlight = false
): KartRig {
  const kart = getKartById(loadout.kartId);
  const wheelDef = WHEELS.find((w) => w.id === loadout.wheelId) || WHEELS[0];
  const tireDef = TIRES.find((t) => t.id === loadout.tireId) || TIRES[0];
  const spoilerDef = SPOILERS.find((s) => s.id === loadout.spoilerId) || SPOILERS[0];
  const decalDef = DECALS.find((d) => d.id === loadout.decalId) || DECALS[0];
  const engineDef = ENGINES.find((e) => e.id === loadout.engineId) || ENGINES[0];
  const exhaustDef = EXHAUSTS.find((ex) => ex.id === loadout.exhaustId) || EXHAUSTS[0];

  const isHover = Boolean(kart.isHover || wheelDef.style === 'hover');
  const carLength = kart.chassisLength * 1.38;
  const carWidth = kart.chassisWidth * 1.24;
  const carHeight = kart.chassisHeight * 1.05;
  const rideHeight = isHover ? 0.54 : kart.kartClass === 'monster' ? 0.44 : 0.25;

  const paintTex = createKartPaintTexture(loadout.paintColor || kart.defaultColor, decalDef.pattern, maxAnisotropy);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: paintTex,
    roughness: 0.16,
    metalness: 0.55,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.35,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: '#111827',
    roughness: 0.42,
    metalness: 0.65,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0B1324',
    roughness: 0.05,
    metalness: 0.25,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 1.6,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    roughness: 0.12,
    metalness: 0.96,
  });

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = rideHeight;
  root.add(bodyGroup);

  const cloakTargets: THREE.Mesh[] = [];

  // 1. Primary Lower Car Chassis
  const hullGeo = createCarSilhouetteGeometry(carLength, carWidth, carHeight, kart.noseStyle);
  const hullMesh = new THREE.Mesh(hullGeo, bodyMat);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  bodyGroup.add(hullMesh);
  cloakTargets.push(hullMesh);

  // 2. Sculpted Hood & Front Splitter
  const hoodMesh = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 0.78, 0.14, carLength * 0.36),
    bodyMat
  );
  hoodMesh.position.set(0, carHeight + 0.04, carLength * 0.26);
  hoodMesh.rotation.x = 0.08;
  hoodMesh.castShadow = true;
  bodyGroup.add(hoodMesh);
  cloakTargets.push(hoodMesh);

  const frontSplitter = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 1.04, 0.08, 0.26),
    carbonMat
  );
  frontSplitter.position.set(0, 0.04, carLength * 0.54);
  bodyGroup.add(frontSplitter);

  const rearDiffuser = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 0.96, 0.16, 0.24),
    carbonMat
  );
  rearDiffuser.position.set(0, 0.08, -carLength * 0.52);
  bodyGroup.add(rearDiffuser);

  // Side Skirts & Mirrors
  const skirtGeo = new THREE.BoxGeometry(0.12, 0.12, carLength * 0.56);
  const skirtL = new THREE.Mesh(skirtGeo, carbonMat);
  skirtL.position.set(-carWidth * 0.52, 0.08, 0);
  const skirtR = skirtL.clone();
  skirtR.position.x = carWidth * 0.52;
  bodyGroup.add(skirtL, skirtR);

  const mirrorGeo = new THREE.BoxGeometry(0.18, 0.08, 0.12);
  const mirrorL = new THREE.Mesh(mirrorGeo, bodyMat);
  mirrorL.position.set(-carWidth * 0.52, carHeight + 0.22, carLength * 0.1);
  const mirrorR = mirrorL.clone();
  mirrorR.position.x = carWidth * 0.52;
  bodyGroup.add(mirrorL, mirrorR);

  // 3. Realistic Cabin Canopy + Tinted Windshield
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 0.68, 0.1, carLength * 0.32),
    bodyMat
  );
  roof.position.set(0, carHeight + 0.52, -0.14);
  roof.castShadow = true;
  bodyGroup.add(roof);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 0.66, 0.44, 0.08),
    glassMat
  );
  windshield.position.set(0, carHeight + 0.3, carLength * 0.08);
  windshield.rotation.x = -0.82;
  bodyGroup.add(windshield);

  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 0.64, 0.42, 0.08),
    glassMat
  );
  rearGlass.position.set(0, carHeight + 0.3, -carLength * 0.22);
  rearGlass.rotation.x = 0.85;
  bodyGroup.add(rearGlass);

  // 4. LED Headlights + Real Brake Light Bar
  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#F8FAFC',
    emissive: '#E0F2FE',
    emissiveIntensity: 1.4,
    roughness: 0.1,
  });
  const hlGeo = new THREE.BoxGeometry(0.32, 0.09, 0.08);
  const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
  hlLeft.position.set(-carWidth * 0.34, carHeight * 0.72, carLength * 0.52);
  const hlRight = hlLeft.clone();
  hlRight.position.x = carWidth * 0.34;
  bodyGroup.add(hlLeft, hlRight);

  let headlightBeam: THREE.SpotLight | null = null;
  if (enableRealHeadlight) {
    headlightBeam = new THREE.SpotLight('#E0F2FE', 5.5, 48, Math.PI / 5, 0.45, 1.4);
    headlightBeam.position.set(0, carHeight * 0.8, carLength * 0.55);
    const beamTarget = new THREE.Object3D();
    beamTarget.position.set(0, -0.5, carLength * 0.55 + 16);
    bodyGroup.add(beamTarget);
    headlightBeam.target = beamTarget;
    bodyGroup.add(headlightBeam);
  }

  const brakeLightsMat = new THREE.MeshStandardMaterial({
    color: '#991B1B',
    emissive: '#EF4444',
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });
  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 0.84, 0.09, 0.06),
    brakeLightsMat
  );
  tailBar.position.set(0, carHeight * 0.78, -carLength * 0.51);
  bodyGroup.add(tailBar);

  // Interior Steering Wheel & Driver
  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(0, carHeight + 0.26, 0.12);
  steeringWheel.rotation.x = -0.45;
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 14), carbonMat);
  steeringWheel.add(wheelRim);
  bodyGroup.add(steeringWheel);

  // 5. Rear Engine Intake & Dual/Quad Exhausts
  const engineGroup = new THREE.Group();
  engineGroup.position.set(0, carHeight + 0.06, -carLength * 0.38);
  bodyGroup.add(engineGroup);

  if (engineDef.tier >= 3) {
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.48), chromeMat);
    scoop.position.set(0, 0.16, 0.12);
    engineGroup.add(scoop);
  }

  const flameMeshes: THREE.Mesh[] = [];
  const pipeCount = engineDef.tier >= 4 ? 4 : 2;
  const pipeOffsets = pipeCount === 4 ? [-0.34, -0.22, 0.22, 0.34] : [-0.28, 0.28];
  const flameMat = new THREE.MeshBasicMaterial({
    color: exhaustDef.flameColor,
    transparent: true,
    opacity: 0.9,
  });

  pipeOffsets.forEach((px) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.26, 10), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(px, -carHeight * 0.55, -0.25);
    engineGroup.add(pipe);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.62, 8), flameMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(px, -carHeight * 0.55, -0.55);
    flame.visible = false;
    engineGroup.add(flame);
    flameMeshes.push(flame);
  });

  // 6. Spoiler Customization
  const spoilerGroup = new THREE.Group();
  spoilerGroup.position.set(0, carHeight + 0.08, -carLength * 0.46);
  bodyGroup.add(spoilerGroup);

  if (spoilerDef.style !== 'none') {
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.12), carbonMat);
    strutL.position.set(-carWidth * 0.28, 0.16, 0);
    const strutR = strutL.clone();
    strutR.position.x = carWidth * 0.28;
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(carWidth * 0.98, 0.055, 0.26),
      spoilerDef.style === 'cyber' ? chromeMat : bodyMat
    );
    wing.position.set(0, 0.33, -0.04);
    wing.rotation.x = 0.12;
    wing.castShadow = true;
    spoilerGroup.add(strutL, strutR, wing);
  }

  // 7. Realistic Alloy Wheels, Tires & Brake Calipers
  const wheels: THREE.Group[] = [];
  const frontWheelPivots: THREE.Group[] = [];
  const wheelRadius = kart.kartClass === 'monster' ? Math.max(wheelDef.radius, 0.46) : wheelDef.radius * 1.08;
  const wheelWidth = kart.kartClass === 'monster' ? Math.max(wheelDef.width, 0.34) : wheelDef.width * 1.1;

  const tireMat = new THREE.MeshStandardMaterial({
    color: tireDef.color,
    roughness: 0.88,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: wheelDef.style === 'gold' ? '#FACC15' : wheelDef.style === 'aero' ? '#334155' : '#CBD5E1',
    roughness: 0.18,
    metalness: 0.92,
  });
  const caliperMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.3, metalness: 0.5 });

  const positions = [
    { x: -carWidth * 0.49, z: carLength * 0.32, isFront: true },
    { x: carWidth * 0.49, z: carLength * 0.32, isFront: true },
    { x: -carWidth * 0.51, z: -carLength * 0.32, isFront: false },
    { x: carWidth * 0.51, z: -carLength * 0.32, isFront: false },
  ];

  positions.forEach((p) => {
    const pivot = new THREE.Group();
    pivot.position.set(p.x, wheelRadius, p.z);
    root.add(pivot);
    if (p.isFront) frontWheelPivots.push(pivot);

    const wGroup = new THREE.Group();
    pivot.add(wGroup);
    wheels.push(wGroup);

    const tireMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18),
      tireMat
    );
    tireMesh.rotation.z = Math.PI / 2;
    tireMesh.castShadow = true;
    wGroup.add(tireMesh);

    const rimMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.64, wheelRadius * 0.64, wheelWidth + 0.02, 12),
      rimMat
    );
    rimMesh.rotation.z = Math.PI / 2;
    wGroup.add(rimMesh);

    const brakeDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.44, wheelRadius * 0.44, wheelWidth * 0.4, 10),
      caliperMat
    );
    brakeDisc.rotation.z = Math.PI / 2;
    wGroup.add(brakeDisc);
  });

  // 8. Seated Driver
  const characterRig = buildCharacterMesh(loadout.characterId, loadout.skinId);
  characterRig.root.position.set(0, carHeight * 0.55, -0.14);
  bodyGroup.add(characterRig.root);

  // 9. Protective Energy Shield
  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.05, 18, 14),
    new THREE.MeshStandardMaterial({
      color: '#22D3EE',
      emissive: '#06B6D4',
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: 0.32,
      wireframe: true,
    })
  );
  shieldMesh.position.y = 0.85;
  shieldMesh.visible = false;
  root.add(shieldMesh);

  // 10. Ground Contact Shadow
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(carWidth * 1.9, carLength * 1.35),
    new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.68,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.03;
  root.add(shadowPlane);

  return {
    root,
    bodyGroup,
    hoodMesh,
    bodyMat,
    brakeLightsMat,
    headlightBeam,
    wheels,
    frontWheelPivots,
    steeringWheel,
    flameMeshes,
    shieldMesh,
    cloakTargets,
    characterRig,
    isHover,
    rideHeight,
  };
}

export function applyDamageVisuals(rig: KartRig, condition: number) {
  const dmg = Math.max(0, (100 - condition) / 100);
  rig.hoodMesh.rotation.x = 0.08 - dmg * 0.14;
  rig.hoodMesh.position.y = 0.48 + dmg * 0.06;
  rig.bodyMat.roughness = 0.16 + dmg * 0.48;
  rig.bodyMat.clearcoat = Math.max(0.2, 1.0 - dmg * 0.75);
}

export function buildPowerUpProjectileMesh(type: PowerUpType): THREE.Group {
  const g = new THREE.Group();

  if (type === 'seeker_pulse') {
    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 1.15, 12),
      new THREE.MeshStandardMaterial({
        color: '#EF4444',
        emissive: '#F97316',
        emissiveIntensity: 1.6,
        roughness: 0.2,
      })
    );
    core.rotation.x = Math.PI / 2;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.06, 8, 16),
      new THREE.MeshBasicMaterial({ color: '#FEF08A' })
    );
    g.add(core, ring);
  } else if (type === 'slick_trap') {
    const puddle = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.45, 0.07, 18),
      new THREE.MeshPhysicalMaterial({
        color: '#09090B',
        roughness: 0.05,
        metalness: 0.85,
        clearcoat: 1.0,
      })
    );
    puddle.position.y = 0.05;
    g.add(puddle);
  } else if (type === 'chrono_field') {
    const wave = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.16, 8, 24),
      new THREE.MeshBasicMaterial({ color: '#8B5CF6', transparent: true, opacity: 0.8 })
    );
    wave.rotation.x = Math.PI / 2;
    g.add(wave);
  } else {
    const wave = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.14, 8, 24),
      new THREE.MeshBasicMaterial({ color: '#EC4899', transparent: true, opacity: 0.78 })
    );
    wave.rotation.x = Math.PI / 2;
    g.add(wave);
  }

  return g;
}
