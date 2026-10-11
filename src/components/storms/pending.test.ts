import { describe, expect, it } from "vitest";
import { changesBytes, type ChangeSet } from "@/lib/storms/changeset";
import { MAX_CHANGESET_BYTES, MAX_ENTRIES } from "@/lib/storms/limits";
import type { Sticky } from "@/lib/storms/model";
import { ack, EMPTY_OUTBOX, queue, restore, takeNext } from "./pending";

const sticky = (id: string, x = 0, text = ""): Sticky => ({
  id,
  type: "sticky",
  x,
  y: 0,
  z: "a0",
  w: 200,
  h: 200,
  text,
});
const up = (...items: Sticky[]): ChangeSet => ({ upsert: items, delete: [] });

describe("pending outbox", () => {
  it("keeps edits made during a save", () => {
    const a = sticky("a");
    const b = sticky("b");
    const taken = takeNext(queue(EMPTY_OUTBOX, up(a)), 800_000);
    expect(taken?.send).toEqual(up(a));
    const after = ack(queue(taken!.outbox, up(b)));
    expect(after).toEqual({ pending: up(b), inFlight: null });
  });

  it("restore after failure keeps newer edits on top", () => {
    const taken = takeNext(queue(EMPTY_OUTBOX, up(sticky("a", 1))), 800_000)!;
    const restored = restore(queue(taken.outbox, up(sticky("a", 2))));
    expect(restored).toEqual({ pending: up(sticky("a", 2)), inFlight: null });
  });

  it("restore puts a failed save back under pending edits", () => {
    const taken = takeNext(queue(EMPTY_OUTBOX, up(sticky("a"))), 800_000)!;
    const restored = restore(queue(taken.outbox, up(sticky("b"))));
    expect(restored.inFlight).toBeNull();
    expect(restored.pending.upsert.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("takeNext splits over maxBytes and leaves the rest pending", () => {
    const big = "x".repeat(300);
    const items = ["a", "b", "c"].map((id) => sticky(id, 0, big));
    const maxBytes = changesBytes(up(items[0], items[1])) + 1;
    const taken = takeNext(queue(EMPTY_OUTBOX, { upsert: items, delete: ["d"] }), maxBytes)!;
    expect(taken.send.upsert.map((i) => i.id)).toEqual(["a"]);
    expect(taken.send.delete).toEqual(["d"]);
    expect(changesBytes(taken.send)).toBeLessThanOrEqual(maxBytes);
    expect(taken.outbox.inFlight).toEqual(taken.send);
    expect(taken.outbox.pending).toEqual(up(items[1], items[2]));
    const next = takeNext(ack(taken.outbox), maxBytes)!;
    expect(next.send).toEqual(up(items[1], items[2]));
  });

  it("takeNext on empty → null", () => {
    expect(takeNext(EMPTY_OUTBOX, 800_000)).toBeNull();
  });

  it("takeNext while a save is in flight → null", () => {
    const taken = takeNext(queue(EMPTY_OUTBOX, up(sticky("a"))), 800_000)!;
    expect(takeNext(queue(taken.outbox, up(sticky("b"))), 800_000)).toBeNull();
  });

  it("takeNext never sends more than MAX_ENTRIES upserts or deletes at once", () => {
    const upsert = Array.from({ length: 12_000 }, (_, i) => sticky(`u${i}`));
    const del = Array.from({ length: 6_000 }, (_, i) => `d${i}`);
    let outbox = queue(EMPTY_OUTBOX, { upsert, delete: del });
    const sent: ChangeSet[] = [];
    for (let next = takeNext(outbox, MAX_CHANGESET_BYTES); next; next = takeNext(outbox, MAX_CHANGESET_BYTES)) {
      sent.push(next.send);
      outbox = ack(next.outbox);
    }
    for (const c of sent) {
      expect(c.upsert.length).toBeLessThanOrEqual(MAX_ENTRIES);
      expect(c.delete.length).toBeLessThanOrEqual(MAX_ENTRIES);
    }
    expect(sent.flatMap((c) => c.upsert)).toHaveLength(12_000);
    expect(sent.flatMap((c) => c.delete)).toHaveLength(6_000);
  });
});
