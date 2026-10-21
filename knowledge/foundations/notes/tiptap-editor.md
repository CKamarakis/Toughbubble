---
title: Notes are written in Tiptap and stored as Tiptap JSON
status: current
---

## In short
- The note editor is built on Tiptap 3, using only its free, MIT-licensed add-ons (no Tiptap Pro).
- A note body is saved as Tiptap JSON. One shared list of add-ons sets both what the editor allows and what the server accepts.

## Why (evidence)
- BlockNote was rejected because its free tier has no font-size picker.
- Every save is checked against that shared list, with links limited to http, https and mailto. A crafted request can't store content the editor can't show, or an unsafe link.
- Tables use Tiptap's own table add-on rather than a custom one. Cell selection, merged cells and resizing are the hard parts, and the add-on already handles them.

## Gives you
- Notes reopen exactly as written, on any device.
- New block types (images, file cards, tables) are added in one place, and the editor and server agree on them automatically.

## Limits you
- Every new kind of content must join the shared list, or saves containing it are refused.
- Checking every save adds weight to the server code (accepted for correctness).
- You depend on Tiptap's defaults. Example: its link detection made typed text stick to links until that was switched off.

## Revisit if
- Notes routinely run past tens of thousands of words and the editor slows down.
- Real-time collaboration becomes a goal (it would need Yjs/CRDT).

## Affects
- note-editor, note-attachments, note-tables.

## History
- 2026-09-23 phase-2-notes-editor: Tiptap chosen over BlockNote. Body stored as Tiptap JSON and checked on the server (design D1, D2).
- 2026-09-23 phase-3-attachments: image and file-card blocks added to the shared list (design D4).
- 2026-09-29 editor-link-end-and-note-size: link behaviour changed, and the note's own size saved inside the document (design D1, D2).
- 2026-10-17 tables-in-notes: Tiptap table add-on adopted instead of a custom table block (design D1).
