import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-8">
        <p className="text-center text-lg font-semibold">ToughBubble</p>
        {children}
      </div>
      <ThemeToggle />
    </main>
  );
}
