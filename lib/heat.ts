import type { WeekDay } from "./snapshot";

export const HEAT_LEVELS = [
  "var(--chip)",
  "color-mix(in srgb, var(--accent) 22%, var(--chip))",
  "color-mix(in srgb, var(--accent) 45%, var(--chip))",
  "color-mix(in srgb, var(--accent) 72%, var(--chip))",
  "var(--accent)",
];

export const HEAT_KEY = ["Nothing logged", "Under a third", "Around half", "Most of it", "Everything done"];

export function heatLevel(day: WeekDay): number {
  if (day.total === 0 || day.score <= 0) return 0;
  if (day.done === day.total) return 4;
  if (day.score >= 0.67) return 3;
  return day.score >= 0.34 ? 2 : 1;
}
