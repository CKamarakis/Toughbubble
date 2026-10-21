# Design

## Context

See proposal.md for why. Relevant current state:

- A note body is Tiptap JSON (`src/lib/notes/extensions.ts`). Images (`image`) and file cards (`fileAttachment`) store an attachment **id**, never a URL (`src/lib/notes/attachment-nodes.ts`). Image nodes carry no file name; names and MIME types live in the `attachments` table.
- The attachments table can hold rows the body no longer uses (an image removed from the text is kept for Undo, attachments design). So "the note's attachments" means the ones the body references.
- Files sit in a private Supabase Storage bucket and are read through 1-hour signed links (`getAttachmentLinks`, `src/lib/attachments/operations.ts`), behind row-level security.
- `loadNote` (`src/lib/notes/actions.ts`) returns the saved body and version. Server Actions accept at most 1 MB per request.
- The item actions menu (`src/components/workspace/item-menu.tsx`) is shared by sidebar rows and the item page, so a note can be exported without being open.
- No Markdown support exists today; `@tiptap/markdown` is not installed.

## Goals / Non-Goals

**Goals:**
- A pure converter (Tiptap JSON in, Markdown string out) with no editor, DOM or browser dependency, so the parked MCP connector can call it on the server later.
- Export runs in the browser: no new upload path, no large server responses, nothing stored.

**Non-Goals:**
- Exporting the editor's unsaved typing (the export reads the saved note; see Risks).
- Markdown → Tiptap (import), and round-trip fidelity.
- Embedding images in the `.md` (base64) or linking signed URLs.

## Decisions

### D1. Hand-written converter over `@tiptap/markdown`
A small recursive walker over the JSON in `src/lib/notes/markdown.ts`: `noteToMarkdown(body, assets)` where `assets` maps attachment id → `{ path }` (relative, e.g. `assets/map.png`) or `{ missing: name }`.
- **Why:** it runs anywhere without an editor instance, handles our custom nodes (images, file cards) and the HTML table fallback directly, and is easy to test node by node.
- **Alternative:** Tiptap's official `@tiptap/markdown` extension. It needs Markdown handlers for our custom nodes and an editor or manager instance, and it's a new dependency. Rejected for now. This also settles the MCP design's open question ("official extension vs hand-written"); revisit only if import (Markdown → Tiptap) is built, where the official parser would help.
- Marks: bold `**`, italic `*`, strike `~~`, inline code with a backtick fence longer than any run inside, links `[text](href)` (hrefs are already limited to http/https/mailto on save). Text is escaped for Markdown-special characters. `textStyle` (size, colour) and alignment are ignored.
- Blocks: headings `#`×level, paragraphs, bullet `- `, ordered `1. ` (respecting `start`), task `- [ ]`/`- [x]`, nested lists indented, blockquote `> `, code block fenced with its language, rule `---`, hard break as a trailing backslash.

### D2. Tables: Markdown when lossless, HTML otherwise
A table becomes a pipe table only if every cell has colspan = rowspan = 1, holds at most one paragraph, and header cells appear only in the first row. Otherwise it is written as an HTML `<table>` with `<th>`/`<td>`, `colspan`/`rowspan`, and cell text escaped for HTML. A table without a header row gets an empty header row in pipe form (Markdown requires one).
- **Alternative:** always HTML. Rejected: pipe tables are easier for people and Claude to read in the common case.

### D3. A read-only server action for the export's file list
New `getExportFiles(itemId, ids)` (in `src/lib/attachments/actions.ts`, operation in `operations.ts`) returns `{ id, name, mimeType, url }` for the ready attachments among `ids` that belong to the note, using the same `withUserDb` + RLS path and 1-hour signed links as `getAttachmentLinks`. Validation and limits as in `getAttachmentLinks` (ids are UUIDs, at most 500).
- **Why:** image nodes have no name, and the export needs real file names and types. One call gives names and fresh links at export start.
- **Alternative:** reuse `getAttachmentLinks` and name images `image-1.png` from the response type. Rejected: loses the user's file names (the spec names files by their attachment name).

### D4. The export flow runs in the browser
`exportNote(itemId, title)` in `src/components/notes/export/`:
1. `loadNote(itemId)`. On failure: error toast, stop.
2. Walk the body for attachment ids (images and file cards; a node with `copyOf` and no `attachmentId` counts as missing).
3. No ids: convert, download `<name>.md` as a text Blob. Done.
4. Otherwise `getExportFiles`, then fetch each URL (a few at a time). Assign unique names in `assets/` (D5). Failed or unlisted ids become `{ missing: name or "file" }`.
5. Convert, zip `<name>.md` + `assets/*`, download `<name>.zip`.
- Progress and results through Sonner (already used): `toast.loading("Preparing…")`, then dismissed on download; a warning toast "N file(s) couldn't be included" when any are missing.
- Download via an object URL on a temporary `<a download>`, revoked afterwards.

### D5. File names
- **Export name:** the note title with control characters and `\ / : * ? " < > |` removed, trimmed, trailing dots removed, at most 100 characters; empty → "Untitled".
- **Asset names:** `cleanFileName` (existing) plus the same character removal; collisions (case-insensitive, since Windows and macOS file systems are) get `-2`, `-3` before the extension. Markdown links use the name URL-encoded per path segment (`assets/My%20photo.png`), so spaces and brackets don't break the link.

### D6. Zip library: fflate
Small, no dependencies, works in the browser. Images and PDFs are stored without compression (already compressed); the `.md` is deflated. Check the current version and API with context7 before writing code.
- **Alternative:** JSZip. Larger and slower; nothing here needs its extras.

### D7. Missing files in the Markdown
A missing image or file is written in its place as `> Missing file: <name>` (a quote line), so it is visible to a reader and to Claude without breaking the document.

## Risks / Trade-offs

- [Unsaved typing isn't exported: the export reads the saved note, and autosave runs about 1 s after typing stops] → Accepted; the last second of typing is the only gap. Exporting from the open editor's live state would need the menu to reach the editor, which it can't today.
- [Fetching signed Storage URLs from the app is cross-origin] → Signed URLs already load in `<img>`, but `fetch` also needs CORS on GET. Unverified (assumption: Supabase Storage allows it). Check it first during the build; proxying through the server is not an option (1 MB limit), so a block here would need a design change.
- [Big notes make big zips in memory (5 MB per file)] → Fine for a personal workspace; the zip is built once and released after download.
- [Converter misses a node type added later] → Unknown nodes fall back to their plain text, and a test fails when the note extension list gains a node the converter doesn't name.
- [Links expire mid-export] → Links are requested at export start and valid for 1 hour.

## Migration Plan

None: no database, storage or rule changes. Rollback is removing the menu entry.
