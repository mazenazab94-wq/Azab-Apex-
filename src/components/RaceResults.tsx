import { ArrowLeft, ArrowRight, Coins, Home, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { getCharacterById } from '../data/characters';
import { getKartById } from '../data/karts';
import { getCharacterLocalized, getKartLocalized } from '../i18n/catalogAr';
import { TRANSLATIONS } from '../i18n/translations';
import { GameMode, Language, PlayerProfile, RaceTelemetryFrame } from '../types/game';
import { formatRaceTime } from '../utils/profileStorage';

interface RaceResultsProps {
  frame: RaceTelemetryFrame;
  language: Language;
  mode: GameMode;
  trackName: string;
  profile: PlayerProfile;
  earnedCoins: number;
  earnedXp: number;
  championshipRound?: { round: number; total: number; points: number; cupName: string };
  tournamentRound?: { round: number; total: number };
  onNextRound?: () => void;
  onRematch: () => void;
  onReturnLobby?: () => void;
  onMainMenu: () => void;
}

export function RaceResults({
  frame,
  language,
  mode,
  trackName,
  profile,
  earnedCoins,
  earnedXp,
  championshipRound,
  tournamentRound,
  onNextRound,
  onRematch,
  onReturnLobby,
  onMainMenu,
}: RaceResultsProps) {
  const tr = TRANSLATIONS[language];
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  const p1 = frame.player1;
  const char = getCharacterLocalized(getCharacterById(profile.loadout.characterId), language);
  const kart = getKartLocalized(getKartById(profile.loadout.kartId), language);

  const fetchPitCrewCoach = async () => {
    setCoachLoading(true);
    try {
      const res = await fetch('/api/race-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackName,
          characterName: char.name,
          kartName: kart.name,
          position: p1.position,
          timeMs: p1.finishTimeMs || frame.elapsedMs,
          driftsCompleted: profile.driftsCompleted,
          bestLapMs: p1.bestLapMs,
          language,
        }),
      });
      const data = await res.json();
      setCoachTip(
        data.tip ||
          (language === 'ar'
            ? 'حافظ على تسلسل الانجراف في المنعطفات واستخدم التوربو في الخطوط المستقيمة!'
            : 'Keep chaining drift boosts through corners!')
      );
    } catch {
      setCoachTip(
        language === 'ar'
          ? 'حافظ على تسلسل الانجراف في المنعطفات واستهدف منصات التسريع!'
          : 'Keep chaining drift boosts through corners and aim for boost ramps!'
      );
    } finally {
      setCoachLoading(false);
    }
  };

  const isMultiRound = Boolean(
    (championshipRound && championshipRound.round < championshipRound.total) ||
      (tournamentRound && tournamentRound.round < tournamentRound.total && p1.position <= 4)
  );

  const isKnockedOut = Boolean(tournamentRound && p1.position > 4);
  const NextIcon = language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/92 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="bg-slate-900 border border-white/15 rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="text-xs font-semibold text-amber-400">
              {championshipRound
                ? `${championshipRound.cupName} · ${tr.roundLabel} ${championshipRound.round}/${championshipRound.total}`
                : tournamentRound
                ? `${tr.menuTournament} · ${tr.roundLabel} ${tournamentRound.round}/${tournamentRound.total}`
                : `${trackName} · ${tr.resultsTitle}`}
            </div>
            <h1 className="font-display font-bold text-3xl text-white mt-0.5">
              {isKnockedOut
                ? tr.eliminatedTitle
                : p1.position === 1
                ? tr.victoryTitle
                : `${tr.finishedPos}: #${p1.position}`}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-lg px-3.5 py-2 text-start">
              <div className="text-[11px] text-slate-400">{tr.rewardsLabel}</div>
              <div className="font-mono-num font-bold text-sm text-amber-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> +{earnedCoins} {tr.coins} · +{earnedXp} XP
              </div>
            </div>
          </div>
        </div>

        {/* Standings Table */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto pe-1">
          {frame.racers.map((r) => (
            <div
              key={r.id}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs ${
                r.isHuman
                  ? 'bg-amber-500/15 border-amber-400/50 text-white font-semibold'
                  : 'bg-slate-950/70 border-white/10 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-base w-6 text-amber-400">
                  #{r.position}
                </span>
                <span>{r.name}</span>
                {r.isHuman && (
                  <span className="text-[10px] text-cyan-400 font-bold">
                    {language === 'ar' ? 'أنت' : 'YOU'}
                  </span>
                )}
              </div>
              <div dir="ltr" className="font-mono-num text-slate-300">
                {r.finishTimeMs > 0
                  ? formatRaceTime(r.finishTimeMs)
                  : r.bestLapMs > 0
                  ? formatRaceTime(r.bestLapMs)
                  : tr.waitingState}
              </div>
            </div>
          ))}
        </div>

        {/* Pit Crew Telemetry Coach */}
        <div className="bg-slate-950/75 border border-white/10 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {tr.pitCrewTitle}
            </span>
            {!coachTip && (
              <button
                onClick={fetchPitCrewCoach}
                disabled={coachLoading}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded font-semibold cursor-pointer"
              >
                {coachLoading ? tr.analyzingBtn : tr.getTipBtn}
              </button>
            )}
          </div>
          {coachTip && <p className="text-xs text-slate-200 leading-relaxed">{coachTip}</p>}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onMainMenu}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-lg text-xs cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {tr.exitToMenu}
          </button>

          {(mode === 'online_public' || mode === 'online_private') && onReturnLobby && (
            <button
              onClick={onReturnLobby}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold px-5 py-2.5 rounded-lg text-xs cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              {tr.returnToRoomBtn}
            </button>
          )}

          {isMultiRound && onNextRound ? (
            <button
              onClick={onNextRound}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold px-5 py-2.5 rounded-lg text-xs cursor-pointer"
            >
              {tr.nextRaceBtn}
              <NextIcon className="w-4 h-4" />
            </button>
          ) : (
            mode !== 'online_public' &&
            mode !== 'online_private' && (
              <button
                onClick={onRematch}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold px-5 py-2.5 rounded-lg text-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                {tr.rematchBtn}
              </button>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}
