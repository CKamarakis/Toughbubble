---
title: Saves are versioned, and conflicting edits are caught, not merged
status: current
---

## In short
- Every save says which version it was based on. A save based on an older version is refused.
- You then choose Load latest or Keep mine.

## Why (evidence)
- The aim is that no edit is lost without warning, including with a second tab or device.
- Merging edits as they happen would need real-time collaboration (Yjs/CRDT), which isn't built.

## Gives you
- Typing never waits on the network.
- Failed saves keep retrying, and closing the tab with unsaved work asks first.
- A tab with no unsaved typing quietly loads the newer version when you return, so conflicts are rare.

## Limits you
- When both tabs have unsaved edits, you must pick one version. Nothing is merged.
- A crash or reload in the second before a save can lose that second of typing (accepted).

## Revisit if
- Real-time collaboration, or editing the same note on several devices at once, becomes a goal.

## Affects
- note-editor.
- Storms, whose saves are also checked by version and which share the same autosave code.

## History
- 2026-09-23 phase-2-notes-editor: versioned save and autosave design (design D3, D4; non-goals).
- 2026-10-17 storms-canvas: autosave code moved to `src/lib/autosave.ts` for shared use, and storm saves are version-checked (proposal, design).
