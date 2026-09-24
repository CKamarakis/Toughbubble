export type ItemKind = "project" | "folder" | "note" | "storm";

/** An active item as loaded for the sidebar. Dates are ISO strings. */
export type TreeRow = {
  id: string;
  parentId: string | null;
  kind: ItemKind;
  title: string;
  icon: string | null;
  color: string | null;
  /** Manual order within the item's kind group (fractional-indexing key; 'a0' until reordered). */
  position: string;
  createdAt: string;
  editedAt: string;
};

export type TreeNode = TreeRow & { children: TreeNode[] };

export const isContainer = (kind: ItemKind) => kind === "project" || kind === "folder";
