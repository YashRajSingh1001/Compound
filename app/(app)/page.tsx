import { Suspense } from "react";
import { TodayView } from "@/components/TodayView";
import { getToday, loadDay } from "@/lib/data";
import { pickDay } from "@/lib/dates";
import { visionOfTheDay } from "@/lib/vision";
import { loadVision } from "@/lib/vision-data";

export const maxDuration = 60;

export default function TodayPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <Today searchParams={searchParams} />
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

async function Today({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const [today, params] = await Promise.all([getToday(), searchParams]);
  const date = pickDay(params.date, today);
  const [day, vision] = await Promise.all([loadDay(date), date === today ? todaysVision(today) : null]);
  return <TodayView day={day} vision={vision} today={today} />;
}

async function todaysVision(today: string) {
  try {
    return visionOfTheDay((await loadVision(today)).items, today);
  } catch {
    return null;
  }
}
