import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Public demo: the real screens filled with generated sample data. Nothing
 * reads or writes the database, and the screens are inert (look, don't touch).
 */
export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-20 border-b border-accent/30 bg-accent-soft/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm lg:px-8">
          <span className="font-serif text-xl text-accent italic">Compound</span>
          <span className="text-muted">Demo with sample data · read-only</span>
          <nav className="flex gap-1">
            <Link href="/demo" className="rounded-full px-3 py-1.5 hover:bg-card">
              Today
            </Link>
            <Link href="/demo/progress" className="rounded-full px-3 py-1.5 hover:bg-card">
              Progress
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <a href="https://github.com/YashRajSingh1001/Compound" className="text-muted hover:text-foreground">
              Source
            </a>
            <ThemeToggle />
          </div>
        </div>
      </div>
      <main inert className="mx-auto flex w-full max-w-lg min-w-0 flex-1 flex-col gap-5 px-4 pt-6 pb-16 lg:max-w-[1320px] lg:px-8">
        {children}
      </main>
    </div>
  );
}
