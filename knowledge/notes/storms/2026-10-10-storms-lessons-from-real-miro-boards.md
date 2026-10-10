---
title: "Storms: lessons from real Miro boards"
date: 2026-10-10
tags:
  - storms
  - research
  - v1-scope
  - data-model
source: knowledge/assets/Storms/Miro files & pdf exports
---

Review of 9 real Miro boards exported by the user: `knowledge/assets/Storms/Miro files & pdf exports/` (PDF + `.rtb` each). These decisions override earlier notes where they differ.

## About the `.rtb` files

- Each is a zip; the board data (`canvas.json`) is encrypted (`meta.json`: `encryptionVersion 1.0`). Only embedded images are readable. No import from `.rtb`, and we won't break the encryption.
- If importing Miro boards is ever wanted: Miro's REST API returns board items as JSON for boards the user owns (needs a developer token). Not planned.

## Patterns seen

- **Labelled areas** dominate (7 of 9 boards): a big coloured rectangle + header bar + title, filled with a grid of stickies (Kaizen, Team trust, Interview insights, C3, CV Bank, 10 for 10, C2).
- **Reusable workshop boards** (Solution sprint, Kaizen, Team trust, 10 for 10): template-like.
- **Manual voting**: copy-pasted small red circles, "+1" mini stickies, emoji initials. Covered by circles + duplicate.
- **Locked "reveal later" panels** (Solution sprint): covered by lock.
- **Text-heavy shapes**: paragraphs, bullet/numbered lists, links, highlights, emoji in text.
- **Transparent cut-out PNG illustrations**: the image pipeline keeps transparency.
- **Elbow-arrow trees** (OKR board) and arrows pointing at plain text: covered by connectors.
- **Big boards**: C2 looks well over 500 items (estimated by eye).

## Decisions

- **Frames (v1)**: a light frame item, a titled area where items fully inside move with it. No nesting, no presentation mode. Plain shapes stay free (items on a shape aren't contained).
- **Templates: v2.** Duplicate a whole storm as a v1 stand-in (default, not explicitly confirmed).
- **Extra shapes (v1)**: star, speech bubble.
- **Fill opacity (v1)**: a transparency slider for fills (for example, an overlay on a timeline).
- **Text that doesn't fit:**
  - Text typed directly into a shape or sticky note auto-resizes to fit that shape (same as stickies).
  - A separate text item placed on top of a shape is independent: it doesn't resize or move with the shape unless grouped, and it may overflow the shape.
- **Fonts**: a small set of about 10 free fonts (Google Fonts, for example Roboto), basics only; pick them at design time.
- **Performance target: 1,000 items** running smoothly (replaces 500).

## Technical direction: data model

- Each item: `x`, `y` (board position), `z` (stacking order), `width`, `height`, `rotation` (reserved for v2), `parent` (group or frame).
- `z` is a fractional index between neighbours, so "bring forward" updates one item instead of renumbering the board.
- Stored as 3D data only; the board is drawn flat, and `z` decides what draws on top. Moving a parent moves its children.
