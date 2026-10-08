"use client";

import { useSyncExternalStore } from "react";

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const subscribe = () => () => {};

/**
 * A date in the viewer's locale and time zone. It renders only in the browser
 * (shell-hardening D6): the server's locale can differ from the viewer's, and
 * hydration would keep the server's text, so dates looked different depending
 * on whether the page was loaded or navigated to. The empty placeholder
 * reserves the width so nothing shifts when the date appears.
 */
export function FormatDate({ iso, className }: { iso: string; className?: string }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <time dateTime={iso} className={className}>
      {mounted ? formatter.format(new Date(iso)) : <span className="inline-block min-w-[11ch]" />}
    </time>
  );
}
