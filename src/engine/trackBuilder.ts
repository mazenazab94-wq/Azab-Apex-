import * as THREE from 'three';
import { TimeOfDay, TrackDef, TrackFeaturePoint, TrackTheme, WeatherCondition } from '../types/game';
import {
  createBoostPadTexture,
  createBuildingFacadeTexture,
  createCheckeredTexture,
  createRoadTexture,
  createTerrainTexture,
} from './proceduralTextures';

export interface TrackSample {
  t: number;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
}

export interface RampTrigger {
  pos: THREE.Vector3;
  radius: number;
  forward: THREE.Vector3;
}

export interface BoostPadTrigger {
  pos: THREE.Vector3;
  radius: number;
}

export interface ObstacleEntity {
  mesh: THREE.Group;
  t: number;
  basePoint: THREE.Vector3;
  right: THREE.Vector3;
  halfWidth: number;
  kind: NonNullable<TrackFeaturePoint['obstacleKind']>;
  phaseOffset: number;
  worldPos: THREE.Vector3;
  radius: number;
}

export interface CrateEntity {
  id: number;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  active: boolean;
  respawnTimer: number;
}

export interface CoinEntity {
  id: number;
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  active: boolean;
  respawnTimer: number;
}

export interface BuiltTrack {
  def: TrackDef;
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  totalLength: number;
  ramps: RampTrigger[];
  boostPads: BoostPadTrigger[];
  obstacles: ObstacleEntity[];
  crates: CrateEntity[];
  coins: CoinEntity[];
  sampleAtT: (t: number, outPos: THREE.Vector3, outTan: THREE.Vector3, outRight: THREE.Vector3) => void;
  findClosestT: (pos: THREE.Vector3, hintT?: number) => { t: number; distSq: number; lateral: number; roadY: number };
  updateDynamicElements: (elapsed: number, dt: number) => void;
}

const SAMPLE_COUNT = 360;
const _tmpVec = new THREE.Vector3();

export function buildTrack(
  def: TrackDef,
  maxAnisotropy = 4,
  timeOfDay: TimeOfDay = 'day',
  weather: WeatherCondition = 'clear'
): BuiltTrack {
  const group = new THREE.Group();
  const vectors = def.controlPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(vectors, true, 'catmullrom', 0.5);
  const totalLength = curve.getLength();

  const samples: TrackSample[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i / SAMPLE_COUNT;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
    samples.push({ t, point, tangent, right });
  }

  // 1. Realistic Asphalt Road Ribbon + Highway Guardrails/Kerbs
  const halfW = def.trackWidth * 0.5;
  const roadSegs = SAMPLE_COUNT;
  const roadPos: number[] = [];
  const roadUvs: number[] = [];
  const roadIdx: number[] = [];

  const kerbLeftPos: number[] = [];
  const kerbRightPos: number[] = [];
  const kerbIdx: number[] = [];

  for (let i = 0; i <= roadSegs; i++) {
    const s = samples[i % SAMPLE_COUNT];
    const vCoord = (i / roadSegs) * 28;

    const lPt = s.point.clone().addScaledVector(s.right, -halfW);
    const rPt = s.point.clone().addScaledVector(s.right, halfW);
    roadPos.push(lPt.x, lPt.y, lPt.z, rPt.x, rPt.y, rPt.z);
    roadUvs.push(0, vCoord, 1, vCoord);

    const lkInner = s.point.clone().addScaledVector(s.right, -halfW - 0.05);
    const lkOuter = s.point.clone().addScaledVector(s.right, -halfW - 1.05);
    lkInner.y += 0.12;
    lkOuter.y += 0.48;
    kerbLeftPos.push(lkOuter.x, lkOuter.y, lkOuter.z, lkInner.x, lkInner.y, lkInner.z);

    const rkInner = s.point.clone().addScaledVector(s.right, halfW + 0.05);
    const rkOuter = s.point.clone().addScaledVector(s.right, halfW + 1.05);
    rkInner.y += 0.12;
    rkOuter.y += 0.48;
    kerbRightPos.push(rkInner.x, rkInner.y, rkInner.z, rkOuter.x, rkOuter.y, rkOuter.z);

    if (i < roadSegs) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      roadIdx.push(a, b, c, b, d, c);
      kerbIdx.push(a, b, c, b, d, c);
    }
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPos, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIdx);
  roadGeo.computeVertexNormals();

  // Wet-road reflections: glossy reflective tarmac in rain
  const isWet = weather === 'rain';
  const roadMat = new THREE.MeshStandardMaterial({
    map: createRoadTexture(def.theme, def.roadColor, def.accentColor, maxAnisotropy, weather),
    roughness: isWet ? 0.14 : 0.78,
    metalness: isWet ? 0.45 : 0.08,
    envMapIntensity: isWet ? 1.8 : 0.75,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  const makeKerbMesh = (positions: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(kerbIdx);
    const colors = new Float32Array((positions.length / 3) * 3);
    const cA = new THREE.Color(def.kerbColorA);
    const cB = new THREE.Color(def.kerbColorB);
    for (let i = 0; i <= roadSegs; i++) {
      const c = Math.floor(i / 2) % 2 === 0 ? cA : cB;
      for (let v = 0; v < 2; v++) {
        const idx = (i * 2 + v) * 3;
        colors[idx] = c.r;
        colors[idx + 1] = c.g;
        colors[idx + 2] = c.b;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(
      g,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: isWet ? 0.25 : 0.6,
        metalness: 0.2,
      })
    );
    m.receiveShadow = true;
    m.castShadow = true;
    return m;
  };
  group.add(makeKerbMesh(kerbLeftPos), makeKerbMesh(kerbRightPos));

  // Elevated Bridge Pillars
  const pillarGeo = new THREE.CylinderGeometry(1.1, 1.4, 26, 8);
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.85 });
  for (let i = 0; i < SAMPLE_COUNT; i += 16) {
    const s = samples[i];
    if (s.point.y > 2.6) {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(s.point.x, s.point.y - 13.1, s.point.z);
      group.add(pillar);
    }
  }

  // 2. Start/Finish Gantry & Checkered Line
  const startS = samples[0];
  const finishStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(def.trackWidth, 4.2),
    new THREE.MeshStandardMaterial({
      map: createCheckeredTexture(maxAnisotropy),
      roughness: isWet ? 0.2 : 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  finishStrip.rotation.x = -Math.PI / 2;
  finishStrip.rotation.z = -Math.atan2(startS.tangent.x, startS.tangent.z);
  finishStrip.position.copy(startS.point).add(new THREE.Vector3(0, 0.04, 0));
  finishStrip.receiveShadow = true;
  group.add(finishStrip);

  const gantryGroup = new THREE.Group();
  gantryGroup.position.copy(startS.point);
  gantryGroup.rotation.y = Math.atan2(startS.tangent.x, startS.tangent.z);
  const gPillarGeo = new THREE.CylinderGeometry(0.42, 0.52, 8.2, 10);
  const gPillarMat = new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.7, roughness: 0.3 });
  const gpL = new THREE.Mesh(gPillarGeo, gPillarMat);
  gpL.position.set(-halfW - 0.6, 4.1, 0);
  gpL.castShadow = true;
  const gpR = gpL.clone();
  gpR.position.x = halfW + 0.6;
  const gBanner = new THREE.Mesh(
    new THREE.BoxGeometry(def.trackWidth + 2.2, 1.8, 0.7),
    new THREE.MeshStandardMaterial({
      map: createCheckeredTexture(maxAnisotropy),
      roughness: 0.35,
    })
  );
  gBanner.position.set(0, 7.6, 0);
  const gAccent = new THREE.Mesh(
    new THREE.BoxGeometry(def.trackWidth + 2.4, 0.35, 0.85),
    new THREE.MeshStandardMaterial({
      color: def.accentColor,
      emissive: def.accentColor,
      emissiveIntensity: 0.8,
    })
  );
  gAccent.position.set(0, 8.65, 0);
  gantryGroup.add(gpL, gpR, gBanner, gAccent);
  group.add(gantryGroup);

  // 3. Textured Terrain + Distant Horizon Mountain Range
  const terrainMat = new THREE.MeshStandardMaterial({
    map: createTerrainTexture(def.groundColor, def.theme, maxAnisotropy),
    roughness: def.theme === 'ocean' || def.theme === 'tropical' ? 0.18 : 0.92,
    metalness: def.theme === 'ocean' || def.theme === 'tropical' ? 0.45 : 0.04,
  });
  const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), terrainMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = -0.35;
  groundPlane.receiveShadow = true;
  group.add(groundPlane);

  populateMountainHorizon(group, def.theme);

  // 4. Interactive Features (Ramps, Boost Pads, Obstacles, Crates, Coins)
  const ramps: RampTrigger[] = [];
  const boostPads: BoostPadTrigger[] = [];
  const obstacles: ObstacleEntity[] = [];
  const crates: CrateEntity[] = [];
  const coins: CoinEntity[] = [];

  const boostTex = createBoostPadTexture(maxAnisotropy);
  const boostMat = new THREE.MeshStandardMaterial({
    map: boostTex,
    emissive: '#06B6D4',
    emissiveMap: boostTex,
    emissiveIntensity: 0.9,
    roughness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const crateGeo = new THREE.BoxGeometry(1.45, 1.45, 1.45);
  const crateMat = new THREE.MeshPhysicalMaterial({
    color: '#F59E0B',
    emissive: '#D97706',
    emissiveIntensity: 0.7,
    roughness: 0.15,
    metalness: 0.4,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.9,
  });
  const crateInnerGeo = new THREE.OctahedronGeometry(0.5, 0);
  const crateInnerMat = new THREE.MeshBasicMaterial({ color: '#FEF08A', wireframe: true });

  const coinGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.16, 14);
  coinGeo.rotateZ(Math.PI / 2);
  const coinMat = new THREE.MeshStandardMaterial({
    color: '#FACC15',
    emissive: '#CA8A04',
    emissiveIntensity: 0.45,
    metalness: 0.88,
    roughness: 0.18,
  });

  let crateId = 0;
  let coinId = 0;

  def.features.forEach((feat, fIdx) => {
    const sIdx = Math.floor(feat.t * SAMPLE_COUNT) % SAMPLE_COUNT;
    const s = samples[sIdx];
    const latPos = s.point.clone().addScaledVector(s.right, feat.offset * halfW);
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);

    if (feat.type === 'boost') {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 6.2), boostMat);
      pad.rotation.x = -Math.PI / 2;
      pad.rotation.z = -yaw;
      pad.position.copy(latPos).add(new THREE.Vector3(0, 0.06, 0));
      group.add(pad);
      boostPads.push({ pos: latPos.clone(), radius: 3.1 });
    } else if (feat.type === 'ramp' || feat.type === 'shortcut') {
      const rampGroup = new THREE.Group();
      rampGroup.position.copy(latPos);
      rampGroup.rotation.y = yaw;
      const rampMesh = new THREE.Mesh(
        new THREE.BoxGeometry(5.0, 0.5, 6.8),
        new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.5 })
      );
      rampMesh.rotation.x = -0.22;
      rampMesh.position.y = 0.65;
      rampMesh.castShadow = true;
      const rampTop = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.8), boostMat);
      rampTop.rotation.x = -Math.PI / 2 - 0.22;
      rampTop.position.set(0, 0.94, 0);
      rampGroup.add(rampMesh, rampTop);
      group.add(rampGroup);
      ramps.push({ pos: latPos.clone(), radius: 3.4, forward: s.tangent.clone() });
      if (feat.type === 'shortcut') {
        boostPads.push({ pos: latPos.clone(), radius: 3.2 });
      }
    } else if (feat.type === 'crate_row') {
      [-0.45, 0, 0.45].forEach((o) => {
        const cPos = s.point.clone().addScaledVector(s.right, o * halfW).add(new THREE.Vector3(0, 1.15, 0));
        const cg = new THREE.Group();
        cg.position.copy(cPos);
        const outer = new THREE.Mesh(crateGeo, crateMat);
        const inner = new THREE.Mesh(crateInnerGeo, crateInnerMat);
        cg.add(outer, inner);
        group.add(cg);
        crates.push({ id: crateId++, mesh: cg, pos: cPos, active: true, respawnTimer: 0 });
      });
    } else if (feat.type === 'coin_arc') {
      for (let k = -2; k <= 2; k++) {
        const cS = samples[(sIdx + k * 2 + SAMPLE_COUNT) % SAMPLE_COUNT];
        const cPos = cS.point.clone().addScaledVector(cS.right, feat.offset * halfW).add(new THREE.Vector3(0, 0.9, 0));
        const cm = new THREE.Mesh(coinGeo, coinMat);
        cm.position.copy(cPos);
        group.add(cm);
        coins.push({ id: coinId++, mesh: cm, pos: cPos, active: true, respawnTimer: 0 });
      }
    } else if (feat.type === 'obstacle') {
      const kind = feat.obstacleKind || 'boulder';
      const obsMesh = buildObstacleMesh(kind, def.accentColor);
      obsMesh.position.copy(s.point);
      group.add(obsMesh);
      obstacles.push({
        mesh: obsMesh,
        t: feat.t,
        basePoint: s.point.clone(),
        right: s.right.clone(),
        halfWidth: halfW * 0.72,
        kind,
        phaseOffset: fIdx * 1.7,
        worldPos: s.point.clone(),
        radius: 1.55,
      });
    }
  });

  // 5. Realistic Trees, Buildings & Highway Streetlights
  populateRealisticScenery(group, def.theme, def.accentColor, samples, halfW, timeOfDay === 'night', maxAnisotropy);

  const sampleAtT = (
    t: number,
    outPos: THREE.Vector3,
    outTan: THREE.Vector3,
    outRight: THREE.Vector3
  ) => {
    const wrapped = ((t % 1) + 1) % 1;
    const fIdx = wrapped * SAMPLE_COUNT;
    const i0 = Math.floor(fIdx) % SAMPLE_COUNT;
    const i1 = (i0 + 1) % SAMPLE_COUNT;
    const alpha = fIdx - Math.floor(fIdx);

    outPos.lerpVectors(samples[i0].point, samples[i1].point, alpha);
    outTan.lerpVectors(samples[i0].tangent, samples[i1].tangent, alpha).normalize();
    outRight.lerpVectors(samples[i0].right, samples[i1].right, alpha).normalize();
  };

  const findClosestT = (pos: THREE.Vector3, hintT?: number) => {
    let bestIdx = 0;
    let bestDistSq = Infinity;

    if (hintT !== undefined) {
      const center = Math.floor((((hintT % 1) + 1) % 1) * SAMPLE_COUNT);
      for (let d = -22; d <= 22; d++) {
        const idx = (center + d + SAMPLE_COUNT) % SAMPLE_COUNT;
        const p = samples[idx].point;
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
      if (bestDistSq > 1600) {
        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const p = samples[i].point;
          const dx = pos.x - p.x;
          const dz = pos.z - p.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestIdx = i;
          }
        }
      }
    } else {
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const p = samples[i].point;
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
    }

    const s = samples[bestIdx];
    _tmpVec.subVectors(pos, s.point);
    const along = _tmpVec.dot(s.tangent);
    const tOffset = along / totalLength;
    const refinedT = (((bestIdx / SAMPLE_COUNT) + tOffset) % 1 + 1) % 1;
    const lateral = _tmpVec.dot(s.right);
    return {
      t: refinedT,
      distSq: bestDistSq,
      lateral,
      roadY: s.point.y,
    };
  };

  const updateDynamicElements = (elapsed: number, dt: number) => {
    for (const c of crates) {
      if (c.active) {
        c.mesh.rotation.y += dt * 1.8;
        c.mesh.rotation.x += dt * 0.9;
        c.mesh.position.y = c.pos.y + Math.sin(elapsed * 3.2 + c.id) * 0.22;
      } else {
        c.respawnTimer -= dt;
        if (c.respawnTimer <= 0) {
          c.active = true;
          c.mesh.visible = true;
        }
      }
    }

    for (const coin of coins) {
      if (coin.active) {
        coin.mesh.rotation.y += dt * 3.2;
        coin.mesh.position.y = coin.pos.y + Math.sin(elapsed * 4 + coin.id) * 0.14;
      } else {
        coin.respawnTimer -= dt;
        if (coin.respawnTimer <= 0) {
          coin.active = true;
          coin.mesh.visible = true;
        }
      }
    }

    for (const obs of obstacles) {
      const sway = Math.sin(elapsed * 1.9 + obs.phaseOffset) * obs.halfWidth;
      obs.worldPos.copy(obs.basePoint).addScaledVector(obs.right, sway);
      if (obs.kind === 'pendulum') {
        obs.mesh.position.copy(obs.basePoint);
        obs.mesh.rotation.z = Math.sin(elapsed * 1.9 + obs.phaseOffset) * 0.75;
        obs.worldPos.y = obs.basePoint.y + 1.2;
      } else {
        obs.mesh.position.copy(obs.worldPos);
        if (obs.kind === 'boulder') {
          obs.mesh.rotation.z -= dt * 3.5 * Math.cos(elapsed * 1.9 + obs.phaseOffset);
        } else {
          obs.mesh.rotation.y += dt * 2.5;
        }
      }
    }
  };

  return {
    def,
    group,
    curve,
    samples,
    totalLength,
    ramps,
    boostPads,
    obstacles,
    crates,
    coins,
    sampleAtT,
    findClosestT,
    updateDynamicElements,
  };
}

function buildObstacleMesh(kind: NonNullable<TrackFeaturePoint['obstacleKind']>, accent: string): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'pendulum') {
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 7.5, 8),
      new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.7, roughness: 0.3 })
    );
    rod.position.y = 4.2;
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 0.65, 12),
      new THREE.MeshStandardMaterial({ color: accent, metalness: 0.6, roughness: 0.25 })
    );
    head.rotation.x = Math.PI / 2;
    head.position.y = 1.1;
    head.castShadow = true;
    g.add(rod, head);
  } else if (kind === 'boulder') {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.35, 1),
      new THREE.MeshStandardMaterial({ color: '#57534E', roughness: 0.92 })
    );
    rock.position.y = 1.35;
    rock.castShadow = true;
    g.add(rock);
  } else if (kind === 'laser') {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.95, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.8, roughness: 0.2 })
    );
    base.position.y = 0.25;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 3.5, 12),
      new THREE.MeshStandardMaterial({
        color: '#EF4444',
        emissive: '#EF4444',
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.85,
      })
    );
    beam.position.y = 2.0;
    g.add(base, beam);
  } else {
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 1.1, 0.9),
      new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.35, metalness: 0.5 })
    );
    barrier.position.y = 0.65;
    barrier.castShadow = true;
    g.add(barrier);
  }
  return g;
}

function populateMountainHorizon(group: THREE.Group, theme: TrackTheme) {
  const mCount = 28;
  const mGeo = new THREE.ConeGeometry(42, 65, 7);
  mGeo.translate(0, 32, 0);
  const mMat = new THREE.MeshStandardMaterial({
    color: theme === 'snow' ? '#CBD5E1' : theme === 'volcano' ? '#27272A' : theme === 'space' ? '#1E1B4B' : '#475569',
    roughness: 0.92,
  });
  const inst = new THREE.InstancedMesh(mGeo, mMat, mCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < mCount; i++) {
    const angle = (i / mCount) * Math.PI * 2;
    const dist = 340 + (i % 3) * 45;
    dummy.position.set(Math.cos(angle) * dist, -2, -100 + Math.sin(angle) * dist);
    dummy.rotation.y = i * 0.7;
    const s = 0.8 + (i % 4) * 0.32;
    dummy.scale.set(s, s * (0.8 + (i % 3) * 0.25), s);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.computeBoundingSphere();
  group.add(inst);
}

function populateRealisticScenery(
  group: THREE.Group,
  theme: TrackTheme,
  accentColor: string,
  samples: TrackSample[],
  halfW: number,
  isNight: boolean,
  maxAnisotropy: number
) {
  const dummy = new THREE.Object3D();

  // 1. Realistic Trees / Buildings along perimeter
  const propCount = 76;
  const isUrban = theme === 'cyber' || theme === 'space';

  const trunkGeo = isUrban
    ? new THREE.BoxGeometry(8, 32, 8)
    : new THREE.CylinderGeometry(0.32, 0.55, 6.5, 8);
  trunkGeo.translate(0, isUrban ? 16 : 3.25, 0);
  const trunkMat = isUrban
    ? new THREE.MeshStandardMaterial({
        map: createBuildingFacadeTexture(isNight, maxAnisotropy),
        roughness: 0.35,
        metalness: 0.65,
      })
    : new THREE.MeshStandardMaterial({ color: '#5C3A21', roughness: 0.9 });

  const crownGeo = isUrban
    ? new THREE.BoxGeometry(8.2, 1.0, 8.2)
    : new THREE.DodecahedronGeometry(3.1, 1);
  crownGeo.translate(0, isUrban ? 32.5 : 8.2, 0);
  const crownMat = isUrban
    ? new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: isNight ? 1.4 : 0.4,
      })
    : new THREE.MeshStandardMaterial({
        color: theme === 'snow' ? '#1E4D45' : theme === 'desert' ? '#92400E' : '#166534',
        roughness: 0.82,
      });

  const instTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, propCount);
  const instCrowns = new THREE.InstancedMesh(crownGeo, crownMat, propCount);
  instTrunks.castShadow = true;
  instTrunks.receiveShadow = true;
  instCrowns.castShadow = true;

  for (let i = 0; i < propCount; i++) {
    const s = samples[Math.floor((i / propCount) * SAMPLE_COUNT) % SAMPLE_COUNT];
    const side = i % 2 === 0 ? 1 : -1;
    const dist = halfW + 10 + ((i * 17) % 32);
    const pos = s.point.clone().addScaledVector(s.right, side * dist);

    let safe = true;
    for (let j = 0; j < SAMPLE_COUNT; j += 6) {
      const sp = samples[j].point;
      const dx = pos.x - sp.x;
      const dz = pos.z - sp.z;
      if (dx * dx + dz * dz < (halfW + 6) * (halfW + 6)) {
        safe = false;
        break;
      }
    }
    pos.y = safe ? -0.35 : -200;

    const scale = 0.85 + ((i * 7) % 35) / 100;
    dummy.position.copy(pos);
    dummy.rotation.set(0, (i * 1.1) % (Math.PI * 2), 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    instTrunks.setMatrixAt(i, dummy.matrix);
    instCrowns.setMatrixAt(i, dummy.matrix);
  }
  instTrunks.instanceMatrix.needsUpdate = true;
  instTrunks.computeBoundingSphere();
  instCrowns.instanceMatrix.needsUpdate = true;
  instCrowns.computeBoundingSphere();
  group.add(instTrunks, instCrowns);

  // 2. Highway Streetlamps along road edges (glowing at night/rain!)
  const lampCount = 30;
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.2, 6);
  poleGeo.translate(0, 3.1, 0);
  const poleMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.3 });
  const bulbGeo = new THREE.BoxGeometry(0.65, 0.2, 0.35);
  bulbGeo.translate(0, 6.2, 0);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: '#FEF3C7',
    emissive: '#FDE68A',
    emissiveIntensity: isNight ? 1.8 : 0.25,
  });

  const instPoles = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);
  const instBulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampCount);
  for (let i = 0; i < lampCount; i++) {
    const s = samples[Math.floor((i / lampCount) * SAMPLE_COUNT) % SAMPLE_COUNT];
    const side = i % 2 === 0 ? 1 : -1;
    const pos = s.point.clone().addScaledVector(s.right, side * (halfW + 1.4));
    dummy.position.copy(pos);
    dummy.rotation.set(0, Math.atan2(s.tangent.x, s.tangent.z), 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instPoles.setMatrixAt(i, dummy.matrix);
    instBulbs.setMatrixAt(i, dummy.matrix);
  }
  instPoles.instanceMatrix.needsUpdate = true;
  instPoles.computeBoundingSphere();
  instBulbs.instanceMatrix.needsUpdate = true;
  instBulbs.computeBoundingSphere();
  group.add(instPoles, instBulbs);
}
