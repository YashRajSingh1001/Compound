// Watchlist helpers shared by the page and its actions.

export const WATCH_TYPES = ["movie", "series", "podcast", "article", "book", "reel", "video"] as const;
export const WATCH_MOODS = ["brain", "fun", "background"] as const;

export type WatchType = (typeof WATCH_TYPES)[number];
export type WatchMood = (typeof WATCH_MOODS)[number];

export type WatchItem = {
  id: string;
  url: string | null;
  title: string | null;
  type: WatchType | null;
  mood: WatchMood | null;
  est_minutes: number | null;
  status: "inbox" | "queued" | "done";
  added_at: string;
  done_at: string | null;
};

export const MOOD_LABEL: Record<WatchMood, string> = { brain: "Brain food", fun: "Fun", background: "Background" };

/** Best guess at the type from the link's site, so most items need no tagging. */
export function guessType(url: string): WatchType | null {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (/(^|\.)instagram\.com$/.test(host) || /tiktok\.com$/.test(host)) return "reel";
  if (/youtube\.com$|youtu\.be$|vimeo\.com$/.test(host)) return url.includes("/shorts/") ? "reel" : "video";
  if (/imdb\.com$|letterboxd\.com$|netflix\.com$|primevideo\.com$|hotstar\.com$/.test(host)) return "movie";
  if (/spotify\.com$/.test(host) && /\/(episode|show)\//.test(url)) return "podcast";
  if (/podcasts\.apple\.com$|pocketcasts\.com$/.test(host)) return "podcast";
  if (/goodreads\.com$|amazon\.[a-z.]+$/.test(host) && url.includes("/book")) return "book";
  if (/medium\.com$|substack\.com$|nytimes\.com$|theverge\.com$|arxiv\.org$/.test(host)) return "article";
  return null;
}

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
