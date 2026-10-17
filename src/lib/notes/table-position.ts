import type { Node as PMNode } from "@tiptap/pm/model";

/**
 * Where a file goes when it's added at `pos`: right after the outermost
 * table around `pos`, since cells hold no files (tables-in-notes D3);
 * otherwise `pos` itself.
 */
export function outsideTable(doc: PMNode, pos: number): number {
  const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size));
  for (let depth = 1; depth <= $pos.depth; depth++) {
    if ($pos.node(depth).type.name === "table") return $pos.after(depth);
  }
  return pos;
}
