import type { Metadata } from "next";
import { StatusList } from "@/components/workspace/status-list";
import { withUserDb } from "@/db/client";
import { loadStatusRoots } from "@/lib/tree/operations";

export const metadata: Metadata = { title: "Archive · ToughBubble" };

export default async function ArchivePage() {
  const items = await withUserDb((tx) => loadStatusRoots(tx, "archived"));
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Archive</h1>
        <p className="text-sm text-muted-foreground">
          Archived items are hidden from the sidebar. Restore brings back everything that was
          archived with them.
        </p>
      </div>
      <StatusList status="archived" items={items} />
    </div>
  );
}
