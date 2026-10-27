import { Suspense } from "react";
import { ProgressView } from "@/components/ProgressView";
import { getToday, loadDayInput, loadTodo } from "@/lib/data";
import { buildProgress } from "@/lib/progress-data";
import { createClient } from "@/lib/supabase/server";
import { todoStats } from "@/lib/todo";

export default function ProgressPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-chip" aria-label="Loading progress" />}>
      <Progress />
    </Suspense>
  );
}

async function Progress() {
  const today = await getToday();
  const supabase = await createClient();
  const [input, todo, reviews] = await Promise.all([
    loadDayInput(today),
    loadTodo(today),
    supabase.from("vocab_reviews").select("correct").eq("mode", "daily"),
  ]);
  const data = buildProgress(input, todoStats(todo.open, todo.finished, today).sameDayRate, reviews.data ?? []);
  return <ProgressView data={data} />;
}
