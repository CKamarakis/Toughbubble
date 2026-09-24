"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import * as actions from "@/lib/tree/actions";
import { generateNKeysBetween } from "fractional-indexing";
import { ancestorPath, buildTree, revealAncestors } from "@/lib/tree/build";
import type { KindGroup } from "@/lib/tree/order";
import type { ItemKind, TreeNode, TreeRow } from "@/lib/tree/types";
import { useStoredValue } from "@/lib/use-stored-value";

type Change =
  | { type: "rename"; id: string; title: string }
  | { type: "style"; id: string; icon: string | null; color: string | null }
  | { type: "convert"; id: string; to: "project" | "folder" }
  | { type: "move"; id: string; parentId: string | null }
  | { type: "reorder"; positions: Record<string, string> }
  | { type: "remove"; id: string };

function subtree(rows: TreeRow[], id: string) {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      if (r.parentId && ids.has(r.parentId) && !ids.has(r.id)) {
        ids.add(r.id);
        grew = true;
      }
    }
  }
  return ids;
}

function applyChange(rows: TreeRow[], change: Change): TreeRow[] {
  const now = new Date().toISOString();
  switch (change.type) {
    case "rename":
      return rows.map((r) => (r.id === change.id ? { ...r, title: change.title, editedAt: now } : r));
    case "style":
      return rows.map((r) =>
        r.id === change.id ? { ...r, icon: change.icon, color: change.color, editedAt: now } : r,
      );
    case "convert":
      return rows.map((r) =>
        r.id === change.id
          ? {
              ...r,
              kind: change.to,
              editedAt: now,
              ...(change.to === "folder" ? { icon: null, color: null } : {}),
            }
          : r,
      );
    case "move":
      // " " sorts before every key, so the item shows first in its group until
      // the server's position arrives.
      return rows.map((r) =>
        r.id === change.id ? { ...r, parentId: change.parentId, position: " ", editedAt: now } : r,
      );
    case "reorder":
      return rows.map((r) => (r.id in change.positions ? { ...r, position: change.positions[r.id] } : r));
    case "remove": {
      const gone = subtree(rows, change.id);
      return rows.filter((r) => !gone.has(r.id));
    }
  }
}

const EXPANDED_KEY = "tb:expanded";
// The item whose ancestors were last revealed, so a reload doesn't reveal again.
const REVEALED_KEY = "tb:revealed";

function readRevealed(): string | null {
  try {
    return localStorage.getItem(REVEALED_KEY);
  } catch {
    return null;
  }
}

function writeRevealed(id: string) {
  try {
    localStorage.setItem(REVEALED_KEY, id);
  } catch {
    // Not persisted: a reload may reveal the path again, which is harmless.
  }
}
const ITEM_PATH = /^\/items\/([0-9a-f-]{36})/i;

type Workspace = {
  email: string;
  rows: TreeRow[];
  tree: TreeNode[];
  currentId: string | null;
  pending: boolean;
  isExpanded: (id: string) => boolean;
  setExpanded: (id: string, open: boolean) => void;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  movingId: string | null;
  setMovingId: (id: string | null) => void;
  create: (kind: ItemKind, parentId: string | null) => void;
  rename: (id: string, title: string) => void;
  setStyle: (id: string, icon: string | null, color: string | null) => void;
  convert: (id: string, to: "project" | "folder") => void;
  move: (id: string, parentId: string | null) => void;
  /** Saves a new order for one kind group under one parent (sidebar-manual-order D2). */
  reorder: (parentId: string | null, group: KindGroup, orderedIds: string[]) => void;
  archive: (id: string) => void;
  trash: (id: string) => void;
  /** Records a note body save (its new "last edited" time) without a server refresh. */
  touch: (id: string, editedAt: string) => void;
};

const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

function parseIds(raw: string): Set<string> {
  try {
    const value: unknown = JSON.parse(raw);
    return new Set(Array.isArray(value) ? value.filter((v) => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

export function WorkspaceProvider({
  email,
  rows: serverRows,
  children,
}: {
  email: string;
  rows: TreeRow[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [optimisticRows, applyOptimistic] = useOptimistic(serverRows, applyChange);
  // Body saves skip the layout refresh (notes design D4), so their edited times
  // are patched in here until the next server render catches up.
  const [touched, setTouched] = useState<Record<string, string>>({});
  // Positions from saved reorders, kept until the server's rows show them, so
  // a server render that started before the save can't put the old order back.
  const [reordered, setReordered] = useState<Record<string, string>>({});
  const rows = useMemo(
    () =>
      optimisticRows.map((r) => {
        let row = r;
        if (touched[r.id] && touched[r.id] > r.editedAt) row = { ...row, editedAt: touched[r.id] };
        if (reordered[r.id] !== undefined) row = { ...row, position: reordered[r.id] };
        return row;
      }),
    [optimisticRows, touched, reordered],
  );
  // Once new server rows carry a saved position, that override is no longer
  // needed (adjusted during render, as React recommends for derived state).
  const [seenServerRows, setSeenServerRows] = useState(serverRows);
  if (seenServerRows !== serverRows) {
    setSeenServerRows(serverRows);
    const caughtUp = serverRows.filter((r) => reordered[r.id] === r.position);
    if (caughtUp.length > 0) {
      const next = { ...reordered };
      for (const r of caughtUp) delete next[r.id];
      setReordered(next);
    }
  }
  const tree = useMemo(() => buildTree(rows), [rows]);
  const currentId = pathname.match(ITEM_PATH)?.[1] ?? null;

  // Expanded containers, remembered per browser.
  const [storedExpanded, storeExpanded] = useStoredValue(EXPANDED_KEY, "[]");
  const expanded = useMemo(() => parseIds(storedExpanded), [storedExpanded]);
  const setExpanded = useCallback(
    (id: string, open: boolean) =>
      storeExpanded((current) => {
        const next = parseIds(current);
        if (open) next.add(id);
        else next.delete(id);
        return JSON.stringify([...next]);
      }),
    [storeExpanded],
  );

  // When an item becomes the open one, expand its ancestors once, into the
  // saved state, so the user can still collapse them (sidebar-collapse-open-path
  // D1). Reads localStorage directly: during hydration the hooks still hold
  // their server values, which would reveal again on every reload.
  useEffect(() => {
    if (!currentId || readRevealed() === currentId) return;
    if (!rows.some((r) => r.id === currentId)) return; // not loaded yet (D2)
    const ancestors = ancestorPath(rows, currentId).map((r) => r.id);
    writeRevealed(currentId);
    if (ancestors.length === 0) return;
    storeExpanded((current) => {
      const next = revealAncestors(parseIds(current), ancestors);
      return next ? JSON.stringify(next) : current;
    });
  }, [currentId, rows, storeExpanded]);

  const isExpanded = useCallback((id: string) => expanded.has(id), [expanded]);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  /** Runs an action with an optimistic change; the change reverts if it fails. */
  const mutate = useCallback(
    (change: Change | null, run: () => Promise<actions.ActionResult<unknown>>, after?: () => void) => {
      startTransition(async () => {
        if (change) applyOptimistic(change);
        const result = await run();
        if (!result.ok) toast.error(result.error);
        else after?.();
      });
    },
    [applyOptimistic],
  );

  const leaveIfRemoved = useCallback(
    (id: string) => {
      if (currentId && subtree(rows, id).has(currentId)) router.push("/");
    },
    [currentId, rows, router],
  );

  const value: Workspace = {
    email,
    rows,
    tree,
    currentId,
    pending,
    isExpanded,
    setExpanded,
    renamingId,
    setRenamingId,
    movingId,
    setMovingId,
    create: (kind, parentId) =>
      startTransition(async () => {
        const result = await actions.createItem(kind, parentId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (parentId) setExpanded(parentId, true);
        router.push(`/items/${result.value}?new=1`);
      }),
    rename: (id, title) =>
      mutate({ type: "rename", id, title: title.trim() }, () => actions.renameItem(id, title)),
    setStyle: (id, icon, color) =>
      mutate({ type: "style", id, icon, color }, () => actions.setProjectStyle(id, icon, color)),
    convert: (id, to) => mutate({ type: "convert", id, to }, () => actions.convertItem(id, to)),
    move: (id, parentId) =>
      mutate({ type: "move", id, parentId }, () => actions.moveItem(id, parentId), () => {
        if (parentId) setExpanded(parentId, true);
      }),
    reorder: (parentId, group, orderedIds) => {
      // The same keys the server writes, so the optimistic order matches.
      const keys = generateNKeysBetween(null, null, orderedIds.length);
      const positions = Object.fromEntries(orderedIds.map((id, i) => [id, keys[i]]));
      mutate(
        { type: "reorder", positions },
        () => actions.reorderItems(parentId, group, orderedIds),
        () => setReordered((current) => ({ ...current, ...positions })),
      );
    },
    archive: (id) => {
      leaveIfRemoved(id);
      mutate({ type: "remove", id }, () => actions.archiveItem(id), () => toast.success("Moved to Archive"));
    },
    trash: (id) => {
      leaveIfRemoved(id);
      mutate({ type: "remove", id }, () => actions.trashItem(id), () => toast.success("Moved to Trash"));
    },
    touch: (id, editedAt) => setTouched((prev) => ({ ...prev, [id]: editedAt })),
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
