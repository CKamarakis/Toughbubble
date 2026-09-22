import Link from "next/link";

export default function ItemNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This item doesn&apos;t exist, or it has been archived or moved to Trash.
      </p>
      <p className="text-sm text-muted-foreground">
        Look in{" "}
        <Link href="/archive" className="text-foreground underline underline-offset-4">
          Archive
        </Link>{" "}
        or{" "}
        <Link href="/trash" className="text-foreground underline underline-offset-4">
          Trash
        </Link>
        .
      </p>
    </div>
  );
}
