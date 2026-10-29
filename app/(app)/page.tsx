import { Suspense } from "react";
import { TodayView } from "@/components/TodayView";
import { getToday, loadDay } from "@/lib/data";
import { visionOfTheDay } from "@/lib/vision";
import { loadVision } from "@/lib/vision-data";

// Groq calls (verdict, vocab words, quick add) can take 10–20 s; the default limit may be shorter.
export const maxDuration = 60;

export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <Today />
    </Suspense>
  );
}

function TodaySkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-4 lg:grid-cols-12" aria-label="Loading your day">
      <div className="h-20 rounded-3xl bg-chip lg:col-span-12" />
      <div className="h-48 rounded-3xl bg-chip lg:col-span-5" />
      <div className="h-48 rounded-3xl bg-chip lg:col-span-3" />
      <div className="h-48 rounded-3xl bg-chip lg:col-span-4" />
      <div className="h-24 rounded-3xl bg-chip lg:col-span-12" />
    </div>
  );
}

async function Today() {
  const today = await getToday();
  const [day, vision] = await Promise.all([loadDay(today), todaysVision(today)]);
  return <TodayView day={day} vision={vision} />;
}

/** The vision card is a bonus: if it can't load, Today still shows. */
async function todaysVision(today: string) {
  try {
    return visionOfTheDay((await loadVision(today)).items, today);
  } catch {
    return null;
  }
}
