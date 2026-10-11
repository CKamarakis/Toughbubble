import {
  isEmptyChanges,
  mergeChanges,
  NO_CHANGES,
  splitChanges,
  type ChangeSet,
} from "@/lib/storms/changeset";

/**
 * Board changes waiting to be saved (design D3): `pending` is every commit merged
 * since the last save was taken, `inFlight` the chunk being sent now. Pure; the
 * autosave hook owns the timers.
 */
export type Outbox = { pending: ChangeSet; inFlight: ChangeSet | null };

export const EMPTY_OUTBOX: Outbox = { pending: NO_CHANGES, inFlight: null };

/** Adds a commit's changes; the latest entry per id wins. */
export const queue = (o: Outbox, cs: ChangeSet): Outbox => ({ ...o, pending: mergeChanges(o.pending, cs) });

/**
 * Takes the next chunk to send (at most `maxBytes`, see `splitChanges`); the rest
 * stays pending. Null when there is nothing to send or a save is already in flight.
 */
export function takeNext(o: Outbox, maxBytes: number): { outbox: Outbox; send: ChangeSet } | null {
  if (o.inFlight || isEmptyChanges(o.pending)) return null;
  const [send, ...rest] = splitChanges(o.pending, maxBytes);
  return { outbox: { pending: rest.reduce(mergeChanges, NO_CHANGES), inFlight: send }, send };
}

/** The in-flight chunk was saved. */
export const ack = (o: Outbox): Outbox => ({ ...o, inFlight: null });

/** The in-flight chunk wasn't saved: put it back under the edits made since. */
export const restore = (o: Outbox): Outbox =>
  o.inFlight ? { pending: mergeChanges(o.inFlight, o.pending), inFlight: null } : o;

/** Nothing pending or in flight. */
export const isQuietOutbox = (o: Outbox) => o.inFlight === null && isEmptyChanges(o.pending);
