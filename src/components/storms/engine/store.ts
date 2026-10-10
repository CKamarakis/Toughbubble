import type { Camera } from "@/lib/storms/camera";
import {
  applyChanges,
  invertChanges,
  isEmptyChanges,
  mergeChanges,
  type ChangeSet,
} from "@/lib/storms/changeset";
import {
  EMPTY_HISTORY,
  pushStep,
  replaceTop,
  takeRedo,
  takeUndo,
  type History,
  type Step,
} from "@/lib/storms/history";
import type { Item, Items, StormBody } from "@/lib/storms/model";

export type Tool = "select" | "sticky";

export type Snapshot = {
  items: Items;
  camera: Camera;
  tool: Tool;
  selectedId: string | null;
  editingId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  revision: number;
};

export type CommitMode = "push" | "merge-top" | "none";

export type StormStore = {
  subscribe(fn: () => void): () => void;
  getSnapshot(): Snapshot;
  getHistory(): History;
  /** Applies `cs`, records it per `mode` and emits it to `onChange` listeners. */
  commit(cs: ChangeSet, mode?: CommitMode): void;
  onChange(fn: (cs: ChangeSet) => void): () => void;
  undo(): void;
  redo(): void;
  setCamera(c: Camera): void;
  setTool(t: Tool): void;
  select(id: string | null): void;
  startEdit(id: string): void;
  /** Commits the text without history; `endEdit` adds the one undo step. */
  setText(id: string, text: string): void;
  endEdit(): void;
  /** Load latest / refresh: new items, no history, selection or edit; no `onChange`. */
  replaceBoard(body: StormBody): void;
  /** Asks the renderer for a redraw. */
  markDirty(): void;
  onFrame(fn: () => void): () => void;
};

type State = Omit<Snapshot, "canUndo" | "canRedo" | "revision">;

function listeners<A extends unknown[]>() {
  const set = new Set<(...args: A) => void>();
  return {
    add(fn: (...args: A) => void) {
      set.add(fn);
      return () => {
        set.delete(fn);
      };
    },
    call(...args: A) {
      for (const fn of [...set]) fn(...args);
    },
  };
}

const sameCamera = (a: Camera, b: Camera) => a.x === b.x && a.y === b.y && a.zoom === b.zoom;

export function createStormStore(init: {
  body: StormBody;
  camera: Camera;
  history?: History;
}): StormStore {
  let state: State = {
    items: init.body.items,
    camera: init.camera,
    tool: "select",
    selectedId: null,
    editingId: null,
  };
  let history = init.history ?? EMPTY_HISTORY;
  let snapshot = build(0);
  /** The edited sticky as it was when the edit session started. */
  let editBefore: Item | null = null;

  const subscribers = listeners<[]>();
  const frames = listeners<[]>();
  const changes = listeners<[ChangeSet]>();

  function build(revision: number): Snapshot {
    return {
      ...state,
      canUndo: history.undo.length > 0,
      canRedo: history.redo.length > 0,
      revision,
    };
  }

  /** Sets state and a new snapshot, dropping references to items that no longer exist. */
  function setState(next: Partial<State>, nextHistory = history) {
    state = { ...state, ...next };
    history = nextHistory;
    if (state.selectedId !== null && !state.items[state.selectedId]) state.selectedId = null;
    if (state.editingId !== null && !state.items[state.editingId]) {
      state.editingId = null;
      editBefore = null;
    }
    snapshot = build(snapshot.revision + 1);
  }

  function notify() {
    frames.call();
    subscribers.call();
  }

  function update(next: Partial<State>, nextHistory = history) {
    setState(next, nextHistory);
    notify();
  }

  /** Change sets not yet delivered to every `onChange` listener, oldest first. */
  const outbox: ChangeSet[] = [];
  let emitting = false;

  /**
   * Emits `onChange` before notifying subscribers. A commit made by a listener is
   * queued and delivered after the current change set, so every listener sees
   * change sets in commit order.
   */
  function apply(cs: ChangeSet, nextHistory: History) {
    setState({ items: applyChanges(state.items, cs) }, nextHistory);
    outbox.push(cs);
    if (emitting) return;
    emitting = true;
    try {
      for (let next = outbox.shift(); next; next = outbox.shift()) changes.call(next);
    } finally {
      emitting = false;
      outbox.length = 0;
    }
    notify();
  }

  function commit(cs: ChangeSet, mode: CommitMode = "push") {
    if (isEmptyChanges(cs)) return;
    if (state.editingId !== null && cs.delete.includes(state.editingId)) {
      // Keep the text edit as its own step before the sticky goes.
      const topBefore = history.undo[history.undo.length - 1];
      endEdit();
      if (mode === "merge-top" && history.undo[history.undo.length - 1] !== topBefore) mode = "push";
    }
    if (mode === "none") return apply(cs, history);
    const undo = invertChanges(state.items, cs);
    const top = history.undo[history.undo.length - 1];
    const step: Step =
      mode === "merge-top" && top
        ? { do: mergeChanges(top.do, cs), undo: mergeChanges(undo, top.undo) }
        : { do: cs, undo };
    apply(cs, mode === "merge-top" && top ? replaceTop(history, step) : pushStep(history, step));
  }

  function endEdit() {
    if (state.editingId === null) return;
    const before = editBefore;
    const after = state.items[state.editingId];
    editBefore = null;
    const nextHistory =
      before && after && before.text !== after.text
        ? pushStep(history, {
            do: { upsert: [after], delete: [] },
            undo: { upsert: [{ ...after, text: before.text }], delete: [] },
          })
        : history;
    update({ editingId: null }, nextHistory);
  }

  function step(take: typeof takeUndo, pick: (s: Step) => ChangeSet) {
    endEdit();
    const taken = take(history);
    if (!taken) return;
    apply(pick(taken.step), taken.history);
  }

  return {
    subscribe: subscribers.add,
    getSnapshot: () => snapshot,
    getHistory: () => history,
    commit,
    onChange: changes.add,
    undo: () => step(takeUndo, (s) => s.undo),
    redo: () => step(takeRedo, (s) => s.do),
    setCamera(c) {
      if (!sameCamera(c, state.camera)) update({ camera: { ...c } });
    },
    setTool(t) {
      if (t !== state.tool) update({ tool: t });
    },
    select(id) {
      const next = id !== null && state.items[id] ? id : null;
      if (next !== state.selectedId) update({ selectedId: next });
    },
    startEdit(id) {
      if (id === state.editingId) return;
      endEdit();
      const item = state.items[id];
      if (!item) return;
      editBefore = item;
      update({ editingId: id, selectedId: id });
    },
    setText(id, text) {
      const item = state.items[id];
      if (id !== state.editingId || !item || item.text === text) return;
      commit({ upsert: [{ ...item, text }], delete: [] }, "none");
    },
    endEdit,
    replaceBoard(body) {
      editBefore = null;
      update({ items: body.items, selectedId: null, editingId: null }, EMPTY_HISTORY);
    },
    markDirty: frames.call,
    onFrame: frames.add,
  };
}
