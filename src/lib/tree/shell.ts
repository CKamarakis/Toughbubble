import { ancestorPath, displayTitle } from "./build";
import type { TreeRow } from "./types";

/**
 * Where Undo of an archive or trash should take the user back to (shell-hardening
 * D1): the open item, when it is the removed item or inside it (the removal sent
 * the user home), otherwise null (Undo restores without navigating).
 */
export function undoReturnTarget(rows: TreeRow[], removedId: string, currentId: string | null) {
  if (!currentId) return null;
  if (currentId === removedId) return currentId;
  return ancestorPath(rows, currentId).some((r) => r.id === removedId) ? currentId : null;
}

const ITEM_PATH = /^\/items\/([0-9a-f-]{36})/i;
const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/archive": "Archive",
  "/trash": "Trash",
  "/settings": "Settings",
};

/**
 * The small-screen top bar's label (shell-hardening D2): the open item's title,
 * or the page's name. An item that isn't in the active tree (an archived or
 * trashed item opened from its list) falls back to the app name.
 */
export function topBarTitle(pathname: string, rows: TreeRow[]) {
  const id = pathname.match(ITEM_PATH)?.[1];
  if (id) {
    const row = rows.find((r) => r.id === id);
    return row ? displayTitle(row) : "ToughBubble";
  }
  return PAGE_NAMES[pathname] ?? "ToughBubble";
}

const MAX_TITLE = 40;

/**
 * The archive or trash confirmation, naming the item (shell-hardening 6.3):
 * `"Budget" moved to Archive`. Long titles are shortened.
 */
export function removedMessage(rows: TreeRow[], id: string, place: "Archive" | "Trash") {
  const row = rows.find((r) => r.id === id);
  if (!row) return `Moved to ${place}`;
  const title = displayTitle(row);
  const short = title.length > MAX_TITLE ? `${title.slice(0, MAX_TITLE - 1).trimEnd()}…` : title;
  return `"${short}" moved to ${place}`;
}
