---
title: "Storms: palette, fonts and shortcuts research"
date: 2026-10-10
tags:
  - storms
  - research
  - palette
  - fonts
  - shortcuts
source: text
---

Research for the palette, fonts and shortcuts open questions, comparing Miro, FigJam and Excalidraw. Refines `notes/storms/2026-10-10-storms-spike-5-palette-fonts-and-shortcuts.md`. Go standard and easy.

## What the others use

- **Miro stickies:** 16 colours in 8 light/deep pairs: yellow, orange/red, pink, violet, blue, teal/green, lime, white/black. Sampled from the user's screenshot (`assets/Storms/sticky notes basics/Sticky note creation.png`): `#fff79e #ffe86d #ffb575 #ff9e9e #ffd2f2 #fd9ae7 #b2d0fe #b8acfb #9ce6ff #86b4f9 #81e7de #6ae08d #d1f09f #b3e65f #f3f5f7 #1d1d1d` (approximate; swatches have gradients). Not customisable for stickies; shapes and text accept any hex ([Miro help](https://help.miro.com/hc/articles/360017572374), [community](https://community.miro.com/ask-the-community-45/sticky-note-hex-values-7604)).
- **FigJam stickies:** 10 pastels: white, grey, green `#B3EFBD`, teal `#B3F4EF`, blue `#A8DAFF`, violet `#D3BDFF`, pink `#FFA8DB`, red `#FFB8A8`, orange `#FFD3A8`, yellow `#FFE299`. Shapes and connectors use a separate, stronger palette ([Figma help](https://help.figma.com/hc/en-us/articles/1500004291341)).
- **Excalidraw:** colours from the open-color palette (MIT). From Claude's knowledge, not checked in this research.
- **Pattern:** everyone uses light pastels for stickies (with dark text) and a separate stronger palette for shapes, lines and text.

## Palette proposal: 16 sticky colours

Light/deep pairs like Miro, built from our hues (OKLCH; contrast vs ink `#141310`):

| Colour | Hex | Text |
|---|---|---|
| Light yellow | `#fff0a1` | dark (16.1) |
| Yellow (brand) | `#f7d000` | dark (12.4) |
| Light orange | `#ffdeb9` | dark (14.5) |
| Orange | `#ffaf68` | dark (10.2) |
| Red | `#ff9f94` | dark (9.4) |
| Light pink | `#ffd8ed` | dark (14.4) |
| Pink | `#fc9ac9` | dark (9.4) |
| Light purple | `#f1deff` | dark (14.7) |
| Purple | `#c9a3f5` | dark (8.9) |
| Light blue | `#c2efff` | dark (15.1) |
| Dark blue | `#81b4f6` | dark (8.7) |
| Light green | `#ccf6c3` | dark (15.5) |
| Dark green | `#6fd087` | dark (9.8) |
| Brown | `#c39b81` | dark (7.4) |
| White | `#ffffff` | dark (18.6) |
| Black | `#22211b` | white (16.1) |

- Shapes, borders, arrows and text: the 12 **strong** tones from the spike 5 note, plus all 16 above as fills, plus custom colours.

## Fonts proposal (10)

- **Miro:** Open Sans by default, plus about 26 families, including Roboto, Caveat, Permanent Marker, PT Sans/Serif, IBM Plex, EB Garamond, Abril Fatface ([Miro help: Fonts](https://help.miro.com/hc/en-us/articles/360017572114-Fonts)).
- **Most used on the web:** Roboto, Open Sans, Montserrat, Inter, Poppins, Lato (third-party rankings; no official 2026 list found: [serbyte](https://www.serbyte.net/fonts), [madegooddesigns](https://madegooddesigns.com/best-google-fonts/)).
- **Proposal:** Geist (default, the app font), Geist Mono, Inter, Roboto, Open Sans, Montserrat, PT Serif, Playfair Display, Caveat (handwriting), Permanent Marker (marker). Replaces Lato and Merriweather from spike 5 with Miro's PT Serif and Permanent Marker.

## Shortcuts: follow Miro

- Miro single keys: T text, N sticky notes, S shapes, R rectangle, O oval, L connection line, C comment; F1 or ? opens the list; single keys can be turned off for accessibility ([Miro help](https://help.miro.com/hc/articles/360017731033)).
- FigJam differs: S = sticky, L = straight connector, X or Shift+L = elbow connector ([Figma help](https://help.figma.com/hc/en-us/articles/1500004362321)).
- **Decision:** use Miro's letters (N, S, T, R, O, L), plus F frame, H hand, V select (common to Figma and Excalidraw), I image. No C (no comments in v1). Add a setting to turn off single-key shortcuts, as Miro has.
