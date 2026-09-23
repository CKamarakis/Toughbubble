import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAttachmentLinks = vi.fn();
vi.mock("@/lib/attachments/actions", () => ({ getAttachmentLinks: (...args: unknown[]) => getAttachmentLinks(...args) }));

const { AttachmentStore, LINK_REFRESH_MS } = await import("./store");

const flush = () => vi.advanceTimersByTimeAsync(1);

describe("AttachmentStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getAttachmentLinks.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("starts with the page's links and asks for unknown ids in one batch", async () => {
    const store = new AttachmentStore("note", { a: "https://a1" });
    expect(store.status("a", null)).toEqual({ kind: "ready", url: "https://a1" });
    getAttachmentLinks.mockResolvedValue({ b: "https://b1" });
    store.ensure("a");
    store.ensure("b");
    store.ensure("c");
    expect(store.status("b", null)).toEqual({ kind: "loading" });
    await flush();
    expect(getAttachmentLinks).toHaveBeenCalledTimes(1);
    expect(getAttachmentLinks).toHaveBeenCalledWith("note", ["b", "c"]);
    expect(store.status("b", null)).toEqual({ kind: "ready", url: "https://b1" });
    // No link for c: an upload that never finished.
    expect(store.status("c", null)).toEqual({ kind: "unavailable" });
  });

  it("refreshes links before they expire", async () => {
    const store = new AttachmentStore("note", { a: "https://a1" });
    const stop = store.start();
    getAttachmentLinks.mockResolvedValue({ a: "https://a2" });
    await vi.advanceTimersByTimeAsync(LINK_REFRESH_MS - 60_000);
    expect(getAttachmentLinks).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    await flush();
    expect(getAttachmentLinks).toHaveBeenCalledWith("note", ["a"]);
    expect(store.status("a", null)).toEqual({ kind: "ready", url: "https://a2" });
    stop();
  });

  it("asks again after a load error, at most once a minute", async () => {
    const store = new AttachmentStore("note", { a: "https://a1" });
    getAttachmentLinks.mockResolvedValue({ a: "https://a2" });
    store.refresh("a"); // just issued: ignored
    await flush();
    expect(getAttachmentLinks).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(61_000);
    store.refresh("a");
    await flush();
    expect(store.status("a", null)).toEqual({ kind: "ready", url: "https://a2" });
  });

  it("keeps known links when the request fails", async () => {
    const store = new AttachmentStore("note", {});
    getAttachmentLinks.mockRejectedValue(new Error("offline"));
    store.ensure("a");
    await flush();
    expect(store.status("a", null)).toEqual({ kind: "loading" });
  });

  it("reports uploads, failures, and copies", () => {
    const store = new AttachmentStore("note", {});
    const retry = () => {};
    store.setUpload("u", { phase: "uploading", preview: "blob:x" });
    expect(store.status("u", null)).toEqual({ kind: "uploading", preview: "blob:x" });
    expect(store.uploading).toBe(1);
    expect(store.owns("u")).toBe(true);
    store.setUpload("u", { phase: "failed", retry });
    expect(store.status("u", null)).toEqual({ kind: "failed", preview: undefined, retry });
    expect(store.uploading).toBe(0);

    store.setCopying(["src"], true);
    expect(store.status(null, "src")).toEqual({ kind: "copying" });
    store.setCopying(["src"], false);
    expect(store.status(null, "src")).toEqual({ kind: "copy-failed" });
  });
});
