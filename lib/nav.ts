// Every page in the app, with its icon (a 24×24 stroke path).
// A plain module so server and client components can both read it.

export const NAV = {
  today: { href: "/", label: "Today", icon: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z" },
  todo: { href: "/todo", label: "To-do", icon: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" },
  journal: { href: "/journal", label: "Journal", icon: "M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM8 7h6M8 11h6M8 15h4" },
  vocab: { href: "/vocab", label: "Vocab", icon: "M4 18 8.5 6h1L14 18M5.5 14h7M19.5 10v8M17 10.5a2.5 2.5 0 1 1 0 5" },
  watchlist: { href: "/watchlist", label: "Watchlist", icon: "M3 6h18v12H3zM10 9.5v5l4-2.5z" },
  ideas: {
    href: "/ideas",
    label: "Ideas",
    icon: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z",
  },
  vision: {
    href: "/vision",
    label: "Vision",
    icon: "M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  },
  progress: { href: "/progress", label: "Progress", icon: "M4 19h16M7 16v-5M12 16V8M17 16v-8" },
  checkIn: {
    href: "/check-in",
    label: "Check-in",
    icon: "M9 3h6v3H9zM7 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-1M9 13.5l2 2 4-4",
  },
  more: { href: "/more", label: "More", icon: "M5 12h.01M12 12h.01M19 12h.01" },
};
