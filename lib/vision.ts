// Vision board: shared types and small helpers.

export type VisionItem = {
  id: string;
  title: string;
  statement: string | null;
  details: string | null;
  category: string | null;
  target_date: string | null;
  target_id: string | null;
  image_path: string | null;
  image_url: string | null;
  achieved_at: string | null;
  sort: number;
};

/** A vision item ready to show: picture resolved, live progress attached when linked. */
export type VisionCardData = VisionItem & {
  picture: string | null;
  progress: { done: number; total: number; label: string } | null;
};

export const VISION_BUCKET = "vision";

/** One item per day for the Today card, rotating through the unachieved ones. */
export function visionOfTheDay<T extends VisionItem>(items: T[], date: string): T | null {
  const open = items.filter((i) => !i.achieved_at);
  if (!open.length) return null;
  const day = Math.floor(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 86_400_000);
  return open[day % open.length];
}
