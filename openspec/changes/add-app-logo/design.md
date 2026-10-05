# Design

## Context

- **Source images (masters, 1024×1024), in `src/toughbubble_assets/`:**
  - `toughbubble-logo-no-circle-transparent-1024.png`: the mark with no disc. The artwork covers only x 282–741, y 222–752 (459×530); the rest is transparent padding.
  - `toughbubble-logo-transparent.png`: the mark on a black disc, with transparent corners.
  - `toughbubble-logo-black.png`: the disc on an **opaque black square**, with no transparency.
- **Edge smoothing is baked in against black.** Every edge pixel is opaque and pre-blended with black:
  - line edges: `190,190,190,255` and `65,65,65,255`
  - yellow circle edge: `92,77,0,255`
  On a light background this shows as dark rims. Recolouring only the white lines would still leave rims on the circles.
- **Theme:** `next-themes` puts `.dark` on `<html>` before hydration, and Tailwind's `dark:` variant targets it (`globals.css:5`). Light-theme text is `--foreground` `#333129`.
- **Auth proxy:** `src/proxy.ts:58` already skips `.png` and `.ico` requests, so signed-out pages can load the images.
- **Next.js 16.3:** `next/image` deprecates `priority`; the docs recommend `loading="eager"` for above-the-fold images. The `favicon.ico`, `icon.*` and `apple-icon.*` files in `app/` produce the `<link>` tags automatically.
- **Mount points:**
  - `src/app/(auth)/layout.tsx`: a centred `flex-col gap-6` column; the wordmark `<p>` sits above the card.
  - `src/components/workspace/sidebar.tsx:39`: `<Link className="font-semibold ...">ToughBubble</Link>` inside a `flex items-center` row. The text is 16px with a 24px line box.

## Goals / Non-Goals

**Goals:**
- Images regenerate exactly from the masters with one command; nothing is edited by hand.
- The theme swap uses CSS only: no client-side theme check, no hydration mismatch, no flash.

**Non-Goals:**
- An SVG version of the logo (the user only has PNGs).
- Separate light and dark browser-tab icons (the disc icon covers both; see Decisions).
- Web app manifest or PWA icons; OG or social images.
- Changing the wordmark's colour or type.

## Decisions

### D1. De-matte against black, then recolour (not a plain colour swap)
Model each opaque pixel as `k × C`: one of the logo's solid colours `C` (white, magenta, yellow, purple) scaled by a coverage `k` in [0,1], because it was blended with black. For each pixel, pick the palette colour whose direction best matches the pixel's colour, set `rgb = C` and `alpha = k` (multiplied by any existing alpha).

The result is a clean transparent PNG with **no black fringe** on lines or circles. From it:
- **dark variant:** keep the lines white
- **light variant:** replace white with `#333129`, keeping alpha

*Alternatives rejected:*
- Thresholding white to dark: jagged lines, and the circle rims stay.
- `alpha = luminance` on lines only: fixes the lines but not the circles.

The palette is sampled from the master's solid interiors rather than hard-coded, so a re-export with slightly different colours still works.

### D2. Crop to the artwork plus a small even margin
Trim to the alpha bounding box, then pad to a fixed aspect ratio with about 4% margin so no shape touches the edge. Export:
- `public/brand/logo-light.png` and `public/brand/logo-dark.png`, about 400px tall (2× the 200px display, so it stays sharp on HiDPI screens).

The sidebar uses the same files scaled down. A dedicated 40px export is unnecessary at this file size.

### D3. Theme swap with two `next/image`s and Tailwind `dark:`
A small `AppLogo` component renders both variants:
- light: `dark:hidden`
- dark: `hidden dark:block`
- both: `alt=""`, `aria-hidden` (decorative next to the wordmark), and `loading="eager"`

Both load eagerly so switching theme doesn't leave a blank gap while the second image loads; together they are a few tens of KB. A `className` prop sets the size at each mount point.

*Alternatives rejected:*
- `useTheme()` choosing the image: the theme is unknown during SSR, causing a hydration mismatch or a flash.
- CSS `filter: invert()`: it would invert the brand colours too.

### D4. Sizing at each mount point
- **Auth page:** `h-[200px] w-auto`, placed above the wordmark in the existing `gap-6` column.
- **Sidebar:** `h-5 w-auto` (20px, inside the 24px line box) with `gap-1.5`, placed inside the existing `Link` so the click target and focus ring cover both. `items-center` on the link centres it vertically. 20px matches the font's visual height (cap height plus descender) without growing the row. Nudge to `h-[18px]` if it looks heavy during the visual check.

### D5. App icons from the disc masters
| File | Source | Sizes | Why |
|---|---|---|---|
| `src/app/favicon.ico` | `logo-transparent` (disc, transparent corners) | 16, 32, 48 | Round icon in the tab; dark disc reads on light and dark tab bars |
| `src/app/icon.png` | `logo-transparent` | 512 | Modern browsers pick the PNG |
| `src/app/apple-icon.png` | `logo-black` (opaque square) | 180 | iOS fills transparency with black anyway, and adds its own rounded corners |

Before scaling, crop the disc to its bounding box (it fills about 85% of the canvas) so it reads bigger at 16px.

**ICO packing.** `sharp` cannot write `.ico`. The script writes a PNG-in-ICO container directly: a 6-byte header, 16-byte entries, then the PNG bytes. This is supported by every current browser and avoids an extra dependency.

### D6. Generation script, outputs committed
- The pure pixel logic (palette sampling, de-matting, recolouring, bounding box and padding, ICO packing) lives in `src/lib/brand/assets.ts`, operating on raw RGBA buffers, so the unit project (`src/**/*.test.ts`) can test it without image files.
- `scripts/generate-brand-assets.mts` is a thin wrapper: `sharp` decodes, resizes and encodes; the helpers do the rest. Node 24 runs it directly through type stripping (`node scripts/generate-brand-assets.mts`), exposed as the npm script `brand:generate`.
- The outputs are committed, so builds on Vercel don't run it.
- `sharp` becomes an explicit devDependency.

### D7. Clean up the placeholders
Delete `public/{next,vercel,globe,file,window}.svg`. A grep found no references in `src/` or the README.

## Risks / Trade-offs

- **[Risk] De-matting misclassifies an anti-aliased pixel where two colours meet** (for example a line touching a circle) and produces a speck. → Pick the colour by best direction match, with a residual check. Inspect both variants at 400px on light and dark backgrounds before committing.
- **[Risk] 20px in the sidebar is too small for the three dots to read.** → It's a brand mark next to the name, not standalone; check visually and adjust within 18–22px.
- **[Trade-off] Both variants download on every page.** → Acceptable: tiny files, and it prevents a gap when switching theme.
- **[Trade-off] The tab icon doesn't follow the app's theme.** → Intentional: the disc icon carries its own background.
- **[Risk] Browsers cache the old favicon aggressively.** → Next adds a content hash to `icon.png` and `apple-icon.png`. `favicon.ico` may stay stale locally until a hard refresh; that isn't a production issue.

## Migration Plan

Additive, static assets only. To roll back, revert the commit. The old `favicon.ico` comes back from git history.
