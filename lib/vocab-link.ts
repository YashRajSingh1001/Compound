import type { Target } from "./types";

/**
 * Props that turn the vocab target's tile into a link to /vocab showing its
 * progress. A plain module, so both server pages and client components can use it.
 */
export function vocabLink(target: Target, vocab: { learned: number; perDay: number; due: number }) {
  if (!target.rules.vocab) return {};
  const parts = [vocab.learned >= vocab.perDay ? `${vocab.perDay} words learned` : `${vocab.learned} of ${vocab.perDay} words`];
  if (vocab.due) parts.push(`${vocab.due} to review`);
  return { href: "/vocab", note: parts.join(" · ") };
}
