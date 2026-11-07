/**
 * Web Audio API Engine for the X-MILE Agricultural Lifecycle
 * Synthesizes organic drone, soil ambiance, daylight harmonics, and interactive gate pulses.
 * Zero external audio assets required; runs entirely in browser audio thread.
 */

class SeedAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private isInitialized: boolean = false;

  // Audio Nodes
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private daylightGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private rainNoiseNode: AudioNode | null = null;
  private holdOsc: OscillatorNode | null = null;
  private holdGain: GainNode | null = null;

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }

      const ctx = this.ctx;

      // Master Gain
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, ctx.currentTime);
      this.masterGain.connect(ctx.destination);

      // Lowpass Master Filter
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = "lowpass";
      this.filterNode.frequency.setValueAtTime(450, ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.5, ctx.currentTime);
      this.filterNode.connect(this.masterGain);

      // 1. Organic Base Drone (Root C2 65.4Hz, Fifth G2 98Hz, Octave C3 130.8Hz)
      this.droneGain = ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.4, ctx.currentTime);
      this.droneGain.connect(this.filterNode);

      const baseFreqs = [65.41, 98.0, 130.81, 196.0];
      baseFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Subtle detune for organic phasing
        osc.detune.setValueAtTime((idx - 1.5) * 4, ctx.currentTime);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.25 / (idx + 1), ctx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(this.droneGain!);
        osc.start();
        this.oscillators.push(osc);
      });

      // 2. Daylight Harvester Shimmer (E4 329.6Hz, G4 392Hz, B4 493.88Hz)
      this.daylightGain = ctx.createGain();
      this.daylightGain.gain.setValueAtTime(0.0, ctx.currentTime);
      this.daylightGain.connect(this.masterGain);

      const daylightFreqs = [329.63, 392.0, 493.88, 587.33];
      daylightFreqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.connect(subGain);
        subGain.connect(this.daylightGain!);
        osc.start();
        this.oscillators.push(osc);
      });

      // 3. Autumn Rain Synthesizer (White noise through bandpass)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = "bandpass";
      rainFilter.frequency.setValueAtTime(1200, ctx.currentTime);
      rainFilter.Q.setValueAtTime(0.7, ctx.currentTime);

      this.rainGain = ctx.createGain();
      this.rainGain.gain.setValueAtTime(0.0, ctx.currentTime);

      whiteNoise.connect(rainFilter);
      rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);
      whiteNoise.start();
      this.rainNoiseNode = whiteNoise;

      // 4. Gate Hold Tension Synthesizer
      this.holdGain = ctx.createGain();
      this.holdGain.gain.setValueAtTime(0, ctx.currentTime);
      this.holdGain.connect(this.masterGain);

      this.holdOsc = ctx.createOscillator();
      this.holdOsc.type = "triangle";
      this.holdOsc.frequency.setValueAtTime(110, ctx.currentTime);
      this.holdOsc.connect(this.holdGain);
      this.holdOsc.start();

      this.isInitialized = true;
    } catch {
      // Graceful fallback if Web Audio is blocked or unsupported
      this.isInitialized = false;
    }
  }

  public setHoldProgress(progress: number) {
    if (!this.ctx || !this.holdOsc || !this.holdGain || this.isMuted) return;
    const p = Math.max(0, Math.min(1, progress));
    const now = this.ctx.currentTime;
    // Pitch rises from 110Hz (A2) to 220Hz (A3) as tension builds
    this.holdOsc.frequency.setTargetAtTime(110 + p * 110, now, 0.05);
    this.holdGain.gain.setTargetAtTime(p > 0 ? 0.35 * p : 0, now, 0.05);
  }

  public triggerEntryChime() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (this.holdGain) {
      this.holdGain.gain.setValueAtTime(0, now);
    }
    // High crystal harmonic chime celebrating awakening
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = "sine";
    chime.frequency.setValueAtTime(523.25, now); // C5
    chime.frequency.exponentialRampToValueAtTime(1046.5, now + 0.3); // C6

    chimeGain.gain.setValueAtTime(0.3, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    chime.connect(chimeGain);
    chimeGain.connect(this.masterGain);
    chime.start(now);
    chime.stop(now + 1.9);
  }

  public updateScroll(progress: number, velocity: number = 0) {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const p = Math.max(0, Math.min(1, progress));
    const absVel = Math.min(Math.abs(velocity) * 10, 1);

    // Filter opens up as the seed rises from subterranean (0.0-0.3) to surface (0.3-0.6)
    if (this.filterNode) {
      const targetFreq = p < 0.3 ? 350 + p * 400 : 750 + (p - 0.3) * 1200 + absVel * 200;
      this.filterNode.frequency.setTargetAtTime(targetFreq, now, 0.1);
    }

    // Daylight shimmer peaks during Daylight & Fullness (0.35 to 0.70)
    if (this.daylightGain) {
      const daylightIntensity =
        p >= 0.3 && p <= 0.75
          ? Math.sin(((p - 0.3) / 0.45) * Math.PI) * 0.25
          : 0.0;
      this.daylightGain.gain.setTargetAtTime(daylightIntensity, now, 0.15);
    }

    // Rain sound rises during Autumn & Fall (0.72 to 0.88)
    if (this.rainGain) {
      const rainIntensity =
        p >= 0.72 && p <= 0.88
          ? Math.sin(((p - 0.72) / 0.16) * Math.PI) * 0.2
          : 0.0;
      this.rainGain.gain.setTargetAtTime(rainIntensity, now, 0.15);
    }
  }

  public toggleSound(): boolean {
    if (!this.isInitialized) {
      this.init();
    }
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, now, 0.1);
    }
    return !this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, now, 0.1);
    }
  }

  public dispose() {
    this.oscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    this.oscillators = [];
    if (this.rainNoiseNode) {
      try {
        this.rainNoiseNode.disconnect();
      } catch {
        // ignore
      }
      this.rainNoiseNode = null;
    }
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}

export const audioEngine = new SeedAudioEngine();
