---
title: Each storm is one JSON document saved as change sets
status: current
---

## In short
- A whole board is one stored document with items keyed by id.
- Saves send only what changed (added, changed, deleted items) with the version they are based on; the server merges them.

## Why (evidence)
- Measured about 385 bytes per item; a 1,000-item board is 377 KB, while editing one item sends about 0.3 KB and dragging 20 about 1.4 KB.
- Reuses what notes already have: the same storage, owner-only access, versions, trash and the tested autosave.
- A row per item was judged overkill for a single-user app.

## Gives you
- Tiny saves at any board size, far below the 1 MB request limit.
- Two tabs can't silently overwrite each other ("Changed elsewhere").

## Limits you
- Boards are capped at about 2 MB (roughly 5,000 items); text-heavy boards may hit it sooner (estimate).
- Opening a board loads all of it at once.
- With Keep mine, the last tab to save wins for the same item.

## Revisit if
- Real-time sharing between several people, or boards beyond about 5,000 items.

## Affects
- storm-saving (Autosave, Changed elsewhere, Board size limit, Server checks).

## History
- 2026-10-10: recommended in note `storms-spikes-2-4-data-images-and-undo` (spike 2).
- 2026-10-17: built in change `storms-canvas` (design D3: server merges in one step, checking version and size together).
