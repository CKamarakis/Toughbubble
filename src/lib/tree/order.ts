import type { ItemKind, TreeNode, TreeRow } from "./types";

type Comparable = Pick<TreeRow, "id" | "kind" | "title" | "position" | "createdAt" | "editedAt">;
export type Compare = (a: Comparable, b: Comparable) => number;

/** Projects, then folders, then notes and Storms together. */
export function kindGroup(kind: ItemKind) {
  return kind === "project" ? 0 : kind === "folder" ? 1 : 2;
}

export type KindGroup = ReturnType<typeof kindGroup>;

/** The kinds in each group, the unit a user reorders (sidebar-manual-order). */
export const GROUP_KINDS: Record<KindGroup, ItemKind[]> = { 0: ["project"], 1: ["folder"], 2: ["note", "storm"] };

const byId = (a: Comparable, b: Comparable) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const newest = (a: Comparable, b: Comparable) => b.createdAt.localeCompare(a.createdAt);

// Keys are ASCII, so comparing code units matches the column's byte-order ("C") collation.
const byPosition = (a: Comparable, b: Comparable) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0);

/**
 * The sidebar order: kind groups, then the user's arrangement (position), then
 * newest first, which is the whole order for groups never rearranged (all
 * 'a0'); id as a stable tie-break (sidebar-manual-order D1).
 */
export const sidebarCompare: Compare = (a, b) =>
  kindGroup(a.kind) - kindGroup(b.kind) || byPosition(a, b) || newest(a, b) || byId(a, b);

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
