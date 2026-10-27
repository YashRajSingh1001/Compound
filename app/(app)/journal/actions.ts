"use server";

import { refresh } from "next/cache";
import { isISODate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Target } from "@/lib/types";

/**
 * Saves the day's journal entry (one per day; saving again replaces it) and
 * ticks the Journal non-negotiable. Emptying the entry deletes it and clears
 * the tick. The text stays in Supabase: nothing here sends it anywhere.
 */
export async function saveJournal(date: string, text: string): Promise<{ savedAt?: string; error?: string }> {
  if (!isISODate(date)) return { error: "Bad date" };
  try {
    const supabase = await createClient();
    const clean = text.replace(/\s+$/, "").slice(0, 50_000);

    if (clean.trim()) {
      const { error } = await supabase
        .from("journal_entries")
        .upsert({ entry_date: date, text: clean, source: "app" }, { onConflict: "user_id,entry_date" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("journal_entries").delete().eq("entry_date", date);
      if (error) throw new Error(error.message);
    }

    const { data: targets } = await supabase.from("targets").select("id, kind, rules").eq("kind", "daily").eq("active", true);
    const journal = ((targets ?? []) as Pick<Target, "id" | "kind" | "rules">[]).find((t) => t.rules?.journal);
    if (journal) {
      await supabase.from("daily_logs").delete().eq("target_id", journal.id).eq("log_date", date);
      if (clean.trim()) await supabase.from("daily_logs").insert({ target_id: journal.id, log_date: date, value: 1, tag: "auto" });
    }

    refresh();
    return { savedAt: new Date().toISOString() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save" };
  }
}
