import { describe, expect, it } from "vitest";
import { changesBytes, type ChangeSet } from "@/lib/storms/changeset";
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
});
