---
title: Storm undo lives in the browser and survives a reload
status: current
---

## In short
- The last 30 undo steps are kept in the browser's own database, per user and storm, and come back after a reload.

## Why (evidence)
- Undo steps are small (usually 0.3-1.4 KB; 30 steps typically under 50 KB), so the browser can hold them at no server cost.
- The browser database rather than simple browser storage, which is synchronous and limited to about 5 MB.

## Gives you
- Undo after a reload, without any server work.

## Limits you
- Restored only if the stored board hasn't changed since; a change from another tab or device drops the history.
- Not shared across browsers or devices.
- Wiped on sign-out (shared computers).

## Revisit if
- Undo should follow the user across devices.

## Affects
- storm-saving (Undo and redo, Undo survives a reload, Changed elsewhere).

## History
- 2026-10-10: recommended in note `storms-spikes-2-4-data-images-and-undo` (spike 4).
- 2026-10-17: built in change `storms-canvas` (design D7).
