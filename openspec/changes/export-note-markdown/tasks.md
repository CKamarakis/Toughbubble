# Tasks

## 1. Setup

- [x] 1.1 Look up fflate's current version and zip API with context7, add it to `dependencies` and to `knowledge/docs/tools.md` (design D6), and verify `npm install` and `npm run build` succeed
- [x] 1.2 Add an integration test that requests a signed Storage URL from the dev project with an `Origin` header and asserts the response allows that origin (design Risks: CORS); verify it passes with `npm run test:integration`, or stop and revisit design D4 if it fails

## 2. Markdown converter

- [x] 2.1 Write `noteToMarkdown(body, assets)` in `src/lib/notes/markdown.ts` for text blocks and marks (design D1), with unit tests for headings, paragraphs, bold/italic/strike/code, links, hard breaks, escaping of Markdown-special characters and dropped size/colour/alignment; verify `npm test` passes
- [x] 2.2 Add lists (bullet, ordered with `start`, task, nested) and blockquote, code block (language, fence longer than inner backticks) and horizontal rule, with unit tests; verify `npm test` passes
- [x] 2.3 Add tables: pipe table when lossless, HTML table otherwise (design D2), with unit tests for a header-row table, a table without a header row, a merged cell (`colspan`), a multi-paragraph cell and HTML escaping; verify `npm test` passes
- [x] 2.4 Add images and file cards: relative `assets/` links, URL-encoded names, and `> Missing file: <name>` for missing ones (design D7), with unit tests; verify `npm test` passes
- [x] 2.5 Add a test that fails when the note extension list (`src/lib/notes/extensions.ts`) has a node type the converter doesn't handle, and an unknown-node fallback to plain text; verify `npm test` passes

## 3. File names

- [ ] 3.1 Write the export-name and asset-name helpers (design D5) with unit tests for slashes and reserved characters, trailing dots, length cap, empty title → "Untitled", and case-insensitive collisions → `-2`, `-3` before the extension; verify `npm test` passes

## 4. Export file list (server)

- [ ] 4.1 Add `getExportFiles` operation and server action (design D3) returning id, name, MIME type and signed link for ready attachments of an active note, with id validation and the 500 limit; add an integration test that it returns only the caller's attachments for the given note and nothing for another user's note; verify `npm run test:integration` passes

## 5. Export flow and menu

- [ ] 5.1 Write `exportNote` in `src/components/notes/export/` (design D4): collect attachment ids, `.md` when none, otherwise fetch files, build the zip with fflate and download it; with happy-dom tests (mocked `loadNote`, `getExportFiles`, `fetch` and download) for a plain note, a note with an image and a file, a failed file fetch, a `copyOf` node, a failed `loadNote` and a second Export while one is preparing (design D9); verify `npm test` passes
- [ ] 5.2 Show "Preparing…" via Sonner during export, an error toast when the note can't be loaded, and a warning toast naming the count of missing files; cover each in the 5.1 tests; verify `npm test` passes
- [ ] 5.3 Add "Export as Markdown" after Duplicate in `item-menu.tsx` for notes only, with a test that a note's menu shows it and folder and Storm menus don't (workspace-tree delta); verify `npm test` and `npm run lint` pass

## 6. Integration check

- [ ] 6.1 Run `npm run lint`, `npm test`, `npm run test:integration` and `npm run build`; verify all pass

## Workflow follow-up

- After archive: update `openspec/config.yaml`'s out-of-scope line, since single-note Markdown export now exists (with the user's yes).
- Offer to set the PRD's `change` to `export-note-markdown` and status to `Building`.
