import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attachments } from "@/db/schema";
import * as ops from "@/lib/attachments/operations";
import * as notes from "@/lib/notes/operations";
import { MAX_ATTACHMENT_BYTES } from "@/lib/attachments/rules";
import * as tree from "@/lib/tree/operations";
import { createTestUser, deleteTestUser, storageAdmin, type TestUser } from "./harness";

let user: TestUser;
let other: TestUser;
const stored: string[] = [];

beforeAll(async () => {
  [user, other] = await Promise.all([createTestUser(), createTestUser()]);
});

afterAll(async () => {
  if (stored.length) await storageAdmin().remove(stored);
  await Promise.all([user, other].filter(Boolean).map(deleteTestUser));
});

const bucketOf = async (u: TestUser) => (await u.client()).storage.from("attachments");
const newNote = (u: TestUser) => u.run((tx) => tree.createItem(tx, "note", null));
const meta = (over: Partial<ops.AttachmentMeta> = {}): ops.AttachmentMeta => ({
  name: "photo.png",
  type: "image/png",
  size: 4,
  width: 2,
  height: 2,
  ...over,
});
const row = (u: TestUser, id: string) =>
  u.run((tx) => tx.select().from(attachments).where(eq(attachments.id, id))).then((r) => r[0]);

/** Starts, uploads, and finishes an attachment; returns its id and path. */
async function attach(u: TestUser, noteId: string, bytes = new Uint8Array([1, 2, 3, 4])) {
  const started = await u.run((tx) => ops.startAttachment(tx, noteId, meta({ size: bytes.length })));
  if (started.status !== "started") throw new Error(started.status);
  const up = await (await bucketOf(u)).upload(started.path, new Blob([bytes]), { contentType: "image/png" });
  if (up.error) throw up.error;
  stored.push(started.path);
  const bucket = await bucketOf(u);
  const finished = await u.run((tx) => ops.finishAttachment(tx, bucket, started.id));
  expect(finished.status).toBe("ready");
  return started;
}

describe("starting and finishing uploads", () => {
  it("records a pending upload under the owner's folder, then marks it ready with the stored size", async () => {
    const noteId = await newNote(user);
    const started = await user.run((tx) => ops.startAttachment(tx, noteId, meta({ size: 999 })));
    expect(started.status).toBe("started");
    if (started.status !== "started") return;
    expect(started.path).toBe(`${user.id}/${noteId}/${started.id}`);
    expect(await row(user, started.id)).toMatchObject({ status: "pending", itemId: noteId, width: 2, height: 2 });

    const bucket = await bucketOf(user);
    await bucket.upload(started.path, new Blob([new Uint8Array(4)]), { contentType: "image/png" });
    stored.push(started.path);
    const finished = await user.run((tx) => ops.finishAttachment(tx, bucket, started.id));
    expect(finished.status).toBe("ready");
    if (finished.status === "ready") expect(finished.link).toMatch(/^https:\/\//);
    expect(await row(user, started.id)).toMatchObject({ status: "ready", sizeBytes: 4 });
  });

  it("does not mark an upload ready while its file is missing", async () => {
    const noteId = await newNote(user);
    const started = await user.run((tx) => ops.startAttachment(tx, noteId, meta()));
    if (started.status !== "started") throw new Error(started.status);
    const bucket = await bucketOf(user);
    expect(await user.run((tx) => ops.finishAttachment(tx, bucket, started.id))).toEqual({ status: "missing" });
    expect((await row(user, started.id)).status).toBe("pending");
  });

  it("cleans the name and ignores dimensions for non-image files", async () => {
    const noteId = await newNote(user);
    const started = await user.run((tx) =>
      ops.startAttachment(tx, noteId, meta({ name: " re\u0007port.pdf ", type: "application/pdf" })),
    );
    if (started.status !== "started") throw new Error(started.status);
    expect(await row(user, started.id)).toMatchObject({ name: "report.pdf", mimeType: "application/pdf", width: null });
  });

  it("refuses files over 5 MB", async () => {
    const noteId = await newNote(user);
    expect(await user.run((tx) => ops.startAttachment(tx, noteId, meta({ size: MAX_ATTACHMENT_BYTES + 1 })))).toEqual({
      status: "too-large",
    });
  });

  it("refuses projects, folders, archived and trashed notes, and another user's note", async () => {
    const project = await user.run((tx) => tree.createItem(tx, "project", null));
    const folder = await user.run((tx) => tree.createItem(tx, "folder", null));
    const archived = await newNote(user);
    await user.run((tx) => tree.archiveItem(tx, archived));
    const trashed = await newNote(user);
    await user.run((tx) => tree.trashItem(tx, trashed));
    const theirs = await newNote(other);

    for (const id of [project, folder, archived, trashed, theirs]) {
      expect(await user.run((tx) => ops.startAttachment(tx, id, meta()))).toEqual({ status: "not-found" });
    }
  });

  it("does not let another user finish someone else's upload", async () => {
    const noteId = await newNote(user);
    const started = await user.run((tx) => ops.startAttachment(tx, noteId, meta()));
    if (started.status !== "started") throw new Error(started.status);
    const theirBucket = await bucketOf(other);
    expect(await other.run((tx) => ops.finishAttachment(tx, theirBucket, started.id))).toEqual({ status: "not-found" });
  });
});


describe("signed links", () => {
  it("issues links only for the note's own ready attachments", async () => {
    const noteId = await newNote(user);
    const ready = await attach(user, noteId);
    const pending = await user.run((tx) => ops.startAttachment(tx, noteId, meta()));
    const elsewhere = await attach(user, await newNote(user));
    if (pending.status !== "started") throw new Error(pending.status);
    const bucket = await bucketOf(user);

    const all = await user.run((tx) => ops.getAttachmentLinks(tx, bucket, noteId));
    expect(Object.keys(all)).toEqual([ready.id]);

    const asked = await user.run((tx) => ops.getAttachmentLinks(tx, bucket, noteId, [ready.id, pending.id, elsewhere.id]));
    expect(Object.keys(asked)).toEqual([ready.id]);

    const res = await fetch(asked[ready.id]);
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("issues no links for another user's note or attachment", async () => {
    const noteId = await newNote(user);
    const ready = await attach(user, noteId);
    const theirBucket = await bucketOf(other);
    expect(await other.run((tx) => ops.getAttachmentLinks(tx, theirBucket, noteId, [ready.id]))).toEqual({});
    expect(await other.run((tx) => ops.getDownloadLink(tx, theirBucket, ready.id))).toBeNull();
  });

  it("issues download links under the original name", async () => {
    const noteId = await newNote(user);
    const ready = await attach(user, noteId);
    const link = await user.run(async (tx) => ops.getDownloadLink(tx, await bucketOf(user), ready.id));
    expect(link).not.toBeNull();
    const res = await fetch(link!);
    expect(res.headers.get("content-disposition")).toContain("photo.png");
  });

  it("issues no links for a trashed note", async () => {
    const noteId = await newNote(user);
    await attach(user, noteId);
    await user.run((tx) => tree.trashItem(tx, noteId));
    const bucket = await bucketOf(user);
    expect(await user.run((tx) => ops.getAttachmentLinks(tx, bucket, noteId))).toEqual({});
  });
});

describe("copying attachments between notes", () => {
  it("copies into the target note, and the copy survives deleting the source forever", async () => {
    const source = await newNote(user);
    const target = await newNote(user);
    const original = await attach(user, source);
    const bucket = await bucketOf(user);

    const copied = await user.run((tx) => ops.copyAttachments(tx, bucket, target, [original.id]));
    const newId = copied?.[original.id];
    expect(newId).toBeDefined();
    expect(newId).not.toBe(original.id);
    stored.push(`${user.id}/${target}/${newId}`);
    expect(await row(user, newId!)).toMatchObject({ itemId: target, status: "ready", name: "photo.png" });

    await user.run((tx) => tree.trashItem(tx, source));
    await user.run((tx) => tree.deleteForever(tx, source));

    const links = await user.run((tx) => ops.getAttachmentLinks(tx, bucket, target));
    const res = await fetch(links[newId!]);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("maps attachments already on the target note to themselves", async () => {
    const noteId = await newNote(user);
    const own = await attach(user, noteId);
    const bucket = await bucketOf(user);
    expect(await user.run((tx) => ops.copyAttachments(tx, bucket, noteId, [own.id]))).toEqual({ [own.id]: own.id });
  });

  it("does not copy another user's attachment", async () => {
    const theirs = await attach(other, await newNote(other));
    const mine = await newNote(user);
    const bucket = await bucketOf(user);
    expect(await user.run((tx) => ops.copyAttachments(tx, bucket, mine, [theirs.id]))).toEqual({});
  });
});

describe("deleting forever", () => {
  it("removes the rows and stored files of every note inside a deleted folder", async () => {
    const folder = await user.run((tx) => tree.createItem(tx, "folder", null));
    const noteA = await user.run((tx) => tree.createItem(tx, "note", folder));
    const noteB = await user.run((tx) => tree.createItem(tx, "note", folder));
    const a = await attach(user, noteA);
    const b = await attach(user, noteB);
    const kept = await attach(user, await newNote(user));

    // What the deleteForever action does.
    await user.run((tx) => tree.trashItem(tx, folder));
    const paths = await user.run(async (tx) => {
      const found = await ops.attachmentPathsUnder(tx, folder);
      expect(await tree.deleteForever(tx, folder)).toBe(true);
      return found;
    });
    expect(paths.sort()).toEqual([a.path, b.path].sort());
    expect(await ops.removeStoredFiles(await bucketOf(user), paths)).toBe(true);

    expect(await row(user, a.id)).toBeUndefined();
    expect(await row(user, b.id)).toBeUndefined();
    const admin = storageAdmin();
    expect((await admin.download(a.path)).error).not.toBeNull();
    expect((await admin.download(b.path)).error).not.toBeNull();
    expect((await admin.download(kept.path)).error).toBeNull();
  });

  it("reports a failed remove without throwing", async () => {
    const failing = { remove: async () => ({ data: null, error: new Error("network down") }) } as unknown as ops.Bucket;
    expect(await ops.removeStoredFiles(failing, ["x/y/z"])).toBe(false);
    const throwing = {
      remove: async () => {
        throw new Error("offline");
      },
    } as unknown as ops.Bucket;
    expect(await ops.removeStoredFiles(throwing, ["x/y/z"])).toBe(false);
  });
});

describe("saving bodies that refer to attachments", () => {
  const body = (id: string) => ({
    type: "doc",
    content: [{ type: "image", attrs: { attachmentId: id, copyOf: null, alt: null, width: null, align: "left" } }],
  });

  it("saves a body naming the note's own attachment, pending or ready", async () => {
    const noteId = await newNote(user);
    const ready = await attach(user, noteId);
    const pending = await user.run((tx) => ops.startAttachment(tx, noteId, meta()));
    if (pending.status !== "started") throw new Error(pending.status);
    expect(await user.run((tx) => notes.saveNoteBody(tx, noteId, body(ready.id), 0))).toMatchObject({ status: "saved" });
    expect(await user.run((tx) => notes.saveNoteBody(tx, noteId, body(pending.id), 1))).toMatchObject({ status: "saved" });
  });

  it("rejects a body naming another note's attachment and stores nothing", async () => {
    const noteId = await newNote(user);
    const elsewhere = await attach(user, await newNote(user));
    const theirs = await attach(other, await newNote(other));
    for (const id of [elsewhere.id, theirs.id]) {
      expect(await user.run((tx) => notes.saveNoteBody(tx, noteId, body(id), 0))).toEqual({ status: "foreign-attachment" });
    }
    expect(await user.run((tx) => notes.getNoteBody(tx, noteId))).toMatchObject({ version: 0 });
  });
});
