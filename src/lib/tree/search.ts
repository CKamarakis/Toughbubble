import { displayTitle } from "./build";
import type { TreeNode } from "./types";

export type SearchResult = {
  /** The tree reduced to matches and the ancestors that contain them. */
  roots: TreeNode[];
  /** Containers to show expanded while searching (they contain a match). */
  expandIds: Set<string>;
};

/**
 * Filters the tree by title, case-insensitively. An item is kept if its title
 * matches or it contains a match; items that do neither are hidden. Returns
 * null for an empty query (show the normal tree).
 */
export function searchTree(roots: TreeNode[], query: string): SearchResult | null {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return null;

  const expandIds = new Set<string>();
  const filter = (nodes: TreeNode[]): TreeNode[] =>
    nodes.flatMap((node) => {
      const children = filter(node.children);
      const matches = displayTitle(node).toLocaleLowerCase().includes(needle);
      if (children.length > 0) expandIds.add(node.id);
      return matches || children.length > 0 ? [{ ...node, children }] : [];
    });

  return { roots: filter(roots), expandIds };
}
