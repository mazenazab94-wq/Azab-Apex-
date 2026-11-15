import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/SoundEngine';
import { CHARACTERS } from '../data/characters';
import { KARTS } from '../data/karts';
import { computeCombinedStats, POWER_UP_LIST } from '../data/progression';
import { getTrackById } from '../data/tracks';
import { getCharacterLocalized } from '../i18n/catalogAr';
import { TRANSLATIONS } from '../i18n/translations';
import {
  CharacterStats,
  DrivingDifficulty,
  GameMode,
  GameSettings,
  KartLoadout,
  PowerUpType,
  RaceTelemetryFrame,
  RacerHudState,
  RemoteKartNetState,
  RoomPlayer,
  TargetLockInfo,
  TimeOfDay,
  WeatherCondition,
} from '../types/game';
import {
  animateCharacterRig,
  applyDamageVisuals,
  buildKartMesh,
  buildPowerUpProjectileMesh,
  KartRig,
} from './models';
import { buildTrack, BuiltTrack } from './trackBuilder';

export interface InputState {
  throttle: number;
  brake: number;
  steer: number;
  drift: boolean;
  jumpPressed: boolean;
  useItemPressed: boolean;
}

interface RacerEntity {
  id: string;
  name: string;
  isHuman: boolean;
  isLocalP2: boolean;
  isRemote: boolean;
  loadout: KartLoadout;
  stats: CharacterStats;
  rig: KartRig;

  pos: THREE.Vector3;
  vel: THREE.Vector3;
  vy: number;
  heading: number;
  speed: number;
  steerAngle: number;
  grounded: boolean;
  airTime: number;
  braking: boolean;

  drifting: boolean;
  driftDir: number;
  driftCharge: number;
  driftLevel: 0 | 1 | 2 | 3;

  boostTimer: number;
  boostPower: number;
  nitroCharge: number; // 0..100
  condition: number;   // 0..100
  spinTimer: number;
  slowTimer: number;
  empTimer: number;
  shieldTimer: number;
  cloakTimer: number;
  overdriveTimer: number;
  crashTimer: number;
  recoveryTimer: number;
  stuckBoundaryTimer: number;

  powerUp: PowerUpType | null;
  coinsCollected: number;
  driftsCompleted: number;
  powerUpsUsed: number;

  trackT: number;
  lap: number;
  totalLaps: number;
  maxCheckpointT: number;
  progress: number;
  finished: boolean;
  finishTimeMs: number;
  lapStartMs: number;
  bestLapMs: number;
  wrongWay: boolean;

  aiTargetOffset: number;
  aiItemTimer: number;
  remoteTargetPos: THREE.Vector3;
  remoteTargetHeading: number;
}

interface ActiveProjectile {
  id: string;
  ownerId: string;
  type: PowerUpType;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  trackT: number;
  life: number;
  targetId?: string;
}

interface Particle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export interface RaceLaunchConfig {
  mode: GameMode;
  trackId: string;
  playerId: string;
  playerName: string;
  loadout: KartLoadout;
  p2Loadout?: KartLoadout;
  roomPlayers?: RoomPlayer[];
  fillWithAi?: boolean;
  laps?: number;
  racerCount?: number;
  difficulty?: DrivingDifficulty;
  timeOfDay?: TimeOfDay;
  weather?: WeatherCondition;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

const SKID_MAX = 240;
const RAIN_COUNT = 320;

export class RaceEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera1: THREE.PerspectiveCamera;
  private camera2: THREE.PerspectiveCamera;
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private orbitControls: OrbitControls | null = null;

  private isSoftwareGl: boolean;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private elapsed = 0;

  private mode: 'menu' | 'garage' | 'race' = 'menu';
  private raceMode: GameMode = 'single';
  private activeDifficulty: DrivingDifficulty = 'medium';
  private activeTimeOfDay: TimeOfDay = 'day';
  private activeWeather: WeatherCondition = 'clear';
  private builtTrack: BuiltTrack | null = null;
  private garageGroup: THREE.Group | null = null;
  private garageKartRig: KartRig | null = null;

  private racers: RacerEntity[] = [];
  private projectiles: ActiveProjectile[] = [];
  private particles: Particle[] = [];
  private particleInstanced: THREE.InstancedMesh;

  // Pooled tire skid marks
  private skidInstanced: THREE.InstancedMesh;
  private skidWriteIdx = 0;
  private skidAccum = 0;

  // 3D Rain streaks
  private rainLines: THREE.LineSegments;
  private rainPositions: Float32Array;
  private rainActive = false;

  private racePhase: 'countdown' | 'racing' | 'paused' | 'finished' = 'countdown';
  private countdownTimer = 3.5;
  private lastCountdownBeep = 4;
  private raceElapsedMs = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private hitstopTimer = 0;
  private crashSlowMoTimer = 0;
  private screenFx: 'none' | 'boost' | 'hit' | 'emp' | 'repair' | 'shield' = 'none';
  private screenFxTimer = 0;
  private eventBanner: { text: string; color: string; id: number; timer: number } | null = null;
  private bannerSeq = 1;

  private p1Input: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    drift: false,
    jumpPressed: false,
    useItemPressed: false,
  };
  private p2Input: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    drift: false,
    jumpPressed: false,
    useItemPressed: false,
  };
  private keysHeld = new Set<string>();
  private touchInput: Partial<InputState> = {};
  private gamepadPrevJump = false;
  private gamepadPrevItem = false;

  private settings: GameSettings;
  private onTelemetry?: (frame: RaceTelemetryFrame) => void;
  private onRaceComplete?: (frame: RaceTelemetryFrame) => void;
  private onPowerUpNetworkEmit?: (type: PowerUpType, x: number, y: number, z: number, heading: number, trackT: number) => void;
  private onCrashNetworkEmit?: () => void;
  private telemetryAccum = 0;
  private raceCompleteFired = false;

  private camPos1 = new THREE.Vector3(0, 6, 12);
  private camLook1 = new THREE.Vector3();
  private camPos2 = new THREE.Vector3(0, 6, 12);
  private camLook2 = new THREE.Vector3();

  constructor(container: HTMLElement, settings: GameSettings) {
    this.container = container;
    this.settings = settings;
    this.activeDifficulty = settings.difficulty || 'medium';
    this.activeTimeOfDay = settings.timeOfDay || 'day';
    this.activeWeather = settings.weather || 'clear';

    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    });

    this.scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera1 = new THREE.PerspectiveCamera(settings.cameraFov, aspect, 0.3, 950);
    this.camera2 = new THREE.PerspectiveCamera(settings.cameraFov, aspect, 0.3, 950);

    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x334155, 0.78);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfffbeb, 1.6);
    this.keyLight.position.set(45, 75, 35);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 5;
    this.keyLight.shadow.camera.far = 220;
    const d = 52;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    // Pooled particles (220 spheres)
    const pCount = 220;
    const pGeo = new THREE.SphereGeometry(0.32, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleInstanced = new THREE.InstancedMesh(pGeo, pMat, pCount);
    this.particleInstanced.frustumCulled = false;
    this.particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < pCount; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.4,
        size: 1,
        color: new THREE.Color('#F59E0B'),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleInstanced.setMatrixAt(i, _mat4);
      this.particleInstanced.setColorAt(i, this.particles[i].color);
    }
    this.scene.add(this.particleInstanced);

    // Pooled Tire Skid Marks (240 flat dark rubber streaks)
    const skidGeo = new THREE.PlaneGeometry(0.36, 1.15);
    skidGeo.rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: '#09090B',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.skidInstanced = new THREE.InstancedMesh(skidGeo, skidMat, SKID_MAX);
    this.skidInstanced.frustumCulled = false;
    _mat4.makeScale(0, 0, 0);
    for (let i = 0; i < SKID_MAX; i++) {
      this.skidInstanced.setMatrixAt(i, _mat4);
    }
    this.scene.add(this.skidInstanced);

    // 3D Rain Streaks (LineSegments around camera)
    this.rainPositions = new Float32Array(RAIN_COUNT * 6);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: '#BAE6FD',
      transparent: true,
      opacity: 0.55,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.initRainDrops();
    this.scene.add(this.rainLines);

    this.bindInputEvents();
    window.addEventListener('resize', this.handleResize);

    this.enterMenuShowcase();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera1);
    }

    this.tick();
  }

  private initRainDrops() {
    for (let i = 0; i < RAIN_COUNT; i++) {
      const rx = (Math.random() - 0.5) * 46;
      const ry = Math.random() * 24;
      const rz = (Math.random() - 0.5) * 46;
      const idx = i * 6;
      this.rainPositions[idx] = rx;
      this.rainPositions[idx + 1] = ry;
      this.rainPositions[idx + 2] = rz;
      this.rainPositions[idx + 3] = rx - 0.14;
      this.rainPositions[idx + 4] = ry - 1.35;
      this.rainPositions[idx + 5] = rz - 0.14;
    }
  }

  public setCallbacks(opts: {
    onTelemetry?: (frame: RaceTelemetryFrame) => void;
    onRaceComplete?: (frame: RaceTelemetryFrame) => void;
    onPowerUpNetworkEmit?: (type: PowerUpType, x: number, y: number, z: number, heading: number, trackT: number) => void;
    onCrashNetworkEmit?: () => void;
  }) {
    this.onTelemetry = opts.onTelemetry;
    this.onRaceComplete = opts.onRaceComplete;
    this.onPowerUpNetworkEmit = opts.onPowerUpNetworkEmit;
    this.onCrashNetworkEmit = opts.onCrashNetworkEmit;
  }

  public updateSettings(next: GameSettings) {
    this.settings = next;
    this.activeDifficulty = next.difficulty || 'medium';
    this.camera1.fov = next.cameraFov;
    this.camera1.updateProjectionMatrix();
    this.camera2.fov = next.cameraFov;
    this.camera2.updateProjectionMatrix();
  }

  public setTouchInput(partial: Partial<InputState>) {
    if (partial.jumpPressed) this.p1Input.jumpPressed = true;
    if (partial.useItemPressed) this.p1Input.useItemPressed = true;
    this.touchInput = { ...this.touchInput, ...partial };
  }

  public triggerLocalUseItem() {
    if (this.mode !== 'race' || this.racePhase !== 'racing') return;
    this.p1Input.useItemPressed = true;
  }

  public triggerLocalRecover() {
    if (this.mode !== 'race' || this.racePhase !== 'racing') return;
    const p1 = this.racers.find((r) => r.isHuman && !r.isLocalP2);
    if (p1 && !p1.finished) {
      this.respawnAtTrackSpline(p1, p1.trackT);
      p1.speed = 22;
      p1.recoveryTimer = 1.6;
    }
  }

  public setPaused(paused: boolean) {
    if (this.mode !== 'race') return;
    if (paused && this.racePhase === 'racing') {
      this.racePhase = 'paused';
      soundEngine.updateEngine(0, false, false, 0);
    } else if (!paused && this.racePhase === 'paused') {
      this.racePhase = 'racing';
    }
  }

  private clearActiveSceneContent() {
    this.orbitControls?.dispose();
    this.orbitControls = null;
    this.renderer.setScissorTest(false);

    if (this.builtTrack) {
      this.scene.remove(this.builtTrack.group);
      this.builtTrack = null;
    }
    if (this.garageGroup) {
      this.scene.remove(this.garageGroup);
      this.garageGroup = null;
      this.garageKartRig = null;
    }
    for (const r of this.racers) {
      this.scene.remove(r.rig.root);
    }
    this.racers = [];
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
    }
    this.projectiles = [];
    for (const pt of this.particles) pt.active = false;

    // Clear skid marks
    _mat4.makeScale(0, 0, 0);
    for (let i = 0; i < SKID_MAX; i++) {
      this.skidInstanced.setMatrixAt(i, _mat4);
    }
    this.skidInstanced.instanceMatrix.needsUpdate = true;
    this.skidWriteIdx = 0;
  }

  public enterMenuShowcase(loadout?: KartLoadout) {
    this.clearActiveSceneContent();
    this.mode = 'menu';
    this.activeTimeOfDay = this.settings.timeOfDay || 'day';
    this.activeWeather = this.settings.weather || 'clear';
    soundEngine.stopEngineLoop();

    const trackDef = getTrackById('coco_bay');
    this.applyAtmosphere(
      trackDef.skyColor,
      trackDef.fogColor,
      trackDef.fogDensity,
      trackDef.sunColor,
      this.activeTimeOfDay,
      this.activeWeather
    );
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.builtTrack = buildTrack(trackDef, maxAniso, this.activeTimeOfDay, this.activeWeather);
    this.scene.add(this.builtTrack.group);

    const showcaseIds = ['blaze_vex', 'drift_yuki', 'volt_dash', 'titan_kong', 'pip_sprout'];
    showcaseIds.forEach((cid, idx) => {
      const ch = CHARACTERS.find((c) => c.id === cid) || CHARACTERS[0];
      const l: KartLoadout =
        idx === 0 && loadout
          ? loadout
          : {
              characterId: cid,
              skinId: 'classic',
              kartId: KARTS[(idx * 5) % KARTS.length].id,
              wheelId: 'spoke',
              tireId: idx % 2 === 0 ? 'slick' : 'neon',
              spoilerId: idx % 2 === 0 ? 'gt' : 'cyber',
              paintColor: KARTS[(idx * 5) % KARTS.length].defaultColor,
              decalId: 'stripes',
              engineId: 'super_v6',
              exhaustId: idx === 0 ? 'blue_nitro' : 'standard',
            };
      const entity = this.createRacerEntity(
        `showcase_${idx}`,
        getCharacterLocalized(ch, this.settings.language).name,
        false,
        false,
        false,
        l,
        idx * 0.045,
        ((idx % 3) - 1) * 2.5,
        3,
        false
      );
      this.racers.push(entity);
      this.scene.add(entity.rig.root);
    });
  }

  public enterGarage(loadout: KartLoadout) {
    this.clearActiveSceneContent();
    this.mode = 'garage';
    this.rainActive = false;
    this.rainLines.visible = false;
    soundEngine.stopEngineLoop();

    this.scene.background = new THREE.Color('#0B1120');
    this.scene.fog = new THREE.FogExp2('#0B1120', 0.018);
    this.keyLight.color.set('#FFFBEB');
    this.keyLight.intensity = 1.65;
    this.keyLight.position.set(16, 26, 18);
    this.keyLight.target.position.set(0, 0.5, 0);
    this.hemiLight.color.set('#93C5FD');
    this.hemiLight.intensity = 0.85;

    const gGroup = new THREE.Group();
    this.garageGroup = gGroup;
    this.scene.add(gGroup);

    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 4.2, 0.35, 36),
      new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.78, roughness: 0.22 })
    );
    podium.position.y = -0.18;
    podium.receiveShadow = true;
    const rimRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.85, 0.055, 8, 48),
      new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        emissive: '#F59E0B',
        emissiveIntensity: 0.9,
      })
    );
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0.01;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.42, metalness: 0.42 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.35;
    floor.receiveShadow = true;

    gGroup.add(podium, rimRing, floor);
    this.updateGarageLoadout(loadout);

    this.camera1.position.set(4.1, 2.3, 4.6);
    this.camera1.lookAt(0, 0.75, 0);

    this.orbitControls = new OrbitControls(this.camera1, this.renderer.domElement);
    this.orbitControls.enableDamping = !this.isSoftwareGl;
    this.orbitControls.dampingFactor = 0.07;
    this.orbitControls.target.set(0, 0.7, 0);
    this.orbitControls.minDistance = 3.0;
    this.orbitControls.maxDistance = 8.8;
    this.orbitControls.maxPolarAngle = Math.PI * 0.48;
  }

  public updateGarageLoadout(loadout: KartLoadout) {
    if (this.mode !== 'garage' || !this.garageGroup) return;
    if (this.garageKartRig) {
      this.garageGroup.remove(this.garageKartRig.root);
    }
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.garageKartRig = buildKartMesh(loadout, maxAniso, false);
    this.garageKartRig.flameMeshes.forEach((f) => {
      f.visible = true;
      f.scale.setScalar(0.55);
    });
    this.garageGroup.add(this.garageKartRig.root);
  }

  public startRace(config: RaceLaunchConfig) {
    this.clearActiveSceneContent();
    this.mode = 'race';
    this.raceMode = config.mode;
    this.activeDifficulty = config.difficulty || this.settings.difficulty || 'medium';
    this.activeTimeOfDay = config.timeOfDay || this.settings.timeOfDay || 'day';
    this.activeWeather = config.weather || this.settings.weather || 'clear';

    this.racePhase = config.mode === 'practice' ? 'racing' : 'countdown';
    this.countdownTimer = 3.2;
    this.lastCountdownBeep = 4;
    this.raceElapsedMs = 0;
    this.raceCompleteFired = false;
    this.crashSlowMoTimer = 0;
    this.screenFx = 'none';
    this.screenFxTimer = 0;
    this.eventBanner = null;

    const trackDef = getTrackById(config.trackId);
    this.applyAtmosphere(
      trackDef.skyColor,
      trackDef.fogColor,
      trackDef.fogDensity,
      trackDef.sunColor,
      this.activeTimeOfDay,
      this.activeWeather
    );

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.builtTrack = buildTrack(trackDef, maxAniso, this.activeTimeOfDay, this.activeWeather);
    this.scene.add(this.builtTrack.group);

    const totalLaps =
      config.laps ??
      (config.mode === 'time_trial' ? 3 : config.mode === 'practice' ? 99 : trackDef.laps);

    const slots: {
      id: string;
      name: string;
      isHuman: boolean;
      isLocalP2: boolean;
      isRemote: boolean;
      loadout: KartLoadout;
    }[] = [];

    const requestedCount = Math.max(1, Math.min(8, Math.floor(config.racerCount ?? 8)));

    if (config.roomPlayers && config.roomPlayers.length > 0) {
      for (const rp of config.roomPlayers) {
        const isMe = rp.playerId === config.playerId;
        slots.push({
          id: rp.playerId,
          name: rp.name,
          isHuman: isMe,
          isLocalP2: false,
          isRemote: !isMe,
          loadout: isMe ? config.loadout : rp.loadout,
        });
      }
      if (config.fillWithAi) {
        let aiIdx = 0;
        while (slots.length < requestedCount) {
          const ch = CHARACTERS[(aiIdx * 3 + 2) % CHARACTERS.length];
          const kt = KARTS[(aiIdx * 4 + 1) % KARTS.length];
          slots.push({
            id: `ai_${aiIdx}`,
            name: getCharacterLocalized(ch, this.settings.language).name,
            isHuman: false,
            isLocalP2: false,
            isRemote: false,
            loadout: {
              characterId: ch.id,
              skinId: 'classic',
              kartId: kt.id,
              wheelId: 'alloy',
              tireId: 'slick',
              spoilerId: 'gt',
              paintColor: kt.defaultColor,
              decalId: 'stripes',
              engineId: 'dual_chrome',
              exhaustId: 'standard',
            },
          });
          aiIdx++;
        }
      }
    } else {
      slots.push({
        id: config.playerId,
        name: config.playerName || (this.settings.language === 'ar' ? 'اللاعب 1' : 'Player 1'),
        isHuman: true,
        isLocalP2: false,
        isRemote: false,
        loadout: config.loadout,
      });

      if (config.mode === 'local_split' && config.p2Loadout) {
        slots.push({
          id: 'local_p2',
          name: this.settings.language === 'ar' ? 'اللاعب 2' : 'Player 2',
          isHuman: true,
          isLocalP2: true,
          isRemote: false,
          loadout: config.p2Loadout,
        });
      }

      if (config.mode !== 'time_trial') {
        const aiTargetTotal = config.mode === 'practice' ? (config.racerCount ?? 1) : requestedCount;
        const usedChars = new Set([config.loadout.characterId, config.p2Loadout?.characterId]);
        const candidates = CHARACTERS.filter((c) => !usedChars.has(c.id));
        let aiCount = 0;
        while (slots.length < aiTargetTotal && aiCount < candidates.length) {
          const ch = candidates[aiCount];
          const kt = KARTS[(aiCount * 3 + 2) % KARTS.length];
          slots.push({
            id: `ai_${aiCount}`,
            name: getCharacterLocalized(ch, this.settings.language).name,
            isHuman: false,
            isLocalP2: false,
            isRemote: false,
            loadout: {
              characterId: ch.id,
              skinId: 'classic',
              kartId: kt.id,
              wheelId: aiCount % 2 === 0 ? 'spoke' : 'alloy',
              tireId: aiCount % 3 === 0 ? 'neon' : 'slick',
              spoilerId: aiCount % 2 === 0 ? 'gt' : 'twin',
              paintColor: kt.defaultColor,
              decalId: aiCount % 2 === 0 ? 'stripes' : 'lightning',
              engineId: 'dual_chrome',
              exhaustId: aiCount % 2 === 0 ? 'blue_nitro' : 'standard',
            },
          });
          aiCount++;
        }
      }
    }

    const enableHeadlight = this.activeTimeOfDay === 'night' || this.activeWeather === 'rain';
    slots.forEach((s, idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2 === 0 ? -1 : 1;
      const startT = ((1 - 0.015 - row * 0.014) % 1 + 1) % 1;
      const lat = col * 2.8;
      const entity = this.createRacerEntity(
        s.id,
        s.name,
        s.isHuman,
        s.isLocalP2,
        s.isRemote,
        s.loadout,
        startT,
        lat,
        totalLaps,
        s.isHuman && !s.isLocalP2 && enableHeadlight
      );
      entity.lap = 1;
      entity.maxCheckpointT = 0;
      entity.progress = 1 - (row * 0.014 + 0.015);
      this.racers.push(entity);
      this.scene.add(entity.rig.root);
    });

    const p1 = this.racers.find((r) => r.isHuman && !r.isLocalP2) || this.racers[0];
    this.snapCameraToRacer(p1, this.camera1, this.camPos1, this.camLook1);
    const p2 = this.racers.find((r) => r.isLocalP2);
    if (p2) {
      this.snapCameraToRacer(p2, this.camera2, this.camPos2, this.camLook2);
    }

    soundEngine.startEngineLoop();
    soundEngine.setMusicMode('race');
    this.emitTelemetryNow();
  }

  private createRacerEntity(
    id: string,
    name: string,
    isHuman: boolean,
    isLocalP2: boolean,
    isRemote: boolean,
    loadout: KartLoadout,
    startT: number,
    lateral: number,
    totalLaps: number,
    enableRealHeadlight: boolean
  ): RacerEntity {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const rig = buildKartMesh(loadout, maxAniso, enableRealHeadlight);
    const stats = computeCombinedStats(loadout);

    const pos = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const right = new THREE.Vector3();
    this.builtTrack!.sampleAtT(startT, pos, tan, right);
    pos.addScaledVector(right, lateral);
    const heading = Math.atan2(tan.x, tan.z);

    rig.root.position.copy(pos);
    rig.root.rotation.y = heading;

    return {
      id,
      name,
      isHuman,
      isLocalP2,
      isRemote,
      loadout,
      stats,
      rig,
      pos: pos.clone(),
      vel: new THREE.Vector3(),
      vy: 0,
      heading,
      speed: 0,
      steerAngle: 0,
      grounded: true,
      airTime: 0,
      braking: false,
      drifting: false,
      driftDir: 0,
      driftCharge: 0,
      driftLevel: 0,
      boostTimer: 0,
      boostPower: 1,
      nitroCharge: 35,
      condition: 100,
      spinTimer: 0,
      slowTimer: 0,
      empTimer: 0,
      shieldTimer: 0,
      cloakTimer: 0,
      overdriveTimer: 0,
      crashTimer: 0,
      recoveryTimer: 0,
      stuckBoundaryTimer: 0,
      powerUp: null,
      coinsCollected: 0,
      driftsCompleted: 0,
      powerUpsUsed: 0,
      trackT: startT,
      lap: 1,
      totalLaps,
      maxCheckpointT: 0,
      progress: startT,
      finished: false,
      finishTimeMs: 0,
      lapStartMs: 0,
      bestLapMs: 0,
      wrongWay: false,
      aiTargetOffset: (Math.random() - 0.5) * 4,
      aiItemTimer: 2 + Math.random() * 4,
      remoteTargetPos: pos.clone(),
      remoteTargetHeading: heading,
    };
  }

  private applyAtmosphere(
    sky: string,
    fog: string,
    density: number,
    sun: string,
    timeOfDay: TimeOfDay,
    weather: WeatherCondition
  ) {
    let skyCol = new THREE.Color(sky);
    let fogCol = new THREE.Color(fog);
    let sunCol = new THREE.Color(sun);
    let sunIntensity = 1.6;
    let hemiIntensity = 0.78;
    let effectiveDensity = density;

    if (timeOfDay === 'sunset') {
      skyCol.lerp(new THREE.Color('#EA580C'), 0.62);
      fogCol.lerp(new THREE.Color('#7C2D12'), 0.58);
      sunCol.set('#FDBA74');
      sunIntensity = 1.4;
      hemiIntensity = 0.58;
    } else if (timeOfDay === 'night') {
      skyCol.set('#030712');
      fogCol.set('#0B1120');
      sunCol.set('#93C5FD');
      sunIntensity = 0.55;
      hemiIntensity = 0.32;
      effectiveDensity = Math.max(density, 0.0022);
    }

    if (weather === 'rain') {
      skyCol.lerp(new THREE.Color('#334155'), 0.65);
      fogCol.lerp(new THREE.Color('#475569'), 0.6);
      sunIntensity *= 0.65;
      effectiveDensity = Math.max(effectiveDensity, 0.003);
      this.rainActive = true;
      this.rainLines.visible = true;
    } else {
      this.rainActive = false;
      this.rainLines.visible = false;
    }

    this.scene.background = skyCol;
    this.scene.fog = new THREE.FogExp2(fogCol, effectiveDensity);
    this.keyLight.color.copy(sunCol);
    this.keyLight.intensity = sunIntensity;
    this.hemiLight.color.copy(skyCol);
    this.hemiLight.intensity = hemiIntensity;
  }

  // === NETWORK SYNC HOOKS ===
  public getLocalPlayerNetState(): RemoteKartNetState | null {
    const p1 = this.racers.find((r) => r.isHuman && !r.isLocalP2);
    if (!p1) return null;
    return {
      playerId: p1.id,
      x: p1.pos.x,
      y: p1.pos.y,
      z: p1.pos.z,
      heading: p1.heading,
      speed: p1.speed,
      steer: p1.steerAngle,
      drifting: p1.drifting,
      driftLevel: p1.driftLevel,
      boosting: p1.boostTimer > 0,
      braking: p1.braking,
      crashing: p1.crashTimer > 0,
      recovering: p1.recoveryTimer > 0,
      condition: p1.condition,
      shieldActive: p1.shieldTimer > 0,
      cloakActive: p1.cloakTimer > 0,
      lap: p1.lap,
      t: p1.trackT,
      progress: p1.progress,
      finished: p1.finished,
      finishTimeMs: p1.finishTimeMs,
      seq: Math.floor(this.raceElapsedMs),
    };
  }

  public applyRemoteKartState(state: RemoteKartNetState) {
    const r = this.racers.find((x) => x.id === state.playerId && x.isRemote);
    if (!r) return;
    r.remoteTargetPos.set(state.x, state.y, state.z);
    r.remoteTargetHeading = state.heading;
    r.speed = state.speed;
    r.steerAngle = state.steer;
    r.drifting = state.drifting;
    r.driftLevel = state.driftLevel as 0 | 1 | 2 | 3;
    r.boostTimer = state.boosting ? 0.3 : 0;
    r.braking = Boolean(state.braking);
    r.crashTimer = state.crashing ? 0.4 : 0;
    r.recoveryTimer = state.recovering ? 0.4 : 0;
    if (typeof state.condition === 'number') r.condition = state.condition;
    r.shieldTimer = state.shieldActive ? 0.5 : 0;
    r.cloakTimer = state.cloakActive ? 0.5 : 0;
    r.lap = state.lap;
    r.trackT = state.t;
    r.progress = state.progress;
    r.finished = state.finished;
    r.finishTimeMs = state.finishTimeMs;
  }

  public applyRemotePowerUp(
    ownerId: string,
    type: PowerUpType,
    x: number,
    y: number,
    z: number,
    heading: number,
    trackT: number
  ) {
    const owner = this.racers.find((r) => r.id === ownerId);
    if (!owner || owner.isHuman) return;
    this.spawnPowerUpEffect(owner, type, new THREE.Vector3(x, y, z), heading, trackT, false);
  }

  public applyRemoteCrash(playerId: string) {
    const r = this.racers.find((x) => x.id === playerId && x.isRemote);
    if (!r) return;
    this.spawnExplosion(r.pos, '#F97316');
  }

  // === MAIN SIMULATION LOOP ===
  private tick = () => {
    if (this.disposed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this.elapsed += dt;

    if (this.mode === 'menu') {
      this.updateMenuShowcase(dt);
    } else if (this.mode === 'garage') {
      this.updateGarage(dt);
    } else if (this.mode === 'race') {
      this.updateRace(dt);
    }

    this.renderScene();

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private renderScene() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    if (this.mode === 'race' && this.raceMode === 'local_split') {
      const halfW = Math.floor(w / 2);
      this.renderer.setScissorTest(true);

      this.camera1.aspect = halfW / h;
      this.camera1.updateProjectionMatrix();
      this.renderer.setViewport(0, 0, halfW, h);
      this.renderer.setScissor(0, 0, halfW, h);
      this.renderer.render(this.scene, this.camera1);

      this.camera2.aspect = (w - halfW) / h;
      this.camera2.updateProjectionMatrix();
      this.renderer.setViewport(halfW, 0, w - halfW, h);
      this.renderer.setScissor(halfW, 0, w - halfW, h);
      this.renderer.render(this.scene, this.camera2);

      this.renderer.setScissorTest(false);
    } else {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.render(this.scene, this.camera1);
    }
  }

  private updateRain(dt: number, anchor: THREE.Vector3) {
    if (!this.rainActive) return;
    this.rainLines.position.set(anchor.x, anchor.y - 2, anchor.z);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const idx = i * 6;
      this.rainPositions[idx + 1] -= 36 * dt;
      this.rainPositions[idx + 4] -= 36 * dt;
      if (this.rainPositions[idx + 1] < -2) {
        const ny = 18 + Math.random() * 6;
        const nx = (Math.random() - 0.5) * 46;
        const nz = (Math.random() - 0.5) * 46;
        this.rainPositions[idx] = nx;
        this.rainPositions[idx + 1] = ny;
        this.rainPositions[idx + 2] = nz;
        this.rainPositions[idx + 3] = nx - 0.14;
        this.rainPositions[idx + 4] = ny - 1.35;
        this.rainPositions[idx + 5] = nz - 0.14;
      }
    }
    this.rainLines.geometry.attributes.position.needsUpdate = true;
  }

  private updateMenuShowcase(dt: number) {
    if (!this.builtTrack) return;
    this.builtTrack.updateDynamicElements(this.elapsed, dt);

    for (const r of this.racers) {
      this.stepAiInput(r, dt);
      this.stepRacerPhysics(
        r,
        { throttle: 0.88, brake: 0, steer: r.steerAngle, drift: false, jumpPressed: false, useItemPressed: false },
        dt
      );
    }
    this.updateParticles(dt);

    const lead = this.racers[0];
    if (lead) {
      const orbitAngle = this.elapsed * 0.25;
      _v1.set(
        lead.pos.x + Math.sin(orbitAngle) * 11,
        lead.pos.y + 4.8,
        lead.pos.z + Math.cos(orbitAngle) * 11
      );
      const damp = 1 - Math.exp(-3.5 * dt);
      this.camPos1.lerp(_v1, damp);
      this.camera1.position.copy(this.camPos1);
      this.camLook1.lerp(lead.pos, damp);
      this.camera1.lookAt(this.camLook1);
      this.updateRain(dt, this.camPos1);

      const sunOffsetX = this.activeTimeOfDay === 'sunset' ? 65 : 35;
      const sunOffsetY = this.activeTimeOfDay === 'sunset' ? 24 : 65;
      this.keyLight.position.set(lead.pos.x + sunOffsetX, lead.pos.y + sunOffsetY, lead.pos.z + 25);
      this.keyLight.target.position.copy(lead.pos);
    }
  }

  private updateGarage(dt: number) {
    this.orbitControls?.update();
    if (this.garageKartRig) {
      this.garageKartRig.root.rotation.y += dt * 0.35;
      const bob = this.garageKartRig.isHover ? Math.sin(this.elapsed * 3.2) * 0.08 : Math.sin(this.elapsed * 22) * 0.008;
      this.garageKartRig.bodyGroup.position.y = this.garageKartRig.rideHeight + bob;
      this.garageKartRig.wheels.forEach((w) => {
        w.rotation.x += dt * 2.8;
      });
      animateCharacterRig(this.garageKartRig.characterRig, this.elapsed, Math.sin(this.elapsed * 1.4) * 0.3, 'idle');
    }
  }

  private updateRace(rawDt: number) {
    if (!this.builtTrack) return;
    if (this.racePhase === 'paused') return;

    let dt = rawDt;
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= rawDt;
      dt *= 0.25;
    } else if (this.crashSlowMoTimer > 0) {
      this.crashSlowMoTimer -= rawDt;
      dt *= 0.42;
    }

    if (this.screenFxTimer > 0) {
      this.screenFxTimer -= rawDt;
      if (this.screenFxTimer <= 0) this.screenFx = 'none';
    }

    this.builtTrack.updateDynamicElements(this.elapsed, dt);

    const tr = TRANSLATIONS[this.settings.language];

    if (this.racePhase === 'countdown') {
      this.countdownTimer -= dt;
      const ceilVal = Math.ceil(this.countdownTimer);
      if (ceilVal < this.lastCountdownBeep && ceilVal >= 0) {
        this.lastCountdownBeep = ceilVal;
        soundEngine.playCountdownBeep(ceilVal === 0);
      }
      if (this.countdownTimer <= 0) {
        this.racePhase = 'racing';
        this.pushBanner(tr.goBanner, '#10B981');
      }
    } else if (this.racePhase === 'racing') {
      this.raceElapsedMs += rawDt * 1000;
    }

    this.readKeyboardInputs();
    this.skidAccum += dt;

    for (const r of this.racers) {
      if (r.isRemote) {
        this.stepRemoteInterpolation(r, dt);
        continue;
      }

      if (this.racePhase === 'countdown') {
        animateCharacterRig(r.rig.characterRig, this.elapsed, 0, 'idle');
        continue;
      }

      if (r.finished || !r.isHuman) {
        const aiIn = this.stepAiInput(r, dt);
        this.stepRacerPhysics(r, aiIn, dt);
      } else {
        const input = r.isLocalP2 ? this.p2Input : this.p1Input;
        this.stepRacerPhysics(r, input, dt);
      }
    }

    this.p1Input.jumpPressed = false;
    this.p1Input.useItemPressed = false;
    this.p2Input.jumpPressed = false;
    this.p2Input.useItemPressed = false;

    this.resolveKartCollisions();
    this.stepProjectiles(dt);
    this.updateStandings();
    this.updateParticles(dt);

    const p1 = this.racers.find((r) => r.isHuman && !r.isLocalP2) || this.racers[0];
    if (p1) {
      this.updateChaseCamera(p1, this.camera1, this.camPos1, this.camLook1, rawDt);
      this.updateRain(rawDt, this.camPos1);

      const sunOffsetX = this.activeTimeOfDay === 'sunset' ? 65 : 40;
      const sunOffsetY = this.activeTimeOfDay === 'sunset' ? 24 : 70;
      this.keyLight.position.set(p1.pos.x + sunOffsetX, p1.pos.y + sunOffsetY, p1.pos.z + 30);
      this.keyLight.target.position.copy(p1.pos);

      const speedRatio = Math.abs(p1.speed) / 44;
      soundEngine.updateEngine(speedRatio, p1.boostTimer > 0, p1.drifting, p1.driftLevel);
    }

    const p2 = this.racers.find((r) => r.isLocalP2);
    if (p2 && this.raceMode === 'local_split') {
      this.updateChaseCamera(p2, this.camera2, this.camPos2, this.camLook2, rawDt);
    }

    if (this.eventBanner) {
      this.eventBanner.timer -= rawDt;
      if (this.eventBanner.timer <= 0) this.eventBanner = null;
    }

    if (!this.raceCompleteFired && this.raceMode !== 'practice') {
      const humans = this.racers.filter((r) => r.isHuman);
      if (humans.length > 0 && humans.every((h) => h.finished)) {
        this.raceCompleteFired = true;
        this.racePhase = 'finished';
        soundEngine.setMusicMode('victory');
        soundEngine.stopEngineLoop();
        const frame = this.buildTelemetryFrame();
        this.onTelemetry?.(frame);
        this.onRaceComplete?.(frame);
      }
    }

    this.telemetryAccum += rawDt;
    if (this.telemetryAccum >= 0.05) {
      this.telemetryAccum = 0;
      this.emitTelemetryNow();
    }
  }

  private stepRemoteInterpolation(r: RacerEntity, dt: number) {
    const damp = 1 - Math.exp(-14 * dt);
    r.pos.lerp(r.remoteTargetPos, damp);
    let diff = r.remoteTargetHeading - r.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    r.heading += diff * damp;

    r.rig.root.position.copy(r.pos);
    r.rig.root.rotation.y = r.heading;
    r.rig.shieldMesh.visible = r.shieldTimer > 0 || r.recoveryTimer > 0;
    r.rig.brakeLightsMat.emissiveIntensity = r.braking ? 2.5 : 0.65;
    applyDamageVisuals(r.rig, r.condition);

    r.rig.flameMeshes.forEach((f) => {
      f.visible = r.boostTimer > 0 || r.speed > 24;
      f.scale.setScalar(r.boostTimer > 0 ? 1.3 : 0.65);
    });
    r.rig.wheels.forEach((w) => {
      w.rotation.x += dt * r.speed * 0.45;
    });
    animateCharacterRig(r.rig.characterRig, this.elapsed, r.steerAngle, r.boostTimer > 0 ? 'boost' : 'idle');
  }

  private stepAiInput(r: RacerEntity, dt: number): InputState {
    if (!this.builtTrack) return { throttle: 0, brake: 0, steer: 0, drift: false, jumpPressed: false, useItemPressed: false };
    const lookAheadT = (r.trackT + 0.025) % 1;
    this.builtTrack.sampleAtT(lookAheadT, _v1, _v2, _v3);
    _v1.addScaledVector(_v3, r.aiTargetOffset);

    const dx = _v1.x - r.pos.x;
    const dz = _v1.z - r.pos.z;
    const desiredHeading = Math.atan2(dx, dz);
    let diff = desiredHeading - r.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const steer = THREE.MathUtils.clamp(diff * 2.2, -1, 1);
    const sharpTurn = Math.abs(diff) > 0.35;

    let baseThrottle = this.activeDifficulty === 'easy' ? 0.8 : this.activeDifficulty === 'pro' ? 0.96 : 0.88;
    const p1 = this.racers.find((x) => x.isHuman && !x.isLocalP2);
    if (p1 && this.mode === 'race' && !r.finished) {
      const gap = r.progress - p1.progress;
      if (gap > 0.14) baseThrottle *= 0.82;
      else if (gap < -0.1) baseThrottle *= 1.12;
    }

    let useItem = false;
    if (r.powerUp && !r.finished) {
      r.aiItemTimer -= dt;
      if (r.aiItemTimer <= 0) {
        useItem = true;
        r.aiItemTimer = 3.2 + Math.random() * 4;
      }
    }

    return {
      throttle: baseThrottle,
      brake: 0,
      steer,
      drift: sharpTurn && r.speed > 18,
      jumpPressed: false,
      useItemPressed: useItem,
    };
  }

  private triggerCrash(r: RacerEntity, damage = 45) {
    if (r.crashTimer > 0 || r.recoveryTimer > 0) return;
    if (r.shieldTimer > 0) {
      r.shieldTimer = 0;
      this.spawnExplosion(r.pos, '#22D3EE');
      return;
    }
    r.condition = Math.max(0, r.condition - damage);
    r.crashTimer = 1.15;
    r.drifting = false;
    r.driftCharge = 0;
    r.driftLevel = 0;
    r.boostTimer = 0;
    this.spawnExplosion(r.pos, '#EF4444');
    applyDamageVisuals(r.rig, r.condition);

    if (r.isHuman && !r.isLocalP2) {
      this.crashSlowMoTimer = 0.72;
      this.shakeTimer = 0.45;
      this.shakeIntensity = 0.55;
      this.setScreenFx('hit', 0.55);
      soundEngine.playCrash();
      soundEngine.playCharacterVoice(r.loadout.characterId, 'hit');
      this.pushBanner(TRANSLATIONS[this.settings.language].crashingBanner, '#EF4444');
      this.onCrashNetworkEmit?.();
    }
  }

  private respawnAtTrackSpline(r: RacerEntity, t: number) {
    if (!this.builtTrack) return;
    this.builtTrack.sampleAtT(t, _v1, _v2, _v3);
    r.pos.set(_v1.x, _v1.y + 0.35, _v1.z);
    r.vy = 0;
    r.grounded = true;
    r.heading = Math.atan2(_v2.x, _v2.z);
    r.speed = 22; // Fast smooth return speed onto the track
    r.crashTimer = 0;
    r.spinTimer = 0;
    r.stuckBoundaryTimer = 0;
    r.recoveryTimer = 1.8;
    r.condition = Math.max(75, r.condition);
    r.rig.bodyGroup.rotation.set(0, 0, 0);
    applyDamageVisuals(r.rig, r.condition);

    if (r.isHuman && !r.isLocalP2) {
      this.setScreenFx('shield', 0.4);
      this.pushBanner(TRANSLATIONS[this.settings.language].recoveringBanner, '#38BDF8');
    }
  }

  private stepRacerPhysics(r: RacerEntity, input: InputState, dt: number) {
    if (!this.builtTrack) return;

    if (r.boostTimer > 0) r.boostTimer = Math.max(0, r.boostTimer - dt);
    if (r.spinTimer > 0) r.spinTimer = Math.max(0, r.spinTimer - dt);
    if (r.slowTimer > 0) r.slowTimer = Math.max(0, r.slowTimer - dt);
    if (r.empTimer > 0) r.empTimer = Math.max(0, r.empTimer - dt);
    if (r.shieldTimer > 0) r.shieldTimer = Math.max(0, r.shieldTimer - dt);
    if (r.cloakTimer > 0) r.cloakTimer = Math.max(0, r.cloakTimer - dt);
    if (r.overdriveTimer > 0) r.overdriveTimer = Math.max(0, r.overdriveTimer - dt);
    if (r.recoveryTimer > 0) r.recoveryTimer = Math.max(0, r.recoveryTimer - dt);

    // Handle active Crash state -> temporarily disable acceleration & tumble, then clean respawn
    if (r.crashTimer > 0) {
      r.crashTimer -= dt;
      r.speed *= Math.exp(-5.0 * dt);
      r.rig.bodyGroup.rotation.y += dt * 10;
      r.rig.bodyGroup.rotation.z = Math.sin(this.elapsed * 22) * 0.22;
      if (Math.random() < 0.7) {
        this.spawnParticle(
          r.pos.x + (Math.random() - 0.5),
          r.pos.y + 0.6,
          r.pos.z + (Math.random() - 0.5),
          (Math.random() - 0.5) * 4,
          2 + Math.random() * 4,
          (Math.random() - 0.5) * 4,
          Math.random() < 0.5 ? '#F97316' : '#475569',
          0.38,
          0.95
        );
      }
      if (r.crashTimer <= 0) {
        this.respawnAtTrackSpline(r, r.trackT);
      }
      r.rig.root.position.copy(r.pos);
      r.rig.root.rotation.y = r.heading;
      return;
    }

    const closest = this.builtTrack.findClosestT(r.pos, r.trackT);
    const halfW = this.builtTrack.def.trackWidth * 0.5;
    const offRoad = Math.abs(closest.lateral) > halfW + 0.6 && r.grounded;

    // Wrong-way check
    this.builtTrack.sampleAtT(closest.t, _v1, _v2, _v3);
    const fwdX = Math.sin(r.heading);
    const fwdZ = Math.cos(r.heading);
    const dotDir = fwdX * _v2.x + fwdZ * _v2.z;
    r.wrongWay = r.speed > 6 && dotDir < -0.35;

    // Difficulty-calibrated balanced realistic speed (Medium default = balanced & controllable)
    const diffSpeedMult =
      this.activeDifficulty === 'easy' ? 0.88 : this.activeDifficulty === 'pro' ? 1.12 : 1.0;
    const diffGripMult =
      this.activeDifficulty === 'easy' ? 1.16 : this.activeDifficulty === 'pro' ? 0.94 : 1.0;
    const wetPenalty = this.activeWeather === 'rain' ? 0.95 : 1.0;

    const coinFactor = 1 + Math.min(r.coinsCollected, 10) * 0.01;
    const baseMaxSpeed = (29 + r.stats.speed * 1.15) * coinFactor * diffSpeedMult;
    const overdriveMult = r.overdriveTimer > 0 ? 1.22 : 1.0;
    const boostAdd = r.boostTimer > 0 ? 13.5 * r.boostPower * overdriveMult : 0;
    const slowMult = (r.slowTimer > 0 || r.empTimer > 0) ? 0.6 : 1.0;
    const offRoadMult = offRoad && r.boostTimer <= 0 ? (this.activeDifficulty === 'easy' ? 0.82 : 0.7) : 1.0;

    const effectiveMax = (baseMaxSpeed + boostAdd) * slowMult * offRoadMult;
    const accelRate = (15.5 + r.stats.acceleration * 1.75) * (r.boostTimer > 0 ? 1.65 : 1.0) * diffSpeedMult;

    r.braking = input.brake > 0.12 && r.speed > 1;

    if (r.spinTimer > 0) {
      r.speed *= Math.exp(-3.5 * dt);
      r.rig.bodyGroup.rotation.y += dt * 12;
    } else {
      r.rig.bodyGroup.rotation.y = THREE.MathUtils.damp(r.rig.bodyGroup.rotation.y, 0, 12, dt);

      if (input.throttle > 0) {
        r.speed += accelRate * input.throttle * dt;
      } else if (input.brake > 0) {
        if (r.speed > 1) {
          r.speed -= 30 * input.brake * dt;
        } else {
          r.speed -= 14 * input.brake * dt;
        }
      } else {
        r.speed *= Math.exp(-1.7 * dt);
      }

      if (r.boostTimer > 0) {
        r.speed = Math.max(r.speed, baseMaxSpeed + boostAdd * 0.8);
        r.nitroCharge = Math.min(100, r.nitroCharge + dt * 20);
      }

      r.speed = THREE.MathUtils.clamp(r.speed, -12, effectiveMax);

      // Steering with EMP wobble if hit
      const empWobble = r.empTimer > 0 ? Math.sin(this.elapsed * 16) * 0.45 : 0;
      const effectiveSteer = THREE.MathUtils.clamp(input.steer + empWobble, -1, 1);
      const turnAuthority = (1.58 + r.stats.handling * 0.11) * diffGripMult * wetPenalty;
      const speedFactor = THREE.MathUtils.clamp(Math.abs(r.speed) / 13, 0.26, 1.12);
      const revSign = r.speed >= -0.5 ? 1 : -1;

      if (input.drift && r.grounded && r.speed > 14 && (Math.abs(effectiveSteer) > 0.15 || r.drifting)) {
        if (!r.drifting) {
          r.drifting = true;
          r.driftDir = effectiveSteer >= 0 ? 1 : -1;
          r.vy = Math.max(r.vy, 3.6);
          r.grounded = false;
          if (r.isHuman && !r.isLocalP2) soundEngine.playJump();
        }

        const driftTurn = r.driftDir * 0.68 + effectiveSteer * 0.62;
        r.heading += driftTurn * turnAuthority * speedFactor * dt;

        const chargeRate = (0.95 + r.stats.drift * 0.08) * (r.overdriveTimer > 0 ? 1.85 : 1.0);
        r.driftCharge = Math.min(3, r.driftCharge + chargeRate * dt);
        r.driftLevel = r.driftCharge >= 2.6 ? 3 : r.driftCharge >= 1.6 ? 2 : r.driftCharge >= 0.7 ? 1 : 0;
        r.nitroCharge = Math.min(100, r.nitroCharge + dt * 12);

        if (Math.random() < 0.72) {
          const sparkCol =
            r.driftLevel === 3 ? '#A855F7' : r.driftLevel === 2 ? '#F97316' : r.driftLevel === 1 ? '#FACC15' : '#CBD5E1';
          this.spawnParticle(
            r.pos.x - fwdX * 1.1 + (Math.random() - 0.5) * 0.9,
            r.pos.y + 0.25,
            r.pos.z - fwdZ * 1.1 + (Math.random() - 0.5) * 0.9,
            (Math.random() - 0.5) * 4,
            2 + Math.random() * 3,
            (Math.random() - 0.5) * 4,
            sparkCol,
            0.25,
            0.55
          );
        }
      } else {
        if (r.drifting) {
          if (r.driftLevel > 0) {
            const tier = r.driftLevel;
            r.boostTimer = Math.max(r.boostTimer, 0.75 + tier * 0.5);
            r.boostPower = 0.95 + tier * 0.14;
            r.driftsCompleted++;
            if (r.isHuman && !r.isLocalP2) {
              soundEngine.playTurboBoost(tier);
              soundEngine.playCharacterVoice(r.loadout.characterId, 'boost');
              this.setScreenFx('boost', 0.45);
              const ar = this.settings.language === 'ar';
              this.pushBanner(
                tier === 3
                  ? ar ? 'توربو خارق!' : 'ULTRA TURBO!'
                  : tier === 2
                  ? ar ? 'توربو فائق!' : 'SUPER TURBO!'
                  : ar ? 'توربو سريع!' : 'MINI TURBO!',
                tier === 3 ? '#A855F7' : tier === 2 ? '#F97316' : '#FACC15'
              );
            }
          }
          r.drifting = false;
          r.driftDir = 0;
          r.driftCharge = 0;
          r.driftLevel = 0;
        }

        r.heading += effectiveSteer * turnAuthority * speedFactor * revSign * dt;
      }

      if (input.jumpPressed && r.grounded) {
        r.vy = 7.8;
        r.grounded = false;
        if (r.isHuman && !r.isLocalP2) soundEngine.playJump();
      }

      if (input.useItemPressed && r.powerUp) {
        this.activatePowerUp(r);
      }
    }

    // Tire skid marks & realistic tire smoke when drifting or hard braking
    if ((r.drifting || (r.braking && r.speed > 15)) && r.grounded && this.skidAccum >= 0.045) {
      this.placeSkidMarks(r);
    }

    // Offroad dust or wet spray
    if (r.grounded && r.speed > 12 && (offRoad || this.activeWeather === 'rain') && Math.random() < 0.35) {
      this.spawnParticle(
        r.pos.x - fwdX * 1.2 + (Math.random() - 0.5) * 1.1,
        r.pos.y + 0.18,
        r.pos.z - fwdZ * 1.2 + (Math.random() - 0.5) * 1.1,
        (Math.random() - 0.5) * 2,
        1.2 + Math.random() * 1.5,
        (Math.random() - 0.5) * 2,
        this.activeWeather === 'rain' ? '#BAE6FD' : '#D6D3D1',
        0.35,
        0.55
      );
    }

    // Damage engine smoke when condition < 55
    if (r.condition < 55 && Math.random() < 0.38) {
      this.spawnParticle(
        r.pos.x + fwdX * 0.9,
        r.pos.y + 0.8,
        r.pos.z + fwdZ * 0.9,
        (Math.random() - 0.5) * 1.2,
        2.5 + Math.random() * 1.8,
        (Math.random() - 0.5) * 1.2,
        r.condition < 25 ? '#18181B' : '#64748B',
        0.55,
        0.75
      );
    }

    const driftSlipAngle = r.drifting ? r.driftDir * 0.16 : 0;
    const moveAngle = r.heading - driftSlipAngle;
    r.vel.x = Math.sin(moveAngle) * r.speed;
    r.vel.z = Math.cos(moveAngle) * r.speed;

    r.pos.x += r.vel.x * dt;
    r.pos.z += r.vel.z * dt;

    // Grounding & Fast Fall-Off-Track Rescue
    const postClosest = this.builtTrack.findClosestT(r.pos, closest.t);
    const onRoadDeck = Math.abs(postClosest.lateral) <= halfW + 2.5;
    const groundY = onRoadDeck ? postClosest.roadY : postClosest.roadY > 2.5 ? -8.0 : -0.35;

    if (!onRoadDeck && postClosest.roadY > 2.5 && r.pos.y < postClosest.roadY - 1.8) {
      // Fell off elevated track -> instant clean respawn back on track!
      this.respawnAtTrackSpline(r, postClosest.t);
      return;
    }

    if (!r.grounded || r.pos.y > groundY + 0.08) {
      r.vy -= 25 * dt;
      r.pos.y += r.vy * dt;
      r.airTime += dt;
      if (r.pos.y <= groundY) {
        if (groundY < -4.0) {
          this.respawnAtTrackSpline(r, postClosest.t);
          return;
        }
        r.pos.y = groundY;
        if (r.airTime > 0.45) {
          r.boostTimer = Math.max(r.boostTimer, 0.8);
          r.boostPower = 1.05;
          if (r.isHuman && !r.isLocalP2) soundEngine.playTurboBoost(1);
        }
        r.vy = 0;
        r.grounded = true;
        r.airTime = 0;
      }
    } else {
      r.pos.y = groundY;
      r.vy = 0;
      r.grounded = true;
    }

    // Track boundary guardrail smooth deflection + fast unstuck rescue
    const maxLat = halfW + 2.3;
    if (Math.abs(postClosest.lateral) > maxLat && postClosest.roadY <= 2.5) {
      this.builtTrack.sampleAtT(postClosest.t, _v1, _v2, _v3);
      const clampedLat = Math.sign(postClosest.lateral) * (halfW + 1.9);
      r.pos.x = _v1.x + _v3.x * clampedLat;
      r.pos.z = _v1.z + _v3.z * clampedLat;

      // Gently re-align nose toward track direction so player never gets wedged in barriers
      const tangentHeading = Math.atan2(_v2.x, _v2.z);
      let hDiff = tangentHeading - r.heading;
      while (hDiff > Math.PI) hDiff -= Math.PI * 2;
      while (hDiff < -Math.PI) hDiff += Math.PI * 2;
      r.heading += hDiff * Math.min(1, dt * 8.5);

      if (Math.abs(r.speed) > 26) {
        r.condition = Math.max(10, r.condition - 4);
        applyDamageVisuals(r.rig, r.condition);
      }
      r.speed = Math.max(12, r.speed * 0.92);
      r.stuckBoundaryTimer += dt;
      if (r.stuckBoundaryTimer > 0.65) {
        this.respawnAtTrackSpline(r, postClosest.t);
        return;
      }
      if (r.isHuman && !r.isLocalP2 && Math.abs(r.speed) > 10) {
        soundEngine.playCollision();
      }
    } else if (Math.abs(postClosest.lateral) > halfW + 1.4 && Math.abs(r.speed) < 5) {
      r.stuckBoundaryTimer += dt;
      if (r.stuckBoundaryTimer > 0.8) {
        this.respawnAtTrackSpline(r, postClosest.t);
        return;
      }
    } else {
      r.stuckBoundaryTimer = Math.max(0, r.stuckBoundaryTimer - dt * 2);
    }

    // Ramps, Boost Pads, Obstacles, Crates, Coins
    for (const ramp of this.builtTrack.ramps) {
      if (r.grounded && r.pos.distanceToSquared(ramp.pos) < ramp.radius * ramp.radius) {
        r.vy = 13.5;
        r.grounded = false;
        r.boostTimer = Math.max(r.boostTimer, 0.85);
        if (r.isHuman && !r.isLocalP2) soundEngine.playJump();
      }
    }

    for (const pad of this.builtTrack.boostPads) {
      if (r.pos.distanceToSquared(pad.pos) < pad.radius * pad.radius) {
        if (r.boostTimer < 0.85) {
          r.boostTimer = 1.25;
          r.boostPower = 1.22;
          r.nitroCharge = Math.min(100, r.nitroCharge + 15);
          if (r.isHuman && !r.isLocalP2) {
            soundEngine.playTurboBoost(2);
            this.setScreenFx('boost', 0.45);
          }
        }
      }
    }

    for (const obs of this.builtTrack.obstacles) {
      const dx = r.pos.x - obs.worldPos.x;
      const dz = r.pos.z - obs.worldPos.z;
      if (dx * dx + dz * dz < (obs.radius + 1.0) * (obs.radius + 1.0) && Math.abs(r.pos.y - obs.worldPos.y) < 2.2) {
        if (r.recoveryTimer > 0) continue;
        if (r.shieldTimer > 0) {
          r.shieldTimer = 0;
          this.spawnExplosion(obs.worldPos, '#22D3EE');
        } else if (r.speed > 26 || r.condition <= 35) {
          this.triggerCrash(r, 40);
        } else if (r.spinTimer <= 0) {
          r.spinTimer = 0.9;
          r.speed *= 0.35;
          r.condition = Math.max(0, r.condition - 25);
          applyDamageVisuals(r.rig, r.condition);
          this.triggerImpactFeedback(r, 0.35);
        }
      }
    }

    for (const crate of this.builtTrack.crates) {
      if (!crate.active) continue;
      if (r.pos.distanceToSquared(crate.pos) < 4.8) {
        crate.active = false;
        crate.mesh.visible = false;
        crate.respawnTimer = 4.0;
        if (!r.powerUp) {
          r.powerUp = this.rollWeightedPowerUp(r);
          if (r.isHuman && !r.isLocalP2) soundEngine.playPowerUpPickup();
        }
        this.spawnExplosion(crate.pos, '#FACC15');
      }
    }

    for (const coin of this.builtTrack.coins) {
      if (!coin.active) continue;
      if (r.pos.distanceToSquared(coin.pos) < 3.6) {
        coin.active = false;
        coin.mesh.visible = false;
        coin.respawnTimer = 6.0;
        r.coinsCollected++;
        r.nitroCharge = Math.min(100, r.nitroCharge + 8);
        if (r.isHuman && !r.isLocalP2) soundEngine.playCoinPickup();
      }
    }

    // Lap & Checkpoint Tracking
    const prevT = r.trackT;
    const newT = postClosest.t;

    if (newT > r.maxCheckpointT && newT - r.maxCheckpointT < 0.35) {
      r.maxCheckpointT = newT;
    }

    if (prevT > 0.82 && newT < 0.18 && r.maxCheckpointT > 0.65) {
      const lapTime = this.raceElapsedMs - r.lapStartMs;
      if (lapTime > 4000 && (r.bestLapMs === 0 || lapTime < r.bestLapMs)) {
        r.bestLapMs = lapTime;
      }
      r.lapStartMs = this.raceElapsedMs;

      if (r.lap >= r.totalLaps && this.raceMode !== 'practice') {
        r.finished = true;
        r.finishTimeMs = this.raceElapsedMs;
        if (r.isHuman && !r.isLocalP2) {
          soundEngine.playCharacterVoice(r.loadout.characterId, 'win');
          this.pushBanner(TRANSLATIONS[this.settings.language].finishBanner, '#F59E0B');
        }
      } else {
        r.lap++;
        r.maxCheckpointT = newT;
        if (r.isHuman && !r.isLocalP2) {
          const isFinal = r.lap === r.totalLaps;
          soundEngine.playLapChime(isFinal);
          if (isFinal) soundEngine.setMusicMode('final_lap');
          const tr = TRANSLATIONS[this.settings.language];
          this.pushBanner(
            isFinal
              ? tr.finalLapBanner
              : this.settings.language === 'ar'
              ? `اللفة ${r.lap} من ${r.totalLaps}`
              : `LAP ${r.lap}/${r.totalLaps}`,
            isFinal ? '#EF4444' : '#38BDF8'
          );
        }
      }
    }

    r.trackT = newT;
    r.progress = r.finished ? r.totalLaps + 2 - r.finishTimeMs / 1000000 : r.lap - 1 + r.trackT;

    // Visual Rig Sync
    r.steerAngle = THREE.MathUtils.damp(r.steerAngle, input.steer, 12, dt);
    r.rig.root.position.copy(r.pos);
    r.rig.root.rotation.y = r.heading;

    const hoverBob = r.rig.isHover ? Math.sin(this.elapsed * 5 + r.pos.x * 0.2) * 0.08 : 0;
    r.rig.bodyGroup.position.y = r.rig.rideHeight + hoverBob;
    r.rig.bodyGroup.rotation.z = THREE.MathUtils.damp(
      r.rig.bodyGroup.rotation.z,
      -r.steerAngle * 0.1 - (r.drifting ? r.driftDir * 0.09 : 0),
      10,
      dt
    );
    r.rig.bodyGroup.rotation.x = THREE.MathUtils.damp(
      r.rig.bodyGroup.rotation.x,
      !r.grounded
        ? THREE.MathUtils.clamp(-r.vy * 0.032, -0.3, 0.3)
        : r.boostTimer > 0
        ? -0.055
        : r.braking
        ? 0.045
        : 0,
      10,
      dt
    );

    r.rig.frontWheelPivots.forEach((p) => {
      p.rotation.y = r.steerAngle * 0.4;
    });
    r.rig.steeringWheel.rotation.z = r.steerAngle * 0.7;
    r.rig.wheels.forEach((w) => {
      w.rotation.x += dt * r.speed * 0.48;
    });

    r.rig.brakeLightsMat.emissiveIntensity = r.braking ? 2.6 : 0.65;
    r.rig.shieldMesh.visible = r.shieldTimer > 0 || (r.recoveryTimer > 0 && Math.floor(this.elapsed * 10) % 2 === 0);
    if (r.rig.shieldMesh.visible) r.rig.shieldMesh.rotation.y += dt * 2.5;

    const showFlame = r.boostTimer > 0 || r.speed > 26;
    r.rig.flameMeshes.forEach((f) => {
      f.visible = showFlame;
      const scale = r.boostTimer > 0 ? 1.25 + Math.sin(this.elapsed * 45) * 0.25 : 0.55;
      f.scale.set(1, scale, 1);
    });

    const mood = r.finished ? 'victory' : r.spinTimer > 0 ? 'hit' : r.boostTimer > 0 ? 'boost' : 'idle';
    animateCharacterRig(r.rig.characterRig, this.elapsed, r.steerAngle, mood);

    if (r.boostTimer > 0 && Math.random() < 0.55) {
      this.spawnParticle(
        r.pos.x - fwdX * 1.4,
        r.pos.y + 0.5,
        r.pos.z - fwdZ * 1.4,
        -fwdX * 5 + (Math.random() - 0.5) * 2,
        1.2 + Math.random() * 1.5,
        -fwdZ * 5 + (Math.random() - 0.5) * 2,
        r.overdriveTimer > 0 ? '#EC4899' : '#38BDF8',
        0.22,
        0.7
      );
    }
  }

  private placeSkidMarks(r: RacerEntity) {
    const rightX = Math.cos(r.heading);
    const rightZ = -Math.sin(r.heading);
    const fwdX = Math.sin(r.heading);
    const fwdZ = Math.cos(r.heading);
    _quat.setFromAxisAngle(_upAxis, r.heading);
    _scale.set(1, 1, 1);

    [-0.75, 0.75].forEach((side) => {
      _v1.set(
        r.pos.x - fwdX * 0.95 + rightX * side,
        r.pos.y + 0.04,
        r.pos.z - fwdZ * 0.95 + rightZ * side
      );
      _mat4.compose(_v1, _quat, _scale);
      this.skidInstanced.setMatrixAt(this.skidWriteIdx, _mat4);
      this.skidWriteIdx = (this.skidWriteIdx + 1) % SKID_MAX;
    });
    this.skidInstanced.instanceMatrix.needsUpdate = true;
  }

  private rollWeightedPowerUp(r: RacerEntity): PowerUpType {
    if (r.condition < 60 && Math.random() < 0.25) return 'repair_kit';
    const pool = POWER_UP_LIST;
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  private activatePowerUp(r: RacerEntity) {
    const type = r.powerUp;
    if (!type) return;
    r.powerUp = null;
    r.powerUpsUsed++;

    if (r.isHuman && !r.isLocalP2) {
      soundEngine.playPowerUpUse(type);
      const itemMeta = TRANSLATIONS[this.settings.language].items[type];
      const colors: Record<PowerUpType, string> = {
        nitro_surge: '#F59E0B',
        seeker_pulse: '#EF4444',
        slick_trap: '#84CC16',
        aegis_dome: '#06B6D4',
        chrono_field: '#8B5CF6',
        overdrive_core: '#EC4899',
        repair_kit: '#10B981',
        nitro_charge: '#38BDF8',
      };
      this.pushBanner(itemMeta.name, colors[type]);
    }

    this.spawnPowerUpEffect(r, type, r.pos, r.heading, r.trackT, true);

    if (r.isHuman && !r.isLocalP2 && this.onPowerUpNetworkEmit) {
      this.onPowerUpNetworkEmit(type, r.pos.x, r.pos.y, r.pos.z, r.heading, r.trackT);
    }
  }

  private spawnPowerUpEffect(
    owner: RacerEntity,
    type: PowerUpType,
    origin: THREE.Vector3,
    heading: number,
    trackT: number,
    applyLocalSelfEffects: boolean
  ) {
    if (type === 'nitro_surge') {
      if (applyLocalSelfEffects) {
        owner.boostTimer = 2.4;
        owner.boostPower = 1.35;
        if (owner.isHuman && !owner.isLocalP2) this.setScreenFx('boost', 0.75);
      }
      this.spawnExplosion(origin, '#F59E0B');
    } else if (type === 'nitro_charge') {
      if (applyLocalSelfEffects) {
        owner.nitroCharge = Math.min(100, owner.nitroCharge + 55);
        owner.boostTimer = Math.max(owner.boostTimer, 1.85);
        owner.boostPower = 1.28;
        owner.speed = Math.max(owner.speed, 32);
        if (owner.isHuman && !owner.isLocalP2) this.setScreenFx('boost', 0.65);
      }
      this.spawnExplosion(origin, '#38BDF8');
    } else if (type === 'repair_kit') {
      owner.condition = Math.min(100, owner.condition + 50);
      owner.spinTimer = 0;
      owner.empTimer = 0;
      applyDamageVisuals(owner.rig, owner.condition);
      this.spawnExplosion(origin, '#10B981');
      if (owner.isHuman && !owner.isLocalP2 && applyLocalSelfEffects) {
        this.setScreenFx('repair', 0.6);
      }
    } else if (type === 'overdrive_core') {
      if (applyLocalSelfEffects) {
        owner.overdriveTimer = 7.0;
        owner.boostTimer = Math.max(owner.boostTimer, 1.4);
        if (owner.isHuman && !owner.isLocalP2) this.setScreenFx('boost', 0.7);
      }
      const waveMesh = buildPowerUpProjectileMesh('overdrive_core');
      waveMesh.position.copy(origin).add(new THREE.Vector3(0, 0.6, 0));
      this.scene.add(waveMesh);
      this.projectiles.push({
        id: `p_${Date.now()}_${Math.random()}`,
        ownerId: owner.id,
        type: 'overdrive_core',
        mesh: waveMesh,
        pos: waveMesh.position.clone(),
        vel: new THREE.Vector3(),
        trackT,
        life: 0.65,
      });
      for (const other of this.racers) {
        if (other.id === owner.id || other.isRemote || other.recoveryTimer > 0) continue;
        if (other.pos.distanceTo(origin) < 22) {
          if (other.shieldTimer > 0) {
            other.shieldTimer = 0;
          } else {
            other.slowTimer = 2.0;
            other.condition = Math.max(0, other.condition - 15);
            applyDamageVisuals(other.rig, other.condition);
          }
        }
      }
    } else if (type === 'aegis_dome') {
      owner.shieldTimer = 8.0;
      if (owner.isHuman && !owner.isLocalP2 && applyLocalSelfEffects) {
        this.setScreenFx('shield', 0.5);
      }
    } else if (type === 'chrono_field') {
      const waveMesh = buildPowerUpProjectileMesh('chrono_field');
      waveMesh.position.copy(origin).add(new THREE.Vector3(0, 0.6, 0));
      this.scene.add(waveMesh);
      this.projectiles.push({
        id: `p_${Date.now()}_${Math.random()}`,
        ownerId: owner.id,
        type: 'chrono_field',
        mesh: waveMesh,
        pos: waveMesh.position.clone(),
        vel: new THREE.Vector3(),
        trackT,
        life: 0.7,
      });
      for (const other of this.racers) {
        if (other.id === owner.id || other.recoveryTimer > 0) continue;
        if (other.pos.distanceTo(origin) < 28) {
          if (other.shieldTimer > 0) {
            other.shieldTimer = 0;
          } else {
            other.empTimer = 3.2;
            if (other.isHuman && !other.isLocalP2) {
              this.setScreenFx('emp', 0.65);
            }
          }
        }
      }
    } else if (type === 'slick_trap') {
      const mesh = buildPowerUpProjectileMesh('slick_trap');
      const backX = origin.x - Math.sin(heading) * 2.6;
      const backZ = origin.z - Math.cos(heading) * 2.6;
      mesh.position.set(backX, origin.y, backZ);
      this.scene.add(mesh);
      this.projectiles.push({
        id: `p_${Date.now()}_${Math.random()}`,
        ownerId: owner.id,
        type: 'slick_trap',
        mesh,
        pos: mesh.position.clone(),
        vel: new THREE.Vector3(),
        trackT,
        life: 16.0,
      });
    } else if (type === 'seeker_pulse') {
      const mesh = buildPowerUpProjectileMesh('seeker_pulse');
      const fwdX = Math.sin(heading);
      const fwdZ = Math.cos(heading);
      mesh.position.set(origin.x + fwdX * 2.4, origin.y + 0.8, origin.z + fwdZ * 2.4);
      mesh.rotation.y = heading;
      this.scene.add(mesh);

      // Strictly target closest opponent AHEAD of owner (never behind!)
      const target = this.findClosestAhead(owner);
      const speed = 64;
      this.projectiles.push({
        id: `p_${Date.now()}_${Math.random()}`,
        ownerId: owner.id,
        type: 'seeker_pulse',
        mesh,
        pos: mesh.position.clone(),
        vel: new THREE.Vector3(fwdX * speed, 0, fwdZ * speed),
        trackT,
        life: 5.5,
        targetId: target?.id,
      });
    }
  }

  private findClosestAhead(owner: RacerEntity): RacerEntity | null {
    let bestProg = Infinity;
    let best: RacerEntity | null = null;
    for (const cand of this.racers) {
      if (cand.id === owner.id || cand.finished || cand.cloakTimer > 0) continue;
      if (cand.progress > owner.progress && cand.progress < bestProg) {
        bestProg = cand.progress;
        best = cand;
      }
    }
    return best;
  }

  private stepProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;

      if (p.type === 'chrono_field' || p.type === 'overdrive_core') {
        const s = 1 + (0.7 - p.life) * 15;
        p.mesh.scale.setScalar(s);
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      if (p.type === 'slick_trap') {
        for (const r of this.racers) {
          if (r.isRemote || r.recoveryTimer > 0) continue;
          if (r.id === p.ownerId && p.life > 15.2) continue;
          if (r.pos.distanceToSquared(p.pos) < 3.8 && Math.abs(r.pos.y - p.pos.y) < 1.5) {
            if (r.shieldTimer > 0) {
              r.shieldTimer = 0;
            } else {
              r.spinTimer = 1.05;
              r.speed *= 0.4;
              r.condition = Math.max(0, r.condition - 18);
              applyDamageVisuals(r.rig, r.condition);
              this.triggerImpactFeedback(r, 0.3);
            }
            p.life = 0;
            break;
          }
        }
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      // Seeker Pulse homing
      if (p.type === 'seeker_pulse' && p.targetId) {
        const target = this.racers.find((r) => r.id === p.targetId);
        if (target) {
          _v1.subVectors(target.pos, p.pos);
          _v1.y = 0;
          if (_v1.lengthSq() > 0.1) {
            _v1.normalize().multiplyScalar(68);
            p.vel.lerp(_v1, 1 - Math.exp(-6.5 * dt));
            p.pos.y = THREE.MathUtils.lerp(p.pos.y, target.pos.y + 0.85, 0.22);
          }
        }
      } else if (this.builtTrack) {
        const closest = this.builtTrack.findClosestT(p.pos, p.trackT);
        p.trackT = closest.t;
        p.pos.y = closest.roadY + 0.85;
      }

      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.y = Math.atan2(p.vel.x, p.vel.z);

      let hit = false;
      for (const r of this.racers) {
        if (r.id === p.ownerId || r.isRemote || r.recoveryTimer > 0) continue;
        if (r.pos.distanceToSquared(p.pos) < 4.8 && Math.abs(r.pos.y - p.pos.y) < 2.2) {
          hit = true;
          if (r.shieldTimer > 0) {
            r.shieldTimer = 0;
            this.spawnExplosion(p.pos, '#22D3EE');
          } else {
            this.triggerCrash(r, 45);
          }
          break;
        }
      }

      if (hit || p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private resolveKartCollisions() {
    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i];
        const b = this.racers[j];
        if (a.recoveryTimer > 0 || b.recoveryTimer > 0) continue;

        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const distSq = dx * dx + dz * dz;
        const minDist = 2.15;
        if (distSq < minDist * minDist && distSq > 0.0001 && Math.abs(a.pos.y - b.pos.y) < 1.8) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = (minDist - dist) * 0.5;

          const totalWeight = a.stats.weight + b.stats.weight;
          const aShare = b.stats.weight / totalWeight;
          const bShare = a.stats.weight / totalWeight;

          if (!a.isRemote) {
            a.pos.x -= nx * overlap * aShare * 1.4;
            a.pos.z -= nz * overlap * aShare * 1.4;
          }
          if (!b.isRemote) {
            b.pos.x += nx * overlap * bShare * 1.4;
            b.pos.z += nz * overlap * bShare * 1.4;
          }

          const relSpeed = Math.abs(a.speed - b.speed);
          if (relSpeed > 18) {
            if (!a.isRemote) {
              a.condition = Math.max(0, a.condition - 12);
              applyDamageVisuals(a.rig, a.condition);
              if (a.condition <= 0) this.triggerCrash(a, 20);
            }
            if (!b.isRemote) {
              b.condition = Math.max(0, b.condition - 12);
              applyDamageVisuals(b.rig, b.condition);
              if (b.condition <= 0) this.triggerCrash(b, 20);
            }
          }

          if (a.shieldTimer > 0 && b.shieldTimer <= 0 && !b.isRemote) {
            b.spinTimer = 0.7;
          } else if (b.shieldTimer > 0 && a.shieldTimer <= 0 && !a.isRemote) {
            a.spinTimer = 0.7;
          }

          if ((a.isHuman || b.isHuman) && this.shakeTimer <= 0) {
            this.shakeTimer = 0.16;
            this.shakeIntensity = 0.25;
            soundEngine.playCollision();
          }
        }
      }
    }
  }

  private triggerImpactFeedback(r: RacerEntity, intensity: number) {
    if (r.isHuman && !r.isLocalP2) {
      this.hitstopTimer = 0.045;
      this.shakeTimer = 0.28;
      this.shakeIntensity = intensity;
      this.setScreenFx('hit', 0.35);
      soundEngine.playExplosion();
      soundEngine.playCharacterVoice(r.loadout.characterId, 'hit');
    }
  }

  private setScreenFx(fx: 'none' | 'boost' | 'hit' | 'emp' | 'repair' | 'shield', duration: number) {
    this.screenFx = fx;
    this.screenFxTimer = duration;
  }

  private updateStandings() {
    const sorted = [...this.racers].sort((a, b) => b.progress - a.progress);
    sorted.forEach((r, idx) => {
      (r as RacerEntity & { _rank?: number })._rank = idx + 1;
    });
  }

  private updateChaseCamera(
    target: RacerEntity,
    cam: THREE.PerspectiveCamera,
    camPos: THREE.Vector3,
    camLook: THREE.Vector3,
    dt: number
  ) {
    const fwdX = Math.sin(target.heading);
    const fwdZ = Math.cos(target.heading);
    const speedRatio = THREE.MathUtils.clamp(Math.abs(target.speed) / 42, 0, 1.3);

    const dist = 6.6 + (target.boostTimer > 0 ? 1.3 : 0);
    const height = 3.1 + (target.boostTimer > 0 ? 0.3 : 0);

    _v1.set(
      target.pos.x - fwdX * dist,
      target.pos.y + height,
      target.pos.z - fwdZ * dist
    );

    const posDamp = 1 - Math.exp(-9.5 * dt);
    camPos.lerp(_v1, posDamp);

    if (this.shakeTimer > 0 && !target.isLocalP2) {
      this.shakeTimer -= dt;
      cam.position.set(
        camPos.x + (Math.random() - 0.5) * this.shakeIntensity,
        camPos.y + (Math.random() - 0.5) * this.shakeIntensity,
        camPos.z + (Math.random() - 0.5) * this.shakeIntensity
      );
    } else {
      cam.position.copy(camPos);
    }

    _v2.set(
      target.pos.x + fwdX * 5.2,
      target.pos.y + 1.25,
      target.pos.z + fwdZ * 5.2
    );
    camLook.lerp(_v2, 1 - Math.exp(-13 * dt));
    cam.lookAt(camLook);

    const targetFov = this.settings.cameraFov + speedRatio * 9 + (target.boostTimer > 0 ? 8 : 0);
    if (Math.abs(cam.fov - targetFov) > 0.1) {
      cam.fov = THREE.MathUtils.damp(cam.fov, targetFov, 7, dt);
      cam.updateProjectionMatrix();
    }
  }

  private snapCameraToRacer(
    r: RacerEntity,
    cam: THREE.PerspectiveCamera,
    camPos: THREE.Vector3,
    camLook: THREE.Vector3
  ) {
    const fwdX = Math.sin(r.heading);
    const fwdZ = Math.cos(r.heading);
    camPos.set(r.pos.x - fwdX * 6.8, r.pos.y + 3.2, r.pos.z - fwdZ * 6.8);
    camLook.set(r.pos.x + fwdX * 5, r.pos.y + 1.2, r.pos.z + fwdZ * 5);
    cam.position.copy(camPos);
    cam.lookAt(camLook);
  }

  private spawnParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    hex: string,
    maxLife: number,
    size: number
  ) {
    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.pos.set(x, y, z);
        p.vel.set(vx, vy, vz);
        p.life = maxLife;
        p.maxLife = maxLife;
        p.size = size;
        p.color.set(hex);
        return;
      }
    }
  }

  private spawnExplosion(pos: THREE.Vector3, hex: string) {
    for (let i = 0; i < 16; i++) {
      this.spawnParticle(
        pos.x,
        pos.y + 0.5,
        pos.z,
        (Math.random() - 0.5) * 14,
        3 + Math.random() * 8,
        (Math.random() - 0.5) * 14,
        hex,
        0.42,
        1.1
      );
    }
  }

  private updateParticles(dt: number) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) {
        _mat4.makeScale(0, 0, 0);
        this.particleInstanced.setMatrixAt(i, _mat4);
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleInstanced.setMatrixAt(i, _mat4);
        continue;
      }
      p.vel.y -= 9.8 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const s = p.size * (p.life / p.maxLife);
      _scale.set(s, s, s);
      _quat.identity();
      _mat4.compose(p.pos, _quat, _scale);
      this.particleInstanced.setMatrixAt(i, _mat4);
      this.particleInstanced.setColorAt(i, p.color);
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;
    if (this.particleInstanced.instanceColor) {
      this.particleInstanced.instanceColor.needsUpdate = true;
    }
  }

  private pushBanner(text: string, color: string) {
    this.eventBanner = { text, color, id: this.bannerSeq++, timer: 1.5 };
  }

  private computeTargetLock(p1Entity: RacerEntity | undefined): TargetLockInfo | null {
    if (!p1Entity || this.racePhase !== 'racing') return null;
    const ahead = this.findClosestAhead(p1Entity);
    if (!ahead) return null;

    const dist = p1Entity.pos.distanceTo(ahead.pos);
    if (dist > 130) return null;

    this.camera1.updateMatrixWorld();
    _projVec.set(ahead.pos.x, ahead.pos.y + 1.05, ahead.pos.z).project(this.camera1);
    const screenX = (_projVec.x + 1) * 0.5;
    const screenY = (-_projVec.y + 1) * 0.5;
    const visible =
      _projVec.z > -1 && _projVec.z < 1 && screenX >= 0.05 && screenX <= 0.95 && screenY >= 0.05 && screenY <= 0.95;

    return {
      racerId: ahead.id,
      racerName: ahead.name,
      distanceMeters: Math.round(dist),
      screenX,
      screenY,
      visible,
    };
  }

  private buildTelemetryFrame(): RaceTelemetryFrame {
    const sorted = [...this.racers].sort((a, b) => b.progress - a.progress);
    const toHud = (r: RacerEntity, rank: number): RacerHudState => ({
      id: r.id,
      name: r.name,
      characterId: r.loadout.characterId,
      isHuman: r.isHuman,
      isLocalP2: r.isLocalP2,
      position: rank,
      lap: Math.min(r.lap, r.totalLaps),
      totalLaps: r.totalLaps,
      progress: r.progress,
      speedKmh: Math.round(Math.abs(r.speed) * 4.4),
      driftCharge: r.driftCharge,
      driftLevel: r.driftLevel,
      boostMeter: Math.min(1, r.boostTimer / 2.2),
      nitroCharge: Math.round(r.nitroCharge),
      condition: Math.round(r.condition),
      crashing: r.crashTimer > 0,
      recovering: r.recoveryTimer > 0,
      powerUp: r.powerUp,
      shieldActive: r.shieldTimer > 0,
      cloakActive: r.cloakTimer > 0,
      overdriveActive: r.overdriveTimer > 0,
      finished: r.finished,
      finishTimeMs: r.finishTimeMs,
      bestLapMs: r.bestLapMs,
      coinsCollected: r.coinsCollected,
      x: r.pos.x,
      z: r.pos.z,
      heading: r.heading,
    });

    const hudRacers = sorted.map((r, i) => toHud(r, i + 1));
    const p1 = hudRacers.find((r) => r.isHuman && !r.isLocalP2) || hudRacers[0];
    const p2 = hudRacers.find((r) => r.isLocalP2);

    const r1 = this.racers.find((r) => r.id === p1?.id);
    const r2 = p2 ? this.racers.find((r) => r.id === p2.id) : undefined;

    return {
      phase: this.racePhase,
      countdownValue: Math.max(0, Math.ceil(this.countdownTimer)),
      elapsedMs: this.raceElapsedMs,
      racers: hudRacers,
      player1: p1,
      player2: p2,
      wrongWayP1: Boolean(r1?.wrongWay),
      wrongWayP2: Boolean(r2?.wrongWay),
      targetLock: this.computeTargetLock(r1),
      screenFx: this.screenFx,
      eventBanner: this.eventBanner
        ? { text: this.eventBanner.text, color: this.eventBanner.color, id: this.eventBanner.id }
        : undefined,
    };
  }

  private emitTelemetryNow() {
    if (this.mode !== 'race' || !this.onTelemetry || this.racers.length === 0) return;
    this.onTelemetry(this.buildTelemetryFrame());
  }

  // === INPUT HANDLING (Keyboard + Touch + Gamepad) ===
  private readKeyboardInputs() {
    const k = this.keysHeld;
    const isSplit = this.raceMode === 'local_split';

    const up1 = k.has('KeyW') || (!isSplit && k.has('ArrowUp'));
    const down1 = k.has('KeyS') || (!isSplit && k.has('ArrowDown'));
    const left1 = k.has('KeyA') || (!isSplit && k.has('ArrowLeft'));
    const right1 = k.has('KeyD') || (!isSplit && k.has('ArrowRight'));
    const drift1 = k.has('ShiftLeft') || (!isSplit && k.has('ShiftRight'));

    let gpThrottle = 0;
    let gpBrake = 0;
    let gpSteer = 0;
    let gpDrift = false;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = pads?.[0];
      if (pad) {
        const ax = Math.abs(pad.axes[0] || 0) > 0.14 ? -(pad.axes[0] || 0) : 0;
        gpSteer = ax;
        gpThrottle = Math.max(pad.buttons[7]?.value || 0, pad.buttons[0]?.pressed ? 1 : 0);
        gpBrake = Math.max(pad.buttons[6]?.value || 0, pad.buttons[1]?.pressed ? 1 : 0);
        gpDrift = Boolean(pad.buttons[5]?.pressed || pad.buttons[2]?.pressed);
        const jumpDown = Boolean(pad.buttons[0]?.pressed && pad.buttons[5]?.pressed);
        const itemDown = Boolean(pad.buttons[3]?.pressed || pad.buttons[4]?.pressed);
        if (jumpDown && !this.gamepadPrevJump) this.p1Input.jumpPressed = true;
        if (itemDown && !this.gamepadPrevItem) this.p1Input.useItemPressed = true;
        this.gamepadPrevJump = jumpDown;
        this.gamepadPrevItem = itemDown;
      }
    } catch {
      // ignore unsupported gamepad APIs
    }

    const kbSteer1 = (left1 ? 1 : 0) - (right1 ? 1 : 0);
    const touchSteer = this.touchInput.steer ?? 0;

    this.p1Input.throttle = Math.max(up1 ? 1 : 0, this.touchInput.throttle ?? 0, gpThrottle);
    this.p1Input.brake = Math.max(down1 ? 1 : 0, this.touchInput.brake ?? 0, gpBrake);
    this.p1Input.steer =
      Math.abs(touchSteer) > 0.05 ? touchSteer : Math.abs(gpSteer) > 0.14 ? gpSteer : kbSteer1;
    this.p1Input.drift = drift1 || Boolean(this.touchInput.drift) || gpDrift;

    if (isSplit) {
      this.p2Input.throttle = k.has('ArrowUp') ? 1 : 0;
      this.p2Input.brake = k.has('ArrowDown') ? 1 : 0;
      this.p2Input.steer = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0);
      this.p2Input.drift = k.has('ShiftRight') || k.has('Slash');
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (!this.keysHeld.has(e.code)) {
      if (e.code === 'Space') this.p1Input.jumpPressed = true;
      if (e.code === 'KeyR') this.triggerLocalRecover();
      if (e.code === 'KeyE' || e.code === 'KeyF' || (this.raceMode !== 'local_split' && e.code === 'Enter')) {
        this.p1Input.useItemPressed = true;
      }
      if (this.raceMode === 'local_split') {
        if (e.code === 'Enter' || e.code === 'ControlRight') this.p2Input.useItemPressed = true;
        if (e.code === 'Period') this.p2Input.jumpPressed = true;
      }
    }
    this.keysHeld.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
  };

  private handleBlur = () => {
    this.keysHeld.clear();
  };

  private bindInputEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera1.aspect = w / h;
    this.camera1.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public getTrackSplineMinimap(): { x: number; z: number }[] {
    if (!this.builtTrack) return [];
    return this.builtTrack.samples.filter((_, i) => i % 4 === 0).map((s) => ({ x: s.point.x, z: s.point.z }));
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    soundEngine.stopEngineLoop();
    this.orbitControls?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
