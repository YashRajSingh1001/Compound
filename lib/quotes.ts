// One line a day on the Today screen. Written for Compound, so no
// attributions to get wrong. The same date always shows the same line.

import { daysBetween } from "./dates";

const LINES = [
  "Small wins, stacked daily, stop being small.",
  "You don't need a perfect day. You need today's day.",
  "Ninety minutes is not much. Ninety minutes, every day, is everything.",
  "The streak is a mirror, not a judge.",
  "Show up first. Feel like it later.",
  "Momentum is a decision you make before you're ready.",
  "Compound interest works on habits too. Keep depositing.",
  "Missed yesterday? Today is still fully yours.",
  "Discipline is just remembering what you want.",
  "Do the next small thing. Then the one after it.",
  "The version of you in December is built tonight.",
  "Consistency beats intensity, every single week.",
  "One section, one rep, one word. That's the whole trick.",
  "Progress is quiet. Keep going anyway.",
  "One off day is noise. Two is a pattern. Break it tonight.",
  "A good day is mostly a few things done on purpose.",
  "Tired is fine. Zero is the only thing to avoid.",
  "Your future self is watching your choices tonight.",
  "Be the person who does it even when no one checks.",
  "Today counts. It always counts.",
  "Log the day honestly. That's how the next one gets better.",
  "Effort shown is a vote for who you're becoming.",
  "It's not about motivation. It's about the next 25 minutes.",
  "The plan is simple. The work is daily.",
  "Every green day makes the next one easier.",
  "Boring repetitions are where the results hide.",
  "Learn a little, lift a little, write a little. Repeat.",
  "Hard weeks build the people who finish.",
  "You're not behind. You're on day one of catching up.",
  "Keep the promise you made to yourself this morning.",
];

export function lineOfTheDay(date: string): string {
  const n = daysBetween("2026-01-01", date);
  return LINES[((n % LINES.length) + LINES.length) % LINES.length];
}
