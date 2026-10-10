"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ancestorPath, displayTitle, findNode } from "@/lib/tree/build";
import { isContainer } from "@/lib/tree/types";
import { ContentsList } from "./contents-list";
import { ItemIcon } from "./item-icon";
import { ItemMenu } from "./item-menu";
import { KindSwitch } from "./kind-switch";
import { ProjectStylePicker } from "./project-style-picker";
import { TitleInput } from "./title-input";
import { useWorkspace } from "./workspace-context";
import { NoteEditor } from "@/components/notes/note-editor";
import { StormView } from "@/components/storms/storm-view";
import type { NoteBody } from "@/lib/notes/operations";
import type { StormBody } from "@/lib/storms/model";

/** A note's body plus signed links for its attachments, by attachment id. */
export type NoteData = NoteBody & { links: Record<string, string> };

/** A Storm's stored board and version. */
export type StormData = { body: StormBody; version: number };

/** The main pane for an item: breadcrumb, title, and contents, note body, or Storm board. */
export function ItemView({ id, note, storm }: { id: string; note?: NoteData | null; storm?: StormData | null }) {
  const ws = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const isNew = useSearchParams().get("new") === "1";
  const [editing, setEditing] = useState(isNew);

  const node = findNode(ws.tree, id);
  // Archived or trashed from this page: the provider is already navigating away.
  if (!node) return null;

  const title = displayTitle(node);
  const ancestors = ancestorPath(ws.rows, id);
  const finishEditing = () => {
    setEditing(false);
    if (isNew) router.replace(pathname); // drop ?new=1 so a reload doesn't reopen the editor
  };
  const isStorm = node.kind === "storm" && !!storm;

  const breadcrumb = (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link href="/" className="hover:text-foreground hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center">
            Workspace
          </Link>
        </li>
        {ancestors.map((a) => (
          <li key={a.id} className="flex items-center gap-1">
            <span aria-hidden>/</span>
            <Link href={`/items/${a.id}`} className="hover:text-foreground hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center">
              {displayTitle(a)}
            </Link>
          </li>
        ))}
        <li className="flex items-center gap-1">
          <span aria-hidden>/</span>
          <span aria-current="page" className="text-foreground">
            {title}
          </span>
        </li>
      </ol>
    </nav>
  );

  const titleRow = (
    <div className="flex items-center gap-3">
      <ItemIcon item={node} className={isStorm ? "size-5" : "size-7"} />
      {editing ? (
        <TitleInput
          initial={node.title}
          placeholder={title}
          aria-label="Title"
          autoSelect={!isNew}
          onSave={(value) => ws.rename(id, value)}
          onDone={finishEditing}
          className={isStorm ? "h-8 text-lg font-semibold" : "h-10 text-2xl font-semibold"}
        />
      ) : (
        <h1 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Rename"
            className={cn(
              "w-full truncate rounded-sm text-left font-semibold hover:bg-accent pointer-coarse:min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              isStorm ? "text-lg" : "text-2xl",
              !node.title.trim() && "text-muted-foreground",
            )}
          >
            {title}
          </button>
        </h1>
      )}
      <ItemMenu item={node} onRename={() => setEditing(true)} className="size-8 pointer-coarse:size-10" />
    </div>
  );

  // A Storm is a slim header over an edge-to-edge board that fills the pane
  // (storms-canvas D4); the pane's own padding doesn't apply to it.
  if (isStorm) {
    return (
      <StormView
        itemId={id}
        initial={storm}
        header={(status) => (
          <header className="flex shrink-0 flex-col gap-1 border-b px-4 py-2">
            {breadcrumb}
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">{titleRow}</div>
              {status && (
                <span aria-live="polite" className="shrink-0 text-sm text-muted-foreground">
                  {status}
                </span>
              )}
            </div>
          </header>
        )}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      {breadcrumb}

      <header className="flex flex-col gap-3">
        {titleRow}
        {/* Projects and folders show their kind as a switch (item-menu-actions
            D3); only projects have a style. */}
        {(node.kind === "project" || node.kind === "folder") && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <KindSwitch item={{ ...node, kind: node.kind }} />
            {node.kind === "project" && <ProjectStylePicker item={node} />}
          </div>
        )}
      </header>

      {isContainer(node.kind) ? (
        <ContentsList node={node} />
      ) : node.kind === "note" && note ? (
        <NoteEditor itemId={id} initial={note} />
      ) : null}
    </div>
  );
}
