import type { Target } from "./types";

// Props that turn a daily tile into a link to its own page, with progress.
// A plain module, so both server pages and client components can use it.

export type TileExtras = {
  vocab: { learned: number; perDay: number; due: number };
  journal: { words: number };
};

export function tileLink(target: Target, extras: TileExtras) {
  if (target.rules.vocab) {
    const { learned, perDay, due } = extras.vocab;
    const parts = [learned >= perDay ? `${perDay} words learned` : `${learned} of ${perDay} words`];
    if (due) parts.push(`${due} to review`);
    return { href: "/vocab", note: parts.join(" · ") };
  }
  if (target.rules.journal) {
    const { words } = extras.journal;
    return { href: "/journal", note: words ? `Written · ${words} words` : "Not written yet" };
  }
  return {};
}
