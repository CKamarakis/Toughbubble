"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { getAttachmentLinks } from "@/lib/attachments/actions";

// Per-note client state for attachments (attachments design D5, D7): signed
// links by attachment id, uploads in flight or failed, and copies from other
// notes in flight or failed. Node views read it; nothing here is saved.

/** Links are asked for again after 50 minutes (they expire after 60). */
export const LINK_REFRESH_MS = 50 * 60 * 1000;

export type UploadState =
  | { phase: "uploading"; preview?: string }
  | { phase: "failed"; preview?: string; retry: () => void };

export type AttachmentStatus =
  | { kind: "ready"; url: string }
  | { kind: "loading" }
  | { kind: "uploading"; preview?: string }
  | { kind: "failed"; preview?: string; retry: () => void }
  | { kind: "copying" }
  | { kind: "copy-failed" }
  | { kind: "unavailable" };

export class AttachmentStore {
  private links = new Map<string, { url: string; at: number }>();
  private unavailable = new Set<string>();
  private uploads = new Map<string, UploadState>();
  private copying = new Set<string>();
  private queued = new Set<string>();
  private inFlight = new Set<string>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private previews = new Set<string>();
  private listeners = new Set<() => void>();
  private version = 0;

  constructor(
    readonly itemId: string,
    initialLinks: Record<string, string>,
  ) {
    const now = Date.now();
    for (const [id, url] of Object.entries(initialLinks)) this.links.set(id, { url, at: now });
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getVersion = () => this.version;
  private changed() {
    this.version++;
    for (const l of this.listeners) l();
  }

  /** Starts refreshing links before they expire. Returns a cleanup that also frees previews. */
  start() {
    this.refreshTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, { at }] of this.links) if (now - at > LINK_REFRESH_MS) this.request(id);
    }, 60_000);
    return () => {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      if (this.flushTimer) clearTimeout(this.flushTimer);
      for (const url of this.previews) URL.revokeObjectURL(url);
    };
  }

  /** Whether this note is known to own the attachment (ready here or uploaded from this tab). */
  owns(id: string) {
    return this.links.has(id) || this.uploads.has(id);
  }

  status(attachmentId: string | null, copyOf: string | null): AttachmentStatus {
    if (!attachmentId) {
      if (copyOf && this.copying.has(copyOf)) return { kind: "copying" };
      return { kind: "copy-failed" };
    }
    const upload = this.uploads.get(attachmentId);
    if (upload) return upload.phase === "uploading" ? { kind: "uploading", preview: upload.preview } : { kind: "failed", preview: upload.preview, retry: upload.retry };
    const link = this.links.get(attachmentId);
    if (link) return { kind: "ready", url: link.url };
    if (this.unavailable.has(attachmentId)) return { kind: "unavailable" };
    return { kind: "loading" };
  }

  /** Asks for a link when none is known yet (called from node views). */
  ensure(id: string) {
    if (!this.links.has(id) && !this.uploads.has(id) && !this.unavailable.has(id)) this.request(id);
  }

  /** Asks for a new link, e.g. after an image failed to load. At most once a minute per id. */
  refresh(id: string) {
    const link = this.links.get(id);
    if (!link || Date.now() - link.at > 60_000) this.request(id);
  }

  /** A link at least 10 minutes from expiring, for opening in a new tab. */
  async freshLink(id: string): Promise<string | null> {
    const link = this.links.get(id);
    if (link && Date.now() - link.at < LINK_REFRESH_MS) return link.url;
    const links = await getAttachmentLinks(this.itemId, [id]).catch(() => ({}) as Record<string, string>);
    if (links[id]) this.setLink(id, links[id]);
    return links[id] ?? null;
  }

  private request(id: string) {
    if (this.inFlight.has(id)) return;
    this.queued.add(id);
    this.flushTimer ??= setTimeout(() => void this.flush(), 0);
  }

  private async flush() {
    this.flushTimer = null;
    const ids = [...this.queued];
    this.queued.clear();
    ids.forEach((id) => this.inFlight.add(id));
    const links = await getAttachmentLinks(this.itemId, ids).catch(() => null);
    ids.forEach((id) => this.inFlight.delete(id));
    if (!links) return; // network trouble: keep what we have; a later render asks again
    const now = Date.now();
    for (const id of ids) {
      if (links[id]) {
        this.links.set(id, { url: links[id], at: now });
        this.unavailable.delete(id);
      } else if (!this.links.has(id) && !this.uploads.has(id)) {
        // Not a ready attachment of this note (an upload that never finished).
        this.unavailable.add(id);
      }
    }
    this.changed();
  }

  setLink(id: string, url: string) {
    this.links.set(id, { url, at: Date.now() });
    this.unavailable.delete(id);
    this.changed();
  }

  setUpload(id: string, state: UploadState | null) {
    if (state) {
      this.uploads.set(id, state);
      if (state.preview) this.previews.add(state.preview);
    } else {
      this.uploads.delete(id);
    }
    this.changed();
  }

  get uploading() {
    let n = 0;
    for (const u of this.uploads.values()) if (u.phase === "uploading") n++;
    return n;
  }

  /** Marks copies from other notes as in flight, or done (a node still pointing at its source then shows as failed). */
  setCopying(sourceIds: string[], inFlight: boolean) {
    for (const id of sourceIds) {
      if (inFlight) this.copying.add(id);
      else this.copying.delete(id);
    }
    this.changed();
  }
}

export const AttachmentStoreContext = createContext<AttachmentStore | null>(null);

/** The note's attachment store; re-renders the caller when it changes. */
export function useAttachmentStore() {
  const store = useContext(AttachmentStoreContext);
  if (!store) throw new Error("useAttachmentStore outside AttachmentStoreContext");
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  return store;
}
