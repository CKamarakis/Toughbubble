# Proposal

## Why

ToughBubble now has a logo, but the app still shows a text-only wordmark and the default Next.js favicon. Putting the mark on the sign-in/sign-up pages, in the sidebar, and in the browser tab gives the app a recognisable identity.

## What Changes

- Add the logo (the version without the circle) above the "ToughBubble" wordmark on the auth pages (sign-in, sign-up, forgot password), at about 200px.
- Add the same logo to the left of the "ToughBubble" name in the sidebar header. It is sized to the text's line height and centred vertically, and it is part of the same home link.
- Ship two variants of that logo. Its connector lines are pure white, so they disappear on light backgrounds:
  - dark theme: white lines (as drawn)
  - light theme: lines recoloured to the text colour `#333129`
  The variant follows the app's theme without a flash or hydration mismatch.
- Crop the empty padding off the 1024px source so the visible logo fills its box at every size.
- Replace the default Next.js favicon with icons made from the **black-disc** logo, which carries its own background and so reads on light and dark browser tabs: `favicon.ico`, `icon.png`, `apple-icon.png`.
- Add a small script that regenerates every derived image from the 1024px masters in `src/toughbubble_assets/`.
- Remove the unused create-next-app placeholders in `public/` (`next.svg`, `vercel.svg`, `globe.svg`, `file.svg`, `window.svg`).

## Capabilities

### New Capabilities
- `app-branding`: where the ToughBubble logo appears (auth pages, sidebar), how it adapts to the light and dark themes, and the browser and home-screen icons.

### Modified Capabilities
<!-- None: theme switching itself (app-theme) is unchanged; the logo only reacts to it. -->

## Impact

- **UI:** `src/app/(auth)/layout.tsx` (logo above the wordmark), `src/components/workspace/sidebar.tsx` (logo in the header link).
- **App icons:** `src/app/favicon.ico` is replaced; `src/app/icon.png` and `src/app/apple-icon.png` are added (Next.js metadata file conventions).
- **Static assets:** new `public/brand/` holding the cropped light and dark logo PNGs; the placeholder SVGs are removed from `public/`.
- **Tooling:** new `scripts/generate-brand-assets.mts` (npm script `brand:generate`) with tested helpers in `src/lib/brand/`, using `sharp`. `sharp` is already installed as a Next.js dependency; it is added as an explicit devDependency so the script does not rely on a transitive install.
- **Auth proxy:** none. `src/proxy.ts` already exempts `.png` and `.ico` requests, so the logo loads on signed-out pages.
- **Dependencies:** no new runtime dependencies.
