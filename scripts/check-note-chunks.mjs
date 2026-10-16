// Notes don't load the board (storms-canvas D12): after `next build`, the item
// page's client modules (what a note page downloads) must not list the Storm
// board chunk. The board is reachable only through its next/dynamic loader.
// Production build only: the dev server lists the page's async chunks up front
// (a Turbopack dev behaviour), so this check says nothing about `next dev`.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(".next/server/app/(workspace)/items/[id]");
const loadable = JSON.parse(readFileSync(resolve(dir, "page/react-loadable-manifest.json"), "utf8"));
const boardEntry = Object.entries(loadable).find(([key]) => key.includes("storm-board")) ?? Object.entries(loadable)[0];
if (!boardEntry) throw new Error("No next/dynamic entry found for the item page; has the board loader moved?");
// The loader's own files; the shared ones also serve other code, so only the board-specific file matters.
const boardFiles = new Set(boardEntry[1].files.map((f) => `/_next/${f}`));

globalThis.__RSC_MANIFEST = {};
await import(`file://${resolve(dir, "page_client-reference-manifest.js").replaceAll("\\", "/")}`);
const manifest = Object.values(globalThis.__RSC_MANIFEST)[0];
const eager = new Set(Object.values(manifest.clientModules).flatMap((m) => m.chunks));

// A chunk used only by the board appears in no client module's list; shared ones (React, utils) do.
const sharedWithBoard = [...boardFiles].filter((f) => eager.has(f));
const boardOnly = [...boardFiles].filter((f) => !eager.has(f));
console.log("board loader files:", [...boardFiles].join(", "));
console.log("also loaded eagerly (shared):", sharedWithBoard.join(", ") || "none");
console.log("board-only (lazy):", boardOnly.join(", ") || "none");
if (boardOnly.length === 0) {
  console.error("FAIL: every board chunk is eagerly loaded on the item page.");
  process.exit(1);
}
console.log("OK: the board's own chunk is not in any client module's eager list.");
