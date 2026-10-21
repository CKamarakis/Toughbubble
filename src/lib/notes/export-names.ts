import { cleanFileName } from "@/lib/attachments/rules";

// File names for an exported note and its attachments (export-note-markdown D5).

const MAX_EXPORT_NAME = 100;
const UNSAFE = /[\u0000-\u001f\u007f\\/:*?"<>|]/g;

/** Removes characters file systems can't hold, and trailing dots and spaces (Windows drops them). */
const safe = (name: string) => name.replace(UNSAFE, "").trim().replace(/[. ]+$/, "");

/** The download's base name (no extension) from the note title; "Untitled" when nothing is left. */
export function exportName(title: string): string {
  const name = [...safe(title)].slice(0, MAX_EXPORT_NAME).join("").trim();
  return name || "Untitled";
}

/**
 * Gives each attachment a unique name inside assets/. A name already taken
 * (ignoring case, as Windows and macOS do) gets -2, -3 … before its extension.
 */
export function assetNamer(): (name: string) => string {
  const taken = new Set<string>();
  return (raw) => {
    const name = safe(cleanFileName(raw)) || "file";
    const dot = name.lastIndexOf(".");
    const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
    let candidate = name;
    for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${stem}-${n}${ext}`;
    taken.add(candidate.toLowerCase());
    return candidate;
  };
}
