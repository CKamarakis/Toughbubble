import { topZ, type Items, type StormBody } from "./model";

const SPACING = 240;
const LINES = ["Ship the thing", "Talk to users first", "Cut scope, keep the core", "Who owns this?", "Needs a decision"];

/** A deterministic synthetic board for the speed gate: a grid of stickies with 1-3 lines of text. */
export function makeBenchBoard(count: number): StormBody {
  const cols = Math.ceil(Math.sqrt(count * 1.6));
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
    };
  }
  return { schema: 1, items };
}
