"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import * as actions from "@/lib/tree/actions";
import { ancestorPath, buildTree } from "@/lib/tree/build";
import type { ItemKind, TreeNode, TreeRow } from "@/lib/tree/types";
import { useStoredValue } from "@/lib/use-stored-value";

type Change =
  | { type: "rename"; id: string; title: string }
  | { type: "style"; id: string; icon: string | null; color: string | null }
  | { type: "convert"; id: string; to: "project" | "folder" }
  | { type: "move"; id: string; parentId: string | null }
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
      return rows.map((r) =>
        r.id === change.id ? { ...r, parentId: change.parentId, editedAt: now } : r,
      );
    case "remove": {
      const gone = subtree(rows, change.id);
      return rows.filter((r) => !gone.has(r.id));
    }
  }
}

const EXPANDED_KEY = "tb:expanded";
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
  archive: (id: string) => void;
  trash: (id: string) => void;
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
  const [rows, applyOptimistic] = useOptimistic(serverRows, applyChange);
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

  // Ancestors of the open item are always shown expanded.
  const openAncestors = useMemo(
    () => new Set(currentId ? ancestorPath(rows, currentId).map((r) => r.id) : []),
    [rows, currentId],
  );
  const isExpanded = useCallback(
    (id: string) => expanded.has(id) || openAncestors.has(id),
    [expanded, openAncestors],
  );

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
    archive: (id) => {
      leaveIfRemoved(id);
      mutate({ type: "remove", id }, () => actions.archiveItem(id), () => toast.success("Moved to Archive"));
    },
    trash: (id) => {
      leaveIfRemoved(id);
      mutate({ type: "remove", id }, () => actions.trashItem(id), () => toast.success("Moved to Trash"));
    },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
