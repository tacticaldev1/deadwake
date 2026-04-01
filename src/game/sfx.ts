// Web Audio API sound effects - procedurally generated
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function resumeAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, detune = 0) {
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

export function sfxCollectCoin() {
  playTone(880, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(1174, 0.15, 'sine', 0.1), 60);
  setTimeout(() => playTone(1318, 0.2, 'sine', 0.08), 120);
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
  playTone(600, 0.06, 'sine', 0.08);
  setTimeout(() => playTone(800, 0.06, 'sine', 0.06), 40);
}

export function sfxWind() {
  playNoise(0.8, 0.04);
}

// Ambient ocean loop
let ambientInterval: number | null = null;

export function startAmbient() {
  if (ambientInterval) return;
  ambientInterval = window.setInterval(() => {
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
