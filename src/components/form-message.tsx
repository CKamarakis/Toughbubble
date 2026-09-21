import { cn } from "@/lib/utils";

// Messages use foreground text on a tinted background: colored text alone
// (e.g. red on a card) does not meet WCAG AA in both themes.
export function FormMessage({
  kind,
  children,
}: {
  kind: "error" | "notice";
  children: React.ReactNode;
}) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm text-foreground",
        kind === "error"
          ? "border-destructive/40 bg-destructive/10"
          : "border-success/40 bg-success/10",
      )}
    >
      {children}
    </p>
  );
}
