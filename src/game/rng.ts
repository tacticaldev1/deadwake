// Tiny deterministic PRNG utilities — no dependency needed for this. Used to
// generate village layouts and outposts that render identically every time
// (same session, reload, or a different co-op client) from just a stable id
// string, without transmitting the generated result itself over the wire.

// FNV-1a string hash -> 32-bit unsigned seed.
export function hashSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 — small, fast, good-enough distribution for layout placement.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience: a ready-to-use generator seeded directly from a string id.
export function rngFromId(id: string): () => number {
  return mulberry32(hashSeed(id));
}
