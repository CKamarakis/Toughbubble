"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { StormBody } from "@/lib/storms/model";

// The board code loads only on Storm pages, and never on the server (it needs a canvas).
const StormBoard = dynamic(() => import("./storm-board"), { ssr: false });

/**
 * A Storm page: the slim header (given the board's status label to show) and
 * the board filling the rest of the pane.
 */
export function StormView({
  itemId,
  initial,
  header,
}: {
  itemId: string;
  initial: { body: StormBody; version: number };
  header: (status: string) => ReactNode;
}) {
  const { userId } = useWorkspace();
  const [status, setStatus] = useState("");
  return (
    <div className="flex h-full min-h-0 flex-col">
      {header(status)}
      <div className="min-h-0 flex-1">
        <StormBoard itemId={itemId} initial={initial} userId={userId} onStatus={setStatus} />
      </div>
    </div>
  );
}
