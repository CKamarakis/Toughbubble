const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/**
 * A date in the viewer's locale and time zone. The server may render a
 * different day than the browser, so the text is allowed to differ at hydration.
 */
export function FormatDate({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {formatter.format(new Date(iso))}
    </time>
  );
}
