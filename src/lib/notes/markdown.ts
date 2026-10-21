import type { JSONContent } from "@tiptap/core";
import { isAllowedHref } from "./links";

// Note body (Tiptap JSON) to Markdown, for exporting a note
// (export-note-markdown D1). Pure: no editor, DOM or browser, so the MCP
// connector can reuse it on the server. Styling (sizes, colours, alignment,
// underline) is left out; tables Markdown can't hold become HTML (D2).

/** Where an attachment ended up in the export: a relative path, or missing. */
export type ExportAsset = { path: string; name: string } | { missing: string };
export type ExportAssets = Record<string, ExportAsset>;

/** Node and mark types the converter writes on purpose; anything else falls back to its text. */
export const MARKDOWN_NODES = [
  "doc",
  "paragraph",
  "text",
  "heading",
  "hardBreak",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "image",
  "fileAttachment",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
] as const;
export const MARKDOWN_MARKS = ["bold", "italic", "strike", "code", "link"] as const;
/** Marks dropped on purpose: styling Markdown has no form for. */
export const DROPPED_MARKS = ["textStyle", "underline"] as const;

type Node = JSONContent;
const children = (node: Node): Node[] => node.content ?? [];

/** Every image and file card in the body, in order: its attachment id, or null while it is still being copied. */
export function attachmentRefs(body: Node): (string | null)[] {
  const refs: (string | null)[] = [];
  const walk = (node: Node) => {
    if (node.type === "image" || node.type === "fileAttachment") {
      refs.push(typeof node.attrs?.attachmentId === "string" ? node.attrs.attachmentId : null);
    }
    children(node).forEach(walk);
  };
  walk(body);
  return refs;
}

/** Attachment ids the body refers to, in order, without repeats. Nodes still copying (no id yet) are left out. */
export const attachmentIds = (body: Node): string[] => [
  ...new Set(attachmentRefs(body).filter((id): id is string => id !== null)),
];

/** Whether the body holds any image or file card, including ones still copying. */
export const hasAttachments = (body: Node): boolean => attachmentRefs(body).length > 0;

export function noteToMarkdown(body: Node, assets: ExportAssets = {}): string {
  const out = blocks(children(body), assets).trim();
  return out ? `${out}\n` : "";
}

// ---- inline ----------------------------------------------------------------

const MD_SPECIAL = /[\\`*_[\]<>~]/g;
const escapeText = (text: string) => text.replace(MD_SPECIAL, (c) => `\\${c}`);

/** Characters that start a block when they open a line ("# ", "> ", "- ", "1. "). */
function escapeLineStart(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line.replace(/^(\s*)(#{1,6}(?=\s|$)|>|[-+](?=\s)|\d+(?=[.)]\s))/, (_m, space: string, mark: string) =>
        /^\d/.test(mark) ? `${space}${mark}\\` : `${space}\\${mark}`,
      ),
    )
    .join("\n");
}

const hasMark = (node: Node, type: string) => node.marks?.some((m) => m.type === type) ?? false;
const linkOf = (node: Node): string | null => {
  const href = node.marks?.find((m) => m.type === "link")?.attrs?.href;
  return typeof href === "string" && isAllowedHref(href) ? href : null;
};

/** A backtick fence longer than any run of backticks inside. */
function fenceFor(text: string, min: number): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(min, longest + 1));
}

function codeSpan(text: string): string {
  const fence = fenceFor(text, 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

/** Wraps text in a marker, keeping surrounding spaces outside it (Markdown ignores `** a**`). */
function wrap(text: string, marker: string): string {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
  return match[2] ? `${match[1]}${marker}${match[2]}${marker}${match[3]}` : text;
}

function textRun(node: Node, inTable: boolean): string {
  const raw = node.text ?? "";
  if (hasMark(node, "code")) return codeSpan(raw);
  let text = escapeText(raw);
  if (inTable) text = text.replace(/\|/g, "\\|");
  if (hasMark(node, "strike")) text = wrap(text, "~~");
  if (hasMark(node, "italic")) text = wrap(text, "*");
  if (hasMark(node, "bold")) text = wrap(text, "**");
  return text;
}

const linkTarget = (href: string) => href.replace(/[\s()<>]/g, (c) => encodeURIComponent(c).replace("(", "%28").replace(")", "%29"));

/** Inline content; consecutive runs with the same link become one link. */
function inline(nodes: Node[], inTable = false): string {
  let out = "";
  for (let i = 0; i < nodes.length; ) {
    const node = nodes[i];
    if (node.type === "hardBreak") {
      out += inTable ? "<br>" : "\\\n";
      i++;
      continue;
    }
    if (node.type !== "text") {
      out += escapeText(plainText(node));
      i++;
      continue;
    }
    const href = linkOf(node);
    let j = i;
    let run = "";
    while (j < nodes.length && nodes[j].type === "text" && linkOf(nodes[j]) === href) run += textRun(nodes[j++], inTable);
    out += href ? `[${run}](${linkTarget(href)})` : run;
    i = j;
  }
  return out;
}

function plainText(node: Node): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return children(node).map(plainText).join("");
}

// ---- blocks ----------------------------------------------------------------

function blocks(nodes: Node[], assets: ExportAssets): string {
  return nodes
    .map((node) => block(node, assets))
    .filter((text) => text !== "")
    .join("\n\n");
}

const indent = (text: string, by: string) =>
  text
    .split("\n")
    .map((line, i) => (i === 0 || line === "" ? line : by + line))
    .join("\n");

function listItemBody(item: Node, assets: ExportAssets): string {
  const parts = children(item);
  let out = "";
  parts.forEach((part, i) => {
    const text = block(part, assets);
    if (i === 0) out = text;
    else out += (isList(part) ? "\n" : "\n\n") + text;
  });
  return out;
}

const isList = (node: Node) => node.type === "bulletList" || node.type === "orderedList" || node.type === "taskList";

function list(node: Node, assets: ExportAssets): string {
  const start = node.type === "orderedList" && Number.isInteger(node.attrs?.start) ? (node.attrs!.start as number) : 1;
  return children(node)
    .map((item, i) => {
      let marker = "- ";
      if (node.type === "orderedList") marker = `${start + i}. `;
      if (node.type === "taskList") marker = item.attrs?.checked ? "- [x] " : "- [ ] ";
      const pad = " ".repeat(node.type === "taskList" ? 2 : marker.length);
      return marker + indent(listItemBody(item, assets) || "", pad);
    })
    .join("\n");
}

function attachment(node: Node, assets: ExportAssets): string {
  const id = node.attrs?.attachmentId;
  const asset = typeof id === "string" ? assets[id] : undefined;
  const fallback = String(node.attrs?.name ?? node.attrs?.alt ?? (node.type === "image" ? "image" : "file"));
  if (!asset || "missing" in asset) return `> Missing file: ${escapeText(asset && "missing" in asset ? asset.missing : fallback)}`;
  const target = asset.path
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/\(/g, "%28").replace(/\)/g, "%29"))
    .join("/");
  if (node.type === "image") return `![${escapeText(String(node.attrs?.alt || asset.name))}](${target})`;
  return `[${escapeText(asset.name)}](${target})`;
}

function block(node: Node, assets: ExportAssets): string {
  switch (node.type) {
    case "paragraph":
      return escapeLineStart(inline(children(node)));
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
      const text = inline(children(node));
      return text ? `${"#".repeat(level)} ${text}` : "";
    }
    case "bulletList":
    case "orderedList":
    case "taskList":
      return list(node, assets);
    case "blockquote":
      return blocks(children(node), assets)
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n");
    case "codeBlock": {
      const code = plainText(node);
      const fence = fenceFor(code, 3);
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      return `${fence}${language}\n${code}\n${fence}`;
    }
    case "horizontalRule":
      return "---";
    case "image":
    case "fileAttachment":
      return attachment(node, assets);
    case "table":
      return table(node);
    default: {
      // A node the converter doesn't know: keep its text rather than lose it.
      const text = plainText(node).trim();
      return text ? escapeLineStart(escapeText(text)) : "";
    }
  }
}

// ---- tables ----------------------------------------------------------------

const span = (cell: Node, key: "colspan" | "rowspan") => Number(cell.attrs?.[key]) || 1;

/** A pipe table holds a table only when nothing is lost: no merged cells, one paragraph per cell, headers only in the first row. */
function fitsPipeTable(rows: Node[]): boolean {
  return rows.every((row, r) =>
    children(row).every((cell) => {
      if (span(cell, "colspan") !== 1 || span(cell, "rowspan") !== 1) return false;
      if (cell.type === "tableHeader" && r > 0) return false;
      const content = children(cell);
      return content.length <= 1 && content.every((b) => b.type === "paragraph");
    }),
  );
}

function table(node: Node): string {
  const rows = children(node);
  if (rows.length === 0) return "";
  if (!fitsPipeTable(rows)) return htmlTable(rows);

  const width = Math.max(...rows.map((row) => children(row).length));
  const cells = (row: Node) => {
    const texts = children(row).map((cell) => inline(children(children(cell)[0] ?? {}), true).trim());
    while (texts.length < width) texts.push("");
    return `| ${texts.join(" | ")} |`;
  };
  const first = children(rows[0]);
  const headed = first.length > 0 && first.every((cell) => cell.type === "tableHeader");
  const header = headed ? cells(rows[0]) : `|${" |".repeat(width)}`;
  const body = (headed ? rows.slice(1) : rows).map(cells);
  return [header, `|${" --- |".repeat(width)}`, ...body].join("\n");
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function inlineHtml(nodes: Node[]): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "<br>";
      if (node.type !== "text") return escapeHtml(plainText(node));
      let text = escapeHtml(node.text ?? "");
      if (hasMark(node, "code")) text = `<code>${text}</code>`;
      if (hasMark(node, "strike")) text = `<s>${text}</s>`;
      if (hasMark(node, "italic")) text = `<em>${text}</em>`;
      if (hasMark(node, "bold")) text = `<strong>${text}</strong>`;
      const href = linkOf(node);
      return href ? `<a href="${escapeHtml(href)}">${text}</a>` : text;
    })
    .join("");
}

function blockHtml(node: Node): string {
  switch (node.type) {
    case "paragraph":
      return `<p>${inlineHtml(children(node))}</p>`;
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
      return `<h${level}>${inlineHtml(children(node))}</h${level}>`;
    }
    case "bulletList":
    case "taskList":
      return `<ul>${children(node).map(itemHtml).join("")}</ul>`;
    case "orderedList": {
      const start = Number(node.attrs?.start) || 1;
      return `<ol${start !== 1 ? ` start="${start}"` : ""}>${children(node).map(itemHtml).join("")}</ol>`;
    }
    case "blockquote":
      return `<blockquote>${children(node).map(blockHtml).join("")}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${escapeHtml(plainText(node))}</code></pre>`;
    case "horizontalRule":
      return "<hr>";
    default:
      return escapeHtml(plainText(node));
  }
}

function itemHtml(item: Node): string {
  const box = item.type === "taskItem" ? (item.attrs?.checked ? "[x] " : "[ ] ") : "";
  return `<li>${box}${children(item).map(blockHtml).join("")}</li>`;
}

function htmlTable(rows: Node[]): string {
  const row = (r: Node) =>
    `<tr>${children(r)
      .map((cell) => {
        const tag = cell.type === "tableHeader" ? "th" : "td";
        const attrs = (["colspan", "rowspan"] as const)
          .filter((key) => span(cell, key) > 1)
          .map((key) => ` ${key}="${span(cell, key)}"`)
          .join("");
        return `<${tag}${attrs}>${children(cell).map(blockHtml).join("")}</${tag}>`;
      })
      .join("")}</tr>`;
  return ["<table>", ...rows.map(row), "</table>"].join("\n");
}
