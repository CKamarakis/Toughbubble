import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      {/* Wordmark on the page background: magenta text meets AA there in both
          themes, but not on the dark-mode card. */}
      <p className="text-2xl font-semibold text-highlight-text">ToughBubble</p>
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-8">
        {children}
      </div>
      <ThemeToggle />
    </main>
  );
}
