import { ArrowLeft, ArrowRight, Check, Coins, Lock, Map as MapIcon, MapPin, Play, Trophy, Users } from 'lucide-react';
import { useState } from 'react';
import { CHAMPIONSHIP_CUPS, CupDef } from '../data/progression';
import { getTrackById, TRACKS } from '../data/tracks';
import { getTrackLocalized, TRANSLATIONS } from '../i18n/translations';
import { Language, PlayerProfile, TrackTheme } from '../types/game';
import { formatRaceTime } from '../utils/profileStorage';

interface TrackSelectProps {
  initialMode?: 'tracks' | 'championship';
  language: Language;
  profile: PlayerProfile;
  selectedTrackId: string;
  racerCount: number;
  onChangeRacerCount: (count: number) => void;
  onSelectTrack: (trackId: string) => void;
  onUnlockTrack: (trackId: string, cost: number) => void;
  onStartRaceWithTrack: (trackId: string) => void;
  onStartChampionship: (cup: CupDef) => void;
  onClose: () => void;
}

const THEME_IDS: ('all' | TrackTheme)[] = [
  'all',
  'tropical',
  'temple',
  'desert',
  'snow',
  'volcano',
  'cyber',
  'haunted',
  'jungle',
  'ocean',
  'space',
];

export function TrackSelect({
  initialMode = 'tracks',
  language,
  profile,
  selectedTrackId,
  racerCount,
  onChangeRacerCount,
  onSelectTrack,
  onUnlockTrack,
  onStartRaceWithTrack,
  onStartChampionship,
  onClose,
}: TrackSelectProps) {
  const tr = TRANSLATIONS[language];
  const [section, setSection] = useState<'tracks' | 'championship'>(initialMode);
  const [themeFilter, setThemeFilter] = useState<'all' | TrackTheme>('all');
  const [focusedTrackId, setFocusedTrackId] = useState(selectedTrackId);

  const focusedTrack = getTrackById(focusedTrackId);
  const focusedLoc = getTrackLocalized(focusedTrack, language);
  const isUnlocked = profile.unlockedTracks.includes(focusedTrack.id);
  const filteredTracks =
    themeFilter === 'all' ? TRACKS : TRACKS.filter((t) => t.theme === themeFilter);

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="fixed inset-0 z-30 bg-[#050811]/95 flex flex-col p-4 md:p-6 overflow-hidden">
      {/* Header with Unified Tracks / Championships Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-white/10"
          >
            <BackIcon className="w-4 h-4" />
            {tr.back}
          </button>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setSection('tracks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                section === 'tracks' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              {tr.tracksTab}
            </button>
            <button
              onClick={() => setSection('championship')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                section === 'championship'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              {tr.cupsTab}
            </button>
          </div>

          <div className="hidden md:block">
            <p className="text-xs text-slate-400">
              {section === 'tracks' ? tr.tracksSub : tr.championshipSub}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Racer Count Quick Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 hidden sm:inline">{tr.racerCountLabel}:</span>
            <select
              value={racerCount}
              onChange={(e) => onChangeRacerCount(Number(e.target.value))}
              className="bg-slate-950 border border-white/15 rounded px-2 py-0.5 text-white font-mono-num font-bold outline-none"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-1.5 text-sm font-mono-num font-bold text-amber-400">
            <Coins className="w-4 h-4" />
            {profile.coins}
          </div>
        </div>
      </div>

      {section === 'championship' ? (
        <div className="flex-1 overflow-y-auto pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto w-full pb-4">
            {CHAMPIONSHIP_CUPS.map((cup) => {
              const cupName = language === 'ar' ? cup.nameAr : cup.name;
              const cupSub = language === 'ar' ? cup.subtitleAr : cup.subtitle;
              return (
                <div
                  key={cup.id}
                  className="apex-surface apex-stripe-top rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: cup.accent }}>
                        4 {tr.tracksTitle}
                      </span>
                      <span className="text-xs font-mono-num font-bold text-amber-400">
                        +{cup.rewardCoins} {tr.bonusCoins}
                      </span>
                    </div>
                    <h2 className="font-display font-bold text-2xl text-white mt-1">{cupName}</h2>
                    <p className="text-xs text-slate-400">{cupSub}</p>
                    <div className="mt-4 space-y-1.5">
                      {cup.trackIds.map((tid, idx) => {
                        const trackObj = getTrackById(tid);
                        const loc = getTrackLocalized(trackObj, language);
                        return (
                          <div
                            key={tid}
                            className="flex items-center justify-between text-xs bg-slate-950/75 px-3 py-2 rounded-lg border border-white/10"
                          >
                            <span className="text-slate-200 font-medium">
                              {tr.roundLabel} {idx + 1}: {loc.name}
                            </span>
                            <span className="text-slate-400">{tr.themes[trackObj.theme]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => onStartChampionship(cup)}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold py-3 rounded-xl cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                    {tr.startCup}: {cupName}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5 py-3">
            {THEME_IDS.map((tid) => (
              <button
                key={tid}
                onClick={() => setThemeFilter(tid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  themeFilter === tid
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {tid === 'all' ? `${tr.all} (16)` : tr.themes[tid]}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
            <div className="lg:col-span-2 overflow-y-auto pe-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 content-start">
              {filteredTracks.map((t) => {
                const owned = profile.unlockedTracks.includes(t.id);
                const active = selectedTrackId === t.id;
                const focused = focusedTrackId === t.id;
                const loc = getTrackLocalized(t, language);
                return (
                  <button
                    key={t.id}
                    onClick={() => setFocusedTrackId(t.id)}
                    className={`p-3.5 rounded-xl border text-start flex flex-col justify-between gap-2 transition-colors cursor-pointer ${
                      focused
                        ? 'bg-slate-800 border-amber-400'
                        : 'apex-card hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: t.accentColor }}
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-950" />
                      </span>
                      {active ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : !owned ? (
                        <Lock className="w-4 h-4 text-amber-400" />
                      ) : null}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white truncate">{loc.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {tr.themes[t.theme]} · {tr.trackDiffs[t.difficulty]} ·{' '}
                        {owned ? tr.ready : `${t.unlockCost} ${tr.coins}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="apex-surface apex-stripe-top rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="text-xs font-semibold" style={{ color: focusedTrack.accentColor }}>
                  {tr.themes[focusedTrack.theme]} · {tr.trackDiffs[focusedTrack.difficulty]} ·{' '}
                  {focusedTrack.laps} {tr.lapsLabel}
                </div>
                <h2 className="font-display font-bold text-2xl text-white">{focusedLoc.name}</h2>
                <p className="text-xs text-slate-300">{focusedLoc.subtitle}</p>

                <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="text-amber-400 font-semibold">{tr.shortcutIntel}</div>
                  <p className="text-slate-300">{focusedLoc.shortcutNote}</p>
                </div>

                <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{tr.personalBest}</span>
                  <span dir="ltr" className="font-mono-num font-bold text-cyan-400">
                    {formatRaceTime(profile.bestTrackTimes[focusedTrack.id] || 0)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {isUnlocked ? (
                  <>
                    <button
                      onClick={() => {
                        onSelectTrack(focusedTrack.id);
                        onStartRaceWithTrack(focusedTrack.id);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold py-3 rounded-xl cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      {tr.raceThisTrack} ({racerCount})
                    </button>
                    <button
                      onClick={() => {
                        onSelectTrack(focusedTrack.id);
                        onClose();
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer border border-white/10"
                    >
                      {tr.setActiveTrack}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onUnlockTrack(focusedTrack.id, focusedTrack.unlockCost)}
                    disabled={profile.coins < focusedTrack.unlockCost}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-display font-bold py-3 rounded-xl cursor-pointer"
                  >
                    {profile.coins >= focusedTrack.unlockCost
                      ? `${tr.unlockFor} ${focusedTrack.unlockCost} ${tr.coins}`
                      : `${tr.needCoins} ${focusedTrack.unlockCost} ${tr.coins}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
