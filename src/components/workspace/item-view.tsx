"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ancestorPath, displayTitle, findNode } from "@/lib/tree/build";
import { isContainer } from "@/lib/tree/types";
import { ContentsList } from "./contents-list";
import { ItemIcon, KIND_LABELS } from "./item-icon";
import { ItemMenu } from "./item-menu";
import { ProjectStylePicker } from "./project-style-picker";
import { TitleInput } from "./title-input";
import { useWorkspace } from "./workspace-context";

/** The main pane for an item: breadcrumb, title, and contents or placeholder. */
export function ItemView({ id }: { id: string }) {
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground hover:underline">
              Workspace
            </Link>
          </li>
          {ancestors.map((a) => (
            <li key={a.id} className="flex items-center gap-1">
              <span aria-hidden>/</span>
              <Link href={`/items/${a.id}`} className="hover:text-foreground hover:underline">
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

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <ItemIcon item={node} className="size-7" />
          {editing ? (
            <TitleInput
              initial={node.title}
              placeholder={title}
              aria-label="Title"
              autoSelect={!isNew}
              onSave={(value) => ws.rename(id, value)}
              onDone={finishEditing}
              className="h-10 text-2xl font-semibold"
            />
          ) : (
            <h1 className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Rename"
                className={cn(
                  "w-full truncate rounded-sm text-left text-2xl font-semibold hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  !node.title.trim() && "text-muted-foreground",
                )}
              >
                {title}
              </button>
            </h1>
          )}
          <ItemMenu item={node} onRename={() => setEditing(true)} className="size-8" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{KIND_LABELS[node.kind]}</span>
          {node.kind === "project" && <ProjectStylePicker item={node} />}
        </div>
      </header>

      {isContainer(node.kind) ? (
        <ContentsList node={node} />
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {node.kind === "note"
            ? "The note editor arrives in the next phase."
            : "The Storm canvas arrives in a later phase."}
        </div>
      )}
    </div>
  );
}
