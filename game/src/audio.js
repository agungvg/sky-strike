// Procedural audio, no assets: jet whine (saw + lowpass, pitch follows
// throttle, sharper in afterburner), wind noise (filtered noise, louder
// with speed), gate chime, lock beep, missile launch whoosh, thunder
// rumble. Everything starts on the first user gesture.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineGain = null;
    this.windGain = null;
    this.osc = null;
    this.osc2 = null;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      // jet: two detuned saws through a lowpass
      this.osc = this.ctx.createOscillator();
      this.osc.type = 'sawtooth'; this.osc.frequency.value = 82;
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'sawtooth'; this.osc2.frequency.value = 123;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 620; lp.Q.value = 2;
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0.0;
      this.osc.connect(lp); this.osc2.connect(lp);
      lp.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
      this.osc.start(); this.osc2.start();
      // wind: looping noise buffer through a bandpass
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
      this.windGain = this.ctx.createGain(); this.windGain.gain.value = 0.0;
      noise.connect(bp); bp.connect(this.windGain); this.windGain.connect(this.ctx.destination);
      noise.start();
    } catch (e) { this.ctx = null; }
  }

  update(throttle, speedKt, flying, afterburner = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const eng = flying ? 0.05 + throttle * 0.10 + (afterburner ? 0.05 : 0) : 0.0;
    this.engineGain.gain.setTargetAtTime(eng, t, 0.15);
    this.osc.frequency.setTargetAtTime(72 + throttle * 88 + (afterburner ? 40 : 0), t, 0.1);
    this.osc2.frequency.setTargetAtTime(108 + throttle * 132 + (afterburner ? 60 : 0), t, 0.1);
    const wind = flying ? Math.min(0.14, speedKt / 1400) : 0;
    this.windGain.gain.setTargetAtTime(wind, t, 0.2);
  }

  blip(freq = 880, dur = 0.12, vol = 0.15) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  gate() { this.blip(880, 0.1, 0.18); setTimeout(() => this.blip(1318, 0.16, 0.18), 90); }

  lockTone() { this.blip(1568, 0.07, 0.12); }

  launch() {
    if (!this.ctx || this.muted) return;
    const len = this.ctx.sampleRate * 0.7;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1;
    const g = this.ctx.createGain(); g.gain.value = 0.4;
    src.connect(bp); bp.connect(g); g.connect(this.ctx.destination);
    src.start();
  }

  explosion() {
    if (!this.ctx || this.muted) return;
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const g = this.ctx.createGain(); g.gain.value = 0.6;
    src.connect(lp); lp.connect(g); g.connect(this.ctx.destination);
    src.start();
  }

  thunder() {
    if (!this.ctx || this.muted) return;
    const len = this.ctx.sampleRate * 1.6;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
    const g = this.ctx.createGain(); g.gain.value = 0.5;
    src.connect(lp); lp.connect(g); g.connect(this.ctx.destination);
    src.start();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx && this.engineGain) {
      this.engineGain.gain.value = 0;
      this.windGain.gain.value = 0;
    }
    return this.muted;
  }
}
