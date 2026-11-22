// Sound: every effect is synthesised in WebAudio — no audio files, no network.
// Footsteps, a gem chime, the vault crack, the alarm sting and the getaway fanfare.

let audioContext = null;
let masterGain = null;

function ensureAudio() {
  if (audioContext) return audioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.22;
  masterGain.connect(audioContext.destination);
  return audioContext;
}

/** Unlock audio on the first user gesture (browsers require one). */
export function unlockAudio() {
  const ctx = ensureAudio();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, seconds, type, when, slideTo) {
  const ctx = ensureAudio();
  if (!ctx || !masterGain) return;
  const start = ctx.currentTime + (when || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.6, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

export function playFootstep() {
  tone(140, 0.07, 'triangle', 0, 90);
}

export function playGemChime() {
  tone(880, 0.18, 'sine', 0);
  tone(1318, 0.24, 'sine', 0.07);
}

export function playVaultCrack() {
  tone(220, 0.12, 'square', 0);
  tone(330, 0.12, 'square', 0.1);
  tone(440, 0.2, 'square', 0.2);
  tone(660, 0.32, 'sine', 0.32);
}

export function playAlarmSting() {
  tone(520, 0.16, 'sawtooth', 0, 780);
  tone(520, 0.16, 'sawtooth', 0.2, 780);
}

export function playCaughtSting() {
  tone(392, 0.25, 'sawtooth', 0, 196);
  tone(196, 0.6, 'sawtooth', 0.22, 98);
}

export function playWinFanfare() {
  const notes = [523, 659, 784, 1046, 1318];
  notes.forEach((freq, i) => tone(freq, 0.3, 'triangle', i * 0.11));
}

export function playSmokeHiss() {
  const ctx = ensureAudio();
  if (!ctx || !masterGain) return;
  const duration = 0.5;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = 0.35;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1200;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start();
}

export function playEmpZap() {
  tone(1200, 0.25, 'square', 0, 180);
}
