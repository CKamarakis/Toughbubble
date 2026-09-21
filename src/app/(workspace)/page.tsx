import { count } from "drizzle-orm";
import { withUserDb } from "@/db/client";
import { items } from "@/db/schema";

export default async function WorkspacePage() {
  // RLS limits this to the signed-in user's items; no owner filter needed.
  const [{ total }] = await withUserDb((tx) => tx.select({ total: count() }).from(items));

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      {total === 0 ? (
        <>
          <h1 className="text-xl font-semibold">Your workspace is empty</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Projects, folders, notes, and Storms will appear here.
          </p>
        </>
      ) : (
        <h1 className="text-xl font-semibold">
          {total} {total === 1 ? "item" : "items"} in your workspace
        </h1>
      )}
    </main>
  );
}
