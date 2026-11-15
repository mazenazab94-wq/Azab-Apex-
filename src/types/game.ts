export type Language = 'ar' | 'en';
export type DrivingDifficulty = 'easy' | 'medium' | 'pro';
export type TimeOfDay = 'day' | 'sunset' | 'night';
export type WeatherCondition = 'clear' | 'rain';

export type CharacterCategory =
  | 'speed'
  | 'acceleration'
  | 'handling'
  | 'balanced'
  | 'power';

export type CharacterArchetype =
  | 'fox'
  | 'robot'
  | 'lizard'
  | 'cat'
  | 'bear'
  | 'rhino'
  | 'golem'
  | 'monkey'
  | 'racer'
  | 'alien'
  | 'bird'
  | 'shark';

export interface CharacterSkin {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  cost: number;
}

export interface CharacterStats {
  speed: number;
  acceleration: number;
  handling: number;
  weight: number;
  drift: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  category: CharacterCategory;
  archetype: CharacterArchetype;
  quote: string;
  stats: CharacterStats;
  voicePitch: number;
  voiceType: 'chirp' | 'roar' | 'synth' | 'hero' | 'trickster';
  unlockCost: number;
  skins: CharacterSkin[];
}

export type KartClass =
  | 'classic'
  | 'sports'
  | 'hover'
  | 'monster'
  | 'offroad'
  | 'lightweight'
  | 'heavy';

export interface KartDef {
  id: string;
  name: string;
  kartClass: KartClass;
  description: string;
  statsBonus: Partial<CharacterStats>;
  unlockCost: number;
  chassisLength: number;
  chassisWidth: number;
  chassisHeight: number;
  noseStyle: 'wedge' | 'round' | 'flat' | 'fang' | 'pod' | 'blade';
  isHover?: boolean;
  defaultColor: string;
}

export interface WheelDef {
  id: string;
  name: string;
  style: 'alloy' | 'spoke' | 'monster' | 'hover' | 'aero' | 'gold';
  radius: number;
  width: number;
  unlockCost: number;
}

export interface TireDef {
  id: string;
  name: string;
  color: string;
  treadColor: string;
  emissive?: string;
  gripBonus: number;
  unlockCost: number;
}

export interface SpoilerDef {
  id: string;
  name: string;
  style: 'none' | 'gt' | 'twin' | 'monster' | 'cyber' | 'horns';
  unlockCost: number;
}

export interface DecalDef {
  id: string;
  name: string;
  pattern: 'none' | 'stripes' | 'lightning' | 'flames' | 'checkered' | 'star' | 'cyber' | 'dragon';
  unlockCost: number;
}

export interface EngineDef {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  speedBonus: number;
  accelBonus: number;
  unlockCost: number;
}

export interface ExhaustDef {
  id: string;
  name: string;
  flameColor: string;
  coreColor: string;
  unlockCost: number;
}

export interface KartLoadout {
  characterId: string;
  skinId: string;
  kartId: string;
  wheelId: string;
  tireId: string;
  spoilerId: string;
  paintColor: string;
  decalId: string;
  engineId: string;
  exhaustId: string;
}

export type TrackTheme =
  | 'tropical'
  | 'temple'
  | 'desert'
  | 'snow'
  | 'volcano'
  | 'cyber'
  | 'haunted'
  | 'jungle'
  | 'ocean'
  | 'space';

export interface TrackFeaturePoint {
  t: number;
  offset: number;
  type: 'ramp' | 'boost' | 'obstacle' | 'shortcut' | 'crate_row' | 'coin_arc';
  obstacleKind?: 'pendulum' | 'boulder' | 'laser' | 'crab' | 'drone';
}

export interface TrackDef {
  id: string;
  name: string;
  theme: TrackTheme;
  subtitle: string;
  laps: number;
  trackWidth: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  skyColor: string;
  fogColor: string;
  fogDensity: number;
  roadColor: string;
  kerbColorA: string;
  kerbColorB: string;
  groundColor: string;
  accentColor: string;
  sunColor: string;
  controlPoints: [number, number, number][];
  features: TrackFeaturePoint[];
  shortcutNote: string;
  unlockCost: number;
}

export type PowerUpType =
  | 'nitro_surge'
  | 'aegis_dome'
  | 'seeker_pulse'
  | 'chrono_field'
  | 'slick_trap'
  | 'overdrive_core'
  | 'repair_kit'
  | 'nitro_charge';

export interface PowerUpMeta {
  id: PowerUpType;
  name: string;
  shortDesc: string;
  color: string;
}

export type GameMode =
  | 'single'
  | 'online_public'
  | 'online_private'
  | 'championship'
  | 'time_trial'
  | 'practice'
  | 'tournament'
  | 'local_split';

export interface TargetLockInfo {
  racerId: string;
  racerName: string;
  distanceMeters: number;
  screenX: number; // 0..1 normalized viewport
  screenY: number; // 0..1 normalized viewport
  visible: boolean;
}

export interface RacerHudState {
  id: string;
  name: string;
  characterId: string;
  isHuman: boolean;
  isLocalP2?: boolean;
  position: number;
  lap: number;
  totalLaps: number;
  progress: number;
  speedKmh: number;
  driftCharge: number;
  driftLevel: 0 | 1 | 2 | 3;
  boostMeter: number;
  nitroCharge: number; // 0..100
  condition: number;   // 0..100 vehicle condition
  crashing: boolean;
  recovering: boolean;
  powerUp: PowerUpType | null;
  shieldActive: boolean;
  cloakActive: boolean;
  overdriveActive: boolean;
  finished: boolean;
  finishTimeMs: number;
  bestLapMs: number;
  coinsCollected: number;
  x: number;
  z: number;
  heading: number;
}

export interface RaceTelemetryFrame {
  phase: 'countdown' | 'racing' | 'paused' | 'finished';
  countdownValue: number;
  elapsedMs: number;
  racers: RacerHudState[];
  player1: RacerHudState;
  player2?: RacerHudState;
  wrongWayP1: boolean;
  wrongWayP2?: boolean;
  targetLock: TargetLockInfo | null;
  screenFx: 'none' | 'boost' | 'hit' | 'emp' | 'repair' | 'shield';
  eventBanner?: { text: string; color: string; id: number };
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  claimed: boolean;
  metric: 'races' | 'wins' | 'drifts' | 'powerups' | 'coins';
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXp: number;
}

export interface PlayerProfile {
  playerId: string;
  name: string;
  tag: string;
  level: number;
  xp: number;
  coins: number;
  wins: number;
  racesPlayed: number;
  driftsCompleted: number;
  powerUpsUsed: number;
  unlockedCharacters: string[];
  unlockedKarts: string[];
  unlockedParts: string[];
  unlockedTracks: string[];
  unlockedAchievements: string[];
  dailyChallenges: DailyChallenge[];
  friends: { playerId: string; name: string; tag: string; online?: boolean }[];
  bestTrackTimes: Record<string, number>;
  loadout: KartLoadout;
}

export interface MobileControlsConfig {
  enabled: boolean;
  mode: 'buttons' | 'touch_drag' | 'tilt';
  preset: 'standard' | 'left_handed' | 'wide' | 'compact';
  buttonScale: number;
  steerOffsetX: number;
  steerOffsetY: number;
  actionOffsetX: number;
  actionOffsetY: number;
}

export interface GameSettings {
  language: Language;
  difficulty: DrivingDifficulty;
  timeOfDay: TimeOfDay;
  weather: WeatherCondition;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  cameraFov: number;
  showMinimap: boolean;
  quality: 'high' | 'balanced';
  mobile: MobileControlsConfig;
}

export interface RoomPlayer {
  playerId: string;
  name: string;
  tag: string;
  characterId: string;
  loadout: KartLoadout;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  slotIndex: number;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface RoomState {
  code: string;
  isPublic: boolean;
  locked: boolean;
  hostId: string;
  trackId: string;
  laps: number;
  maxPlayers: number;
  timeOfDay: TimeOfDay;
  weather: WeatherCondition;
  fillWithAi: boolean;
  status: 'lobby' | 'countdown' | 'racing' | 'results';
  players: RoomPlayer[];
  chat: ChatMessage[];
  countdownSec?: number;
  raceStartEpoch?: number;
}

export interface RemoteKartNetState {
  playerId: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  steer: number;
  drifting: boolean;
  driftLevel: number;
  boosting: boolean;
  braking: boolean;
  crashing: boolean;
  recovering: boolean;
  condition: number;
  shieldActive: boolean;
  cloakActive: boolean;
  lap: number;
  t: number;
  progress: number;
  finished: boolean;
  finishTimeMs: number;
  seq: number;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  tag: string;
  characterId: string;
  kartId: string;
  trackId: string;
  timeMs: number;
  updatedAt: number;
}
