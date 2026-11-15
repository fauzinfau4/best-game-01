// Lantern Keeper — all sound is synthesized with the Web Audio API, so the
// game ships no audio files and makes no network request. Every effect is
// a short oscillator or filtered-noise gesture; music is a quiet pentatonic
// pluck loop that only plays while the game is running.

const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C5 D5 E5 G5 A5 C6

export class SoundBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = 0;
    this.musicStep = 0;
  }

  // Browsers require a user gesture before audio starts; call from the
  // first key press or click, never before.
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.context.destination);
    } catch {
      this.context = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // One short tone: frequency slides from `from` to `to` over `seconds`.
  tone({ from = 440, to = null, seconds = 0.12, type = 'sine', volume = 0.25, delay = 0 }) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + seconds);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  // A breath of filtered noise, for the dash whoosh and the moth scatter.
  noise({ seconds = 0.2, volume = 0.2, frequency = 1200, delay = 0 }) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + delay;
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
  }

  pickup(comboStep) {
    const base = 660 + Math.min(comboStep, 12) * 32;
    this.tone({ from: base, to: base * 1.5, seconds: 0.14, type: 'sine', volume: 0.22 });
    this.tone({ from: base * 2, seconds: 0.08, type: 'triangle', volume: 0.1, delay: 0.03 });
  }

  dash() {
    this.noise({ seconds: 0.18, volume: 0.16, frequency: 1800 });
  }

  mothBurn() {
    this.tone({ from: 320, to: 90, seconds: 0.25, type: 'sawtooth', volume: 0.14 });
    this.noise({ seconds: 0.22, volume: 0.12, frequency: 500 });
  }

  hurt() {
    this.tone({ from: 220, to: 55, seconds: 0.4, type: 'sawtooth', volume: 0.28 });
    this.noise({ seconds: 0.3, volume: 0.18, frequency: 300 });
  }

  levelUp() {
    [523.25, 659.25, 783.99].forEach((f, i) =>
      this.tone({ from: f, seconds: 0.16, type: 'triangle', volume: 0.18, delay: i * 0.07 }),
    );
  }

  freeze() {
    this.tone({ from: 1200, to: 1800, seconds: 0.35, type: 'sine', volume: 0.14 });
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      this.tone({ from: f, seconds: 0.35, type: 'triangle', volume: 0.2, delay: i * 0.11 }),
    );
  }

  lose() {
    [392, 329.63, 261.63, 196].forEach((f, i) =>
      this.tone({ from: f, seconds: 0.4, type: 'sine', volume: 0.18, delay: i * 0.16 }),
    );
  }

  // Called every frame while playing: a soft pluck every beat, pentatonic
  // so it can never sound wrong, quiet enough to sit under the effects.
  updateMusic(dt, playing) {
    if (!this.context || this.muted || !playing) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.42;
    this.musicStep += 1;
    if (this.musicStep % 2 === 0) return; // pluck on every other beat
    const note = NOTES[(this.musicStep * 7 + 3) % NOTES.length];
    this.tone({ from: note, seconds: 0.5, type: 'sine', volume: 0.05 });
  }
}
