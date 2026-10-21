---
title: Export a note as Markdown
status: Draft
sources:
  - notes/2026-10-21-export-a-note-as-markdown.md
  - notes/mcp-connector/2026-10-08-mcp-connector-design-parked.md
shape: declined
---

<!-- Keep it to one or two pages. Every section should help someone decide or build. Write "Unknown" or move it to Open questions rather than guessing. -->

## Problem

When I work with Claude Code, I want to hand it what's in a note, but there's no way to get a note out of ToughBubble. Copy-paste loses images and attached files, and an MCP connector is parked for later.

Bet: if a note can be exported as Markdown (with its images and files alongside), I can give notes to Claude Code today, and the converter we build becomes the read half of the MCP connector later.

## Users

- Me, the owner, using ToughBubble together with Claude Code.
- Assumption: other users will find it useful as a plain backup or to move a note elsewhere; not a goal for now.

## Goals and success measures

- **Goal:** one action turns a note into files Claude Code can read, text and images included.
- **Measure:** an exported note with text, a table, an image and a PDF opens in Claude Code, which can read the text and table and see the image and the PDF (yes/no).
- **Must not get worse:** the note itself: exporting never changes or saves the note.

## Scope

**In:**
- Export a single note from its ⋯ menu.
- A note without attachments downloads as `<title>.md`.
- A note with images or attached files downloads as `<title>.zip`: the `.md` plus an `assets/` folder with every attachment, linked by relative paths.

**Out (and why):**
- Folders, projects and Storms: notes cover the need; Storms have no natural Markdown form.
- Import of Markdown into a note: converting back loses attachments and styling (see MCP design D6); later.
- Styling (font sizes, colours, alignment): Claude doesn't need it.
- PDF or Word export: Claude Code reads Markdown and image files best.

## Requirements

**Export menu**
- Given a note is open, when I open its ⋯ menu, then I see "Export as Markdown".

**Note without attachments**
- Given a note with no images or files, when I choose Export as Markdown, then a file `<title>.md` downloads with the note's text as Markdown.

**Note with attachments**
- Given a note with images or attached files, when I choose Export as Markdown, then `<title>.zip` downloads, holding `<title>.md` and an `assets/` folder with each image and file.
- Given that zip is unpacked, when I open the `.md`, then each image and file link points to its file in `assets/` by a relative path.
- Given two attachments with the same name, when they're exported, then the second gets a suffix (`a-2.png`) and its link matches.
- Given one attachment fails to download, when the export runs, then the export still finishes and the `.md` names the missing file where it would have been.

**Content**
- Headings, bold, italic, links, bullet and numbered lists and tables become standard Markdown.
- A table with merged cells is written as an HTML table, so nothing is lost.
- Font sizes, colours and alignment are dropped.

**While exporting**
- Given a note with large attachments, when the export runs, then I see "Preparing…" until the download starts.

## UX notes and assets

- Flow: open note → ⋯ → Export as Markdown → file downloads.
- The file name comes from the note title, cleaned of characters a file name can't hold.
- Built in the browser: attachments are fetched while signed in, then zipped there (fflate; check docs and version at build time). Avoids the server's 1 MB limit.
- The Tiptap-to-Markdown converter is a pure function, so the MCP connector can reuse it later.

## Risks

| Risk | How we'd notice | What we'd do |
|---|---|---|
| Large notes make a big zip (up to 5 MB per file) | Export feels slow or the tab struggles | Keep "Preparing…"; consider a size warning |
| A custom node (file card, image) converts badly | Exported `.md` misses content in a test note | Cover every node type in the converter tests |
| Attachment links expire mid-export (1 hour) | Missing-file lines on long exports | Fetch fresh links at export start |

## Open questions

-
