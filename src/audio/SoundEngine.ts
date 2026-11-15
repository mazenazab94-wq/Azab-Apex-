import { getCharacterById } from '../data/characters';
import { GameSettings } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineRunning = false;

  private driftNoiseGain: GainNode | null = null;
  private driftFilter: BiquadFilterNode | null = null;

  private musicTimer: number | null = null;
  private musicMode: 'none' | 'menu' | 'race' | 'final_lap' | 'victory' = 'none';
  private stepIndex = 0;

  private settings: GameSettings = {
    language: 'ar',
    difficulty: 'medium',
    timeOfDay: 'day',
    weather: 'clear',
    masterVolume: 0.75,
    musicVolume: 0.55,
    sfxVolume: 0.85,
    muted: false,
    cameraFov: 68,
    showMinimap: true,
    quality: 'high',
    mobile: {
      enabled: false,
      mode: 'buttons',
      preset: 'standard',
      buttonScale: 1,
      steerOffsetX: 0,
      steerOffsetY: 0,
      actionOffsetX: 0,
      actionOffsetY: 0,
    },
  };

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public updateSettings(next: GameSettings) {
    this.settings = next;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.03);
  }

  // === ENGINE & DRIFT LOOP ===
  public startEngineLoop() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.engineRunning) return;
    this.engineRunning = true;

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 320;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.001;

    this.engineOsc1 = ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 54;

    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 108;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Drift tire hiss noise buffer
    const bufLen = ctx.sampleRate * 1;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    this.driftFilter = ctx.createBiquadFilter();
    this.driftFilter.type = 'bandpass';
    this.driftFilter.frequency.value = 1400;
    this.driftFilter.Q.value = 3.2;

    this.driftNoiseGain = ctx.createGain();
    this.driftNoiseGain.gain.value = 0;

    noise.connect(this.driftFilter);
    this.driftFilter.connect(this.driftNoiseGain);
    this.driftNoiseGain.connect(this.sfxGain);
    noise.start();
  }

  public updateEngine(speedRatio: number, boosting: boolean, drifting: boolean, driftLevel: number) {
    if (!this.ctx || !this.engineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineGain || !this.engineFilter) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1.5, speedRatio));
    const freq = 50 + clamped * 112 + (boosting ? 36 : 0);
    this.engineOsc1.frequency.setTargetAtTime(freq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(freq * 1.98, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(260 + clamped * 960 + (boosting ? 600 : 0), now, 0.06);
    this.engineGain.gain.setTargetAtTime(0.05 + clamped * 0.05, now, 0.06);

    if (this.driftNoiseGain && this.driftFilter) {
      this.driftNoiseGain.gain.setTargetAtTime(drifting ? 0.045 + driftLevel * 0.015 : 0, now, 0.04);
      this.driftFilter.frequency.setTargetAtTime(1100 + driftLevel * 450, now, 0.04);
    }
  }

  public stopEngineLoop() {
    if (!this.engineRunning) return;
    this.engineRunning = false;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
    } catch {
      // ignore
    }
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain?.disconnect();
    this.driftNoiseGain?.disconnect();
    this.engineGain = null;
    this.driftNoiseGain = null;
  }

  // === PROCEDURAL SOUNDTRACK ===
  public setMusicMode(mode: 'none' | 'menu' | 'race' | 'final_lap' | 'victory') {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (mode === 'none') return;

    this.stepIndex = 0;
    const bpm = mode === 'menu' ? 112 : mode === 'race' ? 138 : mode === 'final_lap' ? 156 : 128;
    const stepMs = (60 / bpm / 2) * 1000;

    if (mode === 'victory') {
      this.playVictoryFanfare();
    }

    this.musicTimer = window.setInterval(() => {
      if (this.settings.muted) return;
      this.tickMusicStep();
    }, stepMs);
  }

  private tickMusicStep() {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const step = this.stepIndex % 16;
    this.stepIndex++;

    if (this.musicMode === 'menu') {
      const menuBass = [110, 0, 110, 0, 130.81, 0, 146.83, 0, 98, 0, 98, 0, 123.47, 0, 130.81, 146.83];
      const menuLead = [440, 0, 523.25, 659.25, 0, 587.33, 523.25, 0, 392, 0, 493.88, 587.33, 0, 659.25, 587.33, 523.25];
      if (menuBass[step] > 0) this.synthTone(menuBass[step], 'triangle', 0.16, 0.1, this.musicGain, now);
      if (menuLead[step] > 0) this.synthTone(menuLead[step], 'sine', 0.18, 0.055, this.musicGain, now);
      if (step % 4 === 0) this.synthKick(0.13, this.musicGain, now);
      return;
    }

    if (this.musicMode === 'race' || this.musicMode === 'final_lap') {
      const scale = this.musicMode === 'final_lap'
        ? [146.83, 146.83, 293.66, 146.83, 174.61, 174.61, 196, 174.61, 130.81, 130.81, 261.63, 130.81, 164.81, 196, 220, 246.94]
        : [130.81, 130.81, 261.63, 130.81, 155.56, 155.56, 174.61, 155.56, 116.54, 116.54, 233.08, 116.54, 146.83, 174.61, 196, 220];
      const leadPattern = [523.25, 0, 659.25, 783.99, 0, 659.25, 587.33, 659.25, 466.16, 0, 587.33, 698.46, 0, 783.99, 880, 783.99];
      this.synthTone(scale[step], 'sawtooth', 0.11, 0.075, this.musicGain, now, 500);
      if (leadPattern[step] > 0) {
        const pitchMult = this.musicMode === 'final_lap' ? 1.12 : 1.0;
        this.synthTone(leadPattern[step] * pitchMult, 'square', 0.1, 0.04, this.musicGain, now, 1800);
      }
      if (step % 4 === 0) this.synthKick(0.2, this.musicGain, now);
      if (step % 4 === 2) this.synthSnare(0.075, this.musicGain, now);
      if (step % 2 === 1) this.synthHat(0.025, this.musicGain, now);
    }
  }

  private playVictoryFanfare() {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.synthTone(n, 'triangle', 0.25, 0.16, this.musicGain!, now + idx * 0.13);
    });
  }

  // === ONE-SHOT SFX ===
  public playMenuClick() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    this.synthTone(680, 'triangle', 0.06, 0.11, this.sfxGain, ctx.currentTime);
  }

  public playCountdownBeep(isGo: boolean) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    if (isGo) {
      this.synthTone(880, 'sawtooth', 0.35, 0.22, this.sfxGain, now, 2200);
      this.synthTone(1318.5, 'triangle', 0.35, 0.18, this.sfxGain, now);
    } else {
      this.synthTone(440, 'square', 0.16, 0.16, this.sfxGain, now, 1200);
    }
  }

  public playTurboBoost(tier = 1) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180 + tier * 70, now);
    osc.frequency.exponentialRampToValueAtTime(620 + tier * 120, now + 0.28);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playJump() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.14);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playCollision() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    this.synthKick(0.32, this.sfxGain, now);
    this.synthSnare(0.18, this.sfxGain, now);
  }

  public playCrash() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    this.synthKick(0.55, this.sfxGain, now);
    this.synthSnare(0.4, this.sfxGain, now + 0.04);
    this.synthTone(140, 'sawtooth', 0.38, 0.22, this.sfxGain, now, 650);
  }

  public playRepair() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.synthTone(f, 'sine', 0.14, 0.16, this.sfxGain!, now + i * 0.06);
    });
  }

  public playCoinPickup() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    this.synthTone(987.77, 'sine', 0.08, 0.14, this.sfxGain, now);
    this.synthTone(1318.5, 'sine', 0.12, 0.14, this.sfxGain, now + 0.06);
  }

  public playPowerUpPickup() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.synthTone(f, 'triangle', 0.09, 0.13, this.sfxGain!, now + i * 0.045);
    });
  }

  public playPowerUpUse(kind: string) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    if (kind === 'nitro_surge' || kind === 'overdrive_core' || kind === 'nitro_charge') {
      this.playTurboBoost(3);
    } else if (kind === 'seeker_pulse') {
      this.synthTone(640, 'sawtooth', 0.14, 0.18, this.sfxGain, now, 1600);
      this.synthTone(320, 'square', 0.18, 0.14, this.sfxGain, now + 0.08, 900);
    } else if (kind === 'aegis_dome') {
      this.synthTone(440, 'sine', 0.25, 0.16, this.sfxGain, now);
      this.synthTone(660, 'sine', 0.25, 0.14, this.sfxGain, now + 0.08);
    } else if (kind === 'repair_kit') {
      this.playRepair();
    } else if (kind === 'chrono_field') {
      this.synthTone(820, 'square', 0.18, 0.16, this.sfxGain, now, 1400);
      this.synthTone(240, 'sawtooth', 0.25, 0.18, this.sfxGain, now + 0.06, 800);
    } else {
      this.synthTone(280, 'triangle', 0.22, 0.18, this.sfxGain, now);
    }
  }

  public playExplosion() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    this.synthKick(0.45, this.sfxGain, now);
    this.synthSnare(0.32, this.sfxGain, now);
  }

  public playLapChime(isFinal: boolean) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const notes = isFinal ? [659.25, 783.99, 987.77, 1318.5] : [523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      this.synthTone(f, 'triangle', 0.16, 0.18, this.sfxGain!, now + i * 0.08);
    });
  }

  public playCharacterVoice(characterId: string, mood: 'select' | 'boost' | 'hit' | 'win' = 'select') {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const char = getCharacterById(characterId);
    const now = ctx.currentTime;
    const base = 260 * char.voicePitch;
    const wave: OscillatorType =
      char.voiceType === 'synth' ? 'square' :
      char.voiceType === 'roar' ? 'sawtooth' :
      char.voiceType === 'trickster' ? 'triangle' : 'sine';

    if (mood === 'select' || mood === 'win') {
      const pattern = mood === 'win' ? [1, 1.25, 1.5, 1.8] : [1, 1.2, 1.45];
      pattern.forEach((m, i) => {
        this.synthTone(base * m, wave, 0.1, 0.14, this.sfxGain!, now + i * 0.075, 1600);
      });
    } else if (mood === 'boost') {
      this.synthTone(base * 1.1, wave, 0.14, 0.15, this.sfxGain, now, 1800);
      this.synthTone(base * 1.6, wave, 0.14, 0.15, this.sfxGain, now + 0.06, 1800);
    } else {
      this.synthTone(base * 0.9, wave, 0.12, 0.16, this.sfxGain, now, 900);
      this.synthTone(base * 0.62, wave, 0.16, 0.16, this.sfxGain, now + 0.08, 700);
    }
  }

  private synthTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    vol: number,
    dest: AudioNode,
    startTime: number,
    filterCutoff?: number
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    if (filterCutoff) {
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = filterCutoff;
      osc.connect(flt);
      flt.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private synthKick(vol: number, dest: AudioNode, startTime: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, startTime);
    osc.frequency.exponentialRampToValueAtTime(38, startTime + 0.16);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + 0.19);
  }

  private synthSnare(vol: number, dest: AudioNode, startTime: number) {
    if (!this.ctx) return;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
    src.connect(flt);
    flt.connect(g);
    g.connect(dest);
    src.start(startTime);
  }

  private synthHat(vol: number, dest: AudioNode, startTime: number) {
    if (!this.ctx) return;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.value = 5000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);
    src.connect(flt);
    flt.connect(g);
    g.connect(dest);
    src.start(startTime);
  }
}

export const soundEngine = new SoundEngine();
