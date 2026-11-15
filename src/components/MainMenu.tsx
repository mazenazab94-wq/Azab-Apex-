import {
  Flag,
  Globe,
  Languages,
  Map as MapIcon,
  Play,
  Settings,
  User,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { getCharacterById } from '../data/characters';
import { getKartById } from '../data/karts';
import { getTrackById } from '../data/tracks';
import { getCharacterLocalized, getKartLocalized } from '../i18n/catalogAr';
import { getTrackLocalized, TRANSLATIONS } from '../i18n/translations';
import { Language, PlayerProfile } from '../types/game';

export type MenuScreen =
  | 'home'
  | 'play_hub'
  | 'garage'
  | 'tracks'
  | 'multiplayer'
  | 'profile'
  | 'settings';

interface MainMenuProps {
  profile: PlayerProfile;
  language: Language;
  selectedTrackId: string;
  racerCount: number;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLanguage: () => void;
  onNavigate: (screen: MenuScreen) => void;
}

export function MainMenu({
  profile,
  language,
  selectedTrackId,
  racerCount,
  muted,
  onToggleMute,
  onToggleLanguage,
  onNavigate,
}: MainMenuProps) {
  const tr = TRANSLATIONS[language];
  const char = getCharacterLocalized(getCharacterById(profile.loadout.characterId), language);
  const kart = getKartLocalized(getKartById(profile.loadout.kartId), language);
  const track = getTrackLocalized(getTrackById(selectedTrackId), language);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 md:p-7">
      {/* Top Bar: Clean Motorsport Identity & Quick Utility */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto apex-surface apex-stripe-top rounded-2xl px-4 py-3 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shrink-0 shadow-lg">
            <Flag className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl md:text-2xl text-white leading-none">
              {tr.gameTitle}
            </h1>
            <p className="text-[11px] text-amber-400 font-semibold mt-1.5">
              {char.name} · {kart.name} · {track.name} · {racerCount} {tr.rivalsLabel}
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => onNavigate('profile')}
            className="apex-surface hover:border-amber-400/50 rounded-xl px-3.5 py-2 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <User className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs leading-tight whitespace-nowrap text-start">
              <div className="font-semibold text-white">{profile.name}</div>
              <div className="text-slate-300 font-mono-num">
                {tr.level} {profile.level} · {profile.coins} {tr.coins}
              </div>
            </div>
          </button>

          <button
            onClick={onToggleLanguage}
            title={tr.languageLabel}
            className="apex-surface hover:border-cyan-400/50 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-cyan-300 cursor-pointer transition-colors"
          >
            <Languages className="w-4 h-4" />
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          <button
            onClick={onToggleMute}
            title={tr.muteAll}
            className="apex-surface hover:border-amber-400/50 p-2.5 rounded-xl text-slate-200 hover:text-amber-400 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Bottom Clean Section Rail — 6 organized sections, center 3D showcase completely open */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        {/* Primary Race Launch Card */}
        <div className="pointer-events-auto w-full max-w-sm flex flex-col gap-2.5">
          <button
            onClick={() => onNavigate('play_hub')}
            className="group flex items-center justify-between bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-display font-bold text-xl px-6 py-4 rounded-2xl shadow-2xl transition-transform active:scale-[0.99] cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <Play className="w-6 h-6 fill-slate-950" />
              {tr.menuPlay}
            </span>
            <span className="text-xs font-bold bg-slate-950/15 px-2.5 py-1 rounded-lg">
              {racerCount} {tr.rivalsLabel}
            </span>
          </button>

          <button
            onClick={() => onNavigate('multiplayer')}
            className="apex-surface hover:border-cyan-400/60 flex items-center justify-between px-5 py-3.5 rounded-2xl text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-3 font-display font-bold text-base">
              <Globe className="w-5 h-5 text-cyan-400" />
              {tr.menuMultiplayer}
            </span>
            <span className="text-[11px] text-slate-400">
              {tr.publicPlayTab} · {tr.privatePlayTab}
            </span>
          </button>
        </div>

        {/* Clean Section Dock (each item lives inside its proper hub) */}
        <div className="pointer-events-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
          <button
            onClick={() => onNavigate('garage')}
            className="apex-surface apex-stripe-top hover:border-amber-400/50 flex flex-col items-start gap-2 px-4 py-3.5 rounded-2xl text-start transition-colors cursor-pointer min-w-[140px]"
          >
            <Wrench className="w-5 h-5 text-amber-400" />
            <div>
              <div className="font-display font-bold text-sm text-white">
                {tr.menuGarageAndDriver}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{kart.name}</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('tracks')}
            className="apex-surface apex-stripe-top hover:border-emerald-400/50 flex flex-col items-start gap-2 px-4 py-3.5 rounded-2xl text-start transition-colors cursor-pointer min-w-[140px]"
          >
            <MapIcon className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="font-display font-bold text-sm text-white">
                {tr.menuTracksAndCups}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{track.name}</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="apex-surface apex-stripe-top hover:border-cyan-400/50 flex flex-col items-start gap-2 px-4 py-3.5 rounded-2xl text-start transition-colors cursor-pointer min-w-[140px]"
          >
            <User className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="font-display font-bold text-sm text-white">{tr.menuProfile}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{tr.leaderboardsTab}</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="apex-surface apex-stripe-top hover:border-slate-400/50 flex flex-col items-start gap-2 px-4 py-3.5 rounded-2xl text-start transition-colors cursor-pointer min-w-[140px]"
          >
            <Settings className="w-5 h-5 text-slate-300" />
            <div>
              <div className="font-display font-bold text-sm text-white">{tr.menuSettings}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{tr.tutorialTab}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
