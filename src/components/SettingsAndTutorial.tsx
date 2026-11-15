import {
  ArrowLeft,
  ArrowRight,
  CloudRain,
  Gamepad2,
  Gauge,
  HelpCircle,
  Languages,
  Settings,
  Smartphone,
  Sun,
  Volume2,
} from 'lucide-react';
import { useState } from 'react';
import { POWER_UP_LIST } from '../data/progression';
import { TRANSLATIONS } from '../i18n/translations';
import { DrivingDifficulty, GameSettings, Language, TimeOfDay, WeatherCondition } from '../types/game';

interface SettingsAndTutorialProps {
  initialTab?: 'settings' | 'tutorial';
  language: Language;
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onClose: () => void;
}

export function SettingsAndTutorial({
  initialTab = 'settings',
  language,
  settings,
  onUpdateSettings,
  onClose,
}: SettingsAndTutorialProps) {
  const tr = TRANSLATIONS[language];
  const [tab, setTab] = useState<'settings' | 'tutorial'>(initialTab);
  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="fixed inset-0 z-30 bg-[#050811]/95 flex flex-col p-4 md:p-6 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-white/10"
          >
            <BackIcon className="w-4 h-4" />
            {tr.back}
          </button>
          <h1 className="font-display font-bold text-2xl text-white">
            {tab === 'settings' ? tr.settingsTitle : tr.tutorialTitle}
          </h1>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              tab === 'settings' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            {tr.settingsGeneralTab}
          </button>
          <button
            onClick={() => setTab('tutorial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              tab === 'tutorial' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {tr.tutorialTab}
          </button>
        </div>
      </div>

      {tab === 'tutorial' ? (
        <div className="max-w-5xl mx-auto w-full mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="apex-surface apex-stripe-top rounded-2xl p-5 space-y-3">
            <h2 className="font-display font-bold text-lg text-amber-400">
              {tr.tutorialDesktopTitle}
            </h2>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              {tr.tutorialDesktopLines.map((line, i) => (
                <li key={i} className="bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="apex-surface apex-stripe-top rounded-2xl p-5 space-y-3">
            <h2 className="font-display font-bold text-lg text-cyan-400">
              {tr.tutorialDriftTitle}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">{tr.tutorialDriftDesc}</p>
            <div className="space-y-1.5 text-xs">
              <div className="bg-slate-950/70 px-3 py-2 rounded-lg border border-yellow-400/30 text-yellow-300">
                {language === 'ar'
                  ? 'المستوى 1 (شرارة صفراء) — دفعة توربو سريعة'
                  : 'Tier 1 (Yellow Sparks) — Mini Turbo Burst'}
              </div>
              <div className="bg-slate-950/70 px-3 py-2 rounded-lg border border-orange-500/30 text-orange-300">
                {language === 'ar'
                  ? 'المستوى 2 (شرارة برتقالية) — اندفاع توربو خارق'
                  : 'Tier 2 (Orange Sparks) — Super Turbo Surge'}
              </div>
              <div className="bg-slate-950/70 px-3 py-2 rounded-lg border border-purple-500/30 text-purple-300">
                {language === 'ar'
                  ? 'المستوى 3 (شرارة بنفسجية) — أقصى سرعة أبيكس!'
                  : 'Tier 3 (Purple Sparks) — Ultra Apex Overdrive!'}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 apex-surface rounded-2xl p-5 space-y-3">
            <h2 className="font-display font-bold text-lg text-white">{tr.tutorialItemsTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {POWER_UP_LIST.map((item) => {
                const itemLoc = tr.items[item.id];
                return (
                  <div key={item.id} className="apex-card rounded-xl p-3">
                    <div className="font-semibold text-xs" style={{ color: item.color }}>
                      {itemLoc.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{itemLoc.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 apex-surface rounded-2xl p-5 space-y-2">
            <h2 className="font-display font-bold text-lg text-emerald-400">
              {tr.tutorialCrashTitle}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">{tr.tutorialCrashDesc}</p>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto w-full mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 apex-surface apex-stripe-top rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                <Languages className="w-4 h-4" />
                {tr.languageLabel}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['ar', 'العربية'],
                    ['en', 'English'],
                  ] as [Language, string][]
                ).map(([lang, label]) => (
                  <button
                    key={lang}
                    onClick={() => onUpdateSettings({ ...settings, language: lang })}
                    className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                      settings.language === lang
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Gauge className="w-4 h-4" />
                {tr.drivingDifficultyLabel}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['easy', 'medium', 'pro'] as DrivingDifficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => onUpdateSettings({ ...settings, difficulty: diff })}
                    className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                      settings.difficulty === diff
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tr.difficulties[diff]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                <Sun className="w-4 h-4" />
                {tr.timeOfDayLabel}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['day', 'sunset', 'night'] as TimeOfDay[]).map((tod) => (
                  <button
                    key={tod}
                    onClick={() => onUpdateSettings({ ...settings, timeOfDay: tod })}
                    className={`py-2 px-1 rounded-lg text-[11px] font-bold cursor-pointer truncate ${
                      settings.timeOfDay === tod
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tr.timesOfDay[tod]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                <CloudRain className="w-4 h-4" />
                {tr.weatherLabel}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['clear', 'rain'] as WeatherCondition[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => onUpdateSettings({ ...settings, weather: w })}
                    className={`py-2 px-1 rounded-lg text-[11px] font-bold cursor-pointer truncate ${
                      settings.weather === w
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tr.weathers[w]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="apex-surface rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-display font-bold text-lg">
              <Volume2 className="w-5 h-5" />
              {tr.audioCameraTitle}
            </div>

            <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
              <span>{tr.muteAll}</span>
              <input
                type="checkbox"
                checked={settings.muted}
                onChange={(e) => onUpdateSettings({ ...settings, muted: e.target.checked })}
                className="accent-amber-500"
              />
            </label>

            {(
              [
                [tr.masterVol, 'masterVolume'],
                [tr.musicVol, 'musicVolume'],
                [tr.sfxVol, 'sfxVolume'],
              ] as const
            ).map(([label, key]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-mono-num text-white">{Math.round(settings[key] * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings[key]}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, [key]: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500"
                />
              </div>
            ))}

            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{tr.cameraFov}</span>
                <span className="font-mono-num text-white">{settings.cameraFov}°</span>
              </div>
              <input
                type="range"
                min={58}
                max={85}
                step={1}
                value={settings.cameraFov}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, cameraFov: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-500"
              />
            </div>

            <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
              <span>{tr.showMinimap}</span>
              <input
                type="checkbox"
                checked={settings.showMinimap}
                onChange={(e) => onUpdateSettings({ ...settings, showMinimap: e.target.checked })}
                className="accent-cyan-500"
              />
            </label>
          </div>

          <div className="apex-surface rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-display font-bold text-lg">
              <Smartphone className="w-5 h-5" />
              {tr.mobileTitle}
            </div>

            <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
              <span>{tr.enableTouchHud}</span>
              <input
                type="checkbox"
                checked={settings.mobile.enabled}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    mobile: { ...settings.mobile, enabled: e.target.checked },
                  })
                }
                className="accent-cyan-500"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-xs text-slate-300 block">{tr.steerMode}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['buttons', tr.modeButtons],
                    ['touch_drag', tr.modeDrag],
                    ['tilt', tr.modeTilt],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        mobile: { ...settings.mobile, mode: m },
                      })
                    }
                    className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      settings.mobile.mode === m
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-slate-300 block">{tr.layoutPreset}</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['standard', tr.presetStandard],
                    ['left_handed', tr.presetLeft],
                  ] as const
                ).map(([p, label]) => (
                  <button
                    key={p}
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        mobile: { ...settings.mobile, preset: p },
                      })
                    }
                    className={`py-2 px-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      settings.mobile.preset === p
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                {tr.buttonSize}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{tr.buttonSize}</span>
                  <span>{Math.round(settings.mobile.buttonScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.3}
                  step={0.05}
                  value={settings.mobile.buttonScale}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      mobile: { ...settings.mobile, buttonScale: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-slate-400">{tr.steerOffset}</div>
                  <input
                    type="range"
                    min={-40}
                    max={60}
                    step={5}
                    value={settings.mobile.steerOffsetX}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        mobile: { ...settings.mobile, steerOffsetX: parseInt(e.target.value, 10) },
                      })
                    }
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{tr.actionOffset}</div>
                  <input
                    type="range"
                    min={-60}
                    max={40}
                    step={5}
                    value={settings.mobile.actionOffsetX}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        mobile: { ...settings.mobile, actionOffsetX: parseInt(e.target.value, 10) },
                      })
                    }
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
