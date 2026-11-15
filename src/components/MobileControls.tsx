import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Flame, MoveUp, Zap } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { InputState } from '../engine/RaceEngine';
import { Language, MobileControlsConfig } from '../types/game';

interface MobileControlsProps {
  config: MobileControlsConfig;
  language: Language;
  hasItem: boolean;
  onInput: (partial: Partial<InputState>) => void;
}

export function MobileControls({ config, language, hasItem, onInput }: MobileControlsProps) {
  const dragOriginX = useRef<number | null>(null);
  const isAr = language === 'ar';

  useEffect(() => {
    if (!config.enabled || config.mode !== 'tilt') return;
    const handleOrient = (e: DeviceOrientationEvent) => {
      const raw = (e.gamma ?? 0) / 35;
      const steer = Math.max(-1, Math.min(1, -raw));
      onInput({ steer: Math.abs(steer) < 0.08 ? 0 : steer });
    };
    window.addEventListener('deviceorientation', handleOrient);
    return () => {
      window.removeEventListener('deviceorientation', handleOrient);
      onInput({ steer: 0 });
    };
  }, [config.enabled, config.mode, onInput]);

  if (!config.enabled) return null;

  const isLeftHanded = config.preset === 'left_handed';
  const scale = config.buttonScale || 1;

  const steerBlock = (
    <div
      className="pointer-events-auto flex items-center gap-3"
      style={{
        transform: `translate(${config.steerOffsetX}px, ${config.steerOffsetY}px) scale(${scale})`,
      }}
    >
      {config.mode === 'buttons' && (
        <>
          <button
            onPointerDown={() => onInput({ steer: 1 })}
            onPointerUp={() => onInput({ steer: 0 })}
            onPointerLeave={() => onInput({ steer: 0 })}
            onPointerCancel={() => onInput({ steer: 0 })}
            className="w-16 h-16 rounded-xl bg-slate-950/85 active:bg-amber-500 active:text-slate-950 border-2 border-white/25 text-white flex items-center justify-center touch-none"
            aria-label={isAr ? 'اتجاه يسار' : 'Steer Left'}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onPointerDown={() => onInput({ steer: -1 })}
            onPointerUp={() => onInput({ steer: 0 })}
            onPointerLeave={() => onInput({ steer: 0 })}
            onPointerCancel={() => onInput({ steer: 0 })}
            className="w-16 h-16 rounded-xl bg-slate-950/85 active:bg-amber-500 active:text-slate-950 border-2 border-white/25 text-white flex items-center justify-center touch-none"
            aria-label={isAr ? 'اتجاه يمين' : 'Steer Right'}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {config.mode === 'touch_drag' && (
        <div
          onPointerDown={(e) => {
            dragOriginX.current = e.clientX;
          }}
          onPointerMove={(e) => {
            if (dragOriginX.current === null) return;
            const dx = e.clientX - dragOriginX.current;
            const steer = Math.max(-1, Math.min(1, -dx / 55));
            onInput({ steer });
          }}
          onPointerUp={() => {
            dragOriginX.current = null;
            onInput({ steer: 0 });
          }}
          onPointerCancel={() => {
            dragOriginX.current = null;
            onInput({ steer: 0 });
          }}
          className="w-40 h-20 rounded-xl bg-slate-950/80 border-2 border-cyan-400/50 flex items-center justify-center text-xs font-semibold text-cyan-300 touch-none"
        >
          {isAr ? 'اسحب للتوجيه' : 'Slide to Steer'}
        </div>
      )}

      {config.mode === 'tilt' && (
        <div className="px-3 py-2 rounded-lg bg-slate-950/80 border border-cyan-400/40 text-xs font-semibold text-cyan-300">
          {isAr ? 'التوجيه بالإمالة مفعل' : 'Tilt Steering Active'}
        </div>
      )}
    </div>
  );

  const actionBlock = (
    <div
      className="pointer-events-auto flex items-end gap-2.5"
      style={{
        transform: `translate(${config.actionOffsetX}px, ${config.actionOffsetY}px) scale(${scale})`,
      }}
    >
      <div className="flex flex-col gap-2">
        <button
          onPointerDown={() => onInput({ useItemPressed: true })}
          className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center touch-none ${
            hasItem
              ? 'bg-amber-500 text-slate-950 border-amber-200'
              : 'bg-slate-950/80 text-slate-400 border-white/20'
          }`}
          aria-label={isAr ? 'استخدام الأداة' : 'Use Item'}
        >
          <Zap className="w-6 h-6" />
        </button>
        <button
          onPointerDown={() => onInput({ brake: 1 })}
          onPointerUp={() => onInput({ brake: 0 })}
          onPointerLeave={() => onInput({ brake: 0 })}
          onPointerCancel={() => onInput({ brake: 0 })}
          className="w-14 h-14 rounded-xl bg-slate-950/85 active:bg-red-500 border-2 border-white/25 text-white flex items-center justify-center touch-none"
          aria-label={isAr ? 'فرامل' : 'Brake'}
        >
          <ArrowDown className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onPointerDown={() => onInput({ jumpPressed: true })}
          className="w-14 h-14 rounded-xl bg-slate-950/85 active:bg-cyan-500 border-2 border-white/25 text-white flex items-center justify-center touch-none"
          aria-label={isAr ? 'قفز' : 'Jump'}
        >
          <MoveUp className="w-6 h-6" />
        </button>
        <button
          onPointerDown={() => onInput({ drift: true })}
          onPointerUp={() => onInput({ drift: false })}
          onPointerLeave={() => onInput({ drift: false })}
          onPointerCancel={() => onInput({ drift: false })}
          className="w-14 h-14 rounded-xl bg-slate-950/85 active:bg-violet-500 border-2 border-violet-400/50 text-violet-300 flex items-center justify-center touch-none"
          aria-label={isAr ? 'انجراف' : 'Drift'}
        >
          <Flame className="w-6 h-6" />
        </button>
      </div>

      <button
        onPointerDown={() => onInput({ throttle: 1 })}
        onPointerUp={() => onInput({ throttle: 0 })}
        onPointerLeave={() => onInput({ throttle: 0 })}
        onPointerCancel={() => onInput({ throttle: 0 })}
        className="w-16 h-28 rounded-xl bg-emerald-600/90 active:bg-emerald-400 border-2 border-emerald-300/60 text-white flex flex-col items-center justify-center gap-1 font-display font-bold text-xs touch-none"
        aria-label={isAr ? 'انطلاق' : 'Accelerate'}
      >
        <ArrowUp className="w-7 h-7" />
        {isAr ? 'انطلاق' : 'GAS'}
      </button>
    </div>
  );

  return (
    <div dir="ltr" className="pointer-events-none fixed inset-x-0 bottom-14 md:bottom-4 z-30 flex items-end justify-between px-4">
      {isLeftHanded ? (
        <>
          {actionBlock}
          {steerBlock}
        </>
      ) : (
        <>
          {steerBlock}
          {actionBlock}
        </>
      )}
    </div>
  );
}
