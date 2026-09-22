import type { Metadata } from "next";
import { StatusList } from "@/components/workspace/status-list";
import { withUserDb } from "@/db/client";
import { loadStatusRoots } from "@/lib/tree/operations";

export const metadata: Metadata = { title: "Trash · ToughBubble" };

export default async function TrashPage() {
  const items = await withUserDb((tx) => loadStatusRoots(tx, "trashed"));
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Trash</h1>
        <p className="text-sm text-muted-foreground">
          Restore puts items back where they were, or at the top level if that place is gone.
        </p>
      </div>
      <StatusList status="trashed" items={items} />
    </div>
  );
}
