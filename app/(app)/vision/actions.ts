"use server";

import { refresh } from "next/cache";
import { isISODate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { VISION_BUCKET } from "@/lib/vision";

type Fields = {
  title?: string;
  statement?: string | null;
  details?: string | null;
  category?: string | null;
  target_date?: string | null;
  target_id?: string | null;
  image_url?: string | null;
};

function clean(fields: Fields): Fields {
  const out: Fields = {};
  const text = (v: string | null | undefined, max: number) => (v?.trim() ? v.trim().slice(0, max) : null);
  if (fields.title !== undefined) out.title = fields.title.trim().slice(0, 140);
  if (fields.statement !== undefined) out.statement = text(fields.statement, 300);
  if (fields.details !== undefined) out.details = text(fields.details, 2000);
  if (fields.category !== undefined) out.category = text(fields.category, 40);
  if (fields.target_date !== undefined) out.target_date = isISODate(fields.target_date) ? fields.target_date : null;
  if (fields.target_id !== undefined) out.target_id = fields.target_id || null;
  if (fields.image_url !== undefined) out.image_url = /^https:\/\/\S+$/i.test(fields.image_url ?? "") ? fields.image_url : null;
  return out;
}

export async function addVisionItem(fields: Fields): Promise<{ error?: string }> {
  if (!fields.title?.trim()) return { error: "Give it a title." };
  const supabase = await createClient();
  const { data: last } = await supabase.from("vision_items").select("sort").order("sort", { ascending: false }).limit(1);
  const { error } = await supabase.from("vision_items").insert({ ...clean(fields), sort: ((last?.[0]?.sort as number) ?? -1) + 1 });
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function updateVisionItem(id: string, fields: Fields): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("vision_items").update(clean(fields)).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function setVisionAchieved(id: string, achieved: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vision_items")
    .update({ achieved_at: achieved ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteVisionItem(id: string) {
  const supabase = await createClient();
  const { data: current } = await supabase.from("vision_items").select("image_path").eq("id", id).single();
  const { error } = await supabase.from("vision_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (current?.image_path) await supabase.storage.from(VISION_BUCKET).remove([current.image_path]);
  refresh();
}
