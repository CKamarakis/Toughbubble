import { sidebarCompare, sortTree } from "./order";
import type { ItemKind, TreeNode, TreeRow } from "./types";

const DEFAULT_TITLES: Record<ItemKind, string> = {
  project: "Untitled project",
  folder: "Untitled folder",
  note: "Untitled note",
  storm: "Untitled Storm",
};

/** The title to show: empty titles are stored as "" and shown as the kind's default. */
export function displayTitle(item: { kind: ItemKind; title: string }) {
  return item.title.trim() || DEFAULT_TITLES[item.kind];
}

/**
 * Builds the tree from flat rows, sorted in the fixed sidebar order. An item
 * whose parent is not among the rows is shown at the root rather than lost.
 */
export function buildTree(rows: TreeRow[], compare = sidebarCompare): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const row of rows) nodes.set(row.id, { ...row, children: [] });

  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return sortTree(roots, compare);
}

/** Ancestors of `id`, root first, excluding the item itself. Empty if unknown or at the root. */
export function ancestorPath(rows: TreeRow[], id: string): TreeRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const path: TreeRow[] = [];
  const seen = new Set<string>();
  let current = byId.get(id)?.parentId;
  while (current && !seen.has(current)) {
    seen.add(current);
    const row = byId.get(current);
    if (!row) break;
    path.unshift(row);
    current = row.parentId;
  }
  return path;
}

/** Finds a node anywhere in the tree. */
export function findNode(roots: TreeNode[], id: string): TreeNode | undefined {
  for (const node of roots) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return undefined;
}
