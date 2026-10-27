"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { WATCH_MOODS, WATCH_TYPES, guessType, type WatchMood, type WatchType } from "@/lib/watchlist";

// Sites whose pages hide the title from plain requests but offer an oEmbed lookup.
const OEMBED: [RegExp, string][] = [
  [/(^|\.)(youtube\.com|youtu\.be)$/, "https://www.youtube.com/oembed?format=json&url="],
  [/(^|\.)vimeo\.com$/, "https://vimeo.com/api/oembed.json?url="],
];

/** Reads a page's title so a pasted link shows a real name. Gives up quietly. */
async function fetchTitle(url: string): Promise<string | null> {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const oembed = OEMBED.find(([pattern]) => pattern.test(host));
    if (oembed) {
      const reply = await fetch(oembed[1] + encodeURIComponent(url), { signal: AbortSignal.timeout(4000) });
      if (reply.ok) {
        const data = (await reply.json()) as { title?: string; author_name?: string };
        if (data.title) return (data.author_name ? `${data.title} · ${data.author_name}` : data.title).slice(0, 300);
      }
    }
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CompoundBot/1.0)", Accept: "text/html" },
      redirect: "follow",
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return null;
    const html = (await response.text()).slice(0, 300_000);
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const title = og ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    return title
      ? title
          .replace(/&amp;/g, "&")
          .replace(/&#39;|&apos;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 300)
      : null;
  } catch {
    return null;
  }
}

/** Paste a link (or just type a name) into the inbox. */
export async function addWatchItem(input: string): Promise<{ error?: string }> {
  const raw = input.trim().slice(0, 1000);
  if (!raw) return { error: "Paste a link or type a name." };
  const isUrl = /^https?:\/\/\S+$/i.test(raw);
  const supabase = await createClient();
  const { error } = await supabase.from("watchlist").insert({
    url: isUrl ? raw : null,
    title: isUrl ? await fetchTitle(raw) : raw,
    type: isUrl ? guessType(raw) : null,
    status: "inbox",
    source: "app",
  });
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** Tag type, mood and length. Once type and mood are set, the item leaves the inbox. */
export async function updateWatchItem(
  id: string,
  patch: { type?: WatchType | null; mood?: WatchMood | null; est_minutes?: number | null; title?: string },
) {
  if (patch.type && !WATCH_TYPES.includes(patch.type)) throw new Error("Bad type");
  if (patch.mood && !WATCH_MOODS.includes(patch.mood)) throw new Error("Bad mood");
  const supabase = await createClient();
  const { data: current } = await supabase.from("watchlist").select("type, mood, status").eq("id", id).single();
  const next = { ...current, ...patch };
  const status = current?.status === "done" ? "done" : next.type && next.mood ? "queued" : "inbox";
  const { error } = await supabase.from("watchlist").update({ ...patch, status }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function setWatchDone(id: string, done: boolean) {
  const supabase = await createClient();
  const { data: current } = await supabase.from("watchlist").select("type, mood").eq("id", id).single();
  const { error } = await supabase
    .from("watchlist")
    .update(
      done
        ? { status: "done", done_at: new Date().toISOString() }
        : { status: current?.type && current?.mood ? "queued" : "inbox", done_at: null },
    )
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteWatchItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("watchlist").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
