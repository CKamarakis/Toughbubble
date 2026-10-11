"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { makeBenchBoard } from "@/lib/storms/bench-board";

const StormBoard = dynamic(() => import("@/components/storms/storm-board"), { ssr: false });

const NOOP = () => {};

/** Dev speed gate: a read-only board of synthetic stickies. Saves nothing and calls no server action. */
export function BenchClient({ items }: { items: number }) {
  const initial = useMemo(() => ({ body: makeBenchBoard(items), version: 0 }), [items]);
  return (
    <div className="h-screen w-screen">
      <StormBoard itemId="bench" initial={initial} userId="bench" onStatus={NOOP} readOnly />
    </div>
  );
}
