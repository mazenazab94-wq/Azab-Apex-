import {
  Crosshair,
  Flame,
  HeartPulse,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useMemo } from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import { GameMode, Language, RaceTelemetryFrame } from '../types/game';
import { formatRaceTime } from '../utils/profileStorage';

interface RaceHUDProps {
  frame: RaceTelemetryFrame;
  language: Language;
  mode: GameMode;
  trackName: string;
  minimapPoints: { x: number; z: number }[];
  showMinimap: boolean;
  muted: boolean;
  paused: boolean;
  showHelp: boolean;
  onUseItemClick: () => void;
  onRecoverTrack: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onToggleHelp: () => void;
  onRestart: () => void;
  onQuitToMenu: () => void;
}

const ITEM_COLORS: Record<string, string> = {
  nitro_surge: '#F59E0B',
  seeker_pulse: '#EF4444',
  slick_trap: '#84CC16',
  aegis_dome: '#06B6D4',
  chrono_field: '#8B5CF6',
  overdrive_core: '#EC4899',
  repair_kit: '#10B981',
  nitro_charge: '#38BDF8',
};

export function RaceHUD({
  frame,
  language,
  mode,
  trackName,
  minimapPoints,
  showMinimap,
  muted,
  paused,
  showHelp,
  onUseItemClick,
  onRecoverTrack,
  onTogglePause,
  onToggleMute,
  onToggleHelp,
  onRestart,
  onQuitToMenu,
}: RaceHUDProps) {
  const tr = TRANSLATIONS[language];
  const p1 = frame.player1;
  const p2 = frame.player2;
  const isSplit = mode === 'local_split' && Boolean(p2);

  const minimapBounds = useMemo(() => {
    if (minimapPoints.length === 0) return { minX: -150, maxX: 150, minZ: -220, maxZ: 20 };
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const pt of minimapPoints) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.z < minZ) minZ = pt.z;
      if (pt.z > maxZ) maxZ = pt.z;
    }
    return { minX: minX - 18, maxX: maxX + 18, minZ: minZ - 18, maxZ: maxZ + 18 };
  }, [minimapPoints]);

  const toMapCoord = (x: number, z: number) => {
    const w = minimapBounds.maxX - minimapBounds.minX || 1;
    const h = minimapBounds.maxZ - minimapBounds.minZ || 1;
    const nx = ((x - minimapBounds.minX) / w) * 116 + 6;
    const ny = ((z - minimapBounds.minZ) / h) * 116 + 6;
    return `${nx.toFixed(1)},${ny.toFixed(1)}`;
  };

  const mapPathD = useMemo(() => {
    if (minimapPoints.length === 0) return '';
    return (
      minimapPoints
        .map((pt, i) => `${i === 0 ? 'M' : 'L'}${toMapCoord(pt.x, pt.z)}`)
        .join(' ') + ' Z'
    );
  }, [minimapPoints, minimapBounds]);

  const p1PowerMeta = p1.powerUp ? tr.items[p1.powerUp] : null;
  const p2PowerMeta = p2?.powerUp ? tr.items[p2.powerUp] : null;
  const targetLock = frame.targetLock;

  const conditionColor =
    p1.condition > 60 ? '#10B981' : p1.condition > 30 ? '#F59E0B' : '#EF4444';

  const fxRingColor =
    frame.screenFx === 'boost'
      ? 'inset 0 0 80px rgba(245,158,11,0.34)'
      : frame.screenFx === 'hit'
      ? 'inset 0 0 95px rgba(239,68,68,0.45)'
      : frame.screenFx === 'emp'
      ? 'inset 0 0 85px rgba(139,92,246,0.4)'
      : frame.screenFx === 'repair'
      ? 'inset 0 0 70px rgba(16,185,129,0.38)'
      : frame.screenFx === 'shield'
      ? 'inset 0 0 70px rgba(6,182,212,0.34)'
      : 'none';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 md:p-5 select-none"
      style={{ boxShadow: fxRingColor, transition: 'box-shadow 180ms ease-out' }}
    >
      {/* Target Lock Reticle Projected Over Closest Rival Ahead */}
      {targetLock && targetLock.visible && !isSplit && (
        <div
          className="pointer-events-none fixed z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
          style={{
            left: `${targetLock.screenX * 100}%`,
            top: `${targetLock.screenY * 100}%`,
          }}
        >
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950/90 border border-red-500/70 text-[10px] font-bold text-red-300 whitespace-nowrap">
            <Crosshair className="w-3 h-3 text-red-400" />
            <span>{targetLock.racerName}</span>
            <span className="font-mono-num text-amber-300">{targetLock.distanceMeters}m</span>
          </div>
          <div className="w-7 h-7 rounded-full border-2 border-red-500/80" />
        </div>
      )}

      {/* Top Perimeter */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Position & Lap */}
          <div className="apex-surface apex-stripe-top rounded-xl px-4 py-2 flex items-center gap-3.5">
            <div className="text-center">
              <div className="text-[10px] text-slate-400 font-semibold">{tr.positionLabel}</div>
              <div className="font-display font-bold text-2xl md:text-3xl leading-none text-amber-400">
                #{p1.position}
                <span className="text-xs text-slate-400">/{frame.racers.length}</span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div>
              <div className="text-[10px] text-slate-400 font-semibold">{tr.lapLabel}</div>
              <div className="font-mono-num font-bold text-lg text-white leading-tight">
                {p1.lap}
                <span className="text-slate-400 text-xs">
                  /{p1.totalLaps > 50 ? '∞' : p1.totalLaps}
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/15 hidden sm:block" />
            <div className="hidden sm:block">
              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{trackName}</div>
              <div dir="ltr" className="font-mono-num text-sm text-cyan-300 font-bold">
                {formatRaceTime(frame.elapsedMs)}
              </div>
            </div>
          </div>

          {/* Active Item Slot & Instant Use Button */}
          <div className="pointer-events-auto flex items-center gap-2 apex-surface rounded-xl px-3 py-2">
            <div
              className="w-10 h-10 rounded-lg border-2 flex items-center justify-center shrink-0"
              style={{
                borderColor: p1.powerUp ? ITEM_COLORS[p1.powerUp] : 'rgba(255,255,255,0.16)',
                backgroundColor: p1.powerUp
                  ? `${ITEM_COLORS[p1.powerUp]}22`
                  : 'rgba(15,23,42,0.6)',
              }}
            >
              {p1.shieldActive ? (
                <Shield className="w-5 h-5 text-cyan-400" />
              ) : p1.powerUp ? (
                <Sparkles className="w-5 h-5" style={{ color: ITEM_COLORS[p1.powerUp] }} />
              ) : (
                <Zap className="w-4 h-4 text-slate-600" />
              )}
            </div>
            <div className="leading-tight min-w-[90px]">
              <div className="text-[10px] text-slate-400">{tr.currentItem}</div>
              <div className="text-xs font-bold text-white truncate max-w-[130px]">
                {p1PowerMeta ? p1PowerMeta.name : tr.noItem}
              </div>
            </div>
            {p1.powerUp && (
              <button
                onClick={onUseItemClick}
                className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-display font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer"
              >
                {tr.useItemBtn} (E)
              </button>
            )}
          </div>

          {isSplit && p2 && (
            <div className="hidden sm:flex items-center gap-2 apex-surface rounded-xl px-3 py-2">
              <span className="font-display font-bold text-amber-400 text-sm">
                P2: {p2.position}
              </span>
              <span className="text-xs text-slate-200 whitespace-nowrap">
                {p2PowerMeta ? p2PowerMeta.name : `${tr.lapLabel} ${p2.lap}/${p2.totalLaps}`}
              </span>
            </div>
          )}
        </div>

        {/* Rivals Standings + Utility Controls (including Quick Back to Track button) */}
        <div className="flex items-start gap-2">
          {!isSplit && frame.racers.length > 1 && (
            <div className="hidden lg:flex flex-col gap-0.5 apex-surface rounded-xl px-3 py-2 w-48 text-[11px]">
              <div className="text-[10px] text-slate-400 font-bold mb-0.5">{tr.rivalsLabel}</div>
              {frame.racers.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between ${
                    r.isHuman ? 'text-amber-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  <span className="truncate">
                    {r.position}. {r.name}
                  </span>
                  <span className="font-mono-num text-[10px] text-slate-400">{r.lap}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={onRecoverTrack}
              title={tr.recoverToTrack}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer border transition-colors ${
                frame.wrongWayP1
                  ? 'bg-red-600 border-red-300 text-white'
                  : 'apex-surface hover:border-cyan-400/50 text-cyan-300'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">{tr.recoverToTrack}</span>
            </button>
            <button
              onClick={onToggleHelp}
              className="apex-surface hover:border-amber-400/50 p-2.5 rounded-xl text-slate-200 cursor-pointer"
              title={tr.menuTutorial}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleMute}
              className="apex-surface hover:border-amber-400/50 p-2.5 rounded-xl text-slate-200 cursor-pointer"
              title={tr.muteAll}
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onTogglePause}
              className="apex-surface hover:border-amber-400/50 p-2.5 rounded-xl text-slate-200 cursor-pointer"
              title={tr.pauseTitle}
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Countdown / Wrong Way / Event Banner */}
      <div className="flex flex-col items-center justify-center gap-2">
        {frame.phase === 'countdown' && (
          <div className="font-display font-bold text-6xl md:text-8xl text-amber-400 drop-shadow-[0_6px_18px_rgba(0,0,0,0.9)]">
            {frame.countdownValue > 0 ? frame.countdownValue : tr.goBanner}
          </div>
        )}
        {frame.wrongWayP1 && (
          <div className="bg-red-600/95 text-white font-display font-bold text-lg px-5 py-1.5 rounded-xl border border-red-300">
            {tr.wrongWay}
          </div>
        )}
        {frame.eventBanner && frame.phase === 'racing' && (
          <div
            className="apex-surface font-display font-bold text-xl md:text-2xl px-4 py-1.5 rounded-xl"
            style={{ color: frame.eventBanner.color }}
          >
            {frame.eventBanner.text}
          </div>
        )}
      </div>

      {isSplit && (
        <div className="fixed inset-y-0 left-1/2 w-0.5 bg-slate-950/90 pointer-events-none" />
      )}

      {/* Bottom Perimeter: Mini-Map + Speedometer, Nitro Meter, Vehicle Condition */}
      <div className="flex items-end justify-between gap-3">
        {showMinimap && minimapPoints.length > 0 ? (
          <div className="hidden sm:block apex-surface rounded-xl p-1.5">
            <svg width="128" height="128" viewBox="0 0 128 128">
              <path
                d={mapPathD}
                fill="none"
                stroke="#475569"
                strokeWidth="5"
                strokeLinejoin="round"
              />
              {frame.racers.map((r) => {
                const [cx, cy] = toMapCoord(r.x, r.z).split(',').map(Number);
                return (
                  <circle
                    key={r.id}
                    cx={cx}
                    cy={cy}
                    r={r.isHuman ? 4.5 : 3}
                    fill={r.isLocalP2 ? '#06B6D4' : r.isHuman ? '#F59E0B' : '#E2E8F0'}
                    stroke="#0F172A"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
          </div>
        ) : (
          <div />
        )}

        {/* Speedometer, Nitro Meter & Vehicle Condition */}
        <div className="apex-surface apex-stripe-top flex items-center gap-3.5 rounded-xl px-4 py-2.5">
          <div className="flex flex-col gap-1.5 w-36 md:w-44">
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1 text-slate-300">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  {p1.driftLevel > 0 ? `${tr.driftTier} ${p1.driftLevel}` : tr.nitroMeter}
                </span>
                <span className="font-mono-num text-amber-400">
                  {Math.round(
                    Math.max(p1.boostMeter * 100, (p1.driftCharge / 3) * 100, p1.nitroCharge)
                  )}
                  %
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded overflow-hidden">
                <div
                  className="h-full transition-all duration-75"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(p1.boostMeter * 100, (p1.driftCharge / 3) * 100, p1.nitroCharge)
                    )}%`,
                    backgroundColor:
                      p1.driftLevel === 3
                        ? '#A855F7'
                        : p1.driftLevel === 2
                        ? '#F97316'
                        : p1.driftLevel === 1
                        ? '#FACC15'
                        : '#06B6D4',
                  }}
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px] font-semibold">
                <span className="flex items-center gap-1 text-slate-300">
                  <HeartPulse className="w-3 h-3" style={{ color: conditionColor }} />
                  {tr.conditionLabel}
                </span>
                <span className="font-mono-num" style={{ color: conditionColor }}>
                  {p1.condition}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded overflow-hidden">
                <div
                  className="h-full transition-all duration-150"
                  style={{ width: `${p1.condition}%`, backgroundColor: conditionColor }}
                />
              </div>
            </div>
          </div>

          <div className="h-10 w-px bg-white/15" />

          <div className="text-center min-w-[54px]">
            <div className="font-mono-num font-bold text-2xl md:text-3xl leading-none text-white">
              {p1.speedKmh}
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{tr.speedUnit}</div>
          </div>
        </div>
      </div>

      {/* Pause Modal */}
      {paused && (
        <div className="pointer-events-auto fixed inset-0 z-40 bg-slate-950/88 flex items-center justify-center p-4">
          <div className="apex-surface apex-stripe-top rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-display font-bold text-2xl text-white">{tr.pauseTitle}</h2>
            <p className="text-xs text-slate-300">
              {trackName} · {tr.lapLabel} {p1.lap}/{p1.totalLaps}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={onTogglePause}
                className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                {tr.resumeRace}
              </button>
              <button
                onClick={onRestart}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl border border-white/10 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                {tr.restartRace}
              </button>
              <button
                onClick={onQuitToMenu}
                className="bg-slate-800 hover:bg-red-950/70 text-red-300 font-semibold py-2.5 rounded-xl border border-white/10 cursor-pointer"
              >
                {tr.exitToMenu}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Controls Help Overlay */}
      {showHelp && (
        <div className="pointer-events-auto fixed inset-0 z-40 bg-slate-950/88 flex items-center justify-center p-4">
          <div className="apex-surface apex-stripe-top rounded-2xl p-6 w-full max-w-md flex flex-col gap-3">
            <h2 className="font-display font-bold text-xl text-amber-400">{tr.tutorialTitle}</h2>
            <div className="text-xs text-slate-200 space-y-2">
              {tr.tutorialDesktopLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              <div className="pt-1 text-slate-300">{tr.tutorialDriftDesc}</div>
              <div className="text-slate-300">{tr.tutorialCrashDesc}</div>
            </div>
            <button
              onClick={onToggleHelp}
              className="mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl cursor-pointer"
            >
              {tr.resumeRace}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
