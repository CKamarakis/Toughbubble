import { describe, expect, it } from "vitest";
import { ancestorPath, buildTree, displayTitle, revealAncestors } from "./build";
import { canMoveTo, moveDestinations } from "./destinations";
import { contentsCompare, sidebarCompare, sortTree, type ContentsSort } from "./order";
import { canReorderNextTo, groupOf, movedOneStep, reorderedIds } from "./reorder";
import { searchTree } from "./search";
import type { ItemKind, TreeNode, TreeRow } from "./types";

let n = 0;
function row(kind: ItemKind, title: string, opts: Partial<TreeRow> = {}): TreeRow {
  n++;
  return {
    id: opts.id ?? `id-${String(n).padStart(3, "0")}`,
    parentId: null,
    kind,
    title,
    icon: null,
    color: null,
    position: "a0",
    createdAt: opts.createdAt ?? `2026-01-${String(n).padStart(2, "0")}T00:00:00.000Z`,
    editedAt: opts.editedAt ?? opts.createdAt ?? `2026-01-${String(n).padStart(2, "0")}T00:00:00.000Z`,
    ...opts,
  };
}
const titles = (nodes: TreeNode[]) => nodes.map((x) => x.title);

describe("displayTitle", () => {
  it("shows the kind's default for empty titles", () => {
    expect(displayTitle({ kind: "project", title: "" })).toBe("Untitled project");
    expect(displayTitle({ kind: "storm", title: "  " })).toBe("Untitled Storm");
    expect(displayTitle({ kind: "note", title: "Ideas" })).toBe("Ideas");
  });
});

describe("buildTree and the sidebar order", () => {
  it("groups projects, then folders, then notes and Storms, each newest first (spec scenario)", () => {
    const parent = row("folder", "Parent", { id: "p", createdAt: "2026-01-01T00:00:00.000Z" });
    const rows = [
      parent,
      row("note", "Monday note", { parentId: "p", createdAt: "2026-02-02T00:00:00.000Z" }),
      row("folder", "Tuesday folder", { parentId: "p", createdAt: "2026-02-03T00:00:00.000Z" }),
      row("storm", "Wednesday Storm", { parentId: "p", createdAt: "2026-02-04T00:00:00.000Z" }),
      row("project", "Thursday project", { parentId: "p", createdAt: "2026-02-05T00:00:00.000Z" }),
    ];
    const [root] = buildTree(rows);
    expect(titles(root.children)).toEqual([
      "Thursday project",
      "Tuesday folder",
      "Wednesday Storm",
      "Monday note",
    ]);
  });

  it("orders within a group newest first and breaks ties by id", () => {
    const t = "2026-03-01T00:00:00.000Z";
    const rows = [
      row("project", "Old", { createdAt: "2026-01-01T00:00:00.000Z" }),
      row("project", "B", { id: "b", createdAt: t }),
      row("project", "A", { id: "a", createdAt: t }),
    ];
    expect(titles(buildTree(rows))).toEqual(["A", "B", "Old"]);
  });

  it("orders a rearranged group by position, before creation time", () => {
    const rows = [
      row("note", "Newest", { createdAt: "2026-03-03T00:00:00.000Z", position: "a2" }),
      row("note", "Middle", { createdAt: "2026-03-02T00:00:00.000Z", position: "a0" }),
      row("note", "Oldest", { createdAt: "2026-03-01T00:00:00.000Z", position: "a1" }),
      row("folder", "Folder", { position: "a9" }),
    ];
    // Kind groups still come first; within the notes, positions win.
    expect(titles(buildTree(rows))).toEqual(["Folder", "Middle", "Oldest", "Newest"]);
  });

  it("puts a key below 'a0' (a new item in an untouched group) first", () => {
    const rows = [
      row("note", "Old A", { createdAt: "2026-03-02T00:00:00.000Z" }),
      row("note", "Old B", { createdAt: "2026-03-03T00:00:00.000Z" }),
      row("note", "New", { createdAt: "2026-03-01T00:00:00.000Z", position: "Zz" }),
    ];
    expect(titles(buildTree(rows))).toEqual(["New", "Old B", "Old A"]);
  });

  it("nests children and shows orphans at the root", () => {
    const rows = [
      row("project", "P", { id: "p" }),
      row("note", "Child", { parentId: "p" }),
      row("note", "Orphan", { parentId: "missing" }),
    ];
    const tree = buildTree(rows);
    expect(titles(tree)).toEqual(["P", "Orphan"]);
    expect(titles(tree[0].children)).toEqual(["Child"]);
  });

  it("returns ancestors root first", () => {
    const rows = [
      row("project", "P", { id: "p" }),
      row("folder", "F", { id: "f", parentId: "p" }),
      row("note", "N", { id: "n", parentId: "f" }),
    ];
    expect(ancestorPath(rows, "n").map((r) => r.title)).toEqual(["P", "F"]);
    expect(ancestorPath(rows, "p")).toEqual([]);
    expect(ancestorPath(rows, "unknown")).toEqual([]);
  });
});

describe("contents sorts", () => {
  const rows = [
    row("note", "banana", { createdAt: "2026-01-02T00:00:00.000Z", editedAt: "2026-05-01T00:00:00.000Z" }),
    row("note", "Apple 10", { createdAt: "2026-01-03T00:00:00.000Z" }),
    row("storm", "", { createdAt: "2026-01-01T00:00:00.000Z" }),
    row("note", "apple 9", { createdAt: "2026-01-04T00:00:00.000Z" }),
    row("folder", "Zeta folder", { createdAt: "2026-01-05T00:00:00.000Z" }),
  ];
  const sorted = (sort: ContentsSort) =>
    titles(sortTree(buildTree(rows), contentsCompare(sort, displayTitle)));

  it("keeps kind groups for every sort", () => {
    for (const sort of ["newest", "oldest", "edited", "az", "za"] as const) {
      expect(sorted(sort)[0]).toBe("Zeta folder");
    }
  });

  it("Newest and Oldest use creation time", () => {
    expect(sorted("newest")).toEqual(["Zeta folder", "apple 9", "Apple 10", "banana", ""]);
    expect(sorted("oldest")).toEqual(["Zeta folder", "", "banana", "Apple 10", "apple 9"]);
  });

  it("Last edited puts the most recently edited first", () => {
    expect(sorted("edited")[1]).toBe("banana");
  });

  it("A–Z is case-insensitive, numeric-aware, and uses default titles", () => {
    expect(sorted("az")).toEqual(["Zeta folder", "apple 9", "Apple 10", "banana", ""]);
    expect(sorted("za")).toEqual(["Zeta folder", "", "banana", "Apple 10", "apple 9"]);
  });

  it("does not change the sidebar order", () => {
    expect(titles(buildTree(rows))).toEqual(titles(sortTree(buildTree(rows), sidebarCompare)));
  });
});

describe("searchTree", () => {
  const rows = [
    row("project", "Work", { id: "w" }),
    row("folder", "Quarterly", { id: "q", parentId: "w" }),
    row("note", "Q3 Planning", { id: "n", parentId: "q" }),
    row("note", "Groceries", { parentId: "w" }),
    row("project", "Home"),
  ];
  const tree = buildTree(rows);

  it("keeps matches with their ancestors and hides the rest", () => {
    const result = searchTree(tree, "PLAN")!;
    expect(titles(result.roots)).toEqual(["Work"]);
    expect(titles(result.roots[0].children)).toEqual(["Quarterly"]);
    expect(titles(result.roots[0].children[0].children)).toEqual(["Q3 Planning"]);
    expect([...result.expandIds].sort()).toEqual(["q", "w"]);
  });

  it("matches default titles", () => {
    const result = searchTree(buildTree([row("note", "")]), "untitled")!;
    expect(result.roots).toHaveLength(1);
  });

  it("returns an empty tree when nothing matches", () => {
    expect(searchTree(tree, "zzz")!.roots).toEqual([]);
  });

  it("returns null for an empty query", () => {
    expect(searchTree(tree, "   ")).toBeNull();
  });
});

describe("move destinations", () => {
  const rows = [
    row("project", "P", { id: "p" }),
    row("folder", "A", { id: "a", parentId: "p" }),
    row("folder", "A1", { id: "a1", parentId: "a" }),
    row("note", "N", { id: "n", parentId: "a" }),
    row("folder", "B", { id: "b", parentId: "p" }),
    row("storm", "S", { id: "s" }),
  ];
  const tree = buildTree(rows);

  it("excludes the item, its descendants, its current parent, notes, and Storms", () => {
    const ids = moveDestinations(tree, "a").map((d) => d.id);
    expect(ids).toEqual([null, "b"]);
  });

  it("offers the root only when the item is not already there", () => {
    // Tree order: B was created after A, so it comes first.
    expect(moveDestinations(tree, "s").map((d) => d.id)).toEqual(["p", "b", "a", "a1"]);
  });

  it("includes ancestor paths for context", () => {
    const a1 = moveDestinations(tree, "n").find((d) => d.id === "a1")!;
    expect(a1.path).toEqual(["P", "A"]);
    expect(a1.depth).toBe(2);
  });

  it("validates drop targets the same way", () => {
    expect(canMoveTo(tree, "n", "b")).toBe(true);
    expect(canMoveTo(tree, "n", null)).toBe(true);
    expect(canMoveTo(tree, "n", "a")).toBe(false); // already there
    expect(canMoveTo(tree, "a", "a1")).toBe(false); // own descendant
    expect(canMoveTo(tree, "a", "a")).toBe(false); // itself
    expect(canMoveTo(tree, "b", "s")).toBe(false); // a Storm
    expect(canMoveTo(tree, "s", null)).toBe(false); // already at root
  });
});

describe("revealAncestors", () => {
  it("adds ancestors that aren't expanded yet, keeping the rest", () => {
    expect(revealAncestors(["a", "x"], ["a", "b", "c"])?.sort()).toEqual(["a", "b", "c", "x"]);
  });

  it("returns null when there is nothing to add", () => {
    expect(revealAncestors(["a", "b"], ["a", "b"])).toBeNull();
    expect(revealAncestors(["a"], [])).toBeNull();
    expect(revealAncestors([], [])).toBeNull();
  });
});

describe("reordering helpers", () => {
  const rows = [
    row("project", "P", { id: "p" }),
    row("folder", "F1", { id: "f1", parentId: "p" }),
    row("folder", "F2", { id: "f2", parentId: "p" }),
    row("note", "A", { id: "a", parentId: "p", position: "a0" }),
    row("storm", "B", { id: "b", parentId: "p", position: "a1" }),
    row("note", "C", { id: "c", parentId: "p", position: "a2" }),
    row("note", "In F1", { id: "x", parentId: "f1" }),
  ];
  const tree = buildTree(rows);

  it("finds an item's group in sidebar order, notes and Storms together", () => {
    expect(groupOf(tree, "b")).toEqual({ parentId: "p", group: 2, ids: ["a", "b", "c"] });
    expect(groupOf(tree, "p")).toEqual({ parentId: null, group: 0, ids: ["p"] });
    expect(groupOf(tree, "missing")).toBeNull();
  });

  it("only allows places in the same parent and group", () => {
    expect(canReorderNextTo(tree, "c", "a")).toBe(true);
    expect(canReorderNextTo(tree, "c", "c")).toBe(false);
    expect(canReorderNextTo(tree, "c", "f1")).toBe(false); // another group
    expect(canReorderNextTo(tree, "c", "x")).toBe(false); // another parent
  });

  it("moves an item above or below another, or reports no change", () => {
    expect(reorderedIds(["a", "b", "c"], "c", "a", "above")).toEqual(["c", "a", "b"]);
    expect(reorderedIds(["a", "b", "c"], "a", "c", "below")).toEqual(["b", "c", "a"]);
    expect(reorderedIds(["a", "b", "c"], "a", "b", "above")).toBeNull(); // already there
    expect(reorderedIds(["a", "b", "c"], "b", "a", "below")).toBeNull();
    expect(reorderedIds(["a", "b"], "a", "z", "above")).toBeNull();
  });

  it("moves one step up or down, not past the ends", () => {
    expect(movedOneStep(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(movedOneStep(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
    expect(movedOneStep(["a", "b", "c"], "a", "up")).toBeNull();
    expect(movedOneStep(["a", "b", "c"], "c", "down")).toBeNull();
  });
});
