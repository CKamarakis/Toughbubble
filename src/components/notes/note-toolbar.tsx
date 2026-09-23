"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  FileCode,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ALIGNMENTS, HEADING_LEVELS } from "@/lib/notes/extensions";
import { FONT_SIZE_MAX, FONT_SIZE_MIN, FONT_SIZE_PRESETS, parseFontSize, toCssSize } from "@/lib/notes/font-size";
import { effectiveSize, type StyleElement } from "@/lib/settings/editor-styles";
import { useSettings } from "@/components/workspace/settings-context";
import { LinkPopover } from "./link-popover";

const ALIGN_ICONS: Record<(typeof ALIGNMENTS)[number], LucideIcon> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
  justify: AlignJustify,
};

// Toolbar menus leave focus in the editor (they call editor.focus()), so typing
// continues where it was instead of on the menu button.
const triggerClass =
  "flex h-8 items-center gap-1 rounded-md px-2 text-sm text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[popup-open]:bg-accent";

/**
 * Formatting toolbar (notes design D5): pinned to the top of the scrolling
 * pane, one Tab stop, arrow keys move between controls.
 */
export function NoteToolbar({
  editor,
  status,
  linkOpen,
  onLinkOpenChange,
}: {
  editor: Editor;
  status: string;
  linkOpen: boolean;
  onLinkOpenChange: (open: boolean) => void;
}) {
  const { editorStyles } = useSettings();
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      heading: HEADING_LEVELS.find((level) => e.isActive("heading", { level })) ?? 0,
      align: ALIGNMENTS.find((a) => e.isActive({ textAlign: a })) ?? "left",
      fontSize: parseFontSize(e.getAttributes("textStyle").fontSize as string | undefined),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      href: (e.getAttributes("link").href as string | undefined) ?? null,
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const element: StyleElement = s.heading ? (`h${s.heading}` as StyleElement) : "p";
  const shownSize = s.fontSize ?? effectiveSize(editorStyles, element);
  const run = () => editor.chain().focus();

  const toolbarRef = useRef<HTMLDivElement>(null);
  // Roving tab index: only one control is in the Tab order at a time.
  useEffect(() => {
    const items = toolbarRef.current?.querySelectorAll<HTMLElement>("[data-toolbar-item]");
    items?.forEach((el, i) => el.setAttribute("tabindex", i === 0 ? "0" : "-1"));
  }, []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    const items = [...(toolbarRef.current?.querySelectorAll<HTMLElement>("[data-toolbar-item]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    items.forEach((el, j) => el.setAttribute("tabindex", j === next ? "0" : "-1"));
    items[next].focus();
  };

  const toggle = (label: string, Icon: LucideIcon, active: boolean, action: () => void, shortcut?: string) => (
    <button
      type="button"
      data-toolbar-item
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={action}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active && "bg-accent",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
  const divider = <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
  const AlignIcon = ALIGN_ICONS[s.align];

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Formatting"
      onKeyDown={onKeyDown}
      className="sticky top-0 z-20 -mx-2 flex flex-wrap items-center gap-0.5 border-b bg-background/95 px-2 py-1.5 backdrop-blur"
    >
      <DropdownMenu>
        <DropdownMenuTrigger data-toolbar-item aria-label="Text style" className={cn(triggerClass, "w-28 justify-between")}>
          {s.heading ? `Heading ${s.heading}` : "Paragraph"}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40" finalFocus={false}>
          <DropdownMenuRadioGroup
            value={String(s.heading)}
            onValueChange={(v) => {
              const level = Number(v);
              if (level) run().setHeading({ level: level as (typeof HEADING_LEVELS)[number] }).run();
              else run().setParagraph().run();
            }}
          >
            <DropdownMenuRadioItem value="0" closeOnClick>
              Paragraph
            </DropdownMenuRadioItem>
            {HEADING_LEVELS.map((level) => (
              <DropdownMenuRadioItem key={level} value={String(level)} closeOnClick>
                Heading {level}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <FontSizeControl
        size={shownSize}
        explicit={s.fontSize !== null}
        onApply={(px) => run().setFontSize(toCssSize(px)).run()}
        onDefault={() => run().unsetFontSize().run()}
      />
      {divider}
      {toggle("Bold", Bold, s.bold, () => run().toggleBold().run(), "Ctrl+B")}
      {toggle("Italic", Italic, s.italic, () => run().toggleItalic().run(), "Ctrl+I")}
      {toggle("Underline", Underline, s.underline, () => run().toggleUnderline().run(), "Ctrl+U")}
      {toggle("Strikethrough", Strikethrough, s.strike, () => run().toggleStrike().run(), "Ctrl+Shift+S")}
      {toggle("Inline code", Code, s.code, () => run().toggleCode().run(), "Ctrl+E")}
      <LinkPopover editor={editor} open={linkOpen} onOpenChange={onLinkOpenChange} active={s.link} href={s.href} />
      {divider}
      <DropdownMenu>
        <DropdownMenuTrigger data-toolbar-item aria-label={`Align: ${s.align}`} className={triggerClass}>
          <AlignIcon className="size-4" />
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36" finalFocus={false}>
          <DropdownMenuRadioGroup value={s.align} onValueChange={(v) => run().setTextAlign(String(v)).run()}>
            {ALIGNMENTS.map((a) => {
              const Icon = ALIGN_ICONS[a];
              return (
                <DropdownMenuRadioItem key={a} value={a} closeOnClick>
                  <Icon />
                  {a[0].toUpperCase() + a.slice(1)}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {toggle("Bulleted list", List, s.bullet, () => run().toggleBulletList().run())}
      {toggle("Numbered list", ListOrdered, s.ordered, () => run().toggleOrderedList().run())}
      {toggle("Checklist", ListChecks, s.task, () => run().toggleTaskList().run())}
      {divider}
      {toggle("Quote", Quote, s.quote, () => run().toggleBlockquote().run())}
      {toggle("Code block", FileCode, s.codeBlock, () => run().toggleCodeBlock().run())}
      {toggle("Divider", Minus, false, () => run().setHorizontalRule().run())}
      {divider}
      <button
        type="button"
        data-toolbar-item
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
        disabled={!s.canUndo}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => run().undo().run()}
        className="flex size-8 items-center justify-center rounded-md hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
      >
        <Undo2 className="size-4" />
      </button>
      <button
        type="button"
        data-toolbar-item
        aria-label="Redo"
        title="Redo (Ctrl+Shift+Z)"
        disabled={!s.canRedo}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => run().redo().run()}
        className="flex size-8 items-center justify-center rounded-md hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
      >
        <Redo2 className="size-4" />
      </button>
      <span role="status" aria-live="polite" className="ml-auto pl-2 text-xs whitespace-nowrap text-muted-foreground">
        {status}
      </span>
    </div>
  );
}

function FontSizeControl({
  size,
  explicit,
  onApply,
  onDefault,
}: {
  size: number;
  explicit: boolean;
  onApply: (px: number) => void;
  onDefault: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const parsed = parseFontSize(draft);
  const invalid = draft !== "" && parsed === null;
  const applyDraft = () => {
    if (!parsed) return;
    setOpen(false);
    setDraft("");
    onApply(parsed);
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Cleared on close, so a late open event can't wipe what's being typed.
        if (!next) setDraft("");
      }}
    >
      <DropdownMenuTrigger data-toolbar-item aria-label={`Font size: ${size}`} className={cn(triggerClass, "w-16 justify-between tabular-nums")}>
        {size}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44" finalFocus={false}>
        <form
          className="flex flex-col gap-1 p-1"
          onSubmit={(e) => {
            e.preventDefault();
            applyDraft();
          }}
          // The menu handles Enter and letter keys itself; catch them first so
          // the field types normally and Enter applies the size.
          onKeyDownCapture={(e) => {
            if (e.key === "Escape") return;
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              applyDraft();
            }
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputMode="numeric"
            placeholder={`Size ${FONT_SIZE_MIN}–${FONT_SIZE_MAX}`}
            aria-label="Custom font size"
            aria-invalid={invalid || undefined}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
          />
          {invalid && (
            <span role="alert" className="px-0.5 text-xs text-foreground">
              Use {FONT_SIZE_MIN}–{FONT_SIZE_MAX}
            </span>
          )}
        </form>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDefault} disabled={!explicit}>
          Default
        </DropdownMenuItem>
        {FONT_SIZE_PRESETS.map((px) => (
          <DropdownMenuItem key={px} onClick={() => onApply(px)} className="tabular-nums">
            {px}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
