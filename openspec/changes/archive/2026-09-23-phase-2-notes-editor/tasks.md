# Tasks

## 1. Editor foundations

- [x] 1.1 Install `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-list`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style`, `@tiptap/extensions`; verify `npm run build` succeeds
- [x] 1.2 Create `src/lib/notes/extensions.ts` with the shared extension list per D1/D2 (headings 1–6, task lists, alignment, font size, link allow-list, placeholder); verify a unit test builds the schema and round-trips a document using every node and mark
- [x] 1.3 Implement `src/lib/notes/links.ts` (normalise "example.com" to https, allow http/https/mailto only) and `src/lib/notes/font-size.ts` (parse, clamp 8–96, presets); verify with unit tests
- [x] 1.4 Implement server-side document validation (`src/lib/notes/validate.ts`: ProseMirror schema parse, link allow-list, 800 KB limit); verify unit tests accept all supported content and reject unknown types, unsafe links, and oversized bodies

## 2. Saving

- [x] 2.1 Implement `saveNoteBody`, `getNoteBody`, and `getNoteVersion` operations per D3; verify integration tests: first save is version 1, next increments, stale save changes nothing and reports the stored version, `edited_at` updated on save only
- [x] 2.2 Add integration tests rejecting saves for projects, folders, archived and trashed notes, and another user's note; verify they pass
- [x] 2.3 Add the Server Actions (validation, no `revalidatePath`, conflict and error results mapped to messages); verify types and lint pass
- [x] 2.4 Implement the autosave reducer (`src/lib/notes/autosave.ts`) per D4; verify unit tests for debounce, follow-up save, retry backoff, conflict stop, and flush on leave

## 3. Editor settings and color picker

- [x] 3.1 Add `user_settings` to the Drizzle schema with owner-only RLS per D9, generate the migration, and apply it to dev; verify the table and policies exist in dev
- [x] 3.2 Implement `src/lib/settings/editor-styles.ts` (shape, validation of keys/size/hex, built-in defaults, CSS variable generation) and the load/save/reset operations and Server Actions; verify unit tests and integration tests (upsert, reset removes keys, invalid values rejected, another user cannot read or write)
- [x] 3.3 Build the reusable `ColorPicker` per D10 (saved colors first, nine presets in two rows, Automatic where allowed, "+" custom color with color field and hex, remove saved colors, contrast warning, keyboard grid navigation) and store saved colors in `user_settings.saved_colors`; verify unit tests (hex parsing, contrast, saved-list add/dedupe/cap/remove), an integration test for saving the list, and in the browser that a saved color appears first in another picker and removing it leaves an element using it unchanged
- [x] 3.4 Load settings in the workspace layout, expose them from `WorkspaceProvider`, and apply them as CSS variables on the editor; verify in the browser that a changed Heading 1 size and color restyle an existing note
- [x] 3.5 Build `/settings` with the Editor section (per-element size and color, live preview, autosave, Reset, Reset all with confirmation) and a Settings link in the sidebar; verify in the browser including an out-of-range size and persistence after reload

## 4. Editor UI

- [x] 4.1 Load `{ body, version }` on the note page and render the editor with element styles per D6/D7; verify in the browser that a new note shows "Start writing…" and a seeded body renders with its formatting
- [x] 4.2 Build the sticky toolbar per D5 (block type, font size, marks, alignment, lists, quote/code/divider, undo/redo) with active states and roving keyboard focus; verify each control and the pinned position after scrolling in the browser
- [x] 4.3 Build the link popover (add, edit, open in new tab, remove, Ctrl/Cmd+K, unsafe address message); verify in the browser
- [x] 4.4 Wire `useNoteAutosave`: status indicator, flush on leaving, `beforeunload` while unsaved, `touch()` for last edited in the workspace tree; verify in the browser that text persists after reload and after navigating away mid-typing
- [x] 4.5 Conflict banner with Load latest and Keep mine, and the quiet refresh on focus/visibility; verify with two browser tabs in the browser check

## 5. Verification and release

- [x] 5.1 Extend the browser check script: formatting controls and shortcuts, Markdown shortcuts, font size (preset, custom, out of range, default, defaults from Settings), links, paste from HTML, sticky toolbar, autosave and persistence, leave-and-return, beforeunload, two-tab conflict (both choices), quiet refresh, Settings page and color picker; verify all checks pass on a production build
- [x] 5.2 Add editor colors to the contrast test (links, code on muted, color-picker presets flagged correctly) and update README (editor, autosave, `edited_at` on save, settings); verify lint, unit, and integration tests pass
- [x] 5.3 Push a branch and verify the preview; apply the `user_settings` migration to prod; merge to `main` and verify writing a note and changing a setting on production
