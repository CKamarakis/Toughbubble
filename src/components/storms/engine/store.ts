import type { Camera } from "@/lib/storms/camera";
import { MAX_TEXT } from "@/lib/storms/limits";
import { cutText } from "@/lib/storms/cut-text";
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
import { colorOf, currentHex, DEFAULT_STICKY_COLOR, PRESET_HEXES } from "@/lib/storms/palette";
import { fitFontSize, type SizedMeasure } from "@/lib/storms/text-layout";

export type Tool = "select" | "sticky";

/** Transient, unsaved offset of a sticky being dragged; the renderer applies it. */
export type DragPreview = { id: string; dx: number; dy: number };

export type Snapshot = {
  items: Items;
  camera: Camera;
  tool: Tool;
  selectedId: string | null;
  editingId: string | null;
  dragPreview: DragPreview | null;
  /** A pan drag (right button, or Space + left) is in progress; the sticky toolbar hides meanwhile. */
  panning: boolean;
  /** The preset new stickies get: the last colour the user picked in either palette (D8). */
  creationColor: string;
  canUndo: boolean;
  canRedo: boolean;
  revision: number;
};

export type CommitMode = "push" | "merge-top" | "none";

export type StormStore = {
  subscribe(fn: () => void): () => void;
  getSnapshot(): Snapshot;
  getHistory(): History;
  /**
   * The history to keep for a reload: `getHistory()` plus, while an edit is open,
   * that edit as its own step (its text is already saved, its step not yet added).
   */
  getHistoryForPersist(): History;
  /** Applies `cs`, records it per `mode` and emits it to `onChange` listeners. */
  commit(cs: ChangeSet, mode?: CommitMode): void;
  onChange(fn: (cs: ChangeSet) => void): () => void;
  undo(): void;
  redo(): void;
  setCamera(c: Camera): void;
  setTool(t: Tool): void;
  select(id: string | null): void;
  /** Shows a dragged sticky at an offset without committing or saving anything. */
  setDragPreview(p: DragPreview | null): void;
  setPanning(panning: boolean): void;
  startEdit(id: string): void;
  /**
   * Commits the text and its fitted size (with the measure from `setMeasure`; none
   * yet: no size, the renderer fits it) without history; `endEdit` adds the one undo step.
   */
  setText(id: string, text: string): void;
  /** The board font's measure, once the font has loaded; `setText` fits text with it. */
  setMeasure(measure: SizedMeasure | null): void;
  /** The measure `setText` fits with; the text overlay lays out with it, so the two agree. */
  getMeasure(): SizedMeasure | null;
  endEdit(): void;
  /**
   * Sets a sticky's preset colour: one commit, one undo step; nothing when unchanged or not
   * a preset. A preset picked for an existing sticky also becomes the creation colour.
   */
  setColor(id: string, hex: string): void;
  /** Sets the colour for new stickies (a preset; anything else is ignored). Not an undo step. */
  setCreationColor(hex: string): void;
  /** Load latest / refresh: new items, no history, selection or edit; no `onChange`. */
  replaceBoard(body: StormBody): void;
  /** Called after `replaceBoard`, so input can drop gestures on the old board (an item drag). */
  onReplace(fn: () => void): () => void;
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

/** `item` with `text` and `fontSize`; an undefined size leaves the key out (fitted when drawn). */
function withText(item: Item, text: string, fontSize: number | undefined): Item {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fontSize: _old, ...rest } = item;
  return fontSize === undefined ? { ...rest, text } : { ...rest, text, fontSize };
}

/**
 * An item brought up to today's rules, so change sets that carry it validate: text over
 * MAX_TEXT (saved before the limit dropped) is clamped, and a clamped sticky's stored size
 * no longer matches, so it is fitted again; a colour removed from the palette becomes its
 * nearest preset (D5). The same item when nothing needs fixing.
 */
function normalizeItem(item: Item): Item {
  let next = item;
  if (next.text.length > MAX_TEXT) next = withText(next, cutText(next.text, MAX_TEXT), undefined);
  if (next.color !== undefined && currentHex(next.color) !== next.color) next = { ...next, color: currentHex(next.color) };
  return next;
}

/**
 * Normalises a board that enters the store (`normalizeItem`). Nothing is written: a fixed
 * sticky is saved with its next change (whole-item upserts).
 */
function clampItems(items: Items): Items {
  let out: Items | null = null;
  for (const [id, item] of Object.entries(items)) {
    const next = normalizeItem(item);
    if (next === item) continue;
    out ??= { ...items };
    out[id] = next;
  }
  return out ?? items;
}

/**
 * Normalises the upserts of a history restored from a reload (saved before a rule changed),
 * so an undo or redo never puts a removed colour or over-long text back on the board.
 * The same history when nothing needs fixing.
 */
function clampHistory(h: History): History {
  let changed = false;
  const fixSet = (cs: ChangeSet): ChangeSet => {
    const upsert = cs.upsert.map(normalizeItem);
    if (upsert.every((item, i) => item === cs.upsert[i])) return cs;
    changed = true;
    return { ...cs, upsert };
  };
  const fixSteps = (steps: Step[]) =>
    steps.map((s) => {
      const d = fixSet(s.do);
      const u = fixSet(s.undo);
      return d === s.do && u === s.undo ? s : { do: d, undo: u };
    });
  const out = { undo: fixSteps(h.undo), redo: fixSteps(h.redo) };
  return changed ? out : h;
}

const sameCamera = (a: Camera, b: Camera) => a.x === b.x && a.y === b.y && a.zoom === b.zoom;

export function createStormStore(init: {
  body: StormBody;
  camera: Camera;
  history?: History;
  /** The remembered colour for new stickies; missing or not a preset: Yellow. */
  creationColor?: string;
}): StormStore {
  let state: State = {
    items: clampItems(init.body.items),
    camera: init.camera,
    tool: "select",
    selectedId: null,
    editingId: null,
    dragPreview: null,
    panning: false,
    creationColor:
      init.creationColor && PRESET_HEXES.has(init.creationColor) ? init.creationColor : DEFAULT_STICKY_COLOR,
  };
  let history = init.history ? clampHistory(init.history) : EMPTY_HISTORY;
  let snapshot = build(0);
  /** The edited sticky as it was when the edit session started. */
  let editBefore: Item | null = null;
  let measure: SizedMeasure | null = null;

  const subscribers = listeners<[]>();
  const frames = listeners<[]>();
  const changes = listeners<[ChangeSet]>();
  const replaced = listeners<[]>();

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

  /**
   * Adds the fitted size to upserted stickies that have none, so an older sticky's size
   * is saved with whatever next changes it (a move, a nudge, a colour). It rides along on
   * that change: no extra step or save. Without a measure (font not loaded) it does nothing.
   */
  function withSizes(cs: ChangeSet): ChangeSet {
    const m = measure;
    if (!m || !cs.upsert.some((i) => i.fontSize === undefined)) return cs;
    return {
      ...cs,
      upsert: cs.upsert.map((i) =>
        i.fontSize === undefined ? { ...i, fontSize: fitFontSize(m, i.text, i.w, i.h) } : i,
      ),
    };
  }

  function commit(input: ChangeSet, mode: CommitMode = "push") {
    if (isEmptyChanges(input)) return;
    const cs = withSizes(input);
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

  /** The history with the open edit session added as one step (unchanged if none or no text change). */
  function withEditStep(): History {
    if (state.editingId === null) return history;
    const before = editBefore;
    const after = state.items[state.editingId];
    return before && after && before.text !== after.text
      ? pushStep(history, {
          do: { upsert: [after], delete: [] },
          undo: { upsert: [withText(after, before.text, before.fontSize)], delete: [] },
        })
      : history;
  }

  function endEdit() {
    if (state.editingId === null) return;
    const nextHistory = withEditStep();
    editBefore = null;
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
    getHistoryForPersist: withEditStep,
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
    setDragPreview(p) {
      update({ dragPreview: p });
    },
    setPanning(panning) {
      if (panning !== state.panning) update({ panning });
    },
    startEdit(id) {
      if (id === state.editingId) return;
      endEdit();
      const item = state.items[id];
      if (!item) return;
      editBefore = item;
      update({ editingId: id, selectedId: id });
    },
    setText(id, rawText) {
      const text = cutText(rawText, MAX_TEXT); // input that bypasses the textarea's maxLength
      const item = state.items[id];
      if (id !== state.editingId || !item || item.text === text) return;
      const fontSize = measure ? fitFontSize(measure, text, item.w, item.h) : undefined;
      commit({ upsert: [withText(item, text, fontSize)], delete: [] }, "none");
    },
    setMeasure(m) {
      if (m === measure) return;
      measure = m;
      // A new snapshot, so an editor opened before the font loaded lays out again.
      update({});
    },
    getMeasure: () => measure,
    endEdit,
    setColor(id, hex) {
      const item = state.items[id];
      if (!item || !PRESET_HEXES.has(hex)) return;
      const creationChanged = hex !== state.creationColor;
      // The commit below notifies; without one, notify only if the creation colour changed.
      if (creationChanged) setState({ creationColor: hex });
      if (colorOf(item).hex !== hex) commit({ upsert: [{ ...item, color: hex }], delete: [] });
      else if (creationChanged) notify();
    },
    setCreationColor(hex) {
      if (PRESET_HEXES.has(hex) && hex !== state.creationColor) update({ creationColor: hex });
    },
    replaceBoard(body) {
      editBefore = null;
      update({ items: clampItems(body.items), selectedId: null, editingId: null, dragPreview: null }, EMPTY_HISTORY);
      replaced.call();
    },
    onReplace: replaced.add,
    markDirty: frames.call,
    onFrame: frames.add,
  };
}
