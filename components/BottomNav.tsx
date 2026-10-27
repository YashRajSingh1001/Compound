"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { ThemeToggle } from "./ThemeToggle";
const RAIL = [NAV.today, NAV.todo, NAV.journal, NAV.vocab, NAV.watchlist, NAV.progress, NAV.checkIn];
const TABS = [NAV.today, NAV.todo, NAV.journal, NAV.progress, NAV.more];
// Pages reached through "More" keep the More tab lit on phones.
const UNDER_MORE = ["/more", NAV.vocab.href, NAV.watchlist.href, NAV.checkIn.href, "/export"];

export function NavIcon({ d, className = "size-[22px]" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Left rail on laptop screens: every page. */
export function SideRail() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 hidden h-dvh w-[76px] shrink-0 flex-col items-center gap-2.5 border-r border-line py-6 lg:flex"
    >
      <Link
        href="/"
        aria-label="Compound"
        className="mb-4 flex size-11 items-center justify-center rounded-[14px] bg-accent font-serif text-[28px] text-on-accent italic"
      >
        C
      </Link>
      {RAIL.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.label}
            title={link.label}
            className={`flex size-11 items-center justify-center rounded-[14px] transition ${
              active ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            <NavIcon d={link.icon} />
          </Link>
        );
      })}
      <div className="flex-1" />
      <ThemeToggle />
    </nav>
  );
}

/** Tab bar on phones: the four most used pages plus More. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((link) => {
          const active = link === NAV.more ? UNDER_MORE.includes(pathname) : pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <NavIcon d={link.icon} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
