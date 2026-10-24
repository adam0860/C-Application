import { settingsStore } from './store';

/*
 * All sound effects are synthesized with the Web Audio API — no audio files to
 * ship, works offline, and every sound is tiny and consistent across platforms.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      // A gentle compressor keeps layered notes from clipping.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    master!.gain.value = settingsStore.get().volume * 0.5;
    return { ctx, out: master! };
  } catch {
    return null;
  }
}

interface Note {
  freq: number;
  start: number; // seconds from now
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
}

function play(notes: Note[]) {
  if (!settingsStore.get().sound) return;
  const a = audio();
  if (!a) return;
  const t0 = a.ctx.currentTime + 0.01;
  for (const n of notes) {
    const osc = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.freq, t0 + n.start);
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, t0 + n.start + n.dur);
    const peak = n.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, t0 + n.start);
    g.gain.exponentialRampToValueAtTime(peak, t0 + n.start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.dur);
    osc.connect(g).connect(a.out);
    osc.start(t0 + n.start);
    osc.stop(t0 + n.start + n.dur + 0.05);
  }
}

const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568 };

export const sfx = {
  tap: () => play([{ freq: 1200, start: 0, dur: 0.035, type: 'triangle', gain: 0.08 }]),
  select: () => play([{ freq: 740, start: 0, dur: 0.06, type: 'triangle', gain: 0.14 }]),
  correct: () =>
    play([
      { freq: N.E5, start: 0, dur: 0.16, type: 'sine', gain: 0.32 },
      { freq: N.E5 * 2, start: 0, dur: 0.12, type: 'triangle', gain: 0.05 },
      { freq: N.A5, start: 0.09, dur: 0.3, type: 'sine', gain: 0.34 },
      { freq: N.A5 * 2, start: 0.09, dur: 0.2, type: 'triangle', gain: 0.05 },
    ]),
  wrong: () =>
    play([
      { freq: 311, start: 0, dur: 0.16, type: 'triangle', gain: 0.32, slideTo: 290 },
      { freq: 233, start: 0.12, dur: 0.3, type: 'triangle', gain: 0.32, slideTo: 196 },
    ]),
  complete: () =>
    play([
      { freq: N.C5, start: 0, dur: 0.18, gain: 0.25 },
      { freq: N.E5, start: 0.1, dur: 0.18, gain: 0.25 },
      { freq: N.G5, start: 0.2, dur: 0.18, gain: 0.25 },
      { freq: N.C6, start: 0.3, dur: 0.6, gain: 0.3 },
      { freq: N.E6, start: 0.3, dur: 0.6, type: 'triangle', gain: 0.08 },
      { freq: N.G5, start: 0.3, dur: 0.6, gain: 0.12 },
    ]),
  achievement: () =>
    play([
      { freq: N.G5, start: 0, dur: 0.12, type: 'triangle', gain: 0.18 },
      { freq: N.B5, start: 0.07, dur: 0.12, type: 'triangle', gain: 0.18 },
      { freq: N.D5 * 2, start: 0.14, dur: 0.12, type: 'triangle', gain: 0.18 },
      { freq: N.G6, start: 0.21, dur: 0.5, type: 'sine', gain: 0.22 },
    ]),
  hint: () => play([{ freq: N.D5, start: 0, dur: 0.1, gain: 0.15 }, { freq: N.A5, start: 0.06, dur: 0.18, gain: 0.12 }]),
};
