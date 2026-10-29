import "server-only";

import { loadDayInput } from "./data";
import { formatMinutes } from "./dates";
import { buildDay } from "./snapshot";
import { createClient } from "./supabase/server";
import { VISION_BUCKET, type VisionCardData, type VisionItem } from "./vision";

// Signed photo links last an hour; the page is rendered fresh on every visit.
const PHOTO_LINK_SECONDS = 3600;

/** Vision items with their photos resolved and live progress for linked targets. */
export async function loadVision(date: string) {
  const supabase = await createClient();
  const [{ data }, { data: targetRows }] = await Promise.all([
    supabase.from("vision_items").select("*").order("achieved_at", { nullsFirst: true }).order("sort"),
    supabase.from("targets").select("id, name, kind").eq("active", true).in("kind", ["weekly", "milestone"]).order("sort"),
  ]);
  const items = (data ?? []) as VisionItem[];

  const paths = items.map((i) => i.image_path).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from(VISION_BUCKET).createSignedUrls(paths, PHOTO_LINK_SECONDS);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }

  // Progress comes from the same snapshot code as the Today screen.
  const day = items.some((i) => i.target_id) ? buildDay(await loadDayInput(date)) : null;
  const progressFor = (targetId: string | null): VisionCardData["progress"] => {
    if (!day || !targetId) return null;
    const m = day.milestones.find((x) => x.target.id === targetId);
    if (m) {
      const label =
        m.mode === "tasks"
          ? `${formatMinutes(m.done)} of ${formatMinutes(m.total)}`
          : `${m.done.toLocaleString()} of ${m.total.toLocaleString()} ${m.target.unit ?? ""}`;
      return { done: m.done, total: m.total, label };
    }
    const w = day.weekly.find((x) => x.target.id === targetId);
    if (w) {
      const fmt = (n: number) => (w.target.metric === "minutes" ? formatMinutes(n) : `${Math.round(n * 10) / 10}`);
      return { done: w.actual, total: w.goal, label: `This week: ${fmt(w.actual)} of ${fmt(w.goal)} ${w.target.metric === "minutes" ? "" : (w.target.unit ?? "")}`.trim() };
    }
    return null;
  };

  return {
    items: items.map<VisionCardData>((i) => ({
      ...i,
      picture: (i.image_path && signed.get(i.image_path)) || i.image_url || null,
      progress: progressFor(i.target_id),
    })),
    targets: ((targetRows ?? []) as { id: string; name: string }[]).map(({ id, name }) => ({ id, name })),
  };
}
