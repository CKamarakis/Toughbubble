import { strToU8, zipSync, type Zippable } from "fflate";
import { toast } from "sonner";
import { getExportFiles } from "@/lib/attachments/actions";
import { loadNote } from "@/lib/notes/actions";
import { assetNamer, exportName } from "@/lib/notes/export-names";
import { attachmentIds, attachmentRefs, type ExportAssets, noteToMarkdown } from "@/lib/notes/markdown";

// Exports a note as Markdown in the browser (export-note-markdown D4): a .md
// when it has no attachments, else a .zip with the .md and an assets/ folder.
// Reads the saved note (D8), never changes it, and runs once per note at a
// time (D9).

const FETCHES_AT_ONCE = 4;
const running = new Set<string>();

/** Already-compressed files are stored as they are; only text-like files are deflated. */
const compressible = (mimeType: string) => /^text\/|json|xml|svg/.test(mimeType);

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking at once can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Runs `task` over `items`, a few at a time. */
async function inBatches<T>(items: T[], task: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += FETCHES_AT_ONCE) await Promise.all(items.slice(i, i + FETCHES_AT_ONCE).map(task));
}

export async function exportNote(itemId: string, title: string): Promise<void> {
  if (running.has(itemId)) return;
  running.add(itemId);
  const progress = toast.loading("Preparing…");
  try {
    const note = await loadNote(itemId).catch(() => null);
    if (!note) {
      toast.error("Couldn't export the note. Check your connection and try again.", { id: progress });
      return;
    }

    const name = exportName(title);
    const refs = attachmentRefs(note.body);
    if (refs.length === 0) {
      download(new Blob([noteToMarkdown(note.body)], { type: "text/markdown;charset=utf-8" }), `${name}.md`);
      toast.dismiss(progress);
      return;
    }

    const ids = attachmentIds(note.body);
    const files = (ids.length ? await getExportFiles(itemId, ids).catch(() => null) : []) ?? [];
    const fetched: (Uint8Array | null)[] = files.map(() => null);
    await inBatches(
      files.map((file, i) => ({ file, i })),
      async ({ file, i }) => {
        fetched[i] = await fetchBytes(file.url);
      },
    );

    // Names are given in body order, so the first of two "photo.png" keeps its name.
    const namer = assetNamer();
    const assets: ExportAssets = {};
    const entries: Zippable = {};
    const byId = new Map(files.map((file, i) => [file.id, { file, bytes: fetched[i] }]));
    for (const id of ids) {
      const found = byId.get(id);
      if (!found) continue; // not listed: the Markdown falls back to the node's own name
      if (!found.bytes) {
        assets[id] = { missing: found.file.name };
        continue;
      }
      const assetName = namer(found.file.name);
      entries[`assets/${assetName}`] = [found.bytes, { level: compressible(found.file.mimeType) ? 6 : 0 }];
      assets[id] = { path: `assets/${assetName}`, name: assetName };
    }
    entries[`${name}.md`] = strToU8(noteToMarkdown(note.body, assets));
    download(new Blob([zipSync(entries)], { type: "application/zip" }), `${name}.zip`);
    toast.dismiss(progress);

    const missing = refs.filter((id) => id === null || !assets[id] || "missing" in assets[id]).length;
    if (missing > 0) {
      toast.warning(missing === 1 ? "1 file couldn't be included." : `${missing} files couldn't be included.`);
    }
  } catch (error) {
    console.error("[export] unexpected error", { message: (error as Error)?.message });
    toast.error("Couldn't export the note. Try again.", { id: progress });
  } finally {
    running.delete(itemId);
  }
}
