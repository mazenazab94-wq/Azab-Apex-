import { ArrowLeft, ArrowRight, Check, Coins, Lock, User, Volume2, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { soundEngine } from '../audio/SoundEngine';
import { CHARACTERS, getCharacterById } from '../data/characters';
import {
  DECALS,
  ENGINES,
  EXHAUSTS,
  getKartById,
  KARTS,
  PAINT_COLORS,
  SPOILERS,
  TIRES,
  WHEELS,
} from '../data/karts';
import { computeCombinedStats } from '../data/progression';
import {
  getCharacterLocalized,
  getKartLocalized,
  getPartLocalized,
  PAINT_COLORS_AR,
  SKIN_NAMES_AR,
} from '../i18n/catalogAr';
import { TRANSLATIONS } from '../i18n/translations';
import {
  CharacterCategory,
  KartClass,
  KartLoadout,
  Language,
  PlayerProfile,
} from '../types/game';

export type GarageTab =
  | 'chassis'
  | 'wheels'
  | 'tires'
  | 'spoilers'
  | 'paint'
  | 'decals'
  | 'engine'
  | 'exhaust';

interface GarageModalProps {
  profile: PlayerProfile;
  language: Language;
  initialTab?: GarageTab;
  onUpdateLoadout: (next: KartLoadout) => void;
  onUnlockKart: (kartId: string, cost: number) => void;
  onUnlockPart: (partId: string, cost: number) => void;
  onUnlockCharacter: (characterId: string, cost: number) => void;
  onClose: () => void;
}

const KART_CLASS_IDS: ('all' | KartClass)[] = [
  'all',
  'classic',
  'sports',
  'hover',
  'monster',
  'offroad',
  'lightweight',
  'heavy',
];

const DRIVER_CATEGORIES: ('all' | CharacterCategory)[] = [
  'all',
  'speed',
  'acceleration',
  'handling',
  'balanced',
  'power',
];

export function GarageModal({
  profile,
  language,
  initialTab = 'chassis',
  onUpdateLoadout,
  onUnlockKart,
  onUnlockPart,
  onUnlockCharacter,
  onClose,
}: GarageModalProps) {
  const tr = TRANSLATIONS[language];
  const [section, setSection] = useState<'tuning' | 'drivers'>('tuning');
  const [tab, setTab] = useState<GarageTab>(initialTab);
  const [classFilter, setClassFilter] = useState<'all' | KartClass>('all');

  // Driver sub-section state
  const [driverFilter, setDriverFilter] = useState<'all' | CharacterCategory>('all');
  const [focusedDriverId, setFocusedDriverId] = useState(profile.loadout.characterId);
  const [focusedSkinId, setFocusedSkinId] = useState(profile.loadout.skinId);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const loadout = profile.loadout;
  const activeKart = getKartById(loadout.kartId);
  const activeKartLoc = getKartLocalized(activeKart, language);
  const stats = computeCombinedStats(loadout);
  const filteredKarts =
    classFilter === 'all' ? KARTS : KARTS.filter((k) => k.kartClass === classFilter);

  const focusedChar = getCharacterById(focusedDriverId);
  const focusedCharLoc = getCharacterLocalized(focusedChar, language);
  const isDriverUnlocked = profile.unlockedCharacters.includes(focusedChar.id);
  const filteredDrivers =
    driverFilter === 'all' ? CHARACTERS : CHARACTERS.filter((c) => c.category === driverFilter);

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div
      className={`${
        section === 'drivers' ? 'bg-slate-950/95' : 'pointer-events-none'
      } fixed inset-0 z-30 flex flex-col justify-between p-4 md:p-5`}
    >
      {/* Top Bar: Back + Section Switcher + Combined Stats */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto apex-surface apex-stripe-top rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border border-white/10"
          >
            <BackIcon className="w-4 h-4" />
            {tr.saveAndExit}
          </button>

          {/* Unified Garage / Drivers Switcher */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setSection('tuning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                section === 'tuning'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              {tr.garageTabLabel}
            </button>
            <button
              onClick={() => setSection('drivers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                section === 'drivers'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              {tr.driversTab}
            </button>
          </div>

          {section === 'tuning' && (
            <div className="hidden lg:block">
              <p className="text-[11px] text-slate-400">{tr.garageHint}</p>
            </div>
          )}
        </div>

        <div className="pointer-events-auto apex-surface rounded-2xl px-4 py-2.5 flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            {(
              [
                [tr.speed, stats.speed, '#EF4444'],
                [tr.acceleration, stats.acceleration, '#F59E0B'],
                [tr.handling, stats.handling, '#06B6D4'],
                [tr.drift, stats.drift, '#A855F7'],
              ] as const
            ).map(([k, v, c]) => (
              <div key={k} className="w-20">
                <div className="flex justify-between font-mono-num font-bold text-slate-200 gap-1">
                  <span className="truncate">{k}</span>
                  <span>{v}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded overflow-hidden mt-0.5">
                  <div className="h-full" style={{ width: `${v * 10}%`, backgroundColor: c }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-sm font-mono-num font-bold text-amber-400">
            <Coins className="w-4 h-4" />
            {profile.coins} {tr.coins}
          </div>
        </div>
      </div>

      {/* Section 1: 3D Vehicle Tuning Dock (unobstructed center 3D viewport) */}
      {section === 'tuning' ? (
        <div className="pointer-events-auto apex-surface apex-stripe-top rounded-2xl p-3.5 max-w-5xl w-full mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1">
              {(
                [
                  ['chassis', tr.tabChassis],
                  ['paint', tr.tabPaint],
                  ['decals', tr.tabDecals],
                  ['wheels', tr.tabWheels],
                  ['tires', tr.tabTires],
                  ['spoilers', tr.tabSpoilers],
                  ['engine', tr.tabEngine],
                  ['exhaust', tr.tabExhaust],
                ] as [GarageTab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    tab === id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="hidden md:inline text-xs text-slate-400 whitespace-nowrap">
              {activeKartLoc.name} · {tr.kartClasses[activeKart.kartClass]}
            </span>
          </div>

          {tab === 'chassis' && (
            <div className="flex items-center gap-1 overflow-x-auto">
              {KART_CLASS_IDS.map((cid) => (
                <button
                  key={cid}
                  onClick={() => setClassFilter(cid)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                    classFilter === cid
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {cid === 'all' ? `${tr.all} (32)` : tr.kartClasses[cid]}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1">
            {tab === 'chassis' &&
              filteredKarts.map((k) => {
                const owned = profile.unlockedKarts.includes(k.id);
                const selected = loadout.kartId === k.id;
                const kLoc = getKartLocalized(k, language);
                return (
                  <button
                    key={k.id}
                    onClick={() => {
                      if (owned) {
                        onUpdateLoadout({ ...loadout, kartId: k.id });
                      } else if (profile.coins >= k.unlockCost) {
                        onUnlockKart(k.id, k.unlockCost);
                        onUpdateLoadout({ ...loadout, kartId: k.id });
                      }
                    }}
                    className={`min-w-[168px] max-w-[168px] p-2.5 rounded-xl border text-start flex flex-col justify-between cursor-pointer ${
                      selected
                        ? 'bg-slate-800 border-amber-400'
                        : 'bg-slate-900 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-cyan-400 font-semibold truncate">
                        {tr.kartClasses[k.kartClass]}
                      </span>
                      {selected ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : !owned ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : null}
                    </div>
                    <div className="font-semibold text-xs text-white truncate mt-1">{kLoc.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{kLoc.description}</div>
                    <div className="text-[11px] text-amber-300 mt-1 font-semibold">
                      {owned
                        ? selected
                          ? tr.active
                          : tr.ready
                        : `${tr.unlockFor} ${k.unlockCost} ${tr.coins}`}
                    </div>
                  </button>
                );
              })}

            {tab === 'paint' &&
              PAINT_COLORS.map((p) => {
                const selected = loadout.paintColor === p.hex;
                const colorName =
                  language === 'ar' ? PAINT_COLORS_AR[p.hex] || p.name : p.name;
                return (
                  <button
                    key={p.hex}
                    onClick={() => onUpdateLoadout({ ...loadout, paintColor: p.hex })}
                    className={`min-w-[130px] p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer ${
                      selected ? 'bg-slate-800 border-amber-400' : 'bg-slate-900 border-white/10'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-white/30 shrink-0"
                      style={{ backgroundColor: p.hex }}
                    />
                    <span className="text-xs text-white truncate">{colorName}</span>
                  </button>
                );
              })}

            {tab === 'decals' &&
              DECALS.map((d) => {
                const owned = d.unlockCost === 0 || profile.unlockedParts.includes(d.id);
                const selected = loadout.decalId === d.id;
                const label = getPartLocalized(d.id, d.name, language, 'decal');
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      if (owned) onUpdateLoadout({ ...loadout, decalId: d.id });
                      else if (profile.coins >= d.unlockCost) {
                        onUnlockPart(d.id, d.unlockCost);
                        onUpdateLoadout({ ...loadout, decalId: d.id });
                      }
                    }}
                    className={`min-w-[145px] p-2.5 rounded-xl border text-start cursor-pointer ${
                      selected ? 'bg-slate-800 border-amber-400' : 'bg-slate-900 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-white truncate">{label}</span>
                      {!owned && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {owned
                        ? selected
                          ? tr.active
                          : tr.select
                        : `${d.unlockCost} ${tr.coins}`}
                    </div>
                  </button>
                );
              })}

            {tab === 'wheels' &&
              WHEELS.map((w) => {
                const owned = w.unlockCost === 0 || profile.unlockedParts.includes(w.id);
                const selected = loadout.wheelId === w.id;
                const label = getPartLocalized(w.id, w.name, language);
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      if (owned) onUpdateLoadout({ ...loadout, wheelId: w.id });
                      else if (profile.coins >= w.unlockCost) {
                        onUnlockPart(w.id, w.unlockCost);
                        onUpdateLoadout({ ...loadout, wheelId: w.id });
                      }
                    }}
                    className={`min-w-[150px] p-2.5 rounded-xl border text-start cursor-pointer ${
                      selected ? 'bg-slate-800 border-amber-400' : 'bg-slate-900 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-white truncate">{label}</span>
                      {!owned && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {owned
                        ? selected
                          ? tr.active
                          : tr.select
                        : `${w.unlockCost} ${tr.coins}`}
                    </div>
                  </button>
                );
              })}

            {tab === 'tires' &&
              TIRES.map((t) => {
                const owned = t.unlockCost === 0 || profile.unlockedParts.includes(t.id);
                const selected = loadout.tireId === t.id;
                const label = getPartLocalized(t.id, t.name, language);
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (owned) onUpdateLoadout({ ...loadout, tireId: t.id });
                      else if (profile.coins >= t.unlockCost) {
                        onUnlockPart(t.id, t.unlockCost);
                        onUpdateLoadout({ ...loadout, tireId: t.id });
                      }
                    }}
                    className={`min-w-[150px] p-2.5 rounded-xl border text-start cursor-pointer ${
                      selected ? 'bg-slate-800 border-amber-400' : 'bg-slate-900 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-white truncate">{label}</span>
                      {!owned && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      +{t.gripBonus} {tr.handling} ·{' '}
                      {owned ? (selected ? tr.active : tr.ready) : `${t.unlockCost} ${tr.coins}`}
                    </div>
                  </button>
                );
              })}

            {tab === 'spoilers' &&
              SPOILERS.map((s) => {
                const owned = s.unlockCost === 0 || profile.unlockedParts.includes(s.id);
                const selected = loadout.spoilerId === s.id;
                const label = getPartLocalized(s.id, s.name, language, 'spoiler');
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (owned) onUpdateLoadout({ ...loadout, spoilerId: s.id });
                      else if (profile.coins >= s.unlockCost) {
                        onUnlockPart(s.id, s.unlockCost);
                        onUpdateLoadout({ ...loadout, spoilerId: s.id });
                      }
                    }}
                    className={`min-w-[150px] p-2.5 rounded-xl border text-start cursor-pointer ${
                      selected ? 'bg-slate-800 border-amber-400' : 'bg-slate-900 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-white truncate">{label}</span>
                      {!owned && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {owned
                        ? selected
                          ? tr.active
                          : tr.select
                        : `${s.unlockCost} ${tr.coins}`}
                    </div>
                  </button>
                );
              })}

            {tab === 'engine' &&
              ENGINES.map((e) => {
                const owned = e.unlockCost === 0 || profile.unlockedParts.includes(e.id);
                const selected = loadout.engineId === e.id;
                const label = getPartLocalized(e.id, e.name, language);
                return (
                  <button
                    key={e.id}
                    onClick={() => {
                      if (owned) onUpdateLoadout({ ...loadout, engineId: e.id });
                      else if (profile.coins >= e.unlockCost) {
                        onUnlockPart(e.id, e.unlockCost);
                        onUpdateLoadout({ ...loadout, engineId: e.id });
                      }
                    }}
                    className={`min-w-[165px] p-2.5 rounded-xl border text-start cursor-pointer ${
                      selected ? 'bg-slate-800 border-amber-400' : 'bg-slate-900 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-white truncate">{label}</span>
                      {!owned && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {tr.level} {e.tier} ·{' '}
                      {owned ? (selected ? tr.active : tr.ready) : `${e.unlockCost} ${tr.coins}`}
                    </div>
                  </button>
                );
              })}

            {tab === 'exhaust' &&
              EXHAUSTS.map((ex) => {
                const owned = ex.unlockCost === 0 || profile.unlockedParts.includes(ex.id);
                const selected = loadout.exhaustId === ex.id;
                const label = getPartLocalized(ex.id, ex.name, language);
                return (
                  <button
                    key={ex.id}
                    onClick={() => {
                      if (owned) onUpdateLoadout({ ...loadout, exhaustId: ex.id });
                      else if (profile.coins >= ex.unlockCost) {
                        onUnlockPart(ex.id, ex.unlockCost);
                        onUpdateLoadout({ ...loadout, exhaustId: ex.id });
                      }
                    }}
                    className={`min-w-[150px] p-2.5 rounded-xl border text-start cursor-pointer ${
                      selected ? 'bg-slate-800 border-amber-400' : 'bg-slate-900 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: ex.flameColor }}
                      />
                      <span className="text-xs font-semibold text-white truncate">{label}</span>
                      {!owned && <Lock className="w-3 h-3 text-amber-400 shrink-0 ms-auto" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {owned
                        ? selected
                          ? tr.active
                          : tr.select
                        : `${ex.unlockCost} ${tr.coins}`}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      ) : (
        /* Section 2: Drivers Roster (24) cleanly housed inside Garage & Driver Hub */
        <div className="flex-1 min-h-0 flex flex-col gap-3 mt-3 max-w-6xl mx-auto w-full">
          <div className="flex flex-wrap items-center gap-1.5">
            {DRIVER_CATEGORIES.map((cid) => (
              <button
                key={cid}
                onClick={() => setDriverFilter(cid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  driverFilter === cid
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {cid === 'all' ? `${tr.all} (24)` : tr.categories[cid]}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
            <div className="lg:col-span-2 overflow-y-auto pe-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 content-start">
              {filteredDrivers.map((c) => {
                const owned = profile.unlockedCharacters.includes(c.id);
                const active = profile.loadout.characterId === c.id;
                const focused = focusedDriverId === c.id;
                const skin = c.skins[0];
                const cLoc = getCharacterLocalized(c, language);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setFocusedDriverId(c.id);
                      setFocusedSkinId('classic');
                      soundEngine.playCharacterVoice(c.id, 'select');
                    }}
                    className={`flex flex-col justify-between p-3 rounded-xl border text-start transition-colors cursor-pointer ${
                      focused
                        ? 'bg-slate-800 border-cyan-400'
                        : 'apex-card hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div
                        className="w-9 h-9 rounded-lg border border-white/20 flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
                        style={{ backgroundColor: skin.primaryColor }}
                      >
                        {cLoc.name.slice(0, 2).toUpperCase()}
                      </div>
                      {active ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : !owned ? (
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : null}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white truncate">{cLoc.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {tr.categories[c.category]} ·{' '}
                        {owned ? tr.unlocked : `${c.unlockCost} ${tr.coins}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="apex-surface rounded-2xl p-5 flex flex-col justify-between gap-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-cyan-400">
                      {tr.categories[focusedChar.category]}
                    </div>
                    <h2 className="font-display font-bold text-2xl text-white mt-0.5">
                      {focusedCharLoc.name}
                    </h2>
                    <p className="text-xs text-slate-400">{focusedCharLoc.title}</p>
                  </div>
                  <button
                    onClick={() => soundEngine.playCharacterVoice(focusedChar.id, 'select')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-cyan-400 cursor-pointer"
                    title={tr.previewVoice}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs italic text-slate-300 bg-slate-950/80 border border-white/10 rounded-xl p-3">
                  "{focusedCharLoc.quote}"
                </p>

                <div className="space-y-2">
                  {(
                    [
                      [tr.speed, focusedChar.stats.speed, '#EF4444'],
                      [tr.acceleration, focusedChar.stats.acceleration, '#F59E0B'],
                      [tr.handling, focusedChar.stats.handling, '#06B6D4'],
                      [tr.drift, focusedChar.stats.drift, '#A855F7'],
                      [tr.weight, focusedChar.stats.weight, '#10B981'],
                    ] as const
                  ).map(([label, val, color]) => (
                    <div key={label} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">{label}</span>
                        <span className="font-mono-num font-bold text-white">{val}/10</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all"
                          style={{ width: `${val * 10}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300">{tr.appearanceSkin}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {focusedChar.skins.map((skin) => {
                      const skinName =
                        language === 'ar' ? SKIN_NAMES_AR[skin.id] || skin.name : skin.name;
                      return (
                        <button
                          key={skin.id}
                          onClick={() => setFocusedSkinId(skin.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                            focusedSkinId === skin.id
                              ? 'bg-slate-800 border-amber-400 text-white'
                              : 'bg-slate-950/60 border-white/10 text-slate-300'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                            style={{ backgroundColor: skin.primaryColor }}
                          />
                          <span className="truncate">{skinName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                {isDriverUnlocked ? (
                  <button
                    onClick={() => {
                      onUpdateLoadout({
                        ...loadout,
                        characterId: focusedChar.id,
                        skinId: focusedSkinId,
                      });
                      setSection('tuning');
                    }}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold py-3 rounded-xl cursor-pointer"
                  >
                    {tr.selectDriver}: {focusedCharLoc.name}
                  </button>
                ) : (
                  <button
                    onClick={() => onUnlockCharacter(focusedChar.id, focusedChar.unlockCost)}
                    disabled={profile.coins < focusedChar.unlockCost}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-display font-bold py-3 rounded-xl cursor-pointer"
                  >
                    {profile.coins >= focusedChar.unlockCost
                      ? `${tr.unlockFor} ${focusedChar.unlockCost} ${tr.coins}`
                      : `${tr.needCoins} ${focusedChar.unlockCost} ${tr.coins}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
