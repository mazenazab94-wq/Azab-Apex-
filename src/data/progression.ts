import {
  AchievementDef,
  CharacterStats,
  DailyChallenge,
  KartLoadout,
  PowerUpMeta,
  PowerUpType,
} from '../types/game';
import { getCharacterById } from './characters';
import { ENGINES, getKartById, TIRES } from './karts';

export const POWER_UPS: Record<PowerUpType, PowerUpMeta> = {
  nitro_surge: {
    id: 'nitro_surge',
    name: 'Turbo Boost',
    shortDesc: 'Temporarily increases vehicle speed',
    color: '#F59E0B',
  },
  seeker_pulse: {
    id: 'seeker_pulse',
    name: 'Energy Projectile',
    shortDesc: 'Targets closest rival ahead',
    color: '#EF4444',
  },
  slick_trap: {
    id: 'slick_trap',
    name: 'Oil Trap',
    shortDesc: 'Creates temporary slippery hazard',
    color: '#84CC16',
  },
  aegis_dome: {
    id: 'aegis_dome',
    name: 'Protective Shield',
    shortDesc: 'Shields vehicle from attacks',
    color: '#06B6D4',
  },
  chrono_field: {
    id: 'chrono_field',
    name: 'EMP Pulse',
    shortDesc: 'Affects nearby rivals controls',
    color: '#8B5CF6',
  },
  overdrive_core: {
    id: 'overdrive_core',
    name: 'Speed Wave',
    shortDesc: 'Energy wave impacting nearby racers',
    color: '#EC4899',
  },
  repair_kit: {
    id: 'repair_kit',
    name: 'Repair Kit',
    shortDesc: 'Restores vehicle condition',
    color: '#10B981',
  },
  nitro_charge: {
    id: 'nitro_charge',
    name: 'Nitro Charge',
    shortDesc: 'Extra acceleration & nitro fill',
    color: '#38BDF8',
  },
};

export const POWER_UP_LIST: PowerUpMeta[] = Object.values(POWER_UPS);

export interface CupDef {
  id: string;
  name: string;
  nameAr: string;
  subtitle: string;
  subtitleAr: string;
  trackIds: string[];
  rewardCoins: number;
  accent: string;
}

export const CHAMPIONSHIP_CUPS: CupDef[] = [
  {
    id: 'nitro_cup',
    name: 'Nitro Grand Prix',
    nameAr: 'جائزة نيترو الكبرى',
    subtitle: 'Coastal & Canyon Classics',
    subtitleAr: 'كلاسيكيات السواحل والصحراء',
    trackIds: ['coco_bay', 'mojave_mirage', 'sunspire_ruins', 'frostpeak_summit'],
    rewardCoins: 800,
    accent: '#F59E0B',
  },
  {
    id: 'apex_cup',
    name: 'Apex Championship',
    nameAr: 'بطولة أبيكس الذهبية',
    subtitle: 'Volcanic & Neon Showdown',
    subtitleAr: 'تحدي البراكين والمدن الليلية',
    trackIds: ['neo_tokyo', 'caldera_inferno', 'emerald_canopy', 'coral_speedway'],
    rewardCoins: 1200,
    accent: '#06B6D4',
  },
  {
    id: 'phantom_cup',
    name: 'Phantom Cup',
    nameAr: 'كأس الشبح السريع',
    subtitle: 'Haunted & Glacier Trials',
    subtitleAr: 'اختبارات الجليد والغابات',
    trackIds: ['hollowood_hollow', 'glacier_gorge', 'pharaoh_dune', 'witching_marsh'],
    rewardCoins: 1500,
    accent: '#A855F7',
  },
  {
    id: 'hyperion_cup',
    name: 'Hyperion Galactic',
    nameAr: 'كأس هايبريون المداري',
    subtitle: 'Extreme Circuits & Orbitals',
    subtitleAr: 'أصعب المضامير والمدارات',
    trackIds: ['skyline_metro', 'magma_foundry', 'orbital_starway', 'hyperion_station'],
    rewardCoins: 2000,
    accent: '#EF4444',
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_race', title: 'انطلاق الأضواء', description: 'أكمل أول سباق ثلاثي الأبعاد.', rewardCoins: 200, rewardXp: 150 },
  { id: 'first_win', title: 'المركز الذهبي', description: 'فز بالمركز الأول في أي سباق.', rewardCoins: 350, rewardXp: 250 },
  { id: 'drift_master', title: 'أسطورة الانجراف', description: 'أتمم 25 انجرافاً توربينياً.', rewardCoins: 400, rewardXp: 300 },
  { id: 'item_ace', title: 'تكتيك الحلبة', description: 'استخدم 20 أداة سباق.', rewardCoins: 300, rewardXp: 250 },
  { id: 'garage_tuner', title: 'مهندس المرآب', description: 'خصّص سيارتك داخل المرآب ثلاثي الأبعاد.', rewardCoins: 250, rewardXp: 200 },
  { id: 'online_racer', title: 'منافس عالمي', description: 'شارك في سباق جماعي عبر الإنترنت.', rewardCoins: 500, rewardXp: 400 },
  { id: 'champ_winner', title: 'بطل الكأس', description: 'فز ببطولة من 4 جولات.', rewardCoins: 800, rewardXp: 600 },
  { id: 'collector_10', title: 'جامع السيارات', description: 'افتح 10 سيارات أو سائقين.', rewardCoins: 600, rewardXp: 500 },
  { id: 'speed_demon', title: 'ملك السرعة', description: 'حقق 5 انتصارات إجمالاً.', rewardCoins: 750, rewardXp: 550 },
  { id: 'time_breaker', title: 'دقة الساعة', description: 'أكمل جولة في سباق الزمن.', rewardCoins: 300, rewardXp: 250 },
  { id: 'split_screen', title: 'منافسة محلية', description: 'العب سباق شاشة مقسمة للاعبين.', rewardCoins: 350, rewardXp: 300 },
  { id: 'veteran_10', title: 'سائق محترف', description: 'أكمل 10 سباقات.', rewardCoins: 1000, rewardXp: 800 },
];

export function createInitialDailyChallenges(): DailyChallenge[] {
  return [
    {
      id: 'dc_races',
      title: 'إحماء يومي',
      description: 'أكمل سباقين في أي وضع',
      target: 2,
      progress: 0,
      rewardCoins: 300,
      rewardXp: 200,
      claimed: false,
      metric: 'races',
    },
    {
      id: 'dc_drifts',
      title: 'أخصائي الانجراف',
      description: 'نفّذ 10 انجرافات مع توربو',
      target: 10,
      progress: 0,
      rewardCoins: 400,
      rewardXp: 250,
      claimed: false,
      metric: 'drifts',
    },
    {
      id: 'dc_win',
      title: 'مجد خط النهاية',
      description: 'حقق المركز الأول في سباق واحد',
      target: 1,
      progress: 0,
      rewardCoins: 500,
      rewardXp: 350,
      claimed: false,
      metric: 'wins',
    },
  ];
}

export const PRESET_CHAT_MESSAGES: string[] = [
  'جاهز للسباق!',
  'بالتوفيق للجميع!',
  'انتبه من التوربو!',
  'سباق رائع!',
  'سباق إضافي؟',
  'اختر مضماراً أصعب!',
  'أحسنتم جميعاً!',
  'نلتقي عند خط النهاية!',
];

export function computeCombinedStats(loadout: KartLoadout): CharacterStats {
  const char = getCharacterById(loadout.characterId);
  const kart = getKartById(loadout.kartId);
  const tire = TIRES.find((t) => t.id === loadout.tireId) || TIRES[0];
  const engine = ENGINES.find((e) => e.id === loadout.engineId) || ENGINES[0];

  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n * 10) / 10));

  return {
    speed: clamp(char.stats.speed * 0.7 + (kart.statsBonus.speed || 0) + engine.speedBonus),
    acceleration: clamp(char.stats.acceleration * 0.7 + (kart.statsBonus.acceleration || 0) + engine.accelBonus),
    handling: clamp(char.stats.handling * 0.75 + (kart.statsBonus.handling || 0) + tire.gripBonus),
    weight: clamp(char.stats.weight * 0.75 + (kart.statsBonus.weight || 0)),
    drift: clamp(char.stats.drift * 0.75 + (kart.statsBonus.drift || 0) + tire.gripBonus * 0.5),
  };
}
