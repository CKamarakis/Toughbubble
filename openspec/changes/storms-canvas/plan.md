# Storms Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Storm opens as an always-light, zoomable, pannable board with a minimal plain-text sticky, change-set autosave with version checks, undo that survives a reload, and Duplicate.

**Architecture:** A framework-free TypeScript core (`src/lib/storms/`: model, change sets, camera, history, hit-test, wheel classification, text layout, validation, server operations) and a browser engine (`src/components/storms/engine/`: store, renderer, input) behind a thin React shell that subscribes with `useSyncExternalStore`. Saves send `{ upsert, delete }` change sets merged in one SQL UPDATE that checks version and size.

**Tech Stack:** Next.js 16.3 App Router, React 19.2, TypeScript, Drizzle + Supabase Postgres (RLS), Vitest 5 (`unit` and `integration` projects), `fractional-indexing` 4, Tailwind + shadcn/ui, Playwright (new dev dependency, speed gate only).

**Spec:** `openspec/changes/storms-canvas/` — `design.md` (decisions D1–D11), `specs/storm-board/spec.md`, `specs/storm-saving/spec.md`, `specs/workspace-tree/spec.md`, `specs/note-editor/spec.md`. Read the design and the spec files before any task. Task numbers match `tasks.md`.

## Global Constraints

- Zoom 0.1–4; steps `[0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]`.
- `BOARD_LIMIT = 1_000_000` px (camera centre and item positions).
- Sticky: 200×200, fill `#F7D000`, text `#333129`, 20 px, resolved Geist family; selection outline 2 px `#F700A8`.
- `MAX_TEXT = 5_000` chars; `MAX_ENTRIES = 5_000` per change-set list; `MAX_CHANGESET_BYTES = 800_000`; `MAX_BODY_BYTES = 2 * 1024 * 1024`.
- `SAVE_DELAY_MS = 1000` (existing). History max 30 steps. Nudges within 1,000 ms merge. Wheel gesture lock 150 ms. Text skipped below 30% zoom. Drag starts beyond 3 px.
- Status words: "Saving…", "Saved", "Couldn't save — retrying", "Changed elsewhere", "Too big to save". Too-large message: "This storm is too big to save. Remove some items." Duplicate title: `<title> (copy)` within 200 chars.
- Next 16: read `node_modules/next/dist/docs/` for any Next API before using it (AGENTS.md). `ssr: false` only inside a Client Component.
- Library APIs you're unsure of: `npx -y ctx7@latest library <name> "<q>"` then `docs` (CLAUDE.md).
- Commands: unit `npm test -- <path>`; integration `npm run test:integration -- <path>`; types `npx tsc --noEmit`; lint `npm run lint`. Dev server `npm run dev` (port 3001).
- Commit after every task and `git push` (user preference). End commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A save in flight when the user keeps editing**: changes made during a save must reach the server in the next save, never be dropped or sent twice. Test in Task 8.1 (`keeps edits made during a save`).
2. **Reload during an unacknowledged save**: undo history must not contain steps the server never stored. Test in Task 8.4 (`does not write history while changes are pending`).
3. **A sticky deleted in one tab and moved in the other, then Keep mine**: the server must end with the moved sticky (mine wins), and the tab must show the server board afterwards. Test in Task 3.1 (`keep-mine upsert re-adds a sticky deleted elsewhere`) and Task 8.2 browser check.
4. **Editing text then pressing Ctrl+Z while still in the textarea**: the textarea's own undo must work; board undo must not fire while editing. Test in Task 7.3 (`board shortcuts are ignored while editing`).
5. **Dark theme + shared components inside the board**: buttons and tooltips inside the board stay light. Test in Task 4.2 browser check and `theme-contrast.test.ts`.

---

### Task 1.1–1.2: Shared autosave with a too-large phase

**Files:**
- Move: `src/lib/notes/autosave.ts` → `src/lib/autosave.ts`; `src/lib/notes/autosave.test.ts` → `src/lib/autosave.test.ts`
- Modify: every importer of `@/lib/notes/autosave` (find with `grep -rn "notes/autosave" src`)

**Interfaces:**
- Produces: `Phase` gains `"too-large"`; `AutosaveEvent` gains `{ type: "save-too-large" }`; `StatusLabel` gains `"Too big to save"`. All existing exports unchanged.

- [ ] **Step 1:** `git mv` both files; update imports. Run `npm test -- src/lib/autosave.test.ts src/lib/notes` — Expected: PASS (unchanged behaviour).
- [ ] **Step 2: Write failing tests** in `src/lib/autosave.test.ts`:
  - `save-too-large while saving → phase "too-large", dirty true, retries unchanged`
  - `canStartSave is false in too-large`
  - `edit in too-large → phase "dirty"`
  - `statusLabel in too-large → "Too big to save"`
- [ ] **Step 3:** Run them — Expected: FAIL (unknown event/phase).
- [ ] **Step 4:** Implement in `autosaveReducer` and `statusLabel`. `save-too-large` applies only when `phase === "saving"`. `edit` from `too-large` returns `{ ...s, phase: "dirty", dirty: true }`.
- [ ] **Step 5:** Run `npm test` — Expected: all PASS. `npx tsc --noEmit` clean.
- [ ] **Step 6:** Commit `autosave: shared module with too-large phase`; push.

---

### Task 2.1: Model and limits

**Files:**
- Create: `src/lib/storms/model.ts`, `src/lib/storms/limits.ts`, `src/lib/storms/model.test.ts`

**Interfaces:**
- Produces:
  - `type Point = { x: number; y: number }`, `type Size = { w: number; h: number }`, `type Rect = Point & Size`
  - `type Sticky = { id: string; type: "sticky"; x: number; y: number; z: string; w: number; h: number; text: string; parentId?: string; rotation?: number }` (x, y = top-left in board px)
  - `type Item = Sticky`; `type Items = Record<string, Item>`
  - `type StormBody = { schema: 1; items: Items }`; `const EMPTY_BOARD: StormBody`
  - `const STICKY = { size: 200, fill: "#F7D000", text: "#333129", fontPx: 20, padding: 16 }`
  - `topZ(items: Items): string` — `generateKeyBetween(maxZ ?? null, null)`
  - `boundsOf(items: Item[]): Rect | null`
  - `byZ(a: Item, b: Item): number` — byte-order string compare
  - `limits.ts`: `BOARD_LIMIT`, `MAX_TEXT`, `MAX_ENTRIES`, `MAX_CHANGESET_BYTES`, `MAX_BODY_BYTES` (values in Global Constraints)

- [ ] **Step 1: Write failing tests:** `topZ on empty → a key; topZ is greater than every existing z`; `boundsOf([]) → null`; `boundsOf two stickies → union rect`; `byZ sorts ascending`.
- [ ] **Step 2:** Run `npm test -- src/lib/storms/model.test.ts` — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `storms: model and limits`; push.

### Task 2.2: Change sets

**Files:** Create `src/lib/storms/changeset.ts`, `src/lib/storms/changeset.test.ts`

**Interfaces:**
- Consumes: `Item`, `Items` (2.1)
- Produces:
  - `type ChangeSet = { upsert: Item[]; delete: string[] }`; `const NO_CHANGES: ChangeSet`
  - `applyChanges(items: Items, cs: ChangeSet): Items` — returns a new object; deletes first, then upserts (input sets never overlap)
  - `invertChanges(before: Items, cs: ChangeSet): ChangeSet` — upserted ids that existed → upsert old; that didn't → delete; deleted ids that existed → upsert old
  - `mergeChanges(older: ChangeSet, newer: ChangeSet): ChangeSet` — latest per id; result never has an id in both lists
  - `isEmptyChanges(cs: ChangeSet): boolean`
  - `changesBytes(cs: ChangeSet): number` — `new TextEncoder().encode(JSON.stringify(cs)).length`
  - `splitChanges(cs: ChangeSet, maxBytes: number): ChangeSet[]` — consecutive chunks each ≤ maxBytes (deletes first chunk)

- [ ] **Step 1: Write failing tests:** `apply then apply(invert) restores the board` (place, move, delete cases); `merge: upsert then delete = delete`; `merge: delete then upsert = upsert`; `merge: two upserts keep the newer`; `merge never lists an id in both`; `split: each chunk ≤ maxBytes and applying all chunks equals applying the whole`.
- [ ] **Step 2:** Run — Expected: FAIL. **Step 3:** Implement. **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `storms: change sets`; push.

### Task 2.3: Camera

**Files:** Create `src/lib/storms/camera.ts`, `src/lib/storms/camera.test.ts`

**Interfaces:**
- Consumes: `Point`, `Size`, `Rect` (2.1), `BOARD_LIMIT`
- Produces:
  - `type Camera = { x: number; y: number; zoom: number }` — `x, y` = board point at the viewport's centre
  - `MIN_ZOOM = 0.1`, `MAX_ZOOM = 4`, `ZOOM_STEPS`
  - `boardToScreen(cam, vp: Size, p: Point): Point`, `screenToBoard(cam, vp, p): Point` — screen = (p − cam) × zoom + vp/2
  - `zoomAt(cam, vp, screenPoint: Point, zoom: number): Camera` — clamps zoom; keeps `screenToBoard(screenPoint)` fixed
  - `stepZoom(cam, vp, dir: 1 | -1): Camera` — next step strictly above/below current, around the viewport centre
  - `panBy(cam, dxScreen: number, dyScreen: number): Camera` — clamped to ±`BOARD_LIMIT`
  - `fitCamera(bounds: Rect | null, vp: Size, marginPx = 64): Camera` — null → `HOME_CAMERA`
  - `HOME_CAMERA: Camera = { x: 0, y: 0, zoom: 1 }`
  - `visibleRect(cam, vp): Rect`

- [ ] **Step 1: Write failing tests:** `zoomAt keeps the board point under the cursor` (assert `screenToBoard` before = after within 1e-9); `zoomAt clamps to 0.1 and 4`; `stepZoom from 1 → 1.5; from 4 stays 4; from 0.3 down → 0.25`; `fitCamera contains all bounds inside the viewport minus margin`; `fitCamera(null) → HOME_CAMERA`; `fitCamera respects MAX_ZOOM for a tiny item`; `panBy clamps at ±1_000_000`.
- [ ] **Step 2–4:** Run (FAIL) → implement → run (PASS).
- [ ] **Step 5:** Commit `storms: camera`; push.

### Task 2.4–2.5: History and hit-test

**Files:** Create `src/lib/storms/history.ts`, `history.test.ts`, `hit-test.ts`, `hit-test.test.ts`

**Interfaces:**
- Produces:
  - `type Step = { do: ChangeSet; undo: ChangeSet }`; `type History = { undo: Step[]; redo: Step[] }`; `EMPTY_HISTORY`; `MAX_STEPS = 30`
  - `pushStep(h: History, s: Step): History` — drops oldest beyond 30, clears redo
  - `replaceTop(h: History, s: Step): History` — for merged nudges and text sessions
  - `takeUndo(h): { history: History; step: Step } | null`; `takeRedo(h)` likewise
  - `hitTest(items: Items, p: Point): Item | null` — highest `z` whose rect contains `p` (edges inclusive)

- [ ] **Step 1: Write failing tests:** `31 pushes keep 30`; `push clears redo`; `undo then redo returns the same step`; `takeUndo on empty → null`; `hitTest overlapping → higher z`; `hitTest on empty space → null`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `storms: history and hit-test`; push.

### Task 2.6: Wheel classification

**Files:** Create `src/lib/storms/wheel-source.ts`, `wheel-source.test.ts`

**Interfaces:**
- Produces:
  - `type WheelLike = { deltaX: number; deltaY: number; deltaMode: number; ctrlKey: boolean; metaKey: boolean }`
  - `type WheelKind = "zoom" | "pan"`
  - `createWheelClassifier(idleMs = 150): (e: WheelLike, now: number) => WheelKind`
  - Rules: `ctrlKey || metaKey` → `"zoom"` (pinch arrives as ctrl+wheel). Otherwise the first event of a gesture decides and the kind is locked until `idleMs` without events: `deltaMode === 1` (lines) → zoom (mouse); `deltaX !== 0` → pan; `deltaMode === 0` and `|deltaY| < 50` or non-integer `deltaY` → pan (trackpad); else zoom (mouse).

- [ ] **Step 1: Write failing tests:** `line-mode wheel → zoom`; `pixel deltaY 100 integer → zoom`; `pixel deltaY 3.5 → pan`; `horizontal delta → pan`; `ctrl → zoom even mid pan-gesture`; `locked: a trackpad gesture with one large delta stays pan`; `after 150 ms idle a new gesture re-classifies`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `storms: wheel classification`; push.

### Task 2.7: Validation

**Files:** Create `src/lib/storms/validate.ts`, `validate.test.ts`

**Interfaces:**
- Consumes: model, limits, `ChangeSet`, `changesBytes`
- Produces:
  - `validateChangeSet(input: unknown): { ok: true; changes: ChangeSet } | { ok: false; error: string }`
  - `isStormBody(v: unknown): v is StormBody` — `schema === 1` and `items` an object

  Rules: object with exactly `upsert` (array) and `delete` (array); ≤ `MAX_ENTRIES` each; ids are UUIDs (reuse the regex style from `notes/actions.ts`); no duplicate ids within a list, none in both; item keys only those of `Sticky`; `type === "sticky"`; `x, y, w, h, rotation` finite; `|x|, |y| ≤ BOARD_LIMIT`; `0 < w, h ≤ BOARD_LIMIT`; `z` non-empty string ≤ 64 chars; `text` string ≤ `MAX_TEXT`; `parentId` absent or UUID; `item.id` equals its id; `changesBytes ≤ MAX_CHANGESET_BYTES`. Error string: `"That change was not valid."`.

- [ ] **Step 1: Write failing tests**, one per rule, each asserting `ok: false`: non-UUID id, duplicate id in upsert, id in both lists, unknown field `color`, `type: "shape"`, `x: NaN`, `x: 1_000_001`, `w: 0`, text of 5,001 chars, 5,001 deletes, a set over 800,000 bytes. Plus `valid set → ok with the same changes` and `isStormBody({schema: 2, items: {}}) → false`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `storms: change-set validation`; push.

---

### Task 3.1–3.2: Server load and save

**Files:**
- Create: `src/lib/storms/operations.ts`, `src/lib/storms/actions.ts`, `tests/integration/storm-board.test.ts`

**Interfaces:**
- Consumes: `UserTx`, `items`, `itemContent` (schema), `validateChangeSet`, `isStormBody`, limits
- Produces:
  - `isActiveStorm(tx, id): Promise<boolean>` — kind `storm`, status `active` (mirror `isActiveNote`)
  - `getStormBody(tx, id): Promise<{ body: StormBody; version: number } | null>` — `EMPTY_BOARD` at version 0 if no row
  - `getStormVersion(tx, id): Promise<number | null>`
  - `type SaveStormResult = { status: "saved"; version: number; editedAt: string } | { status: "conflict"; storedVersion: number } | { status: "too-large" } | { status: "not-found" }`
  - `saveStormChanges(tx, id, cs: ChangeSet, baseVersion: number): Promise<SaveStormResult>`
  - Actions (`"use server"`): `loadStorm(id)`, `stormVersion(id)`, `saveStorm(id, changes: unknown, baseVersion: number): Promise<SaveStormResult | { status: "error"; error: string }>`

  The merge (D3), with `upserts` = `JSON.stringify(Object.fromEntries(cs.upsert.map(i => [i.id, i])))` and `dels` = `cs.delete`:
  ```sql
  -- version > 0
  UPDATE item_content SET
    body = jsonb_set(body, '{items}', ((body->'items') - $dels::text[]) || $upserts::jsonb),
    version = version + 1, updated_at = now()
  WHERE item_id = $id AND version = $base
    AND octet_length(jsonb_set(body, '{items}', ((body->'items') - $dels::text[]) || $upserts::jsonb)::text) <= $max
  RETURNING version
  ```
  Version 0: `INSERT … SELECT` the merged `EMPTY_BOARD` only if its `octet_length ≤ $max`, `ON CONFLICT DO NOTHING RETURNING version`. Zero rows → read the stored version: equal to `base` → `too-large`; otherwise `conflict`. On success touch `items.edited_at` as `saveNoteBody` does. Check the `updated_at` column name in `timestamps` in `src/db/schema.ts`.

- [ ] **Step 1: Write failing integration tests** (`describe("storm board saves")`, harness as in `note-body.test.ts`):
  - `unsaved storm reads as EMPTY_BOARD at version 0`
  - `first save stores version 1 and reads back the sticky`
  - `a move saves only that sticky and keeps the others`
  - `stale base version → conflict with storedVersion`
  - `keep-mine upsert re-adds a sticky deleted elsewhere`
  - `too large → too-large, stored body and version unchanged` (seed a body near 2 MB via repeated saves of max-text stickies)
  - `first save too large → too-large, no row`
  - `another user's storm → not-found`
  - `a note's id → not-found and the note body unchanged`
  - `archived storm → not-found`
- [ ] **Step 2:** Run `npm run test:integration -- tests/integration/storm-board.test.ts` — Expected: FAIL.
- [ ] **Step 3:** Implement operations, then actions (UUID check, `validateChangeSet`, `Number.isInteger(baseVersion) && baseVersion >= 0`, `withUserDb`, error mapping as `notes/actions.ts`).
- [ ] **Step 4:** Run — Expected: PASS. Add unit test `saveStorm rejects an invalid id and change set without a DB call` only if actions are reachable in the unit project; otherwise cover via integration.
- [ ] **Step 5:** Commit `storms: load and save on the server`; push.

### Task 3.3–3.4: Duplicate a storm

**Files:**
- Modify: `src/lib/storms/operations.ts`, `src/lib/storms/actions.ts`, `src/components/workspace/workspace-context.tsx`, `src/components/workspace/item-menu.tsx`
- Test: `tests/integration/storm-board.test.ts`

**Interfaces:**
- Consumes: `GROUP_KINDS`, `sidebarCompare` (`src/lib/tree/order.ts`), `generateNKeysBetween`, `isActiveStorm`
- Produces:
  - `duplicateStorm(tx, id): Promise<string | null>` (new id, or null if not an active storm)
  - Action `duplicateStorm(id): Promise<ActionResult<string>>` (`ActionResult` from `src/lib/tree/actions.ts`)
  - Workspace context: `duplicate: (id: string) => void` — calls the action, toasts errors, `router.refresh()`, `router.push(\`/items/${newId}\`)`

  Steps inside one transaction: load the original (title, parentId); title = `"<title> (copy)"`, cutting `title` so the whole is ≤ 200 chars (empty title → the default Storm title + " (copy)"; check how `displayTitle` names untitled items); load the active siblings of group 2 under the parent `FOR UPDATE`, sort with `sidebarCompare`, insert the new item, re-key the group in visible order with the copy right after the original (`generateNKeysBetween(null, null, n)`, like `reorderGroup`); copy `item_content.body` with version 1 if a row exists.

- [ ] **Step 1: Write failing integration tests:** `copies three stickies and returns a new id`; `copy is listed directly below the original in a never-reordered group` (sort the parent's rows with `sidebarCompare`, assert index + 1); `200-char title → copy title ends with " (copy)" and is 200 chars`; `unsaved storm → copy has no content row`; `saving to the copy leaves the original unchanged`; `a note's id → null`.
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement operation and action. **Step 4:** Run — PASS.
- [ ] **Step 5:** Add `duplicate` to the workspace context and a "Duplicate" `DropdownMenuItem` (lucide `Copy` icon) after Rename, only when `item.kind === "storm"`.
- [ ] **Step 6: Verify in the browser:** Storm menu = Rename, Duplicate, Move to…, Reorder, Archive, Move to Trash; folder and note menus have no Duplicate; duplicating opens "<title> (copy)" directly below the original.
- [ ] **Step 7:** Commit `storms: duplicate a storm`; push.

---

### Task 4.1: Storm page shell

**Files:**
- Modify: `src/app/(workspace)/items/[id]/page.tsx`, `src/components/workspace/item-view.tsx`, `src/app/(workspace)/layout.tsx` and `workspace-context.tsx` (expose `userId`)
- Create: `src/components/storms/storm-view.tsx` (client), `src/components/storms/storm-board.tsx` (client; placeholder canvas for now)

**Interfaces:**
- Consumes: `getStormBody` (3.1)
- Produces:
  - `ItemView` prop `storm: { body: StormBody; version: number } | null`
  - Workspace context `userId: string` (from `claims.sub` in the layout)
  - `StormView({ itemId, initial }: { itemId: string; initial: { body: StormBody; version: number } })` — renders the slim header status slot and `StormBoard` via `dynamic(() => import("./storm-board"), { ssr: false })`
  - `StormBoard({ itemId, initial, userId, onStatus })` — later tasks fill it in

  For storms, `ItemView` renders a slim header (breadcrumb, title, menu; no extra rows) and the board in a flex child that fills the remaining height of the main pane with no padding. Read `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` first.

- [ ] **Step 1:** Load the storm body in `page.tsx` when `item.kind === "storm"`; pass it through.
- [ ] **Step 2:** Implement the layout and placeholder board.
- [ ] **Step 3: Verify in the browser:** a Storm opens with the slim header and an edge-to-edge board area; opening a note in a fresh tab does not request the `storm-board` chunk (DevTools network).
- [ ] **Step 4:** `npx tsc --noEmit`, `npm run lint` clean. Commit `storms: storm page shell`; push.

### Task 4.2: Always-light board

**Files:** Modify `src/app/globals.css`; `storm-board.tsx`

- [ ] **Step 1:** Change line 5 to `@custom-variant dark (&:is(.dark *):not(.light *));`. Add a `.light` rule that re-declares the light-mode tokens (copy the `:root` token values) so `.dark .light` resolves to light. Board root gets `className="light …"` with `bg-background`.
- [ ] **Step 2:** Run `npm test -- src/app/theme-contrast.test.ts` — Expected: PASS.
- [ ] **Step 3: Verify in the browser** in the dark theme: sidebar and header dark; board area light.
- [ ] **Step 4:** Commit `storms: board always light`; push.

---

### Task 5.1: Engine store

**Files:** Create `src/components/storms/engine/store.ts`, `src/components/storms/engine/store.test.ts` (pure; unit project)

**Interfaces:**
- Consumes: 2.1–2.5
- Produces:
  - `type Tool = "select" | "sticky"`
  - `type Snapshot = { items: Items; camera: Camera; tool: Tool; selectedId: string | null; editingId: string | null; canUndo: boolean; canRedo: boolean; revision: number }`
  - `createStormStore(init: { body: StormBody; camera: Camera; history?: History }): StormStore`
  - `StormStore`: `subscribe(fn: () => void): () => void`; `getSnapshot(): Snapshot`; `getHistory(): History`;
    `commit(cs: ChangeSet, mode: "push" | "merge-top" | "none" = "push"): void` (applies, records history, notifies `onChange` listeners with `cs`);
    `onChange(fn: (cs: ChangeSet) => void): () => void`;
    `undo(): void`; `redo(): void` (each commits the step's change set with mode `"none"` and emits it);
    `setCamera(c: Camera)`; `setTool(t: Tool)`; `select(id: string | null)`;
    `startEdit(id)`; `setText(id, text)` (commit `"none"`); `endEdit()` (pushes one step from text-before to text-after if changed);
    `replaceBoard(body: StormBody)` (Load latest/refresh: replaces items, clears history and selection, no `onChange`);
    `markDirty(): void` and `onFrame(fn)` hooks for the renderer
  - Snapshot objects are new only when something changed (stable for `useSyncExternalStore`).

- [ ] **Step 1: Write failing tests:** `commit applies and pushes history`; `commit emits the change set to onChange`; `undo emits the inverse and redo re-emits`; `merge-top replaces the last step` ; `setCamera does not touch history or emit`; `edit session: three setText calls + endEdit → one undo step restoring the original text`; `replaceBoard clears history and does not emit`; `getSnapshot is referentially stable without changes`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `storms: engine store`; push.

### Task 5.2: Text layout and renderer

**Files:**
- Create: `src/lib/storms/text-layout.ts`, `text-layout.test.ts`, `src/components/storms/engine/renderer.ts`, `src/components/storms/engine/font.ts`

**Interfaces:**
- Produces:
  - `wrapText(measure: (s: string) => number, text: string, maxWidth: number): string[]` — breaks on spaces and `\n`; words wider than `maxWidth` break by character
  - `layoutSticky(measure, s: Sticky): { lines: string[]; lineHeight: number; top: number }` — 20 px font, line height 1.3, padding 16, vertically centred, lines beyond the box dropped (clip)
  - `resolveFontFamily(el: HTMLElement): string` — `getComputedStyle(el).getPropertyValue("--font-geist-sans").trim()`
  - `waitForFont(family: string): Promise<void>` — `document.fonts.load(\`20px ${family}\`)`
  - `createRenderer(canvas: HTMLCanvasElement, store: StormStore, family: string): { resize(size: Size, dpr: number): void; setFontReady(): void; destroy(): void }`
  - Draw order: background; dot grid (spacing 24 board px, alpha fades from 1 at zoom ≥ 0.5 to 0 at zoom ≤ 0.2); stickies inside `visibleRect` sorted by `byZ` with a soft shadow; text only if font ready and zoom ≥ 0.3; selection outline. Redraw on `requestAnimationFrame` only after `markDirty`.

- [ ] **Step 1: Write failing tests** for `wrapText` (`wraps at spaces`, `honours \n`, `breaks a long word`) and `layoutSticky` (`centres one line`, `drops lines that overflow`), using `measure = s => s.length * 10`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Implement renderer and font helpers; mount in `storm-board.tsx` with a `ResizeObserver`.
- [ ] **Step 6: Verify in the browser:** canvas sharp on a high-DPI display (DevTools device pixel ratio 2); grid fades by 20%; reload shows no fallback-font flash on sticky text (seed a sticky via the console store handle in dev only).
- [ ] **Step 7:** Commit `storms: renderer`; push.

### Task 5.3: Input

**Files:** Create `src/components/storms/engine/input.ts`

**Interfaces:**
- Consumes: store (5.1), camera (2.3), `createWheelClassifier` (2.6), `hitTest` (2.4)
- Produces: `attachInput(el: HTMLElement, store: StormStore, getViewport: () => Size): () => void`

  Behaviour per D5: `addEventListener("wheel", h, { passive: false })` with `preventDefault`; zoom factor `Math.exp(-deltaY * 0.0015)` (×20 for line mode); Safari `gesturestart`/`gesturechange` → `zoomAt` with `e.scale`; pointer events with `setPointerCapture`; right button (`button === 2`) drag pans; `contextmenu` → `preventDefault`; Space held (`keydown` Space, not while editing) + left drag pans with `cursor: grab/grabbing`; keys `Ctrl/⌘ + =`/`-`/`0`, `Shift` + `code === "Digit1"` → fit; all keys only when `el` contains `document.activeElement` (board root `tabIndex={0}`). Sticky interactions are added in Task 7.

- [ ] **Step 1:** Implement and wire in `storm-board.tsx`.
- [ ] **Step 2: Verify in the browser:** mouse wheel zooms toward the pointer; trackpad two-finger scroll pans; pinch zooms; Ctrl + wheel and Ctrl + = never change page zoom; right-drag pans with no browser menu; Space shows a hand and pans; Shift+1 fits. In Safari, if available, pinch zooms (else record "Safari untested" in the task notes).
- [ ] **Step 3:** Commit `storms: board input`; push.

---

### Task 6.1–6.3: Toolbar, zoom control, last view

**Files:**
- Create: `src/components/storms/storm-toolbar.tsx`, `src/components/storms/zoom-control.tsx`, `src/components/storms/view-store.ts`, `src/components/storms/view-store.test.ts`

**Interfaces:**
- Consumes: `useSyncExternalStore(store.subscribe, store.getSnapshot)`; `stepZoom`, `fitCamera`, `HOME_CAMERA`, `boundsOf`
- Produces:
  - `StormToolbar({ store })`: Select (`MousePointer2`, "Select (V)"), Sticky (`StickyNote`, "Sticky note (N)"), Undo (`Undo2`, "Undo (Ctrl+Z)"), Redo (`Redo2`, "Redo (Ctrl+Shift+Z)"); `aria-label` on each; `aria-pressed` on the active tool; Undo/Redo `disabled` from the snapshot. V and N keys added to `input.ts`.
  - `ZoomControl({ store, getViewport })`: −, `Math.round(zoom*100)%` button (→ 100%), +, fit (`Maximize`); labels "Zoom out", "Reset zoom to 100%", "Zoom in", "Fit to items".
  - `loadView(stormId: string): Camera | null`; `saveView(stormId: string, c: Camera): void` — `localStorage` key `storm-view:<id>`, try/catch, validated numbers; saved 500 ms after the last camera change.

- [ ] **Step 1: Write failing unit tests** for `view-store` with a stubbed `localStorage`: `round-trips a camera`; `returns null on bad JSON`; `returns null when storage throws`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Implement toolbar and zoom control (bottom centre and bottom right, inside the `.light` board).
- [ ] **Step 6: Verify in the browser:** four tools only; Undo/Redo disabled on a fresh board; + from 100% → 150%; % → 100%; fit on an empty board → 100% at centre; reopen a Storm → same view.
- [ ] **Step 7:** Commit `storms: toolbar, zoom control, last view`; push.

---

### Task 7.1–7.2: Place, select, move, nudge

**Files:** Modify `src/components/storms/engine/input.ts`; create `src/components/storms/engine/actions.ts`, `actions.test.ts`

**Interfaces:**
- Produces (pure helpers over a store, unit-tested):
  - `placeSticky(store, at: Point): string` — 200×200 centred on `at`, clamped inside ±`BOARD_LIMIT`, `z = topZ`, `crypto.randomUUID()`, text `""`; selects it; sets tool `select`
  - `moveSticky(store, id, dx, dy, mode: "push" | "merge-top")`
  - `nudge(store, dx, dy, now: number)` — merges into the previous nudge step if within 1,000 ms

  Input: Sticky tool + click → `placeSticky`; Select: pointer down → `hitTest` → select; move beyond 3 px → drag (preview via `setCamera`-free local offsets, one `push` commit on pointer up); empty board click → `select(null)`; arrows 1 px, Shift 10 px.

- [ ] **Step 1: Write failing tests:** `placeSticky centres a 200×200 sticky on top and selects it`; `placeSticky near the limit stays inside it`; `two nudges 500 ms apart → one undo step`; `two nudges 1,500 ms apart → two steps`; `a drag is one undo step`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Verify in the browser** the "Place a sticky" and "Select and move stickies" scenarios.
- [ ] **Step 6:** Commit `storms: place, select and move stickies`; push.

### Task 7.3–7.4: Type and delete

**Files:** Create `src/components/storms/sticky-text-overlay.tsx`; modify `input.ts`, `actions.ts`, `actions.test.ts`

**Interfaces:**
- Consumes: `layoutSticky` (5.2), store edit API (5.1)
- Produces:
  - `StickyTextOverlay({ store, family })` — a `<textarea>` positioned with `boardToScreen` over the editing sticky, scaled by zoom, same font, size, line height, padding and centring as `layoutSticky` (vertical centring via computed top padding), `maxLength={MAX_TEXT}`, transparent background so the canvas sticky shows beneath; the renderer skips text for `editingId`.
  - `deleteSelected(store): void`
  - Rule: while `editingId` is set, `input.ts` ignores board shortcuts (Delete, arrows, V, N, Ctrl+Z, zoom keys) so the textarea gets them.

- [ ] **Step 1: Write failing tests:** `deleteSelected removes the sticky and is undoable`; `deleteSelected with nothing selected does nothing`; `board shortcuts are ignored while editing` (unit-test the key router function `routeKey(snapshot, e)` exported from `input.ts`, returning the action name or null).
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Verify in the browser:** double-click and Enter start editing; Esc and click outside finish; the text does not move on start or finish at 50%, 100% and 200%; overflow is clipped while the full text is kept; Delete removes; Backspace while typing deletes a character only.
- [ ] **Step 6:** Commit `storms: type in and delete stickies`; push.

---

### Task 8.1–8.2: Autosave and Changed elsewhere

**Files:** Create `src/components/storms/use-storm-autosave.ts`, `src/components/storms/pending.ts`, `pending.test.ts`; modify `storm-board.tsx` (runs the hook, renders the conflict bar at the top of the board, reports the status label through `onStatus`) and `storm-view.tsx` (shows that label in the header)

**Interfaces:**
- Consumes: `autosaveReducer`, `statusLabel`, `retryDelay`, `SAVE_DELAY_MS` (Task 1); `mergeChanges`, `splitChanges`, `changesBytes`; actions `saveStorm`, `loadStorm`, `stormVersion`; `store.onChange`, `store.replaceBoard`
- Produces:
  - Pure `pending.ts`: `type Outbox = { pending: ChangeSet; inFlight: ChangeSet | null }`; `queue(o, cs): Outbox`; `takeNext(o, maxBytes): { outbox: Outbox; send: ChangeSet } | null` (first chunk of `splitChanges`; the rest stays pending); `ack(o): Outbox`; `restore(o): Outbox` (merges `inFlight` back **under** `pending`: `mergeChanges(inFlight, pending)`)
  - `useStormAutosave(store, itemId, initialVersion)`: returns `{ state, status: StatusLabel, loadLatest(): Promise<void>, keepMine(): void, isQuiet(): boolean }` — `isQuiet` = nothing pending or in flight (used by Task 8.4). Leave warning via `beforeunload` when `hasUnsavedChanges`; focus/visibility refresh as in `use-note-autosave.ts` (newer version + quiet → `loadStorm` → `store.replaceBoard`). On `saved` with more pending (split or edits), schedule the next save immediately. `ws.touch` for edited time as notes do.
  - Conflict bar text: "**This storm was changed in another tab or device.** Saving is paused until you choose." with Load latest / Keep mine (same markup as `note-editor.tsx`). Keep mine: dispatch `keep-mine`, save; on `saved`, `loadStorm` → `replaceBoard`. Too large: `toast.error("This storm is too big to save. Remove some items.")`.

- [ ] **Step 1: Write failing tests** for `pending.ts`: `keeps edits made during a save` (queue A, takeNext, queue B, ack → pending = B); `restore after failure keeps newer edits on top` (queue A(x=1), takeNext, queue A(x=2), restore → pending has x=2); `takeNext splits over maxBytes and leaves the rest pending`; `takeNext on empty → null`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Implement the hook and the header status and conflict bar.
- [ ] **Step 6: Verify in the browser:** place a sticky → "Saving…" then "Saved" → reload shows it; type without finishing, wait for Saved, reload → text kept; DevTools offline → "Couldn't save — retrying", back online → saves; leave warning while pending; two-tab "Changed elsewhere" with Load latest and Keep mine as in the spec; switching to an idle tab after the other saved shows the new board.
- [ ] **Step 7:** Commit `storms: autosave and changed elsewhere`; push.

### Task 8.3–8.4: Undo/redo and persistence

**Files:** Create `src/components/storms/undo-store.ts`; modify `input.ts` (keys), `storm-board.tsx`, `src/components/workspace/account-menu.tsx`

**Interfaces:**
- Consumes: `store.undo/redo/getHistory`, `isQuiet()` and the saved version from 8.1, `userId` (4.1)
- Produces:
  - `saveUndo(userId: string, stormId: string, version: number, history: History): Promise<void>`
  - `loadUndo(userId: string, stormId: string, version: number): Promise<History | null>` — deletes the entry and returns null on version mismatch
  - `clearUndo(): Promise<void>` — `objectStore.clear()`
  - IndexedDB `storms-undo`, version 1, store `history`, key `"<userId>:<stormId>"`; connections close on `versionchange`; every call wrapped so failures resolve quietly.
  - Keys: Ctrl/⌘+Z undo; Ctrl/⌘+Shift+Z and Ctrl+Y redo (not while editing).
  - Write rule: after a `saved` result, if `isQuiet()`, `saveUndo(…, newVersion, store.getHistory())`. Steps made during a save are written at the next quiet save.
  - Load: `createStormStore` receives `history` from `loadUndo(userId, id, initial.version)` before the first render (show the board after it resolves; time-box to 300 ms, then start without history).
  - Sign-out: `account-menu.tsx` awaits `clearUndo()` (time-boxed 300 ms) before `requestSubmit()`.

- [ ] **Step 1: Write a failing unit test** for the pure part: extract `shouldPersist(quiet: boolean, result: SaveStormResult): boolean` → true only for `saved` when quiet; test `does not write history while changes are pending`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Verify in the browser:** move, Saved, reload, Ctrl+Z → moves back; change in tab B then reload tab A → Undo unavailable; sign out and in → Undo unavailable; 31 changes → 30 undos; zoom is not undone; undo saves ("Saving…").
- [ ] **Step 6:** Commit `storms: undo that survives a reload`; push.

---

### Task 9.1: Speed gate

**Files:**
- Create: `src/app/dev/storm-bench/page.tsx`, `scripts/storms-bench.mjs`
- Modify: `src/lib/auth/routing.ts` and its test, `package.json` (dev dependency `playwright`, script `"bench:storms": "node scripts/storms-bench.mjs"`)

**Interfaces:**
- Consumes: `StormBoard` in a read-only mode (`readOnly` prop: no autosave, no undo persistence)
- Produces:
  - `/dev/storm-bench?items=1000` renders `StormBoard` with a seeded synthetic board (grid of stickies with 1–3 lines of text) and exposes `window.__stormBench = { store, viewport }` ; calls `notFound()` when `process.env.NODE_ENV === "production"`.
  - `routing.ts`: `/dev` is public only when `process.env.NODE_ENV !== "production"`.
  - `storms-bench.mjs`: launches Chromium against `http://localhost:3001/dev/storm-bench?items=1000`, CDP `Emulation.setCPUThrottlingRate({ rate: 4 })`, viewport 1440×900; runs pan at 100%, zoom 100% → fit → 100%, pan at fit (5 s each) driving the store's camera per frame; records frame times with `requestAnimationFrame`; prints median fps and p95 frame ms per phase; exits 1 if any phase has median < 50 fps or p95 > 33 ms.

- [ ] **Step 1: Write failing unit tests** in `src/lib/auth/routing.test.ts`: `/dev/storm-bench is public in development`; `/dev/storm-bench requires a session in production` (stub `NODE_ENV`).
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Install Playwright (`npm i -D playwright`, `npx playwright install chromium`), write the page and script.
- [ ] **Step 6:** With `npm run dev` running, `npm run bench:storms` — Expected: exit 0. Record the numbers for the user.
- [ ] **Step 7:** Commit `storms: speed gate`; push.

---

### Task 10.1–10.3: Docs and release

**Files:** Modify `README.md`

- [ ] **Step 1:** Add a Storms section to the README: board controls (zoom, pan, fit, toolbar, keys), saving and Changed elsewhere, undo across reloads, Duplicate, and `npm run bench:storms`. Verify it matches the code.
- [ ] **Step 2:** Run `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run bench:storms` — Expected: all pass. Paste the results into the task notes.
- [ ] **Step 3:** Hand the user the manual checklist from design D11 and record what they found.
- [ ] **Step 4:** Commit `storms-canvas: docs`; push.
