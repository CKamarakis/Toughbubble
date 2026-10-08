import { describe, expect, it } from "vitest";
import { removedMessage, topBarTitle, undoReturnTarget } from "./shell";
import { displayTitle } from "./build";
import type { ItemKind, TreeRow } from "./types";

const P = "00000000-0000-4000-8000-000000000001";
const F = "00000000-0000-4000-8000-000000000002";
const N = "00000000-0000-4000-8000-000000000003";
const OTHER = "00000000-0000-4000-8000-000000000004";

function row(id: string, kind: ItemKind, title: string, parentId: string | null = null): TreeRow {
  return {
    id,
    parentId,
    kind,
    title,
    icon: null,
    color: null,
    position: "a0",
    createdAt: "2026-01-01T00:00:00.000Z",
    editedAt: "2026-01-01T00:00:00.000Z",
  };
}

// Project P > folder F > note N, and an unrelated note OTHER at the root.
const rows = [row(P, "project", "Home renovation"), row(F, "folder", "Kitchen", P), row(N, "note", "", F), row(OTHER, "note", "Budget")];

describe("undoReturnTarget", () => {
  it("returns the open item when it is the removed item", () => {
    expect(undoReturnTarget(rows, N, N)).toBe(N);
  });

  it("returns the open item when it is inside the removed subtree", () => {
    expect(undoReturnTarget(rows, P, N)).toBe(N);
  });

  it("returns null when the open item is unrelated", () => {
    expect(undoReturnTarget(rows, P, OTHER)).toBeNull();
  });

  it("returns null when no item is open", () => {
    expect(undoReturnTarget(rows, P, null)).toBeNull();
  });
});

describe("topBarTitle", () => {
  it("shows the open item's title", () => {
    expect(topBarTitle(`/items/${OTHER}`, rows)).toBe("Budget");
  });

  it("shows the kind's default for an untitled item", () => {
    expect(topBarTitle(`/items/${N}`, rows)).toBe("Untitled note");
  });

  it("names the fixed pages", () => {
    expect(topBarTitle("/", rows)).toBe("Home");
    expect(topBarTitle("/archive", rows)).toBe("Archive");
    expect(topBarTitle("/trash", rows)).toBe("Trash");
    expect(topBarTitle("/settings", rows)).toBe("Settings");
  });

  it("falls back to the app name for an item not in the active tree", () => {
    expect(topBarTitle("/items/00000000-0000-4000-8000-0000000000ff", rows)).toBe("ToughBubble");
  });
});

describe("removedMessage", () => {
  it("names the item and the place", () => {
    expect(removedMessage(rows, OTHER, "Archive")).toBe('"Budget" moved to Archive');
    expect(removedMessage(rows, F, "Trash")).toBe('"Kitchen" moved to Trash');
  });

  it("uses the default title for an untitled item", () => {
    expect(removedMessage(rows, N, "Archive")).toBe(`"${displayTitle(rows[2])}" moved to Archive`);
  });

  it("shortens long titles", () => {
    const long = [row(OTHER, "note", "A very long note title that keeps going and going")];
    expect(removedMessage(long, OTHER, "Trash")).toBe('"A very long note title that keeps going…" moved to Trash');
  });

  it("falls back to a plain message for an unknown item", () => {
    expect(removedMessage(rows, "00000000-0000-4000-8000-0000000000ff", "Trash")).toBe("Moved to Trash");
  });
});
