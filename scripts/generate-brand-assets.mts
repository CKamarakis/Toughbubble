// Regenerates every brand image from the 1024px masters in src/toughbubble_assets/.
// Run with `npm run brand:generate`; the outputs are committed, never edited by hand.
//
//   public/brand/logo-dark.png   logo without the disc, white lines (dark theme)
//   public/brand/logo-light.png  same, lines in the light theme's text color
//   src/app/favicon.ico          disc logo, 16/32/48
//   src/app/icon.png             disc logo, 512
//   src/app/apple-icon.png       disc on its black square, 180

import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import {
  alphaBoundingBox,
  cropWithMargin,
  dematteFromBlack,
  hexToRgb,
  packIco,
  recolor,
  samplePalette,
  type RgbaImage,
} from "../src/lib/brand/assets.ts";

const MASTERS = "src/toughbubble_assets";
const LOGO = `${MASTERS}/toughbubble-logo-no-circle-transparent-1024.png`;
const DISC = `${MASTERS}/toughbubble-logo-transparent.png`;
const DISC_ON_BLACK = `${MASTERS}/toughbubble-logo-black.png`;

const LOGO_HEIGHT = 400; // 2x the 200px shown on the auth pages
const LOGO_MARGIN = 0.04;
const LIGHT_LINE = hexToRgb("#333129"); // --foreground in the light theme
const WHITE = [255, 255, 255] as const;

async function load(path: string): Promise<RgbaImage> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

function encode(img: RgbaImage) {
  return sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } });
}

async function squarePng(img: RgbaImage, size: number) {
  return new Uint8Array(await encode(img).resize(size, size).png().toBuffer());
}

async function main() {
  await mkdir("public/brand", { recursive: true });

  // In-app logo: strip the black matte from the edges, crop, then one variant per theme.
  const logo = await load(LOGO);
  const clean = dematteFromBlack(logo, samplePalette(logo));
  const cropped = cropWithMargin(clean, alphaBoundingBox(clean)!, LOGO_MARGIN);
  const variants = { dark: cropped, light: recolor(cropped, WHITE, LIGHT_LINE) };
  for (const [theme, img] of Object.entries(variants)) {
    await encode(img).resize({ height: LOGO_HEIGHT }).png().toFile(`public/brand/logo-${theme}.png`);
  }

  // App icons: the disc fills the whole icon.
  const disc = await load(DISC);
  const discBox = alphaBoundingBox(disc)!;
  const discOnly = cropWithMargin(disc, discBox, 0);
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(sizes.map((size) => squarePng(discOnly, size)));
  await writeFile("src/app/favicon.ico", packIco(sizes.map((size, i) => ({ size, png: pngs[i] }))));
  await writeFile("src/app/icon.png", await squarePng(discOnly, 512));

  // iOS draws its own rounded corners and fills transparency with black, so use the opaque master.
  const onBlack = cropWithMargin(await load(DISC_ON_BLACK), discBox, 0);
  await writeFile("src/app/apple-icon.png", await squarePng(onBlack, 180));
}

await main();
