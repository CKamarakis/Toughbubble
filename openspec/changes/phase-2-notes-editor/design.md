# Design

## Context

See proposal.md for motivation. From Phases 0–1:

- `item_content (item_id pk, owner_id, body jsonb, version int default 1, created_at, updated_at)` with RLS and a same-owner FK to `items`; nothing reads or writes it yet.
- `items.edited_at` drives the "Last edited" sort and must be set by every edit path (README rule).
- The item page `/items/[id]` renders `ItemView` (client) with the tree from `WorkspaceProvider`; notes show a placeholder.
- Tree mutations are Server Actions that call `revalidatePath("/", "layout")`, so every save re-renders the layout (sidebar tree query + page). Next.js runs Server Actions one at a time per page.
- Brand tokens exist (`--link` purple, `--primary` yellow, warm neutrals); `theme-contrast.test.ts` reads real token values.

## Goals / Non-Goals

**Goals:**
- Typing never waits on the network, and no edit is lost silently (network errors, navigation, closing the tab, a second tab).
- A save writes one content row and one `items` row, in one transaction, without re-rendering the sidebar.
- The stored document only ever contains nodes, marks, and link addresses the editor allows.

**Non-Goals:**
- Real-time collaboration or merging concurrent edits (would need Yjs/CRDT; see project context). Conflicts are detected and resolved by the user.
- Offline editing across reloads (unsaved text survives network errors while the tab is open, not a closed tab).
- Images, attachments, slash menu, drag handles, version history, coloring selected text (element colors come from Settings, D9).

## Decisions

### D1. Tiptap 3 with free extensions only
- `@tiptap/starter-kit` (paragraph, headings, bold, italic, underline, strike, code, code block, blockquote, lists, list keymap, horizontal rule, link, undo/redo, Markdown input rules) configured with `heading: { levels: [1,2,3,4,5,6] }`.
- `@tiptap/extension-list`: `TaskList`, `TaskItem` (nested) for checklists.
- `@tiptap/extension-text-align`: `types: ["heading", "paragraph"]`, alignments left/center/right/justify.
- `@tiptap/extension-text-style`: `TextStyle` + `FontSize`. Sizes stored as `"NNpx"` on the textStyle mark.
- `@tiptap/extensions`: `Placeholder` ("Start writing…").
- Rendering with `useEditor({ immediatelyRender: false })`, the documented setting for server-rendered React, so the editor mounts on the client without a hydration mismatch.
- Alternative: BlockNote. Rejected in the project context (its free tier lacks a font-size picker).

### D2. Content model and validation
- The body is Tiptap JSON (`{ type: "doc", content: [...] }`) in `item_content.body`.
- **Server-side validation before saving**: the action parses the JSON against the same extension list (`getSchema(extensions)` + `Node.fromJSON` from ProseMirror), which throws on unknown node/mark types or invalid nesting. Link `href`s are checked against the allow-list (http, https, mailto). This keeps a crafted request from storing content the editor can't render or unsafe links. The extension list lives in one module shared by client and server (`src/lib/notes/extensions.ts`) so both sides agree.
- **Size limit**: bodies over 800 KB of JSON are refused with a clear message (Next.js Server Actions accept 1 MB request bodies by default; a note of that size is very long text).
- **Links**: StarterKit's Link with `openOnClick: false` (clicking places the cursor for editing), `autolink: true`, `defaultProtocol: "https"`, and `isAllowedUri` restricted to http/https/mailto — Tiptap applies it to typed, pasted, and auto-detected links. Rendered with `rel="noopener noreferrer nofollow"` and `target="_blank"`.

### D3. Versioned save operation
`saveNoteBody(tx, { itemId, body, baseVersion })` in one transaction (RLS applies):

```
1. SELECT kind, status FROM items WHERE id = itemId            -> must be an active note
2. baseVersion = 0:  INSERT item_content (item_id, body) ... ON CONFLICT DO NOTHING RETURNING version
   baseVersion > 0:  UPDATE item_content SET body, version = version + 1
                     WHERE item_id = itemId AND version = baseVersion RETURNING version
3. no row returned -> { conflict, storedVersion } (SELECT version); nothing else changes
4. row returned    -> UPDATE items SET edited_at = now() WHERE id = itemId
                      -> { ok, version, editedAt }
```

- The version check is part of the `WHERE`, so two concurrent saves cannot both succeed against the same base version.
- `getNoteBody(tx, itemId)` returns `{ body, version }` (version 0 and an empty doc when no row exists) and `getNoteVersion(tx, itemId)` returns just the version, for the quiet refresh.
- "Keep mine" re-saves with `baseVersion = storedVersion` returned by the conflict.

### D4. Save loop on the client
A small state machine in `useNoteAutosave` (pure reducer in `src/lib/notes/autosave.ts`, unit-tested):

```
idle --edit--> dirty --1s pause / leave--> saving --ok--> saved (idle)
                 ^                            |
                 +------ edit while saving ---+  (queue one follow-up save)
saving --network error--> error --retry with backoff (2s, 4s, ... 30s)--> saving
saving --conflict--> conflict (autosave stops until Load latest / Keep mine)
```

- At most one save in flight; edits during a save mark the note dirty again and trigger one follow-up save with the new base version.
- **Leaving the note** (client navigation unmounts the editor) flushes a pending save immediately. **Closing or reloading the tab** while dirty or saving triggers the browser's `beforeunload` confirmation.
- **Saves do not call `revalidatePath`**: the sidebar and page don't need re-rendering for body text. The action returns `editedAt`, and the client patches that row in `WorkspaceProvider` (a small `touch(id, editedAt)`), so the contents list's "Last edited" updates without a server round trip.
- **Quiet refresh**: on `visibilitychange` to visible and on window focus, if the state is idle (nothing unsaved), call `getNoteVersion`; if newer than the loaded version, load the body with `getNoteBody` and replace the editor content without adding an undo step.

### D5. Toolbar
- `role="toolbar"` with grouped controls: block type (Paragraph, Heading 1–6) as a menu; font size (menu of presets 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72 + a number input with 8–96 validation + Default); Bold, Italic, Underline, Strikethrough, Inline code; Link; alignment menu; Bulleted, Numbered, Checklist; Quote, Code block, Divider; Undo, Redo.
- Toggle buttons use `aria-pressed` and state from `editor.isActive(...)` via Tiptap's `useEditorState` so only the toolbar re-renders on selection changes.
- **Sticky**: `position: sticky; top: 0` inside the main scroll container (`main` in the workspace shell), with a background and bottom border so scrolled text passes underneath. On narrow screens the toolbar wraps.
- Link editing: a small popover (URL input, Apply, Open, Remove) anchored to the toolbar button; Ctrl/Cmd+K opens it.
- Keyboard: arrow keys move between toolbar controls (roving tab index) so the toolbar is one Tab stop.

### D6. Element styles from Settings, applied as CSS variables
Editor content styles live in `globals.css` under `.tb-editor` (no typography plugin). Each element's size and color come from CSS variables (`--tb-p-size`, `--tb-p-color`, `--tb-h1-size`, … `--tb-h6-color`) set on the editor root from the user's settings (D9); unset variables fall back to the built-in defaults below and the theme text color. Because this is CSS, changing a setting restyles every note at once with no change to stored notes, and an explicit font size on text (the textStyle mark) still wins.

| Element | Built-in default size | Weight |
|---|---|---|
| Paragraph, lists | 16 px | normal |
| H1 / H2 / H3 | 36 / 30 / 24 px | bold |
| H4 / H5 / H6 | 20 / 18 / 16 px | semibold |
| Code block, inline code | 14 px monospace on `--muted` | — |

- Links use `--link` (purple, AA on the page background in both themes, per the existing contrast test) with an underline, regardless of the element color. List items, checklist items, and quotes use the paragraph variables. The font-size control reads an explicit mark size or falls back to the element's setting for the block at the cursor.

### D7. Page layout
- `/items/[id]` for a note: breadcrumb, title (unchanged from Phase 1), save status next to the kind label, then the sticky toolbar and the editor. The server page loads the body with `getNoteBody` in the same request as the existing item check and passes `{ body, version }` to the client, so the note opens with its content already there.
- Storms keep the Phase 1 placeholder.

### D9. Editor settings storage and page
- **Table** `user_settings (owner_id uuid pk default auth.uid() fk auth.users on delete cascade, editor_styles jsonb not null default '{}', saved_colors jsonb not null default '[]', updated_at)` with RLS owner-only policies, like `items`. One row per user, created on first save (upsert).
- **Shape** of `editor_styles`: `{ p?: { size?: number, color?: string }, h1?: …, … h6?: … }`. Missing keys mean "built-in default" / "Automatic", so resetting deletes the key and new elements can be added later without a migration. Validated on the server: keys limited to p, h1–h6; size an integer 8–96; color a `#rrggbb` hex.
- **Loading**: the workspace layout reads the row alongside the tree (one more small query in the same request) and passes it to `WorkspaceProvider`, which exposes it and the CSS variables to the editor and the settings page.
- **Saving**: the settings page saves automatically (debounced ~500 ms) through a Server Action; the provider updates its copy immediately so the preview and open notes change as you edit. No `revalidatePath`.
- **Page**: `/settings` (new route in the workspace group) with an Editor section: one row per element (name, size number input with 8–96 validation, color picker, Reset) rendering a live preview line in that style; "Reset all" with a confirmation. A Settings link joins Archive and Trash in the sidebar.
- Alternative: `localStorage` like theme and sort. Rejected: settings would differ per device, and a Settings page implies account settings.

### D10. Reusable color picker (inspired by Miro, not a copy)
- `src/components/color-picker.tsx`: a popover wider than Miro's (about 240 px) so the presets sit in two rows of five:

  ```
  [ saved colors, newest first ........... ] [+]   <- user's colors first; + adds a custom color
  [Black ] [White ] [Yellow] [Red   ] [Pink  ]
  [Purple] [Blue  ] [L.blue] [Green ] [Auto  ]      <- Auto only where allowed (editor settings)
  ```

- **Presets**, all from the existing palette: Black `#141310` (warm 950), White `#ffffff`, Yellow `#f7d000` (brand), Red `#d92d20` (status red), Pink `#f700a8` (brand magenta), Purple `#9c00f7` (brand), Blue `#1d5fd1`, Light blue `#6ea8ff` (project blues), Green `#0b7f3e` (status green). Light swatches (White, Yellow) get a thin border so they stay visible on the popover.
- **Adding a custom color**: the "+" opens a small panel with the browser's color field and a hex input (`#rrggbb`, validated); confirming selects the color and adds it to the saved colors.
- **Saved colors** live in `user_settings.saved_colors` (D9) as an array of lowercase hex strings, newest first, capped at 20 (oldest dropped). Adding an existing color moves it to the front instead of duplicating it. Each saved swatch has a remove control ("×" on hover/focus, or Delete when focused). Removing only edits the list; anything already using the color keeps its stored hex. Saved colors are shared by every picker (editor settings now, Storms later) and update in `WorkspaceProvider` immediately, saved through the same settings Server Action.
- API: `value: string | null` (null = Automatic), `onChange`, optional `allowAutomatic`, optional `contrastAgainst: { light: string; dark: string }`. With `contrastAgainst` set, it shows a warning naming the theme where the color falls below 4.5:1, without blocking the choice. Storms (Phase 4) reuse it for stickies and shapes, passing their own backgrounds.
- A color is one hex value used in both themes (as in Miro). Automatic is the only choice that adapts to the theme, which is why it is the default and the warning exists.
- Keyboard: swatches form a grid navigable with arrow keys; Enter selects; each swatch has an accessible name (e.g. "Purple #9c00f7") and the selected one has `aria-checked`.

### D11. Testing
- **Unit**: autosave reducer (debounce, follow-up save, retry backoff, conflict stop, leave flush), link address normalisation and allow-list, font-size parsing and range, server-side document validation (accepts every supported node/mark, rejects unknown types and unsafe links, size limit). Editor-settings validation (keys, size range, hex), CSS variable generation, color contrast warning, and hex parsing in the color picker.
- **Integration (dev DB)**: first save creates version 1; next save increments; stale save changes nothing and reports the stored version; save updates `edited_at`; saves rejected for projects, folders, archived/trashed notes, and other users' notes; `getNoteVersion`/`getNoteBody` for missing content. Settings: upsert creates the row, reset removes keys, invalid values rejected, another user cannot read or write it.
- **Browser**: every toolbar control and shortcut, font size preset/custom/out-of-range/default, links (add, unsafe, open), paste from HTML, sticky toolbar after scrolling, autosave status and persistence after reload, leave-and-return, beforeunload, two-tab conflict with both choices, quiet refresh on focus. Settings page: change sizes and colors, live preview, notes restyle, out-of-range size, reset one/all, persistence after reload; color picker presets, custom hex, invalid hex, contrast warning, keyboard selection.

## Risks / Trade-offs

- [ProseMirror schema validation on the server adds weight to the server bundle] -> it runs only in the save action; acceptable for correctness.
- [Next.js runs Server Actions one at a time per page, so a slow save delays other actions on the page] -> saves are small and don't re-render the layout; debounce keeps them infrequent.
- [A reload during the ~1 s debounce loses that second of typing] -> the `beforeunload` confirmation covers deliberate closes; accepted for crashes.
- [Pasted content from Word/Docs carries many styles] -> only supported nodes and marks survive parsing; font sizes pasted as inline styles are kept only if within 8–96 px, otherwise dropped.
- [Conflicts require a user decision] -> the quiet refresh makes them rare (both tabs must have unsaved edits).
- [Very long notes and editor performance] -> fine for typical notes; revisit if notes routinely exceed tens of thousands of words.

## Migration Plan

One migration adds `user_settings` (apply to dev, then prod before merging). Deploy code via branch preview, then merge to `main`. Existing notes have no `item_content` row and open as empty; users without settings get the built-in defaults.

## Open Questions

- None blocking.
