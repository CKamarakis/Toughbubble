# Proposal

PRD: knowledge/prds/export-a-note-as-markdown.md @ 264aa05

## Why

There is no way to get a note out of ToughBubble. When working with Claude Code, copy-paste loses images and attached files, and the MCP connector is parked. Exporting a note as Markdown, with its attachments beside it, lets Claude Code read notes today. The Tiptap-to-Markdown converter built here is also the read half the parked MCP connector needs (MCP design D6).

## What Changes

- A note's actions menu gets **Export as Markdown**, after Duplicate (sidebar row and item page, which share the menu).
- A note with no images or attached files downloads as `<title>.md`.
- A note with images or attached files downloads as `<title>.zip`: `<title>.md` plus an `assets/` folder holding every attachment, linked by relative paths. Duplicate file names get a numeric suffix.
- Headings, bold, italic, strikethrough, inline code, links, bullet, numbered and task lists, quotes, code blocks, rules and tables become Markdown. A table with merged cells, column header cells in body rows, or block content a Markdown cell can't hold is written as an HTML table. Font sizes, colours and alignment are dropped.
- An attachment that fails to download doesn't stop the export: the `.md` names the missing file where it would have been.
- "Preparing…" shows while the export builds.
- Exporting never changes or saves the note.
- This lifts "export (Markdown/PDF)" from the project's out-of-scope list for single notes only. Folders, projects, Storms, PDF/Word export and import stay out.

## Capabilities

### New Capabilities
- `note-export`: turning a note into files for use outside the app: the Markdown conversion, the `.md` or `.zip` download, how attachments are packaged and named, and failure handling.

### Modified Capabilities
- `workspace-tree`: the "Item menu layout" requirement adds "Export as Markdown" to the note menu.

## Impact

- **New code:** a pure Tiptap JSON → Markdown converter in `src/lib/notes/` (shared later with the MCP connector), and a browser-side export flow that loads the saved note, fetches attachments and builds the download.
- **Changed code:** `src/components/workspace/item-menu.tsx` (new note entry).
- **Reused:** `loadNote` (`src/lib/notes/actions.ts`), `getAttachmentLinks` (`src/lib/attachments/actions.ts`), `cleanFileName` (`src/lib/attachments/rules.ts`).
- **New dependency:** a zip library (fflate proposed; version and API checked against current docs at build time).
- **No database, storage or server-rule changes.** No migration.
- **Project config:** `openspec/config.yaml` lists "export (Markdown/PDF)" as out of scope; it should be updated after this change (not part of the planning artifacts).
