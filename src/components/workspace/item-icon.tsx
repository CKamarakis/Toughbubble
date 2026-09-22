import {
  BookOpen,
  Briefcase,
  Camera,
  Code,
  FileText,
  Flag,
  Folder,
  FolderKanban,
  GraduationCap,
  Heart,
  House,
  Lightbulb,
  Music,
  Palette,
  Plane,
  Rocket,
  Shapes,
  Star,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isProjectColor, isProjectIcon, type ProjectIcon } from "@/lib/tree/style";
import type { ItemKind } from "@/lib/tree/types";

export const PROJECT_ICON_COMPONENTS: Record<ProjectIcon, LucideIcon> = {
  "folder-kanban": FolderKanban,
  briefcase: Briefcase,
  rocket: Rocket,
  "book-open": BookOpen,
  lightbulb: Lightbulb,
  target: Target,
  heart: Heart,
  star: Star,
  house: House,
  "graduation-cap": GraduationCap,
  code: Code,
  palette: Palette,
  music: Music,
  camera: Camera,
  plane: Plane,
  flag: Flag,
};

const KIND_ICONS: Record<ItemKind, LucideIcon> = {
  project: FolderKanban,
  folder: Folder,
  note: FileText,
  storm: Shapes,
};

export const KIND_LABELS: Record<ItemKind, string> = {
  project: "Project",
  folder: "Folder",
  note: "Note",
  storm: "Storm",
};

/** Kind icon; projects use their chosen icon and color (CSS vars set in globals.css). */
export function ItemIcon({
  item,
  className,
}: {
  item: { kind: ItemKind; icon?: string | null; color?: string | null };
  className?: string;
}) {
  const Icon =
    item.kind === "project" && isProjectIcon(item.icon)
      ? PROJECT_ICON_COMPONENTS[item.icon]
      : KIND_ICONS[item.kind];
  const color = item.kind === "project" && isProjectColor(item.color) ? item.color : null;
  return (
    <Icon
      aria-hidden
      className={cn("size-4 shrink-0", color ? "text-(--project-color)" : "text-muted-foreground", className)}
      style={color ? ({ "--project-color": `var(--project-${color})` } as React.CSSProperties) : undefined}
    />
  );
}
