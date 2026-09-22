import type { ItemKind, TreeNode, TreeRow } from "./types";

type Comparable = Pick<TreeRow, "id" | "kind" | "title" | "createdAt" | "editedAt">;
export type Compare = (a: Comparable, b: Comparable) => number;

/** Projects, then folders, then notes and Storms together. */
export function kindGroup(kind: ItemKind) {
  return kind === "project" ? 0 : kind === "folder" ? 1 : 2;
}

const byId = (a: Comparable, b: Comparable) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const newest = (a: Comparable, b: Comparable) => b.createdAt.localeCompare(a.createdAt);

/** The fixed sidebar order: kind groups, newest first, id as a stable tie-break. */
export const sidebarCompare: Compare = (a, b) =>
  kindGroup(a.kind) - kindGroup(b.kind) || newest(a, b) || byId(a, b);

export const CONTENTS_SORTS = ["newest", "oldest", "edited", "az", "za"] as const;
export type ContentsSort = (typeof CONTENTS_SORTS)[number];

export const CONTENTS_SORT_LABELS: Record<ContentsSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  edited: "Last edited",
  az: "A–Z",
  za: "Z–A",
};

export const isContentsSort = (value: unknown): value is ContentsSort =>
  CONTENTS_SORTS.includes(value as ContentsSort);

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/**
 * Sort for a project or folder page: always grouped like the sidebar, then by
 * the chosen order. `title` receives the display title (defaults for empty ones).
 */
export function contentsCompare(sort: ContentsSort, title: (item: Comparable) => string): Compare {
  const sorts: Record<ContentsSort, Compare> = {
    newest,
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    edited: (a, b) => b.editedAt.localeCompare(a.editedAt),
    az: (a, b) => collator.compare(title(a), title(b)),
    za: (a, b) => collator.compare(title(b), title(a)),
  };
  const within = sorts[sort];
  return (a, b) => kindGroup(a.kind) - kindGroup(b.kind) || within(a, b) || newest(a, b) || byId(a, b);
}

/** Returns a copy of the tree with every level sorted by `compare`. */
export function sortTree(nodes: TreeNode[], compare: Compare): TreeNode[] {
  return [...nodes]
    .sort(compare)
    .map((node) => ({ ...node, children: sortTree(node.children, compare) }));
}
