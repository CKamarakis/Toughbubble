// @vitest-environment happy-dom
import type { JSONContent } from "@tiptap/core";
import { strFromU8, unzipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadNote: vi.fn(),
  getExportFiles: vi.fn(),
  toast: { loading: vi.fn(() => "t1"), dismiss: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock("@/lib/notes/actions", () => ({ loadNote: mocks.loadNote }));
vi.mock("@/lib/attachments/actions", () => ({ getExportFiles: mocks.getExportFiles }));
vi.mock("sonner", () => ({ toast: mocks.toast }));

const { exportNote } = await import("./export-note");

type Download = { name: string; blob: Blob };
let downloads: Download[];

const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });
const p = (value: string): JSONContent => ({ type: "paragraph", content: [{ type: "text", text: value }] });
const image = (attachmentId: string | null, copyOf: string | null = null): JSONContent => ({
  type: "image",
  attrs: { attachmentId, alt: null, copyOf },
});
const fileCard = (attachmentId: string, name: string): JSONContent => ({ type: "fileAttachment", attrs: { attachmentId, name } });
const note = (body: JSONContent) => mocks.loadNote.mockResolvedValue({ body, version: 5 });
const file = (id: string, name: string, mimeType = "image/png") => ({ id, name, mimeType, url: `https://storage.test/${id}` });

async function unzip(download: Download) {
  const files = unzipSync(new Uint8Array(await download.blob.arrayBuffer()));
  return Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, bytes]));
}

beforeEach(() => {
  downloads = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    downloads.push({ name: "", blob: blob as Blob });
    return `blob:${downloads.length}`;
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads[downloads.length - 1].name = this.download;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith("/broken")
        ? new Response(null, { status: 404 })
        : new Response(new Uint8Array([1, 2, 3, url.length % 256])),
    ),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("exportNote", () => {
  it("downloads a plain note as a .md file and leaves the note alone", async () => {
    note(doc(p("Hello")));
    await exportNote("n1", "Trip plan");

    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe("Trip plan.md");
    expect(await downloads[0].blob.text()).toBe("Hello\n");
    expect(mocks.getExportFiles).not.toHaveBeenCalled();
    expect(mocks.toast.loading).toHaveBeenCalledWith("Preparing…");
    expect(mocks.toast.dismiss).toHaveBeenCalledWith("t1");
  });

  it("names a note with an empty title Untitled", async () => {
    note(doc(p("x")));
    await exportNote("n1", "  ");
    expect(downloads[0].name).toBe("Untitled.md");
  });

  it("zips a note with an image and a file, linking both from assets/", async () => {
    note(doc(p("Intro"), image("i1"), fileCard("f1", "tickets.pdf")));
    mocks.getExportFiles.mockResolvedValue([file("i1", "map.png"), file("f1", "tickets.pdf", "application/pdf")]);
    await exportNote("n1", "Trip plan");

    expect(mocks.getExportFiles).toHaveBeenCalledWith("n1", ["i1", "f1"]);
    expect(downloads[0].name).toBe("Trip plan.zip");
    const files = await unzip(downloads[0]);
    expect(Object.keys(files).sort()).toEqual(["Trip plan.md", "assets/map.png", "assets/tickets.pdf"]);
    expect(strFromU8(files["Trip plan.md"])).toBe("Intro\n\n![map.png](assets/map.png)\n\n[tickets.pdf](assets/tickets.pdf)\n");
    expect(mocks.toast.warning).not.toHaveBeenCalled();
  });

  it("zips a note that holds only a file", async () => {
    note(doc(fileCard("f1", "sheet.xlsx")));
    mocks.getExportFiles.mockResolvedValue([file("f1", "sheet.xlsx", "application/vnd.ms-excel")]);
    await exportNote("n1", "Budget");
    expect(Object.keys(await unzip(downloads[0])).sort()).toEqual(["Budget.md", "assets/sheet.xlsx"]);
  });

  it("gives two images with the same name their own files", async () => {
    note(doc(image("i1"), image("i2")));
    mocks.getExportFiles.mockResolvedValue([file("i1", "photo.png"), file("i2", "photo.png")]);
    await exportNote("n1", "Photos");
    const files = await unzip(downloads[0]);
    expect(strFromU8(files["Photos.md"])).toBe("![photo.png](assets/photo.png)\n\n![photo-2.png](assets/photo-2.png)\n");
    expect(files["assets/photo-2.png"]).toBeDefined();
  });

  it("still exports when a file fails, naming it in place and warning", async () => {
    note(doc(image("i1"), image("broken")));
    mocks.getExportFiles.mockResolvedValue([file("i1", "map.png"), { ...file("broken", "lost.png"), url: "https://storage.test/broken" }]);
    await exportNote("n1", "Trip");

    const files = await unzip(downloads[0]);
    expect(Object.keys(files).sort()).toEqual(["Trip.md", "assets/map.png"]);
    expect(strFromU8(files["Trip.md"])).toBe("![map.png](assets/map.png)\n\n> Missing file: lost.png\n");
    expect(mocks.toast.warning).toHaveBeenCalledWith("1 file couldn't be included.");
  });

  it("counts an image still being copied as missing", async () => {
    note(doc(image(null, "src"), p("after")));
    await exportNote("n1", "Copy");

    expect(mocks.getExportFiles).not.toHaveBeenCalled();
    expect(downloads[0].name).toBe("Copy.zip");
    expect(strFromU8((await unzip(downloads[0]))["Copy.md"])).toBe("> Missing file: image\n\nafter\n");
    expect(mocks.toast.warning).toHaveBeenCalledWith("1 file couldn't be included.");
  });

  it("downloads nothing and says so when the note can't be loaded", async () => {
    mocks.loadNote.mockResolvedValue(null);
    await exportNote("n1", "Gone");
    expect(downloads).toHaveLength(0);
    expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining("Couldn't export the note"), { id: "t1" });

    mocks.loadNote.mockRejectedValue(new Error("offline"));
    await exportNote("n1", "Gone");
    expect(downloads).toHaveLength(0);
  });

  it("ignores a second export of the same note while one is preparing", async () => {
    let resolve!: (value: unknown) => void;
    mocks.loadNote.mockReturnValue(new Promise((r) => (resolve = r)));
    const first = exportNote("n1", "Once");
    await exportNote("n1", "Once");
    resolve({ body: doc(p("x")), version: 1 });
    await first;

    expect(mocks.loadNote).toHaveBeenCalledTimes(1);
    expect(downloads).toHaveLength(1);

    note(doc(p("again")));
    await exportNote("n1", "Once");
    expect(downloads).toHaveLength(2);
  });
});
