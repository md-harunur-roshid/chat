// Subtle Web Audio API tone generator for incoming/outgoing call rings (no external audio assets)
class CallTonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: number | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playPulse(freqs: number[], durationMs: number, volume = 0.08): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    gain.connect(ctx.destination);

    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + durationMs / 1000 + 0.02);
    });
  }

  startIncomingRing(): void {
    this.stop();
    const ringOnce = () => {
      this.playPulse([523.25, 659.25], 240, 0.09);
      window.setTimeout(() => {
        if (this.intervalId !== null) {
          this.playPulse([587.33, 783.99], 280, 0.09);
        }
      }, 280);
    };
    ringOnce();
    this.intervalId = window.setInterval(ringOnce, 2200);
  }

  startOutgoingRingback(): void {
    this.stop();
    const toneOnce = () => {
      this.playPulse([440, 480], 450, 0.04);
    };
    toneOnce();
    this.intervalId = window.setInterval(toneOnce, 2600);
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const callTonePlayer = new CallTonePlayer();
