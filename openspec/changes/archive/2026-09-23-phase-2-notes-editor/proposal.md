# Proposal

## Why

Notes can be created, named, and organised since Phase 1, but opening one shows only a placeholder. Writing is the core of the product, so the note body editor comes next. The storage for it (`item_content` with a JSON body and a `version` counter) already exists and is unused.

## What Changes

- **Rich-text editor** on the note page, below the title, built on Tiptap:
  - paragraphs and headings H1–H6, each shown in the size and color set for it in Settings;
  - bold, italic, underline, strikethrough, inline code;
  - links (add, edit, open, remove);
  - text alignment (left, center, right, justify);
  - bulleted, numbered, and checklist lists;
  - blockquote, code block, divider;
  - a font-size picker: preset sizes plus any size from 8 to 96 px, and "Default" to return to the element's size.
- **Toolbar** above the note body that stays pinned to the top of the window while scrolling, showing which formatting is active at the cursor. Standard keyboard shortcuts and Markdown-style typing shortcuts (`# `, `- `, `1. `, `[ ] `, `> `).
- **Autosave**, always on, no Save button: saves shortly after typing pauses and when leaving the note, with a status of Saving… / Saved / "Couldn't save, retrying". The browser warns before closing a tab with unsaved changes.
- **Two tabs or devices**: a save based on an older version is refused and the note offers **Load latest** or **Keep mine**; a tab with no unsaved typing quietly loads the latest version when you return to it.
- **Last edited**: saving a note's body updates its last edited time (used by the contents sort from Phase 1).
- **Settings page** (new, linked from the sidebar) with an Editor section: default font size (8–96 px) and color for Paragraph and Heading 1–6, live preview, reset per element or all. Saved to the account, so it applies on every device.
- **Reusable color picker**, Miro-style: a grid of common preset colors, Automatic (follows the theme), and a custom color by color field or hex code, with a warning when a color is hard to read in light or dark mode. Built as a shared component for later use in Storms.
- Storms keep their placeholder (Phase 4).

## Capabilities

### New Capabilities

- `note-editor`: editing a note's body: formatting, font size, links, lists, toolbar, shortcuts, autosave, save status, and handling edits from another tab or device.
- `editor-settings`: the Settings page's Editor section (per-element default size and color, reset, saved to the account) and the reusable color picker.

### Modified Capabilities

- `workspace-data`: adds versioned content saves (a save states the version it is based on; stale saves are rejected; successful saves increment the version). The existing "Content version counter" requirement is unchanged.

## Impact

- **Code**: note page editor and toolbar components, a note content Server Action and database operation, editor styles; the Phase 1 item page shows the editor for notes instead of the placeholder; a `/settings` page, a Settings link in the sidebar, and a shared `ColorPicker` component.
- **Database**: a new `user_settings` table (one row per user, RLS owner-only) holding editor styles; `item_content` rows are created on a note's first save.
- **Dependencies**: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-list` (checklists), `@tiptap/extension-text-align`, `@tiptap/extension-text-style` (font size), `@tiptap/extensions` (placeholder); all MIT-licensed, no Tiptap Pro.
- **Not in this phase**: attachments and images (Phase 3), slash menu and drag handles (Phase 6), full-text search (Phase 6), real-time collaboration, text color and highlight on selected text (element colors come from Settings), version history.
