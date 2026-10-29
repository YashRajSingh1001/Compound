import Link from "next/link";
import { NavIcon } from "@/components/BottomNav";
import { NAV } from "@/lib/nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOut } from "@/app/login/actions";

const ITEMS = [
  { ...NAV.vision, sub: "Your goals in pictures" },
  { ...NAV.ideas, sub: "Every idea, and why it came up" },
  { ...NAV.vocab, sub: "Today's words and recall test" },
  { ...NAV.watchlist, sub: "Things to watch, read or hear" },
  { ...NAV.checkIn, sub: "The 2-minute evening flow" },
  { href: "/export", label: "Export data", icon: "M12 4v11M7 10l5 5 5-5M5 20h14", sub: "Download everything as JSON or CSV" },
];

/** Phone-only menu for the pages that don't fit in the tab bar. */
export default function MorePage() {
  return (
    <>
      <header className="flex items-end justify-between">
        <h1 className="font-serif text-5xl leading-none italic tracking-tight">More</h1>
        <ThemeToggle />
      </header>
      <nav className="flex flex-col overflow-hidden rounded-3xl border border-line bg-card">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <NavIcon d={item.icon} className="size-5" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{item.label}</span>
              <span className="text-sm text-muted">{item.sub}</span>
            </span>
            <span className="text-muted" aria-hidden>
              ›
            </span>
          </Link>
        ))}
      </nav>
      <form action={signOut} className="flex justify-center">
        <button className="text-sm text-muted hover:text-foreground">Sign out</button>
      </form>
    </>
  );
}
