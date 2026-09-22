import { displayTitle, findNode } from "./build";
import { isContainer, type ItemKind, type TreeNode } from "./types";

/** A place an item can be moved to; `id` null is the root level. */
export type Destination = {
  id: string | null;
  kind: ItemKind | null;
  title: string;
  /** Ancestor titles, root first, to tell same-named folders apart. */
  path: string[];
  depth: number;
};

function subtreeIds(node: TreeNode, into = new Set<string>()) {
  into.add(node.id);
  for (const child of node.children) subtreeIds(child, into);
  return into;
}

/**
 * Whether `itemId` may be moved into `targetId` (null = root). Only projects
 * and folders accept items; an item cannot go into itself, its own
 * descendants, or the parent it is already in.
 */
export function canMoveTo(roots: TreeNode[], itemId: string, targetId: string | null): boolean {
  const item = findNode(roots, itemId);
  if (!item) return false;
  if (targetId === item.parentId) return false;
  if (targetId === null) return true;
  const target = findNode(roots, targetId);
  if (!target || !isContainer(target.kind)) return false;
  return !subtreeIds(item).has(targetId);
}

/** Every valid destination for `itemId`, in tree order, for the "Move to…" dialog. */
export function moveDestinations(roots: TreeNode[], itemId: string): Destination[] {
  const item = findNode(roots, itemId);
  if (!item) return [];
  const excluded = subtreeIds(item);
  const result: Destination[] = [];

  if (item.parentId !== null) {
    result.push({ id: null, kind: null, title: "Workspace (top level)", path: [], depth: 0 });
  }
  const walk = (nodes: TreeNode[], path: string[]) => {
    for (const node of nodes) {
      if (!isContainer(node.kind) || excluded.has(node.id)) continue;
      const title = displayTitle(node);
      if (node.id !== item.parentId) {
        result.push({ id: node.id, kind: node.kind, title, path, depth: path.length });
      }
      walk(node.children, [...path, title]);
    }
  };
  walk(roots, []);
  return result;
}
