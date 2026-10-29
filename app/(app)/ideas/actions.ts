"use server";

import { refresh } from "next/cache";
import { groqJSON } from "@/lib/groq";
import { IDEA_STATUSES, IDEA_SYSTEM, cleanIdea, type IdeaStatus, type StructuredIdea } from "@/lib/ideas";
import { createClient } from "@/lib/supabase/server";

/** Saves an idea. Groq turns the raw text into title, category and context; if it can't, the text is kept as is. */
export async function addIdea(text: string): Promise<{ error?: string }> {
  const raw = text.trim().slice(0, 6000);
  if (!raw) return { error: "Write or say the idea first." };
  const supabase = await createClient();

  const { data: existing } = await supabase.from("ideas").select("category").not("category", "is", null);
  const categories = [...new Set((existing ?? []).map((r) => r.category as string))].slice(0, 30);

  let reply: Partial<StructuredIdea> | null = null;
  try {
    reply = await groqJSON<Partial<StructuredIdea>>(IDEA_SYSTEM, JSON.stringify({ existing_categories: categories, text: raw }), {
      maxTokens: 1200,
      temperature: 0.2,
    });
  } catch {
    // Saved below without the tidy-up rather than losing the idea.
  }
  const idea = cleanIdea(raw, reply);
  const { error } = await supabase.from("ideas").insert({ ...idea, source: "app" });
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function updateIdea(
  id: string,
  patch: { status?: IdeaStatus; category?: string | null; context?: string | null; title?: string; details?: string | null },
) {
  if (patch.status && !IDEA_STATUSES.includes(patch.status)) throw new Error("Bad status");
  const supabase = await createClient();
  const { error } = await supabase.from("ideas").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteIdea(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ideas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
