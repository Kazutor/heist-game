// A tiny seeded random generator (mulberry32) so the staged screenshots and the
// patrol jitter are the same every run for the same seed.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random float in [min, max). */
export function randomRange(random, min, max) {
  return min + random() * (max - min);
}

/** Pick one element of an array. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
