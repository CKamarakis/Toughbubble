import { notFound } from "next/navigation";
import { ItemView } from "@/components/workspace/item-view";
import { withUserDb } from "@/db/client";
import { getActiveItem } from "@/lib/tree/operations";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  // Missing, someone else's, archived, and trashed items all look the same.
  if (!UUID.test(id)) notFound();
  const item = await withUserDb((tx) => getActiveItem(tx, id));
  if (!item) notFound();
  // Keyed so per-item state (title editing) resets when switching items.
  return <ItemView key={id} id={id} />;
}
