---
title: Export a note as Markdown
sources:
  - notes/2026-10-21-export-a-note-as-markdown.md
  - notes/mcp-connector/2026-10-08-mcp-connector-design-parked.md
prd: prds/export-a-note-as-markdown.md
---

# Export a note as Markdown

Written by the kit (`explore.mjs`) at the end of `/opsx:explore`; saves only add.

## Decisions

- Scope: notes only (no folders, projects or Storms); import is out of scope.
- A note with no images or files exports as a plain .md file; no zip by default.
- A note with images or attached files exports as a .zip: the .md plus an assets/ folder, linked by relative paths.
- Attached non-image files (PDFs, spreadsheets) go into the zip too.
- The action lives in the note's ... menu as 'Export as Markdown'.
- Styling (font sizes, colours, alignment) is dropped; tables with merged cells are written as HTML tables.
- Tiptap-to-Markdown conversion is a pure function, so the parked MCP connector can reuse it later.
- The export is built in the browser: files fetched through their signed links while signed in, zipped there (avoids the server's 1 MB limit).
- Q1: Finish the export and name the missing file in the .md.
- Q2: fflate; check its current docs and version at build time.

## Open questions

