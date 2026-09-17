// Web Audio API sound effects - procedurally generated
let audioCtx: AudioContext | null = null;

let muted = (() => {
  try { return localStorage.getItem('deadwake_muted') === '1'; } catch { return false; }
})();

export function isMuted() { return muted; }

export function setMuted(v: boolean) {
  muted = v;
  try { localStorage.setItem('deadwake_muted', v ? '1' : '0'); } catch {}
  if (v) stopAmbient();
}

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function resumeAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, detune = 0) {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.1) {
  if (muted) return;
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

// Small random pitch wobble so frequently-repeated sounds don't feel identical every time.
function wobble(range = 15) { return (Math.random() * 2 - 1) * range; }

export function sfxCollectCoin() {
  const d = wobble();
  playTone(880, 0.12, 'sine', 0.12, d);
  setTimeout(() => playTone(1174, 0.15, 'sine', 0.1, d), 60);
  setTimeout(() => playTone(1318, 0.2, 'sine', 0.08, d), 120);
}

export function sfxCollectCrate() {
  playTone(440, 0.1, 'triangle', 0.15);
  setTimeout(() => playTone(660, 0.15, 'triangle', 0.12), 80);
  setTimeout(() => playTone(880, 0.2, 'triangle', 0.1), 160);
}

export function sfxBoost() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

export function sfxCrash() {
  playNoise(0.5, 0.2);
  playTone(120, 0.3, 'sawtooth', 0.15);
  setTimeout(() => playTone(80, 0.4, 'sawtooth', 0.1), 100);
}

export function sfxSplash() {
  playNoise(0.15, 0.06);
}

export function sfxButtonClick() {
  const d = wobble(8);
  playTone(600, 0.06, 'sine', 0.08, d);
  setTimeout(() => playTone(800, 0.06, 'sine', 0.06, d), 40);
}

export function sfxWind() {
  playNoise(0.8, 0.04);
}

// Docking at a village — a warm, low arrival chime.
export function sfxDock() {
  playTone(294, 0.12, 'triangle', 0.1);
  setTimeout(() => playTone(392, 0.2, 'triangle', 0.1), 100);
}

// Accepting a mission — crisp, businesslike.
export function sfxMissionAccept() {
  playTone(523, 0.09, 'square', 0.07);
  setTimeout(() => playTone(659, 0.13, 'square', 0.07), 70);
}

// A mission (or delivery) paying out — a rewarding rising arpeggio.
export function sfxMissionComplete() {
  playTone(523, 0.12, 'sine', 0.1);
  setTimeout(() => playTone(659, 0.12, 'sine', 0.1), 100);
  setTimeout(() => playTone(880, 0.25, 'sine', 0.1), 210);
}

// A timed mission running out — deflating, distinct from a hull-crash impact.
export function sfxMissionFail() {
  playTone(370, 0.18, 'sawtooth', 0.09);
  setTimeout(() => playTone(294, 0.3, 'sawtooth', 0.08), 140);
}

// Ramming and sinking an enemy boat while boosted.
export function sfxRamHit() {
  playNoise(0.1, 0.12);
  playTone(140, 0.14, 'square', 0.12);
}

// The bow cannon firing — a short, punchy boom distinct from a hull impact.
export function sfxCannonFire() {
  playNoise(0.12, 0.14);
  playTone(90, 0.16, 'sawtooth', 0.14);
}

// A join code is ready to share — a bright, inviting little flourish.
export function sfxCoopReady() {
  playTone(659, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(880, 0.1, 'sine', 0.1), 80);
  setTimeout(() => playTone(1108, 0.18, 'sine', 0.1), 160);
}

// Someone new joined the party — short and celebratory, distinct from any sea sfx.
export function sfxPlayerJoined() {
  playTone(523, 0.08, 'triangle', 0.09);
  setTimeout(() => playTone(784, 0.14, 'triangle', 0.09), 70);
}

// Picking up trade goods at a Goods Post.
export function sfxCargoPickup() {
  playTone(392, 0.07, 'triangle', 0.08);
  setTimeout(() => playTone(523, 0.1, 'triangle', 0.07), 55);
}

// Selling trade goods — a little cash-register lift.
export function sfxCargoDeliver() {
  playTone(523, 0.09, 'sine', 0.09);
  setTimeout(() => playTone(659, 0.09, 'sine', 0.09), 70);
  setTimeout(() => playTone(880, 0.18, 'sine', 0.08), 140);
}

// Discovering a new village for the first time.
export function sfxDiscovery() {
  playTone(440, 0.14, 'sine', 0.07);
  setTimeout(() => playTone(554, 0.14, 'sine', 0.07), 110);
  setTimeout(() => playTone(659, 0.28, 'sine', 0.08), 220);
}

// Reaching an ending — a slow, resolving chord.
export function sfxEnding() {
  playTone(220, 0.5, 'sine', 0.09);
  setTimeout(() => playTone(277, 0.5, 'sine', 0.07), 220);
  setTimeout(() => playTone(330, 0.7, 'sine', 0.07), 440);
}

// Opening or closing the pause menu — minimal, non-intrusive.
export function sfxPauseToggle() {
  playTone(240, 0.07, 'sine', 0.06);
}

// Ambient ocean loop
let ambientInterval: number | null = null;

export function startAmbient() {
  if (ambientInterval) return;
  ambientInterval = window.setInterval(() => {
    if (muted) return;
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let v = 0;
    for (let i = 0; i < bufferSize; i++) {
      v += (Math.random() * 2 - 1) * 0.1;
      v *= 0.999;
      data[i] = v * Math.sin(i / bufferSize * Math.PI);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    gain.gain.value = 0.03;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }, 2000);
}

export function stopAmbient() {
  if (ambientInterval) {
    clearInterval(ambientInterval);
    ambientInterval = null;
  }
}
