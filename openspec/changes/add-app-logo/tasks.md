# Tasks

## 1. Image helpers

- [x] 1.1 Add `sharp` as an explicit devDependency (same version Next already installs); verify `npm ls sharp` shows it as a direct dependency and `npm install` succeeds
- [x] 1.2 Implement in `src/lib/brand/assets.ts`, on raw RGBA buffers: the alpha bounding box, padding to a box with an even margin per D2, palette sampling, de-matting against black and white-to-colour recolouring per D1; verify with unit tests in `src/lib/brand/assets.test.ts`:
  - a pre-blended edge pixel (`92,77,0,255` with a yellow palette) comes out as yellow at about 37% alpha
  - fully transparent pixels stay transparent
  - recolouring changes white pixels only and keeps their alpha
  - the bounding box and padding match a small hand-made buffer
- [x] 1.3 Implement the PNG-in-ICO packer per D5 in the same module; verify a unit test that checks the ICONDIR header, the entry count, each entry's width/height and byte offset, and that the PNG bytes appear unchanged at those offsets

## 2. Generate the assets

- [x] 2.1 Write `scripts/generate-brand-assets.mts` and the `brand:generate` npm script per D6. It writes `public/brand/logo-light.png` and `public/brand/logo-dark.png` (cropped, de-matted, about 400px tall), plus `src/app/favicon.ico` (16/32/48), `src/app/icon.png` (512) and `src/app/apple-icon.png` (180) from the disc masters per D5. Verify `npm run brand:generate` succeeds and writes all five files at the expected sizes
- [x] 2.2 Visual check of the outputs: both logo variants on `#FBFBF9` and on `#22211B` show no dark rims and no specks, the lines in the light variant are clearly visible, and the favicon reads at 16px. Verify by viewing the PNGs, and record any margin or size adjustments in the script, not by hand
- [x] 2.3 Delete the placeholder SVGs in `public/` per D7; verify a grep for their names in `src/` and `README.md` finds nothing

## 3. Show the logo

- [x] 3.1 Add an `AppLogo` component that renders both variants with `dark:hidden` / `hidden dark:block`, `alt=""`, `aria-hidden` and `loading="eager"`, plus a `className` for sizing, per D3; verify types and lint pass
- [x] 3.2 Put the logo above the wordmark in `src/app/(auth)/layout.tsx` at `h-[200px] w-auto` per D4; verify in the browser on sign-in, sign-up and forgot-password in both themes that it is centred above the wordmark, with no layout shift on load
- [ ] 3.3 Put the logo inside the sidebar home `Link` in `src/components/workspace/sidebar.tsx`, with `h-5 w-auto` and `gap-1.5`, per D4; verify in the browser that it is centred vertically on "ToughBubble", the header row height is unchanged, clicking the logo goes home, and the focus ring wraps logo and name

## 4. Verification and release

- [ ] 4.1 Browser check on a production build (`next build && next start`):
  - switching Light, Dark and System swaps the logo instantly, with no flash on reload in either theme
  - signed out, `/favicon.ico`, the `icon` and the `apple-icon` load with no redirect, and `<head>` has the `icon` and `apple-touch-icon` links
  - the tab shows the disc icon on both a light and a dark browser theme
  - a screen reader or the accessibility tree reads the sidebar link as just "ToughBubble"
  Verify all checks pass
- [x] 4.2 Update the README: add the logo to the product intro, and add a short dev note that brand images are generated from `src/toughbubble_assets/` with `npm run brand:generate` (never edited by hand). Run lint and unit tests; verify they pass
- [ ] 4.3 Push a branch and check the Vercel preview; merge to `main` and verify on production that the logo shows on sign-in and in the sidebar, and the tab shows the new favicon
