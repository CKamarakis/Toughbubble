"use client";

import { Archive, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { searchTree } from "@/lib/tree/search";
import { NewItemMenu } from "./new-item-menu";
import { SidebarTree } from "./sidebar-tree";
import { TreeDnd } from "./tree-dnd";
import { useWorkspace } from "./workspace-context";

export function Sidebar() {
  const ws = useWorkspace();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const result = useMemo(() => searchTree(ws.tree, query), [ws.tree, query]);

  const navLink = (href: string, label: string, Icon: typeof Archive) => (
    <Link
      href={href}
      aria-current={pathname === href ? "page" : undefined}
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-sm text-foreground hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        pathname === href && "bg-sidebar-accent font-medium",
      )}
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      {label}
    </Link>
  );

  return (
    <div className="flex h-full flex-col gap-3 bg-sidebar p-3 text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 px-1">
        <Link href="/" className="font-semibold text-highlight-text">
          ToughBubble
        </Link>
        <NewItemMenu round />
      </div>

      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder="Search titles"
          aria-label="Search titles"
          className="h-8 w-full rounded-lg border border-input bg-background pr-8 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <nav aria-label="Items" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <TreeDnd>
          {result ? (
            result.roots.length > 0 ? (
              <SidebarTree nodes={result.roots} forceOpen={result.expandIds} />
            ) : (
              <p className="px-2 py-1 text-sm text-muted-foreground" role="status">
                No matching items
              </p>
            )
          ) : ws.tree.length > 0 ? (
            <SidebarTree nodes={ws.tree} />
          ) : (
            <div className="flex flex-col items-start gap-2 px-2 py-1">
              <p className="text-sm text-muted-foreground">Your workspace is empty.</p>
              <NewItemMenu label="Create your first item" />
            </div>
          )}
        </TreeDnd>
      </nav>

      <div className="flex flex-col gap-px border-t border-sidebar-border pt-2">
        {navLink("/archive", "Archive", Archive)}
        {navLink("/trash", "Trash", Trash2)}
      </div>

      <div className="flex flex-col gap-2 border-t border-sidebar-border pt-2">
        <div className="flex items-center gap-2 px-1">
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
          >
            {ws.email.charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-sm" title={ws.email}>
            {ws.email}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          <form action="/auth/sign-out" method="post">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
