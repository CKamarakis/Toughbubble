import { AppLogo } from "@/components/app-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      {/* Logo and wordmark on the page background: magenta text meets AA there
          in both themes, but not on the dark-mode card. */}
      {/* Brand, not a heading: each page's own h1 (e.g. "Sign in") says what it is for. */}
      <div className="flex flex-col items-center gap-6">
        <AppLogo disc className="size-[120px]" />
        <p className="text-[32px] leading-none font-semibold text-highlight-text">ToughBubble</p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-8">
        {children}
      </div>
      <ThemeToggle />
    </main>
  );
}
