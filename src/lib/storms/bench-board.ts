import { STICKY_COLORS } from "./palette";
import { topZ, type Items, type StormBody } from "./model";

const SPACING = 240;
const LINES = ["Ship the thing", "Talk to users first", "Cut scope, keep the core", "Who owns this?", "Needs a decision"];

/** Small seeded generator, so the "random" colours are the same on every run. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A deterministic synthetic board for the speed gate: a grid of stickies with 1-3 lines of text,
 * a random preset colour each, and no stored font size (the worst case: every size is fitted on first draw).
 */
export function makeBenchBoard(count: number): StormBody {
  const cols = Math.ceil(Math.sqrt(count * 1.6));
  const rand = mulberry32(1234);
  const items: Items = {};
  for (let i = 0; i < count; i++) {
    const id = `bench-${i}`;
    const lineCount = (i % 3) + 1;
    const text = Array.from({ length: lineCount }, (_, l) => LINES[(i + l) % LINES.length]).join("\n");
    items[id] = {
      id,
      type: "sticky",
      x: (i % cols) * SPACING,
      y: Math.floor(i / cols) * SPACING,
      z: topZ(items),
      w: 200,
      h: 200,
      text,
      color: STICKY_COLORS[Math.floor(rand() * STICKY_COLORS.length)].hex,
    };
  }
  return { schema: 1, items };
}
