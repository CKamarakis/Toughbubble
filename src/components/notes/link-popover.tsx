"use client";

import type { Editor } from "@tiptap/core";
import { ExternalLink, Link2, Unlink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeLink } from "@/lib/notes/links";
import { cn } from "@/lib/utils";

/** Toolbar link control: add, edit, open, or remove a link (Ctrl/Cmd+K opens it). */
export function LinkPopover({
  editor,
  open,
  onOpenChange,
  active,
  href,
}: {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: boolean;
  href: string | null;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        data-toolbar-item
        aria-label="Link"
        aria-pressed={active}
        title="Link (Ctrl+K)"
        className={cn(
          "flex size-8 items-center justify-center rounded-md text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          active && "bg-accent",
        )}
      >
        <Link2 className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3" finalFocus={false}>
        {open && <LinkForm key={href ?? "new"} editor={editor} href={href} onDone={() => onOpenChange(false)} />}
      </PopoverContent>
    </Popover>
  );
}

function LinkForm({ editor, href, onDone }: { editor: Editor; href: string | null; onDone: () => void }) {
  const [text, setText] = useState(href ?? "");
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const url = normalizeLink(text);
    if (!url) {
      setError("That address isn't allowed. Use a web address or an email address.");
      return;
    }
    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !editor.isActive("link")) {
      // Nothing selected: insert the address itself as the link text.
      chain.insertContent({ type: "text", text: text.trim(), marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else {
      chain.extendMarkRange("link").setLink({ href: url }).run();
    }
    onDone();
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <label htmlFor="link-address" className="text-xs font-medium text-muted-foreground">
        Link address
      </label>
      <input
        id="link-address"
        autoFocus
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        placeholder="example.com or name@example.com"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "link-error" : undefined}
        className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
      />
      {error && (
        <p id="link-error" role="alert" className="text-xs text-foreground">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {href && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink />
                Open
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  onDone();
                }}
              >
                <Unlink />
                Remove
              </Button>
            </>
          )}
        </div>
        <Button type="submit" size="sm">
          Apply
        </Button>
      </div>
    </form>
  );
}
