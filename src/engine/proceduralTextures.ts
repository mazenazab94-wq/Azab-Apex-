import * as THREE from 'three';
import { DecalDef, TrackTheme, WeatherCondition } from '../types/game';

const textureCache = new Map<string, THREE.CanvasTexture>();

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createRoadTexture(
  theme: TrackTheme,
  roadColor: string,
  accentColor: string,
  maxAnisotropy = 4,
  weather: WeatherCondition = 'clear'
): THREE.CanvasTexture {
  const key = `road_v2_${theme}_${roadColor}_${accentColor}_${weather}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Realistic tarmac base
  ctx.fillStyle = weather === 'rain' ? '#1E2430' : roadColor;
  ctx.fillRect(0, 0, 512, 512);

  // Fine asphalt mineral aggregate grain
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = Math.random() * 0.14;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.3})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle tire racing-line wear grooves
  const groove = ctx.createLinearGradient(0, 0, 512, 0);
  groove.addColorStop(0, 'rgba(0,0,0,0)');
  groove.addColorStop(0.26, 'rgba(0,0,0,0.18)');
  groove.addColorStop(0.45, 'rgba(0,0,0,0.03)');
  groove.addColorStop(0.55, 'rgba(0,0,0,0.03)');
  groove.addColorStop(0.74, 'rgba(0,0,0,0.18)');
  groove.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = groove;
  ctx.fillRect(0, 0, 512, 512);

  // Wet puddle reflections when raining
  if (weather === 'rain') {
    for (let i = 0; i < 18; i++) {
      const px = 60 + Math.random() * 392;
      const py = Math.random() * 512;
      const rx = 25 + Math.random() * 45;
      const ry = 40 + Math.random() * 65;
      const pGrad = ctx.createRadialGradient(px, py, 4, px, py, ry);
      pGrad.addColorStop(0, 'rgba(148, 163, 184, 0.28)');
      pGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Crisp realistic highway edge lines
  ctx.fillStyle = theme === 'cyber' || theme === 'space' ? accentColor : 'rgba(248, 250, 252, 0.82)';
  ctx.fillRect(18, 0, 10, 512);
  ctx.fillRect(484, 0, 10, 512);

  // Dashed center lane markings
  ctx.fillStyle = theme === 'desert' ? '#FBBF24' : 'rgba(248, 250, 252, 0.78)';
  for (let y = 16; y < 512; y += 96) {
    ctx.fillRect(251, y, 10, 48);
  }

  const tex = finalizeTexture(canvas, 1, 28, maxAnisotropy);
  textureCache.set(key, tex);
  return tex;
}

export function createTerrainTexture(baseColor: string, theme: TrackTheme, maxAnisotropy = 4): THREE.CanvasTexture {
  const key = `terrain_${baseColor}_${theme}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 2 + Math.random() * 6;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, y, size, size);
  }

  const tex = finalizeTexture(canvas, 32, 32, maxAnisotropy);
  textureCache.set(key, tex);
  return tex;
}

export function createBuildingFacadeTexture(isNight: boolean, maxAnisotropy = 4): THREE.CanvasTexture {
  const key = `facade_${isNight ? 'night' : 'day'}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isNight ? '#0F172A' : '#334155';
  ctx.fillRect(0, 0, 256, 512);

  for (let y = 18; y < 492; y += 28) {
    for (let x = 16; x < 240; x += 28) {
      const lit = isNight ? Math.random() > 0.35 : Math.random() > 0.7;
      ctx.fillStyle = lit
        ? isNight
          ? '#FDE68A'
          : '#BAE6FD'
        : isNight
        ? '#1E293B'
        : '#475569';
      ctx.fillRect(x, y, 16, 18);
    }
  }

  const tex = finalizeTexture(canvas, 1, 1, maxAnisotropy);
  textureCache.set(key, tex);
  return tex;
}

export function createCheckeredTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const key = 'checkered_finish';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const size = 32;
  for (let y = 0; y < 128; y += size) {
    for (let x = 0; x < 256; x += size) {
      const dark = ((x / size) + (y / size)) % 2 === 0;
      ctx.fillStyle = dark ? '#0F172A' : '#F8FAFC';
      ctx.fillRect(x, y, size, size);
    }
  }
  const tex = finalizeTexture(canvas, 2, 1, maxAnisotropy);
  textureCache.set(key, tex);
  return tex;
}

export function createBoostPadTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const key = 'boost_pad';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 256, 256);

  const colors = ['#06B6D4', '#F59E0B', '#EF4444'];
  for (let i = 0; i < 3; i++) {
    const yOff = 40 + i * 75;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(32, yOff + 45);
    ctx.lineTo(128, yOff);
    ctx.lineTo(224, yOff + 45);
    ctx.lineTo(224, yOff + 72);
    ctx.lineTo(128, yOff + 27);
    ctx.lineTo(32, yOff + 72);
    ctx.closePath();
    ctx.fill();
  }

  const tex = finalizeTexture(canvas, 1, 1, maxAnisotropy);
  textureCache.set(key, tex);
  return tex;
}

export function createKartPaintTexture(
  baseHex: string,
  pattern: DecalDef['pattern'],
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const key = `paint_v2_${baseHex}_${pattern}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle metallic clearcoat micro-flake
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }

  if (pattern === 'stripes') {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(104, 0, 18, 256);
    ctx.fillRect(134, 0, 18, 256);
  } else if (pattern === 'lightning') {
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(140, 10);
    ctx.lineTo(95, 130);
    ctx.lineTo(130, 130);
    ctx.lineTo(105, 245);
    ctx.lineTo(165, 115);
    ctx.lineTo(128, 115);
    ctx.closePath();
    ctx.fill();
  } else if (pattern === 'flames') {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#FEF08A');
    grad.addColorStop(0.5, '#F97316');
    grad.addColorStop(1, '#DC2626');
    ctx.fillStyle = grad;
    for (let x = 20; x < 240; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 256);
      ctx.quadraticCurveTo(x + 12, 120, x + 24, 40);
      ctx.quadraticCurveTo(x + 36, 120, x + 44, 256);
      ctx.fill();
    }
  } else if (pattern === 'checkered') {
    for (let y = 0; y < 256; y += 32) {
      for (let x = 80; x < 176; x += 32) {
        ctx.fillStyle = ((x + y) / 32) % 2 === 0 ? '#FFFFFF' : '#0F172A';
        ctx.fillRect(x, y, 32, 32);
      }
    }
  } else if (pattern === 'star') {
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 75 : 32;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const px = 128 + Math.cos(a) * r;
      const py = 128 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (pattern === 'cyber') {
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 4;
    for (let y = 24; y < 256; y += 48) {
      for (let x = 24; x < 256; x += 48) {
        ctx.strokeRect(x - 14, y - 14, 28, 28);
      }
    }
  } else if (pattern === 'dragon') {
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(128, 28);
    ctx.lineTo(205, 130);
    ctx.lineTo(155, 130);
    ctx.lineTo(175, 225);
    ctx.lineTo(128, 175);
    ctx.lineTo(81, 225);
    ctx.lineTo(101, 130);
    ctx.lineTo(51, 130);
    ctx.closePath();
    ctx.fill();
  }

  const tex = finalizeTexture(canvas, 1, 1, maxAnisotropy);
  textureCache.set(key, tex);
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const key = 'contact_shadow';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}
