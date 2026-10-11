import { notFound } from "next/navigation";
import { BenchClient } from "./bench-client";

const MAX_ITEMS = 5000;

/** Development only: the Storm speed gate's synthetic board (scripts/storms-bench.mjs). */
export default async function StormBenchPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { items } = await searchParams;
  const n = Math.min(MAX_ITEMS, Math.max(1, Number.parseInt(items ?? "1000", 10) || 1000));
  return <BenchClient items={n} />;
}
