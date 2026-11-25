/**
 * Clash of Codes — Web Audio API Synthesized Sound System.
 * Zero external audio dependencies — generated entirely in-browser.
 * Complies with user audio preferences and browser autoplay policies.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;

    if (typeof window !== "undefined") {
      this.isMuted = localStorage.getItem("coc_sound_muted") === "true";
    }
  }

  initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("coc_sound_muted", String(this.isMuted));
    }
    return this.isMuted;
  }

  getMuted() {
    return this.isMuted;
  }

  // ── Tactile Button Click ──
  playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // AudioContext not allowed yet
    }
  }

  // ── War Attack Launch (Battle Horn / Resonant Strike) ──
  playAttack() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Deep root tone
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(140, now);
      osc1.frequency.exponentialRampToValueAtTime(220, now + 0.25);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Brass overtone
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(280, now);
      osc2.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      gain2.gain.setValueAtTime(0.12, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.5);
    } catch {
      //
    }
  }

  // ── Star Awarded Jingle (Ascending Chime based on star 1, 2, or 3) ──
  playStar(starIndex = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const pitches = [523.25, 659.25, 783.99]; // C5, E5, G5
      const freq = pitches[Math.min(2, Math.max(0, starIndex - 1))];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.setValueAtTime(freq * 1.5, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      //
    }
  }

  // ── Success Chime (All Test Cases Passed) ──
  playSuccess() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A Major arpeggio

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.08;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.14, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch {
      //
    }
  }

  // ── Failure Thud (Test Case Failed / Runtime Error) ──
  playFail() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.22);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      //
    }
  }

  // ── 3-Star Victory Fanfare ──
  playFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const chords = [
        { freqs: [440, 554, 659], start: 0, dur: 0.15 },
        { freqs: [440, 554, 659], start: 0.18, dur: 0.15 },
        { freqs: [440, 554, 659], start: 0.36, dur: 0.15 },
        { freqs: [587, 740, 880], start: 0.54, dur: 0.45 },
      ];

      chords.forEach(({ freqs, start, dur }) => {
        freqs.forEach((freq) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const s = now + start;

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, s);

          gain.gain.setValueAtTime(0.1, s);
          gain.gain.exponentialRampToValueAtTime(0.001, s + dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(s);
          osc.stop(s + dur);
        });
      });
    } catch {
      //
    }
  }
}

export const sounds = new SoundEngine();
export const playStarChime = (star) => sounds.playStar(star);
export const playVictoryFanfare = () => sounds.playFanfare();


