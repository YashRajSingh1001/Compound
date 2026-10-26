"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/check-in", label: "Check-in" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 py-4 text-center text-sm font-medium ${active ? "text-foreground" : "text-muted"}`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
