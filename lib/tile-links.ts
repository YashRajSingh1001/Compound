import type { Target } from "./types";

export type TileExtras = {
  date: string;
  vocab: { learned: number; perDay: number; due: number };
  journal: { words: number };
};

export function tileLink(target: Target, extras: TileExtras, isToday = true) {
  if (target.rules.vocab && isToday) {
    const { learned, perDay, due } = extras.vocab;
    const parts = [learned >= perDay ? `${perDay} words learned` : `${learned} of ${perDay} words`];
    if (due) parts.push(`${due} to review`);
    return { href: "/vocab", note: parts.join(" · ") };
  }
  if (target.rules.journal) {
    const { words } = extras.journal;
    return {
      href: isToday ? "/journal" : `/journal?date=${extras.date}`,
      note: words ? `Written · ${words} words` : "Not written yet",
    };
  }
  return {};
}
