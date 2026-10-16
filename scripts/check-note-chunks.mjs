// Notes don't load the board (storms-canvas D12): after `next build`, none of the
// Storm board's chunks may appear in the item page's eager client-module lists
// (what a note page downloads). The board is reachable only through its
// next/dynamic loader. If a chunk is ever legitimately shared with other client
// code, this fails loudly and the check should be refined, not loosened.
// Production build only: the dev server lists the page's async chunks up front
// (a Turbopack dev behaviour), so this says nothing about `next dev`.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(".next/server/app/(workspace)/items/[id]");
const loadable = JSON.parse(readFileSync(resolve(dir, "page/react-loadable-manifest.json"), "utf8"));
globalThis.__RSC_MANIFEST = {};
await import(`file://${resolve(dir, "page_client-reference-manifest.js").replaceAll("\\", "/")}`);
const manifest = Object.values(globalThis.__RSC_MANIFEST)[0];

// Production keys are numeric module ids, so find the board by its code:
// "gesturestart" (Safari pinch handling in the engine) is only in the board's chunks.
const MARKER = "gesturestart";
const has = (url) => readFileSync(resolve(".next", url.replace("/_next/", "")), "utf8").includes(MARKER);

// 1. No chunk a client module loads eagerly may contain the board's code.
const leaks = new Set();
for (const [module, { chunks }] of Object.entries(manifest.clientModules)) {
  for (const f of chunks) if (f.endsWith(".js") && has(f)) leaks.add(`${f} in ${module}`);
}
if (leaks.size) {
  console.error("FAIL: board code is eagerly loaded on the item page:\n  " + [...leaks].join("\n  "));
  process.exit(1);
}

// 2. The board must still be a lazy entry (guards against the check going blind if the loader is renamed).
const keys = Object.keys(loadable).filter((k) => loadable[k].files.some((f) => has(`/_next/${f}`)));
if (keys.length !== 1) {
  throw new Error(`Expected exactly one next/dynamic entry whose chunks contain "${MARKER}", found ${keys.length} (entries: ${Object.keys(loadable).join(", ") || "none"}). Has the board loader moved, or the marker changed?`);
}
const boardFiles = loadable[keys[0]].files;

// 3. None of that entry's files, marker or not, may be in any client module's eager list.
// (If one is ever legitimately shared with other client code, refine this check, don't loosen it.)
const eager = new Set(Object.values(manifest.clientModules).flatMap((m) => m.chunks));
const shared = boardFiles.filter((f) => eager.has(`/_next/${f}`));
if (shared.length) {
  console.error("FAIL: board loader chunks are eagerly loaded on the item page:\n  " + shared.join("\n  "));
  process.exit(1);
}
console.log("board chunks (lazy):", boardFiles.join(", "));
console.log("OK: no board chunk is in any client module's eager list.");
