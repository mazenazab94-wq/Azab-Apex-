import {
  ArrowLeft,
  ArrowRight,
  CloudRain,
  Compass,
  Flag,
  Map as MapIcon,
  Play,
  Split,
  Sun,
  Swords,
  Timer,
  Trophy,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { CHAMPIONSHIP_CUPS, CupDef } from '../data/progression';
import { getTrackById } from '../data/tracks';
import { getTrackLocalized, TRANSLATIONS } from '../i18n/translations';
import { GameMode, GameSettings, Language, TimeOfDay, WeatherCondition } from '../types/game';

interface RaceSetupModalProps {
  language: Language;
  selectedTrackId: string;
  racerCount: number;
  settings: GameSettings;
  onChangeRacerCount: (count: number) => void;
  onUpdateEnvironment: (timeOfDay: TimeOfDay, weather: WeatherCondition) => void;
  onOpenTracks: () => void;
  onLaunchMode: (mode: GameMode) => void;
  onLaunchChampionship: (cup: CupDef) => void;
  onClose: () => void;
}

export function RaceSetupModal({
  language,
  selectedTrackId,
  racerCount,
  settings,
  onChangeRacerCount,
  onUpdateEnvironment,
  onOpenTracks,
  onLaunchMode,
  onLaunchChampionship,
  onClose,
}: RaceSetupModalProps) {
  const tr = TRANSLATIONS[language];
  const [selectedMode, setSelectedMode] = useState<GameMode>('single');
  const [selectedCupId, setSelectedCupId] = useState<string>(CHAMPIONSHIP_CUPS[0].id);

  const track = getTrackById(selectedTrackId);
  const trackLoc = getTrackLocalized(track, language);
  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;
  const isAr = language === 'ar';

  const modes: { id: GameMode; label: string; icon: typeof Flag; accent: string }[] = [
    { id: 'single', label: tr.singleRaceMode, icon: Flag, accent: 'text-amber-400' },
    { id: 'championship', label: tr.menuChampionships, icon: Trophy, accent: 'text-yellow-400' },
    { id: 'tournament', label: tr.menuTournament, icon: Swords, accent: 'text-rose-400' },
    { id: 'time_trial', label: tr.menuTimeTrial, icon: Timer, accent: 'text-cyan-400' },
    { id: 'practice', label: tr.menuPractice, icon: Compass, accent: 'text-emerald-400' },
    { id: 'local_split', label: tr.menuSplitScreen, icon: Split, accent: 'text-violet-400' },
  ];

  const activeCup = CHAMPIONSHIP_CUPS.find((c) => c.id === selectedCupId) || CHAMPIONSHIP_CUPS[0];

  const handleStart = () => {
    if (selectedMode === 'championship') {
      onLaunchChampionship(activeCup);
    } else {
      onLaunchMode(selectedMode);
    }
  };

  const countOptions = selectedMode === 'practice' ? [1, 2, 3, 4, 5, 6, 7, 8] : [2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="fixed inset-0 z-30 bg-[#050811]/92 flex items-center justify-center p-4 overflow-y-auto">
      <div className="apex-surface apex-stripe-top rounded-2xl p-5 md:p-6 max-w-4xl w-full space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-white/10"
            >
              <BackIcon className="w-4 h-4" />
              {tr.back}
            </button>
            <div>
              <h1 className="font-display font-bold text-2xl text-white">{tr.raceSetupTitle}</h1>
              <p className="text-xs text-slate-400">{tr.raceSetupSub}</p>
            </div>
          </div>
        </div>

        {/* Mode Grid */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300">{tr.raceModeLabel}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {modes.map((m) => {
              const Icon = m.icon;
              const active = selectedMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMode(m.id)}
                  className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-start transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500/15 border-amber-400 text-white'
                      : 'apex-card hover:border-white/25 text-slate-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-950/90 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${m.accent}`} />
                  </div>
                  <span className="font-display font-bold text-sm truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Championship Selector when championship mode selected */}
        {selectedMode === 'championship' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CHAMPIONSHIP_CUPS.map((cup) => {
              const selected = cup.id === activeCup.id;
              return (
                <button
                  key={cup.id}
                  onClick={() => setSelectedCupId(cup.id)}
                  className={`p-3 rounded-xl border text-start cursor-pointer ${
                    selected
                      ? 'bg-amber-500/15 border-amber-400'
                      : 'apex-card hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-sm text-white">
                      {isAr ? cup.nameAr : cup.name}
                    </span>
                    <span className="font-mono-num text-xs font-bold text-amber-400">
                      +{cup.rewardCoins} {tr.coins}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {isAr ? cup.subtitleAr : cup.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Racer Count Selector & Track/Weather Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Racer Count */}
          <div className="apex-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Users className="w-4 h-4" />
                {tr.racerCountLabel}
              </span>
              <span className="font-mono-num font-bold text-sm text-white">
                {selectedMode === 'time_trial' ? '1' : racerCount}
              </span>
            </div>

            {selectedMode === 'time_trial' ? (
              <div className="text-xs text-slate-400 bg-slate-950/70 rounded-lg px-3 py-2.5 border border-white/5">
                {tr.soloLabel}
              </div>
            ) : (
              <div className={`grid gap-1.5 ${countOptions.length === 8 ? 'grid-cols-8' : 'grid-cols-7'}`}>
                {countOptions.map((n) => (
                  <button
                    key={n}
                    onClick={() => onChangeRacerCount(n)}
                    className={`py-2.5 rounded-lg font-mono-num font-bold text-sm cursor-pointer transition-colors ${
                      racerCount === n
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950/80 border border-white/10 text-slate-200 hover:border-amber-400/50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Track & Environment */}
          <div className="apex-card rounded-xl p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">{tr.tracksTab}</div>
                <div className="font-display font-bold text-sm text-white truncate">
                  {trackLoc.name} · {track.laps} {tr.lapsLabel}
                </div>
              </div>
              <button
                onClick={onOpenTracks}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 border border-white/10"
              >
                <MapIcon className="w-3.5 h-3.5" />
                {tr.chooseTrackBtn}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1 flex-1">
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {(['day', 'sunset', 'night'] as TimeOfDay[]).map((tod) => (
                  <button
                    key={tod}
                    onClick={() => onUpdateEnvironment(tod, settings.weather)}
                    className={`flex-1 py-1 px-1.5 rounded text-[11px] font-semibold cursor-pointer truncate ${
                      settings.timeOfDay === tod
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950/70 text-slate-300 hover:text-white'
                    }`}
                  >
                    {tr.timesOfDay[tod]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                {(['clear', 'rain'] as WeatherCondition[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => onUpdateEnvironment(settings.timeOfDay, w)}
                    className={`py-1 px-2 rounded text-[11px] font-semibold cursor-pointer truncate ${
                      settings.weather === w
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-950/70 text-slate-300 hover:text-white'
                    }`}
                  >
                    {tr.weathers[w]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Launch Button */}
        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-display font-bold text-lg py-3.5 rounded-xl shadow-xl cursor-pointer transition-all active:scale-[0.99]"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          {tr.startRaceNow}
        </button>
      </div>
    </div>
  );
}
