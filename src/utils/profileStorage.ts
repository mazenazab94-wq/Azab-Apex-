import { createInitialDailyChallenges } from '../data/progression';
import { GameSettings, PlayerProfile } from '../types/game';

const PROFILE_KEY = 'nitro_apex_profile_v2';
const SETTINGS_KEY = 'nitro_apex_settings_v2';

export function xpForNextLevel(level: number): number {
  return 250 + (level - 1) * 180;
}

export function createDefaultProfile(): PlayerProfile {
  const num = Math.floor(1000 + Math.random() * 8999);
  const pid = `racer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    playerId: pid,
    name: `متسابق_${num}`,
    tag: `APEX#${num}`,
    level: 1,
    xp: 0,
    coins: 950,
    wins: 0,
    racesPlayed: 0,
    driftsCompleted: 0,
    powerUpsUsed: 0,
    unlockedCharacters: [
      'blaze_vex',
      'volt_dash',
      'pip_sprout',
      'zippy_fox',
      'drift_yuki',
      'aero_wren',
      'ace_carter',
      'sunny_coco',
      'titan_kong',
    ],
    unlockedKarts: [
      'apex_classic',
      'nitro_sprint',
      'valkyrie_gt',
      'aether_hover',
      'crush_titan',
    ],
    unlockedParts: ['alloy', 'slick', 'gt', 'none', 'stripes', 'stock_twin', 'standard'],
    unlockedTracks: [
      'coco_bay',
      'sunspire_ruins',
      'mojave_mirage',
      'frostpeak_summit',
      'caldera_inferno',
      'neo_tokyo',
    ],
    unlockedAchievements: [],
    dailyChallenges: createInitialDailyChallenges(),
    friends: [],
    bestTrackTimes: {},
    loadout: {
      characterId: 'blaze_vex',
      skinId: 'classic',
      kartId: 'apex_classic',
      wheelId: 'alloy',
      tireId: 'slick',
      spoilerId: 'gt',
      paintColor: '#EF4444',
      decalId: 'stripes',
      engineId: 'stock_twin',
      exhaustId: 'standard',
    },
  };
}

export function loadLocalProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerProfile;
      if (parsed.playerId && parsed.loadout) {
        return {
          ...createDefaultProfile(),
          ...parsed,
        };
      }
    }
  } catch {
    // fallback
  }
  const fresh = createDefaultProfile();
  saveLocalProfile(fresh);
  return fresh;
}

export function saveLocalProfile(profile: PlayerProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore quota
  }
}

export async function syncProfileToServer(profile: PlayerProfile): Promise<PlayerProfile> {
  saveLocalProfile(profile);
  try {
    const res = await fetch('/api/profile/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.profile) {
        saveLocalProfile(data.profile);
        return data.profile;
      }
    }
  } catch {
    // offline fallback
  }
  return profile;
}

export function getDefaultSettings(): GameSettings {
  const isTouch =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 900);
  return {
    language: 'ar',
    difficulty: 'medium',
    timeOfDay: 'day',
    weather: 'clear',
    masterVolume: 0.75,
    musicVolume: 0.55,
    sfxVolume: 0.85,
    muted: false,
    cameraFov: 66,
    showMinimap: true,
    quality: 'high',
    mobile: {
      enabled: isTouch,
      mode: 'buttons',
      preset: 'standard',
      buttonScale: 1,
      steerOffsetX: 0,
      steerOffsetY: 0,
      actionOffsetX: 0,
      actionOffsetY: 0,
    },
  };
}

export function loadLocalSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...getDefaultSettings(), ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return getDefaultSettings();
}

export function saveLocalSettings(settings: GameSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function formatRaceTime(ms: number): string {
  if (!ms || ms <= 0) return '--:--.--';
  const totalSec = ms / 1000;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}
