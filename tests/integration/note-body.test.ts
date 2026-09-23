import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { items } from "@/db/schema";
import type { UserTx } from "@/db/rls";
import * as notes from "@/lib/notes/operations";
import * as tree from "@/lib/tree/operations";
import { createTestUser, deleteTestUser, type TestUser } from "./harness";

let user: TestUser;
let other: TestUser;

beforeAll(async () => {
  [user, other] = await Promise.all([createTestUser(), createTestUser()]);
});

afterAll(async () => {
  await Promise.all([user, other].filter(Boolean).map(deleteTestUser));
});

const doc = (t: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] });
const editedAt = (tx: UserTx, id: string) =>
  tx
    .select({ editedAt: items.editedAt })
    .from(items)
    .where(eq(items.id, id))
    .then((r) => r[0].editedAt.getTime());
const pause = () => new Promise((r) => setTimeout(r, 25));

describe("versioned note saves", () => {
  it("reads an unsaved note as an empty document at version 0", async () => {
    const id = await user.run((tx) => tree.createItem(tx, "note", null));
    const body = await user.run((tx) => notes.getNoteBody(tx, id));
    expect(body?.version).toBe(0);
    expect(body?.body.type).toBe("doc");
    expect(await user.run((tx) => notes.getNoteVersion(tx, id))).toBe(0);
  });

  it("first save stores version 1, the next increments, and the body reads back", async () => {
    const id = await user.run((tx) => tree.createItem(tx, "note", null));
    expect(await user.run((tx) => notes.saveNoteBody(tx, id, doc("one"), 0))).toMatchObject({ status: "saved", version: 1 });
    expect(await user.run((tx) => notes.saveNoteBody(tx, id, doc("two"), 1))).toMatchObject({ status: "saved", version: 2 });
    const body = await user.run((tx) => notes.getNoteBody(tx, id));
    expect(body).toEqual({ body: doc("two"), version: 2 });
  });

  it("refuses a stale save, changes nothing, and reports the stored version", async () => {
    const id = await user.run((tx) => tree.createItem(tx, "note", null));
    await user.run((tx) => notes.saveNoteBody(tx, id, doc("a"), 0));
    await user.run((tx) => notes.saveNoteBody(tx, id, doc("b"), 1));
    const before = await user.run((tx) => editedAt(tx, id));
    const stale = await user.run((tx) => notes.saveNoteBody(tx, id, doc("stale"), 1));
    expect(stale).toEqual({ status: "conflict", storedVersion: 2 });
    expect(await user.run((tx) => notes.getNoteBody(tx, id))).toEqual({ body: doc("b"), version: 2 });
    expect(await user.run((tx) => editedAt(tx, id))).toBe(before);
    // A second "first save" is a conflict too.
    expect(await user.run((tx) => notes.saveNoteBody(tx, id, doc("again"), 0))).toEqual({
      status: "conflict",
      storedVersion: 2,
    });
  });

  it("'Keep mine' succeeds when re-saved on the reported version", async () => {
    const id = await user.run((tx) => tree.createItem(tx, "note", null));
    await user.run((tx) => notes.saveNoteBody(tx, id, doc("tab A"), 0));
    const conflict = await user.run((tx) => notes.saveNoteBody(tx, id, doc("tab B"), 0));
    expect(conflict.status).toBe("conflict");
    const stored = conflict.status === "conflict" ? conflict.storedVersion : -1;
    expect(await user.run((tx) => notes.saveNoteBody(tx, id, doc("tab B"), stored))).toMatchObject({ version: 2 });
    expect((await user.run((tx) => notes.getNoteBody(tx, id)))?.body).toEqual(doc("tab B"));
  });

  it("updates edited_at on a save and returns it", async () => {
    const id = await user.run((tx) => tree.createItem(tx, "note", null));
    const before = await user.run((tx) => editedAt(tx, id));
    await pause();
    const result = await user.run((tx) => notes.saveNoteBody(tx, id, doc("x"), 0));
    const after = await user.run((tx) => editedAt(tx, id));
    expect(after).toBeGreaterThan(before);
    expect(result.status === "saved" && new Date(result.editedAt).getTime()).toBe(after);
  });
});

describe("saves only for the owner's active notes", () => {
  it("rejects projects, folders, and Storms", async () => {
    for (const kind of ["project", "folder", "storm"] as const) {
      const id = await user.run((tx) => tree.createItem(tx, kind, null));
      expect(await user.run((tx) => notes.saveNoteBody(tx, id, doc("x"), 0))).toEqual({ status: "not-found" });
      expect(await user.run((tx) => notes.getNoteBody(tx, id))).toBeNull();
    }
  });

  it("rejects archived and trashed notes", async () => {
    const archived = await user.run((tx) => tree.createItem(tx, "note", null));
    const trashed = await user.run((tx) => tree.createItem(tx, "note", null));
    await user.run((tx) => tree.archiveItem(tx, archived));
    await user.run((tx) => tree.trashItem(tx, trashed));
    for (const id of [archived, trashed]) {
      expect(await user.run((tx) => notes.saveNoteBody(tx, id, doc("x"), 0))).toEqual({ status: "not-found" });
      expect(await user.run((tx) => notes.getNoteVersion(tx, id))).toBeNull();
    }
  });

  it("another user can neither read nor save someone's note", async () => {
    const id = await user.run((tx) => tree.createItem(tx, "note", null));
    await user.run((tx) => notes.saveNoteBody(tx, id, doc("private"), 0));
    expect(await other.run((tx) => notes.getNoteBody(tx, id))).toBeNull();
    expect(await other.run((tx) => notes.saveNoteBody(tx, id, doc("hijack"), 1))).toEqual({ status: "not-found" });
    expect((await user.run((tx) => notes.getNoteBody(tx, id)))?.body).toEqual(doc("private"));
  });
});
