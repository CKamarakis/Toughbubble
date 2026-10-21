// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemKind, TreeRow } from "@/lib/tree/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({ exportNote: vi.fn() }));
vi.mock("@/components/notes/export/export-note", () => ({ exportNote: mocks.exportNote }));
vi.mock("./workspace-context", () => ({
  useWorkspace: () => ({ tree: [], create: vi.fn(), duplicate: vi.fn(), reorder: vi.fn(), archive: vi.fn(), trash: vi.fn() }),
}));

const { ItemMenu } = await import("./item-menu");

const row = (kind: ItemKind, title = "Trip plan"): TreeRow => ({
  id: `${kind}-1`,
  parentId: null,
  kind,
  title,
  icon: null,
  color: null,
  position: "a0",
  createdAt: "2026-10-01T00:00:00Z",
  editedAt: "2026-10-01T00:00:00Z",
});

// Item menu layout (workspace-tree, export-note-markdown delta).
describe("ItemMenu: Export as Markdown", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  async function openMenu(item: TreeRow) {
    await act(async () => root.render(createElement(ItemMenu, { item, onRename: () => {} })));
    const trigger = container.querySelector<HTMLElement>(`[aria-label="Actions for ${item.title}"]`)!;
    await act(async () => {
      trigger.focus();
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
  }
  const topLevel = () =>
    [...document.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent?.trim()).filter(Boolean);

  it("offers Export as Markdown after Duplicate in a note's menu, and runs the export", async () => {
    await openMenu(row("note"));
    expect(topLevel()).toEqual(["Rename", "Duplicate", "Export as Markdown", "Move to…", "Reorder", "Archive", "Move to Trash"]);

    const entry = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.trim() === "Export as Markdown")!;
    await act(async () => entry.click());
    expect(mocks.exportNote).toHaveBeenCalledWith("note-1", "Trip plan");
  });

  it("doesn't offer it for folders or Storms", async () => {
    await openMenu(row("folder"));
    expect(topLevel()).not.toContain("Export as Markdown");
    act(() => root.unmount());
    root = createRoot(container);

    await openMenu(row("storm"));
    expect(topLevel()).toContain("Duplicate");
    expect(topLevel()).not.toContain("Export as Markdown");
  });
});
