import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser, storageAdmin, type TestUser } from "./harness";

// Storage RLS on the "attachments" bucket (attachments design D1): owner-only
// read, upload, and delete under <owner_id>/…; no replacing; 5 MB limit.

let user: TestUser;
let other: TestUser;
const created: string[] = [];

beforeAll(async () => {
  [user, other] = await Promise.all([createTestUser(), createTestUser()]);
});

afterAll(async () => {
  if (created.length) await storageAdmin().remove(created);
  await Promise.all([user, other].filter(Boolean).map(deleteTestUser));
});

const bucket = async (u: TestUser) => (await u.client()).storage.from("attachments");
const pathFor = (u: TestUser) => `${u.id}/${randomUUID()}/${randomUUID()}`;
const bytes = (n: number, fill = 1) => new Blob([new Uint8Array(n).fill(fill)], { type: "application/octet-stream" });

async function upload(u: TestUser, path: string, body: Blob, upsert = false) {
  const result = await (await bucket(u)).upload(path, body, { upsert });
  if (!result.error) created.push(path);
  return result;
}

describe("attachments bucket", () => {
  it("lets a user upload, read, list, and delete under their own folder", async () => {
    const path = pathFor(user);
    expect((await upload(user, path, bytes(10))).error).toBeNull();

    const own = await bucket(user);
    const read = await own.download(path);
    expect(read.error).toBeNull();
    expect(read.data?.size).toBe(10);

    const folder = path.split("/").slice(0, 2).join("/");
    expect((await own.list(folder)).data?.map((f) => f.name)).toEqual([path.split("/")[2]]);

    expect((await own.remove([path])).error).toBeNull();
    expect((await own.download(path)).error).not.toBeNull();
  });

  it("hides another user's files from reading, listing, and link signing", async () => {
    const path = pathFor(user);
    await upload(user, path, bytes(10));
    const theirs = await bucket(other);

    expect((await theirs.download(path)).error).not.toBeNull();
    expect((await theirs.createSignedUrl(path, 60)).error).not.toBeNull();
    const folder = path.split("/").slice(0, 2).join("/");
    expect((await theirs.list(folder)).data ?? []).toEqual([]);
  });

  it("does not let another user delete or overwrite a file", async () => {
    const path = pathFor(user);
    await upload(user, path, bytes(10, 1));
    const theirs = await bucket(other);

    await theirs.remove([path]); // silently removes nothing
    expect((await theirs.upload(path, bytes(10, 2), { upsert: true })).error).not.toBeNull();

    const read = await (await bucket(user)).download(path);
    expect(read.error).toBeNull();
    expect(new Uint8Array(await read.data!.arrayBuffer())[0]).toBe(1);
  });

  it("does not let a user write into another user's folder", async () => {
    const path = pathFor(user); // user's folder, uploaded by other
    expect((await upload(other, path, bytes(10))).error).not.toBeNull();
  });

  it("does not let the owner replace a stored file", async () => {
    const path = pathFor(user);
    await upload(user, path, bytes(10, 1));
    expect((await (await bucket(user)).upload(path, bytes(10, 2))).error).not.toBeNull();
    expect((await (await bucket(user)).upload(path, bytes(10, 2), { upsert: true })).error).not.toBeNull();
    const read = await (await bucket(user)).download(path);
    expect(new Uint8Array(await read.data!.arrayBuffer())[0]).toBe(1);
  });

  it("refuses a file over 5 MB", async () => {
    const result = await upload(user, pathFor(user), bytes(5 * 1024 * 1024 + 1));
    expect(result.error).not.toBeNull();
  });
});
