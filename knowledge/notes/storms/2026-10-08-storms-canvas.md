---
title: "Storms: canvas"
date: 2026-10-08
tags:
  - storms
  - canvas
source: voice
---

Feature 1 of the storms requirements. Overview: `notes/storms/2026-10-08-storms-a-simple-miro-like-board-overview.md`. Screenshots: `knowledge/assets/Storms/strom basic views/`.

## Where storms live

- A storm is a node in the sidebar tree, like a note: create, move, nest, or stand alone, with the same tree behaviour.

## Board

- No limit for the user. Technically, keep coordinates within a few million px of the origin to avoid floating-point precision problems.
- Background: a light, non-strict grid or dot hint to help with placing items.
- Autosave. Single user: no live collaboration (doubtful it's ever needed). Sharing for comments maybe later, out of scope now.

## Zoom

- Range 10%–400%.
- Mouse wheel zooms toward the cursor; the +/− buttons zoom in steps; the bottom-right control shows the current %.
- Fit button: zoom so every item fits on screen.

## Pan and select (desktop)

- Hold right click and drag: pan.
- Space + left-drag: pan.
- Two-finger trackpad scroll: pan.
- Left-drag on empty space: selection box.
- Left click: select. Single right click on an item: options menu.

## Toolbar (v1)

- Select, sticky note, shape, text, image, undo/redo.
- More tools later; keep it simple.

## Images

- Upload from file, drag and drop from the desktop, and paste from the clipboard.

## Tablet / mobile (proposal, not confirmed)

- v1 is desktop. Handle input so a touch layer is cheap to add later; no separate mobile layout.
- Proposed touch mapping: one finger on empty space pans, one finger on an item drags it, pinch zooms, tap selects, long-press opens the options menu, selection box via a toolbar toggle.
- Phones: probably view only. Tablets: editing makes sense. Discuss further.
