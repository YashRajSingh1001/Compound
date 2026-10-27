"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Today", icon: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z" },
  { href: "/todo", label: "To-do", icon: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" },
  { href: "/vocab", label: "Vocab", icon: "M4 18 8.5 6h1L14 18M5.5 14h7M19.5 10v8M17 10.5a2.5 2.5 0 1 1 0 5" },
  {
    href: "/check-in",
    label: "Check-in",
    icon: "M9 3h6v3H9zM7 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-1M9 13.5l2 2 4-4",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Left rail on laptop screens. */
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
      {LINKS.map((link) => {
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
            <Icon d={link.icon} />
          </Link>
        );
      })}
      <div className="flex-1" />
      <ThemeToggle />
    </nav>
  );
}

/** Tab bar on phones. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon d={link.icon} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
