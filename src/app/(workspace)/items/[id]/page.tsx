import { notFound } from "next/navigation";
import { ItemView } from "@/components/workspace/item-view";
import { withUserDb } from "@/db/client";
import { getAttachmentLinks } from "@/lib/attachments/operations";
import { getNoteBody } from "@/lib/notes/operations";
import { createClient } from "@/lib/supabase/server";
import { getActiveItem } from "@/lib/tree/operations";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  // Missing, someone else's, archived, and trashed items all look the same.
  if (!UUID.test(id)) notFound();
  const bucket = (await createClient()).storage.from("attachments");
  const { item, note } = await withUserDb(async (tx) => {
    const item = await getActiveItem(tx, id);
    // A note opens with its body and attachment links already loaded (notes
    // design D7, attachments design D5), so images show on first paint.
    const body = item?.kind === "note" ? await getNoteBody(tx, id) : null;
    const note = body && { ...body, links: await getAttachmentLinks(tx, bucket, id) };
    return { item, note };
  });
  if (!item) notFound();
  // Keyed so per-item state (title editing, the editor) resets when switching items.
  return <ItemView key={id} id={id} note={note} />;
}
