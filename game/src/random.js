// Lantern Keeper — a tiny seeded random source so demo screenshots and
// replays are reproducible, and so gameplay never depends on Math.random
// in a way a test cannot repeat.

// mulberry32: a small, fast, deterministic PRNG.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// An integer in [min, max] inclusive.
export function rangeInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// One element of an array, uniformly.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// A point inside the arena, clear of the hedge margin.
export function randomPointInArena(rng, width, height, margin) {
  return {
    x: range(rng, margin + 30, width - margin - 30),
    y: range(rng, margin + 30, height - margin - 30),
  };
}
