/** Deterministic PRNG so a question keeps the same shuffle while it is on screen. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const rnd = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle, but never return the original order when there are 2+ items. */
export function shuffledNotIdentity<T>(items: readonly T[], seed: number): T[] {
  if (items.length < 2) return [...items];
  for (let k = 0; k < 8; k++) {
    const s = shuffled(items, seed + k * 7919);
    if (s.some((v, i) => v !== items[i])) return s;
  }
  return [...items].reverse();
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pick<T>(items: readonly T[], rnd: () => number = Math.random): T {
  return items[Math.floor(rnd() * items.length)];
}
