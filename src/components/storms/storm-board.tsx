"use client";

import type { StormBody } from "@/lib/storms/model";

export type StormBoardProps = {
  itemId: string;
  initial: { body: StormBody; version: number };
  userId: string;
  onStatus: (label: string) => void;
};

/** The board surface. A blank canvas for now; the engine arrives in later tasks. */
export default function StormBoard(props: StormBoardProps) {
  void props;
  return (
    <div className="size-full">
      <canvas className="block size-full touch-none" />
    </div>
  );
}
