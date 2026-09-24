import { kindGroup, type KindGroup } from "./order";
import type { TreeNode } from "./types";

// Pure helpers for reordering in the sidebar (sidebar-manual-order D4, D5).

export type Group = { parentId: string | null; group: KindGroup; ids: string[] };

/** The kind group an item belongs to, with its members in sidebar order. */
export function groupOf(tree: TreeNode[], id: string): Group | null {
  const visit = (nodes: TreeNode[], parentId: string | null): Group | null => {
    const item = nodes.find((n) => n.id === id);
    if (item) {
      const group = kindGroup(item.kind);
      return { parentId, group, ids: nodes.filter((n) => kindGroup(n.kind) === group).map((n) => n.id) };
    }
    for (const n of nodes) {
      const found = visit(n.children, n.id);
      if (found) return found;
    }
    return null;
  };
  return visit(tree, null);
}

/** Whether `targetId` is a place `activeId` can be dropped next to: same parent, same group, not itself. */
export function canReorderNextTo(tree: TreeNode[], activeId: string, targetId: string): boolean {
  if (activeId === targetId) return false;
  const group = groupOf(tree, activeId);
  return !!group && group.ids.includes(targetId);
}

/**
 * The group's ids with `activeId` moved above or below `targetId`, or null
 * when that leaves the order unchanged.
 */
export function reorderedIds(ids: string[], activeId: string, targetId: string, side: "above" | "below"): string[] | null {
  if (activeId === targetId || !ids.includes(activeId) || !ids.includes(targetId)) return null;
  const rest = ids.filter((id) => id !== activeId);
  const at = rest.indexOf(targetId) + (side === "below" ? 1 : 0);
  const next = [...rest.slice(0, at), activeId, ...rest.slice(at)];
  return next.every((id, i) => id === ids[i]) ? null : next;
}

/** The group's ids with `id` swapped with its neighbour (Move up / Move down), or null at the end. */
export function movedOneStep(ids: string[], id: string, direction: "up" | "down"): string[] | null {
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
